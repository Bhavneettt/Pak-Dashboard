#!/usr/bin/env python3
"""
ingest_news.py — Automated diplomatic event ingestion pipeline
Pak-Diplomacy Dashboard (Op Sindoor Intelligence Tracker)

Pipeline:
  GDELT API → keyword filter → scrape content → LLM parse → PHP API insert
"""

import os, sys, json, time, logging, re
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Optional

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import hashlib

# ── Load env ──────────────────────────────────────────────────
load_dotenv()

# ── Paths ─────────────────────────────────────────────────────
BASE_DIR   = Path(__file__).parent
CACHE_DIR  = BASE_DIR / "cache"
LOG_DIR    = BASE_DIR / "logs"
CACHE_FILE = CACHE_DIR / "seen_urls.json"
LOG_FILE   = LOG_DIR / f"ingest_{datetime.now().strftime('%Y-%m-%d')}.log"
CACHE_DIR.mkdir(exist_ok=True)
LOG_DIR.mkdir(exist_ok=True)

# ── Config ────────────────────────────────────────────────────
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openai").lower()
OPENAI_KEY   = os.getenv("OPENAI_API_KEY", "")
GEMINI_KEY   = os.getenv("GEMINI_API_KEY", "")
NVIDIA_KEY   = os.getenv("NVIDIA_API_KEY", "")
NVIDIA_MODEL = os.getenv("NVIDIA_MODEL", "meta/llama-3.3-70b-instruct")
NEWSAPI_KEY  = os.getenv("NEWSAPI_KEY", "")
API_BASE     = os.getenv("API_BASE", "http://localhost:3000/api").rstrip("/")
LOOKBACK_HRS = int(os.getenv("LOOKBACK_HOURS", "24"))
MAX_ARTICLES = int(os.getenv("MAX_ARTICLES", "20"))

# ── Logging ───────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
    ],
)
log = logging.getLogger("ingest")

# ── GDELT query ───────────────────────────────────────────────
GDELT_QUERY = (
    "Pakistan (visit OR talks OR diplomacy OR diplomatic OR "
    "IMF OR loan OR aid OR funding OR mediation OR multilateral "
    'OR "foreign minister" OR "prime minister")'
)

# ── LLM prompts ───────────────────────────────────────────────
SYSTEM_PROMPT = """You are a geopolitical intelligence analyst.

Extract ONLY if the article describes a REAL diplomatic action by Pakistan.

Classify event_type strictly as one of:
- Visit (physical travel by Pakistani leader)
- Funding (IMF, loans, aid, financial support)
- Mediation (Pakistan acting as mediator in conflicts)
- Multilateral (UN, OIC, international forums)
- Statement (official diplomatic statements)

Rules:
- Ignore opinion pieces
- Ignore military/internal news
- Ignore vague mentions without action
- If no clear diplomatic action → return {"is_valid": false, "reason": "..."}

Return JSON:
{
  "is_valid": true,
  "confidence": 0.85,
  "date": "YYYY-MM-DD",
  "country": "Saudi Arabia",
  "event_type": "Visit",
  "actor": "PM Shehbaz Sharif",
  "title": "...",
  "summary": "...",
  "strategic_intent": "...",
  "india_relevance": "Low | Medium | High",
  "outcome": null,
  "funding_amount": null,
  "funding_source": null,
  "mediation_region": null,
  "source_name": "...",
  "source_url": "..."
}"""

USER_PROMPT = """Article URL: {url}
Title: {title}
Published: {date}
Source: {source}

Content:
{content}

Extract the Pakistan diplomatic event JSON. Return JSON only."""

VALID_TYPES = {"Visit", "Funding", "Mediation", "Multilateral", "Statement"}

KEY_PATTERNS = [
    r"Pakistan .* visit",
    r"Pakistan .* talks",
    r"Pakistan .* IMF",
    r"Pakistan .* loan",
    r"Pakistan .* mediation",
    r"Pakistan .* met with",
    r"Pakistan .* delegation",
    r"Pakistan .* foreign minister",
]
COMPILED_PATTERNS = [re.compile(p, re.IGNORECASE) for p in KEY_PATTERNS]


