const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
};

const targetDb = process.env.DB_NAME;

async function initDB() {
    // 1. Connect to default 'postgres' db to check/create target db
    console.log(`[DB] Connecting to postgres...`);
    const client = new Client({ ...dbConfig, database: 'postgres' });

    try {
        await client.connect();

        const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [targetDb]);
        if (res.rowCount === 0) {
            console.log(`[DB] Database '${targetDb}' does not exist. Creating...`);
            await client.query(`CREATE DATABASE "${targetDb}"`);
            console.log(`[DB] Database '${targetDb}' created.`);
        } else {
            console.log(`[DB] Database '${targetDb}' already exists.`);
        }
    } catch (err) {
        console.error('[DB] Error checking/creating database:', err);
        process.exit(1);
    } finally {
        await client.end();
    }

    // 2. Connect to the target DB and apply schema
    console.log(`[DB] Applying schema to '${targetDb}'...`);
    const targetClient = new Client({ ...dbConfig, database: targetDb });

    try {
        await targetClient.connect();
        const schemaPath = path.join(__dirname, '../db/schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');

        await targetClient.query(schema);
        console.log('[DB] Schema applied successfully.');
    } catch (err) {
        console.error('[DB] Error applying schema:', err);
        process.exit(1);
    } finally {
        await targetClient.end();
    }
}

initDB();
