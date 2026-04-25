import type { VercelRequest, VercelResponse } from '@vercel/node';
import { pool, sendResponse } from './db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return sendResponse(res, 200, {});
  }

  if (req.method !== 'POST') {
    return sendResponse(res, 405, { success: false, error: 'Method Not Allowed' });
  }

  try {
    const body = req.body;
    
    // Validate required fields
    const required = ['date', 'country', 'event_type', 'title', 'summary', 'source_name', 'source_url'];
    for (const field of required) {
        if (!body[field]) {
            return sendResponse(res, 400, { success: false, error: `Missing required field: ${field}` });
        }
    }

    const query = `
        INSERT INTO events
            (date, country, event_type, actor, title, summary, strategic_intent, india_relevance, outcome,
             funding_amount, funding_source, mediation_region, source_name, source_url, content_hash)
        VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING id
    `;

    const values = [
        body.date,
        body.country.trim(),
        body.event_type,
        body.actor ? body.actor.trim() : null,
        body.title.trim(),
        body.summary.trim(),
        body.strategic_intent || null,
        body.india_relevance || null,
        body.outcome || null,
        body.funding_amount || null,
        body.funding_source || null,
        body.mediation_region || null,
        body.source_name.trim(),
        body.source_url.trim(),
        body.content_hash || null
    ];

    const result = await pool.query(query, values);

    return sendResponse(res, 201, {
        success: true,
        message: 'Event added successfully.',
        id: result.rows[0].id
    });

  } catch (error: any) {
    if (error.code === '23505') { // Postgres unique violation
        return sendResponse(res, 409, {
            success: false,
            error: 'Duplicate event (content_hash collision).'
        });
    }

    return sendResponse(res, 500, {
      success: false,
      error: 'Insert failed.',
      detail: error.message
    });
  }
}