# ================================================================
#  DEDUP CACHE
# ================================================================

def load_seen_urls() -> set:
    if CACHE_FILE.exists():
        try:
            return set(json.loads(CACHE_FILE.read_text(encoding="utf-8")))
        except Exception:
            return set()
    return set()


def save_seen_url(url: str, seen: set) -> None:
    seen.add(url)
    try:
        CACHE_FILE.write_text(json.dumps(sorted(seen), indent=2), encoding="utf-8")
    except Exception as e:
        log.warning(f"Cache write failed: {e}")


# ================================================================
#  PHP API CLIENT
# ================================================================

def get_existing_urls() -> set:
    """Pull all source_urls already stored in Supabase via PHP API."""
    try:
        r = requests.get(f"{API_BASE}/get_events.php", timeout=10)
        if r.status_code == 200:
            return {row["source_url"] for row in r.json().get("data", [])}
    except Exception as e:
        log.warning(f"Could not fetch existing URLs: {e}")
    return set()


def post_event(event: dict) -> bool:
    """POST a structured event to add_event.php."""
    try:
        r = requests.post(f"{API_BASE}/add_event", json=event, timeout=10)
        result = r.json()
        if result.get("success"):
            log.info(f"  ✅ Inserted id={result.get('id')} [{event['event_type']}] {event['title'][:60]}")
            return True
        log.warning(f"  ⚠️  Rejected: {result.get('error')} {result.get('detail', '')}")
    except Exception as e:
        log.error(f"  ❌ POST error: {e}")
    return False


# ================================================================
#  ARTICLE FETCHERS
# ================================================================

def _gdelt_date(raw: str) -> str:
    try:
        return datetime.strptime(raw[:8], "%Y%m%d").strftime("%Y-%m-%d")
    except Exception:
        return datetime.now().strftime("%Y-%m-%d")


def fetch_gdelt() -> list[dict]:
    since = (datetime.now(timezone.utc) - timedelta(hours=LOOKBACK_HRS)).strftime("%Y%m%d%H%M%S")
    log.info(f"Fetching GDELT (last {LOOKBACK_HRS}h)...")
    try:
        r = requests.get("https://api.gdeltproject.org/api/v2/doc/doc", params={
            "query": GDELT_QUERY, "mode": "artlist",
            "maxrecords": 100, "startdatetime": since,
            "format": "json", "sort": "datedesc",
        }, timeout=45)
        r.raise_for_status()
        articles = r.json().get("articles", [])
        log.info(f"  GDELT → {len(articles)} articles")
        return [
            {"url": a["url"], "title": a.get("title",""), "date": _gdelt_date(a.get("seendate","")), "source": a.get("domain","Unknown")}
            for a in articles if a.get("url") and a.get("language","English") == "English"
        ]
    except Exception as e:
        log.error(f"GDELT failed: {e}")
        return []


def fetch_newsapi() -> list[dict]:
    if not NEWSAPI_KEY:
        log.warning("NEWSAPI_KEY not set — skipping fallback")
        return []
    since = (datetime.now(timezone.utc) - timedelta(hours=LOOKBACK_HRS)).strftime("%Y-%m-%dT%H:%M:%S")
    log.info("Fetching NewsAPI (fallback)...")
    try:
        r = requests.get("https://newsapi.org/v2/everything", params={
            "q": "Pakistan AND (diplomacy OR IMF OR visit OR talks OR mediation OR aid)",
            "from": since, "sortBy": "publishedAt", "language": "en",
            "pageSize": min(MAX_ARTICLES * 3, 100), "apiKey": NEWSAPI_KEY,
        }, timeout=15)
        r.raise_for_status()
        articles = r.json().get("articles", [])
        log.info(f"  NewsAPI → {len(articles)} articles")
        return [
            {"url": a["url"], "title": a.get("title",""), "date": (a.get("publishedAt","") or "")[:10], "source": (a.get("source") or {}).get("name","Unknown")}
            for a in articles if a.get("url")
        ]
    except Exception as e:
        log.error(f"NewsAPI failed: {e}")
        return []


