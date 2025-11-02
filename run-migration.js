/**
 * Run Migration Script
 * This script runs the migration to add date_of_birth column to user_profiles table
 * 
 * Usage: node run-migration.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration() {
  console.log('🔄 Starting migration to add date_of_birth column...\n');

  if (!process.env.DATABASE_URL) {
    console.error('❌ Error: DATABASE_URL not found in .env file');
    console.log('Please make sure you have set up your .env file');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('railway') ? { rejectUnauthorized: false } : undefined
  });

  try {
    // Test connection
    console.log('🔌 Connecting to database...');
    await pool.query('SELECT NOW()');
    console.log('✅ Connected successfully\n');

    // Read migration SQL file
    const sqlFile = path.join(__dirname, 'migration-add-date-of-birth.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('📝 Executing migration...\n');

    // Execute the migration
    await pool.query(sql);

    console.log('✅ Migration completed successfully!\n');

    // Verify the column was added
    console.log('🔍 Verifying user_profiles table...');
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'user_profiles' 
      AND column_name = 'date_of_birth'
    `);

    if (result.rows.length > 0) {
      const col = result.rows[0];
      console.log(`✅ Column 'date_of_birth' exists:`);
      console.log(`   - Type: ${col.data_type}`);
      console.log(`   - Nullable: ${col.is_nullable}\n`);
    } else {
      console.log('⚠️  Column not found (this should not happen)\n');
    }

    console.log('🎉 Migration successful!');
    console.log('\n📝 Next steps:');
    console.log('1. Restart your API server: npm start');
    console.log('2. Test the profile endpoints with date_of_birth field');
    console.log('3. Visit: http://localhost:3000/api-docs to see the updated API');
    
  } catch (error) {
    console.error('\n❌ Error during migration:', error.message);
    console.error('\nStack:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
runMigration();

