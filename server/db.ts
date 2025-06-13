import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;
import * as schema from '@shared/schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export const db = drizzle(pool, { schema });

export async function connectToDatabase() {
  try {
    const client = await pool.connect();
    client.release();
    console.log('Connected to PostgreSQL database');
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

export async function disconnectFromDatabase() {
  try {
    await pool.end();
    console.log('Disconnected from PostgreSQL database');
  } catch (error) {
    console.error('Database disconnection error:', error);
  }
}