export interface DiplomaticEvent {
  id: number;
  date: string;
  country: string;
  event_type: string;
  actor: string;
  title: string;
  summary: string;
  strategic_intent?: string | null;
  india_relevance?: string | null;
  outcome?: string | null;
  funding_amount?: string | null;
  funding_source?: string | null;
  mediation_region?: string | null;
  source_name: string;
  source_url: string;
}

export interface StatsData {
  total_events: number;
  by_type: Record<string, number>;
  top_country: {
    country: string;
    count: number;
  };
}

export interface TimelineData {
  id: number;
  date: string;
  country: string;
  event_type: string;
  actor: string;
  title: string;
  summary: string;
}
