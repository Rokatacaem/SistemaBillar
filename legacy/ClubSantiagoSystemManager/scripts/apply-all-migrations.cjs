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

        const migrationsDir = path.join(__dirname, '../db/migrations');
        const files = fs.readdirSync(migrationsDir).sort();

        // Ensure migrations table exists
        await client.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        for (const file of files) {
            if (!file.endsWith('.sql')) continue;

            // Check if applied
            const check = await client.query('SELECT id FROM schema_migrations WHERE name = $1', [file]);
            if (check.rows.length > 0) {
                // console.log(`[SKIP] ${file} already applied.`);
                continue;
            }

            console.log(`[APPLY] Applying ${file}...`);
            const filePath = path.join(migrationsDir, file);
            const sql = fs.readFileSync(filePath, 'utf8');

            try {
                await client.query('BEGIN');
                await client.query(sql);
                await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
                await client.query('COMMIT');
                console.log(`[SUCCESS] ${file} applied.`);
            } catch (err) {
                await client.query('ROLLBACK');
                console.error(`[ERROR] Failed to apply ${file}:`, err.message);
                // Don't break, maybe it's partial failure or idempotent script
                // actually better to break on failure for safety? 
                // For this dev environment, let's just log and continue or stop.
                // Stop is safer.
                process.exit(1);
            }
        }
        console.log('[DONE] All migrations processed.');

    } catch (err) {
        console.error('[MIGRATE] Connection Error:', err);
    } finally {
        await client.end();
    }
}

migrate();
