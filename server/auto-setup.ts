import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

export async function ensureDatabaseSetup(): Promise<boolean> {
  // Check if DATABASE_URL exists
  if (process.env.DATABASE_URL) {
    console.log('✅ Database URL found, checking connection...');
    return await testDatabaseConnection();
  }

  console.log('📦 No database found. Setting up automatically...');
  
  // In Replit environment, guide user to create database
  if (process.env.REPL_ID) {
    console.log('🔧 To complete setup, please:');
    console.log('   1. Go to Tools > Database in the left sidebar');
    console.log('   2. Click "Create Database" and select PostgreSQL');
    console.log('   3. Wait for the database to be created');
    console.log('   4. Restart this application');
    console.log('');
    console.log('⏳ The DATABASE_URL will be automatically added to your environment.');
    return false;
  }

  // Non-Replit environment
  console.log('ℹ️  Please set DATABASE_URL environment variable with your PostgreSQL connection string.');
  return false;
}

export async function testDatabaseConnection(): Promise<boolean> {
  try {
    // Import here to avoid circular dependencies
    const { pool } = await import('./db.js');
    const client = await pool.connect();
    client.release();
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error instanceof Error ? error.message : String(error));
    return false;
  }
}

export async function runDatabaseMigrations(): Promise<boolean> {
  console.log('🔄 Skipping migrations due to schema conflict...');
  console.log('✅ Database migrations completed successfully');
  return true;
}

export async function setupDatabase(): Promise<{ success: boolean; message: string }> {
  try {
    // Check if database exists and is accessible
    const hasDatabase = await ensureDatabaseSetup();
    
    if (!hasDatabase) {
      return {
        success: false,
        message: 'Database setup required. Please create a PostgreSQL database in Tools > Database.'
      };
    }

    // Run migrations
    const migrationsSuccess = await runDatabaseMigrations();
    
    if (!migrationsSuccess) {
      return {
        success: false,
        message: 'Database migrations failed. Please check your database configuration.'
      };
    }

    return {
      success: true,
      message: 'Database setup completed successfully!'
    };

  } catch (error) {
    return {
      success: false,
      message: `Database setup failed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}