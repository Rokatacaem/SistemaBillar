const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
});

async function runMigration() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, '..', 'db', 'migrations', '008_add_user_to_sales.sql'), 'utf8');
        await pool.query(sql);
        console.log('Migration 008 applied successfully.');
    } catch (err) {
        console.error('Error applying migration:', err);
    } finally {
        await pool.end();
    }
}

runMigration();
