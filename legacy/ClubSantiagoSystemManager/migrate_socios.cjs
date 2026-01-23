const { pool } = require('./db/connection.cjs');

async function migrate() {
    try {
        const res = await pool.query("UPDATE users SET type = 'FUNDADOR' WHERE type = 'SOCIO'");
        console.log(`Migration complete. Updated ${res.rowCount} users from SOCIO to FUNDADOR.`);
    } catch (err) {
        console.error('Migration error:', err);
    } finally {
        pool.end();
    }
}

migrate();
