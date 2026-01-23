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

        const filePath = path.join(__dirname, '../db/migrations/016_add_incorporation_date.sql');
        const sql = fs.readFileSync(filePath, 'utf8');

        console.log(`[APPLY] Applying 016...`);
        await client.query(sql);
        console.log(`[SUCCESS] 016 applied.`);

    } catch (err) {
        console.error('[MIGRATE] Error:', err.message);
    } finally {
        await client.end();
    }
}

migrate();
