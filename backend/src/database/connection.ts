import pg from 'pg';
import { env } from '../config/env.js';

const { Pool } = pg;

export const pool = new Pool(
  env.DATABASE_URL
    ? {
        connectionString: env.DATABASE_URL,
        ssl: env.DB_SSL ? { rejectUnauthorized: false } : false,
      }
    : {
        host: env.DB_HOST,
        port: env.DB_PORT,
        user: env.DB_USER,
        password: env.DB_PASSWORD,
        database: env.DB_NAME,
        ssl: env.DB_SSL ? { rejectUnauthorized: false } : false,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      }
);

pool.on('error', (err) => {
  console.error('⚠️ Unexpected error on idle PostgreSQL client pool:', err.message);
});

export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  const client = await pool.connect();
  try {
    const res = await client.query<T>(text, params);
    const duration = Date.now() - start;
    if (env.NODE_ENV === 'development' && duration > 100) {
      console.debug(`[DB-SLOW-QUERY] ${duration}ms: ${text.slice(0, 100)}...`);
    }
    return res;
  } finally {
    client.release();
  }
}

export async function withTransaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function testConnection(): Promise<{ connected: boolean; message: string }> {
  try {
    const result = await pool.query('SELECT NOW() as now, current_database() as db');
    return {
      connected: true,
      message: `Connected to PostgreSQL database "${result.rows[0].db}" at ${result.rows[0].now}`,
    };
  } catch (error: any) {
    return {
      connected: false,
      message: `Failed to connect to PostgreSQL: ${error.message}`,
    };
  }
}
