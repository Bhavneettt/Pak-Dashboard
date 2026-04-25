import type { VercelRequest, VercelResponse } from '@vercel/node';
import { pool, sendResponse } from './db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return sendResponse(res, 200, {});
  }

  try {
    // 1. Total events
    const totalRes = await pool.query('SELECT COUNT(*) as total FROM events');
    const totalEvents = parseInt(totalRes.rows[0].total);

    // 2. Breakdown by event type
    const byTypeRes = await pool.query(`
        SELECT event_type, COUNT(*) as count 
        FROM events 
        GROUP BY event_type
    `);
    const byType: Record<string, number> = {};
    byTypeRes.rows.forEach(row => {
        byType[row.event_type] = parseInt(row.count);
    });

    // 3. Top country
    const topCountryRes = await pool.query(`
        SELECT country, COUNT(*) as count 
        FROM events 
        GROUP BY country 
        ORDER BY count DESC 
        LIMIT 1
    `);
    
    let topCountry = null;
    if (topCountryRes.rowCount > 0) {
        topCountry = {
            country: topCountryRes.rows[0].country,
            count: parseInt(topCountryRes.rows[0].count)
        };
    }

    return sendResponse(res, 200, {
      success: true,
      data: {
          total_events: totalEvents,
          by_type: byType,
          top_country: topCountry
      }
    });
  } catch (error: any) {
    return sendResponse(res, 500, {
      success: false,
      error: 'Failed to retrieve stats.',
      detail: error.message
    });
  }
}
