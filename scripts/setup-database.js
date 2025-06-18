#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function checkDatabaseUrl() {
  return process.env.DATABASE_URL;
}

async function createDatabase() {
  console.log('📦 Setting up database for first-time use...');
  
  try {
    // Check if we're in Replit environment
    if (!process.env.REPL_ID) {
      console.log('ℹ️  Not in Replit environment. Please set DATABASE_URL manually.');
      return false;
    }

    // Try to create database using Replit's database creation API
    console.log('🔧 Creating PostgreSQL database automatically...');
    
    // Use Replit's internal API to create database
    const createDbProcess = spawn('curl', [
      '-X', 'POST',
      '-H', 'Content-Type: application/json',
      '-H', `Authorization: Bearer ${process.env.REPLIT_DB_URL || ''}`,
      'https://replit.com/data/repls/signed_urls/create_db',
      '-d', JSON.stringify({
        replId: process.env.REPL_ID,
        dbType: 'postgresql'
      })
    ], { stdio: 'pipe' });

    return new Promise((resolve) => {
      createDbProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ Database created successfully!');
          resolve(true);
        } else {
          console.log('⚠️  Automatic database creation failed. Please create manually:');
          console.log('   1. Go to Tools > Database in Replit');
          console.log('   2. Create a PostgreSQL database');
          console.log('   3. Restart the application');
          resolve(false);
        }
      });
    });
    
  } catch (error) {
    console.log('⚠️  Please create database manually in Replit Tools > Database');
    return false;
  }
}

async function runMigrations() {
  console.log('Running database migrations...');
  
  return new Promise((resolve, reject) => {
    const migration = spawn('npx', ['drizzle-kit', 'push'], {
      stdio: 'inherit',
      shell: true
    });

    migration.on('close', (code) => {
      if (code === 0) {
        console.log('Database migrations completed successfully');
        resolve(true);
      } else {
        console.error('Database migrations failed with code:', code);
        reject(new Error(`Migration failed with exit code ${code}`));
      }
    });

    migration.on('error', (error) => {
      console.error('Error running migrations:', error);
      reject(error);
    });
  });
}

async function setupDatabase() {
  try {
    const databaseUrl = await checkDatabaseUrl();
    
    if (!databaseUrl) {
      const created = await createDatabase();
      if (!created) {
        console.log('Database setup incomplete. Please create a PostgreSQL database manually.');
        process.exit(1);
      }
    }

    // Run migrations
    await runMigrations();
    
    console.log('Database setup completed successfully!');
    return true;
  } catch (error) {
    console.error('Database setup failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };