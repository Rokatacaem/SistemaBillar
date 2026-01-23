const { Client } = require('pg');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

const client = new Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function applyMigration() {
    try {
        await client.connect();
        const sql = fs.readFileSync(path.join(__dirname, '../db/migrations/014_add_stock_control.sql'), 'utf8');
        await client.query(sql);
        console.log('Migration 014 applied successfully.');
    } catch (err) {
        console.error('Error applying migration:', err);
    } finally {
        await client.end();
    }
}

applyMigration();
