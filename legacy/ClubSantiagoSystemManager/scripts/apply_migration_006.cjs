const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function runMigration() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, '..', 'db', 'migrations', '006_add_assigned_to_items.sql'), 'utf8');
        await pool.query(sql);
        console.log('Migration 006 applied successfully.');
    } catch (err) {
        console.error('Error applying migration:', err);
    } finally {
        await pool.end();
    }
}

runMigration();
