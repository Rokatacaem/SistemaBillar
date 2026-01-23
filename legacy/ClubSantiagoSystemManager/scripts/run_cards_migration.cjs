const fs = require('fs');
const path = require('path');
const db = require('../db/connection.cjs');

async function run() {
    try {
        const sqlPath = path.join(__dirname, '../db/migrations/017_add_charged_to_players.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log('Running migration:', sqlPath);
        await db.query(sql);
        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

run();
