import type { VercelRequest, VercelResponse } from '@vercel/node';
import { pool, sendResponse } from './db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    return sendResponse(res, 200, {});
  }

  try {
    const query = `
        SELECT id, date, country, event_type, actor, title, summary
        FROM events
        ORDER BY date DESC
    `;
    const result = await pool.query(query);

    return sendResponse(res, 200, {
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    return sendResponse(res, 500, {
      success: false,
      error: 'Failed to retrieve timeline.',
      detail: error.message
    });
  }
}
