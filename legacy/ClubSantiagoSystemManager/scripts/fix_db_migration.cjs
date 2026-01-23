const fs = require('fs');
const path = require('path');
const db = require('../db/connection.cjs');

async function runMigration() {
    try {
        const migrationPath = path.join(__dirname, '../db/migrations/005_create_session_items.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Applying migration: 005_create_session_items.sql');
        await db.query(sql);

        console.log('Migration applied successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

runMigration();
