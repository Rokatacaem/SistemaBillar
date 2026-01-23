const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
};

async function migrate() {
    console.log(`[MIGRATE] Connecting to ${dbConfig.database}...`);
    const client = new Client(dbConfig);

    try {
        await client.connect();

        const migrationPath = path.join(__dirname, '../db/migrations/002_add_payment_tracking.sql');
        const migrationSql = fs.readFileSync(migrationPath, 'utf8');
        await client.query(migrationSql);
        console.log('[MIGRATE] Migration 002 applied.');

    } catch (err) {
        console.error('[MIGRATE] Error:', err);
    } finally {
        await client.end();
    }
}

migrate();
