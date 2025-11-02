/**
 * Run Migration Script
 * Executes a SQL migration file
 * 
 * Usage: node run-migration.js <migration-file.sql>
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

async function runMigration(migrationFile) {
  console.log(`🔄 Running migration: ${migrationFile}\n`);

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // Test connection
    console.log('🔌 Connecting to database...');
    await pool.query('SELECT NOW()');
    console.log('✅ Connected successfully\n');

    // Read SQL file
    const sqlFilePath = path.join(__dirname, migrationFile);
    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`Migration file not found: ${sqlFilePath}`);
    }

    const sql = fs.readFileSync(sqlFilePath, 'utf8');

    console.log('📝 Executing migration SQL...\n');

    // Execute the SQL
    await pool.query(sql);

    console.log('✅ Migration completed successfully!\n');

    // Verify the migration
    if (migrationFile.includes('timeline-title')) {
      console.log('🔍 Verifying title column...');
      const result = await pool.query(`
        SELECT column_name, data_type, character_maximum_length
        FROM information_schema.columns 
        WHERE table_name = 'timeline_posts' 
        AND column_name = 'title'
      `);

      if (result.rows.length > 0) {
        const col = result.rows[0];
        console.log(`  ✅ Column 'title' exists: ${col.data_type}(${col.character_maximum_length || 'N/A'})`);
      } else {
        console.log('  ⚠️  Column verification failed');
      }
    }

    console.log('\n🎉 Migration executed successfully!');
    
  } catch (error) {
    console.error('\n❌ Error during migration:', error.message);
    if (error.message.includes('already exists')) {
      console.log('ℹ️  This is normal if the column already exists.');
    } else {
      console.error('\nStack:', error.stack);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Get migration file from command line argument or use default
const migrationFile = process.argv[2] || 'migration-add-timeline-title.sql';

runMigration(migrationFile);

