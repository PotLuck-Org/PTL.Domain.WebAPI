/**
 * Automated Database Reset Script
 * This script will connect to Railway and reset all tables
 * 
 * Usage: node reset-database.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function resetDatabase() {
  console.log('🔄 Starting database reset...\n');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Test connection
    console.log('🔌 Connecting to Railway database...');
    await pool.query('SELECT NOW()');
    console.log('✅ Connected successfully\n');

    // Read SQL file
    const sqlFile = path.join(__dirname, 'reset-railway-database.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('📝 Executing database reset SQL...\n');

    // Execute the SQL
    await pool.query(sql);

    console.log('✅ Database reset completed!\n');

    // Verify tables
    console.log('🔍 Verifying tables...');
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log('\n📊 Tables created:');
    result.rows.forEach(row => {
      console.log(`  ✅ ${row.table_name}`);
    });

    // Check role permissions
    const roles = await pool.query('SELECT role, permissions FROM role_permissions');
    console.log('\n🔐 Role permissions:');
    roles.rows.forEach(row => {
      console.log(`  ✅ ${row.role}: ${row.permissions.join(', ')}`);
    });

    console.log('\n🎉 Database reset successful!');
    console.log('\n📝 Next steps:');
    console.log('1. Restart your API server: npm start');
    console.log('2. Test registration at: http://localhost:3000/api-docs');
    
  } catch (error) {
    console.error('\n❌ Error during reset:', error.message);
    console.error('\nStack:', error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Confirm before proceeding
console.log('⚠️  WARNING: This will DELETE ALL existing data!');
console.log('Press Ctrl+C to cancel, or wait 3 seconds to continue...\n');

setTimeout(() => {
  resetDatabase();
}, 3000);

