import type { VercelRequest, VercelResponse } from '@vercel/node';
import { pool, sendResponse } from './db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return sendResponse(res, 200, {});
  }

  try {
    const { country, event_type } = req.query;

    let query = `
        SELECT 
            id,
            date,
            country,
            event_type,
            actor,
            title,
            summary,
            strategic_intent,
            india_relevance,
            outcome,
            funding_amount,
            funding_source,
            mediation_region,
            source_name,
            source_url
        FROM events
        WHERE 1=1
    `;

    const values: any[] = [];
    let paramIndex = 1;

    if (country) {
        query += ` AND country ILIKE $${paramIndex}`;
        values.push(`%${country}%`);
        paramIndex++;
    }

    if (event_type) {
        query += ` AND event_type = $${paramIndex}`;
        values.push(event_type);
        paramIndex++;
    }

    query += ` ORDER BY date DESC`;

    const result = await pool.query(query, values);

    return sendResponse(res, 200, {
      success: true,
      count: result.rowCount,
      data: result.rows
    });
  } catch (error: any) {
    return sendResponse(res, 500, {
      success: false,
      error: 'Database query failed.',
      detail: error.message
    });
  }
}
