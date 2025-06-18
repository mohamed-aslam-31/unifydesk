#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function checkDatabaseUrl() {
  return process.env.DATABASE_URL;
}

async function createDatabase() {
  console.log('No DATABASE_URL found. Creating PostgreSQL database...');
  
  try {
    // Check if we're in Replit environment
    if (!process.env.REPL_ID) {
      console.log('Not in Replit environment. Please set DATABASE_URL manually or create a PostgreSQL database.');
      return false;
    }

    // In Replit, we'll use a simple approach - just log instructions
    console.log('To set up database in Replit:');
    console.log('1. Go to Tools > Database');
    console.log('2. Create a PostgreSQL database');
    console.log('3. The DATABASE_URL will be automatically added to your environment');
    console.log('4. Restart your application');
    
    return false;
  } catch (error) {
    console.error('Error creating database:', error);
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