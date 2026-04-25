import { Pool } from 'pg';

// Create a single pool instance
export const pool = new Pool({
  host: process.env.DB_HOST || 'aws-1-ap-southeast-1.pooler.supabase.com',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres.hceynjipmnmxogwpullq',
  password: process.env.DB_PASSWORD || 'Bhavneet@2005', // Change to process.env.DB_PASSWORD in production
  ssl: {
    rejectUnauthorized: false
  }
});

// Helper for sending JSON responses with CORS headers
export function sendResponse(res: any, status: number, data: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  res.status(status).json(data);
}