# ================================================================
#  CONTENT SCRAPER
# ================================================================

@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=8),
       retry=retry_if_exception_type(requests.RequestException), reraise=False)
def scrape_article(url: str) -> str:
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    r = requests.get(url, headers=headers, timeout=12, allow_redirects=True)
    r.raise_for_status()
    soup = BeautifulSoup(r.text, "lxml")
    for tag in soup(["script","style","nav","footer","header","aside","form","noscript"]):
        tag.decompose()
    body = (soup.find("article") or soup.find("main")
            or soup.find(class_=re.compile(r"article|story|content|body", re.I)))
    paras = (body or soup).find_all("p")
    text  = " ".join(p.get_text(" ", strip=True) for p in paras)
    return re.sub(r"\s+", " ", text).strip()[:3000]


# ================================================================
#  LLM EXTRACTORS
# ================================================================

def _build_user_msg(article: dict, content: str) -> str:
    return USER_PROMPT.format(
        url=article["url"], title=article["title"],
        date=article["date"], source=article["source"], content=content
    )


def extract_openai(article: dict, content: str) -> Optional[dict]:
    import openai
    client = openai.OpenAI(api_key=OPENAI_KEY)
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role":"system","content":SYSTEM_PROMPT},
                  {"role":"user","content":_build_user_msg(article, content)}],
        temperature=0.1, max_tokens=600,
    )
    return json.loads(resp.choices[0].message.content.strip())


def extract_nvidia(article: dict, content: str) -> Optional[dict]:
    import openai
    client = openai.OpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=NVIDIA_KEY
    )
    resp = client.chat.completions.create(
        model=NVIDIA_MODEL,
        messages=[{"role":"system","content":SYSTEM_PROMPT},
                  {"role":"user","content":_build_user_msg(article, content)}],
        temperature=0.1, max_tokens=600,
    )
    raw = resp.choices[0].message.content.strip()
    raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw)
    return json.loads(raw)


def extract_gemini(article: dict, content: str) -> Optional[dict]:
    import google.generativeai as genai
    genai.configure(api_key=GEMINI_KEY)
    model = genai.GenerativeModel(
        model_name="gemini-1.5-flash",
        system_instruction=SYSTEM_PROMPT,
        generation_config={"temperature": 0.1, "max_output_tokens": 600},
    )
    raw = model.generate_content(_build_user_msg(article, content)).text.strip()
    raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw)
    return json.loads(raw)


def extract_event(article: dict, content: str) -> Optional[dict]:
    try:
        if LLM_PROVIDER == "gemini":
            return extract_gemini(article, content)
        elif LLM_PROVIDER == "nvidia":
            return extract_nvidia(article, content)
        else:
            return extract_openai(article, content)
    except json.JSONDecodeError as e:
        log.warning(f"  Invalid JSON from LLM: {e}")
    except Exception as e:
        log.error(f"  LLM error: {e}")
    return None


# ================================================================
#  VALIDATOR
# ================================================================

def generate_hash(title: str, date: str) -> str:
    return hashlib.md5(f"{title}-{date}".encode()).hexdigest()

