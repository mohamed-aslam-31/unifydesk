import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Client } = pkg;
import * as schema from '@shared/schema';

const client = new Client({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(client, { schema });

export async function connectToDatabase() {
  try {
    await client.connect();
    console.log('Connected to PostgreSQL database');
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

export async function disconnectFromDatabase() {
  try {
    await client.end();
    console.log('Disconnected from PostgreSQL database');
  } catch (error) {
    console.error('Database disconnection error:', error);
  }
}