def validate_event(data: dict) -> Optional[dict]:
    if not data.get("is_valid"):
        return None
    if float(data.get("confidence", 0)) < 0.80:
        log.debug(f"  Low confidence ({data.get('confidence')}) — skip")
        return None
    required = ["date","country","event_type","actor","title","summary","source_name","source_url"]
    for f in required:
        if not data.get(f):
            log.warning(f"  Missing field: {f}")
            return None
    if data["event_type"] not in VALID_TYPES:
        log.warning(f"  Bad event_type: {data['event_type']}")
        return None
    try:
        datetime.strptime(data["date"], "%Y-%m-%d")
    except ValueError:
        log.warning(f"  Bad date: {data['date']}")
        return None
    return {
        "date":             data["date"],
        "country":          str(data["country"])[:100],
        "event_type":       data["event_type"],
        "actor":            str(data.get("actor","Unknown"))[:255],
        "title":            str(data["title"]),
        "summary":          str(data["summary"]),
        "strategic_intent": data.get("strategic_intent") or None,
        "india_relevance":  data.get("india_relevance") or "Low",
        "outcome":          data.get("outcome") or None,
        "funding_amount":   data.get("funding_amount") or None,
        "funding_source":   data.get("funding_source") or None,
        "mediation_region": data.get("mediation_region") or None,
        "source_name":      str(data["source_name"])[:255],
        "source_url":       str(data["source_url"]),
        "content_hash":     generate_hash(data["title"], data["date"]),
    }


# ================================================================
#  MAIN PIPELINE
# ================================================================

def run() -> None:
    log.info("=" * 60)
    log.info(f"Pak-Diplomacy Ingestion  |  LLM={LLM_PROVIDER.upper()}  |  lookback={LOOKBACK_HRS}h")
    log.info("=" * 60)

    seen_local  = load_seen_urls()
    seen_server = get_existing_urls()
    all_seen    = seen_local | seen_server
    log.info(f"Dedup: {len(seen_local)} local | {len(seen_server)} from DB")

    # Fetch
    articles = fetch_gdelt() or fetch_newsapi()
    if not articles:
        log.warning("No articles fetched — exiting")
        return

    # Pre-filter: pattern match + dedup
    articles = [
        a for a in articles
        if any(p.search(a["title"] + " " + a["url"]) for p in COMPILED_PATTERNS)
        and a["url"] not in all_seen
    ][:MAX_ARTICLES]
    log.info(f"After filter: {len(articles)} articles to process")

    stats = {"inserted": 0, "skipped": 0, "errors": 0}

    for i, article in enumerate(articles, 1):
        log.info(f"\n[{i}/{len(articles)}] {article['title'][:80]}")
        save_seen_url(article["url"], seen_local)   # mark immediately

        # Scrape
        try:
            content = scrape_article(article["url"])
            if len(content) < 100:
                log.info("  Too short — skip")
                stats["skipped"] += 1
                continue
            log.info(f"  Scraped {len(content)} chars")
        except Exception as e:
            log.warning(f"  Scrape failed: {e}")
            stats["errors"] += 1
            continue

        # LLM extract
        raw = extract_event(article, content)
        if raw is None:
            stats["errors"] += 1
            continue
        if raw.get("skip"):
            log.info(f"  LLM skip: {raw.get('reason','not diplomatic')}")
            stats["skipped"] += 1
            continue

        # Validate
        event = validate_event(raw)
        if event is None:
            stats["skipped"] += 1
            continue

        # Final dedup
        if event["source_url"] in all_seen:
            log.info("  Already in DB — skip")
            stats["skipped"] += 1
            continue

        # Insert
        if post_event(event):
            stats["inserted"] += 1
            all_seen.add(event["source_url"])
        else:
            stats["errors"] += 1

        time.sleep(2)   # polite rate limit

    log.info("\n" + "=" * 60)
    log.info(f"Done  inserted={stats['inserted']}  skipped={stats['skipped']}  errors={stats['errors']}")
    log.info("=" * 60)


def main() -> None:
    if LLM_PROVIDER == "openai" and not OPENAI_KEY:
        log.error("OPENAI_API_KEY not set — exiting"); sys.exit(1)
    if LLM_PROVIDER == "gemini" and not GEMINI_KEY:
        log.error("GEMINI_API_KEY not set — exiting"); sys.exit(1)
    if LLM_PROVIDER == "nvidia" and not NVIDIA_KEY:
        log.error("NVIDIA_API_KEY not set — exiting"); sys.exit(1)
    
    try:
        run()
    except Exception as e:
        log.error(f"Fatal script error: {e}", exc_info=True)


if __name__ == "__main__":
    main()
