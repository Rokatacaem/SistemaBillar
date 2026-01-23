const { pool } = require('./db/connection.cjs');

async function debugQuery() {
    try {
        console.log("Testing Connection...");
        await pool.query('SELECT NOW()');
        console.log("Connection OK.");

        console.log("Testing /api/tables Query...");
        const query = `
            SELECT t.*, 
                   s.id as current_session_id,
                   s.start_time, 
                   s.players,
                   s.is_training,
                   COALESCE((SELECT SUM(si.price * si.quantity) FROM session_items si WHERE si.session_id = s.id), 0) as consumption_total
            FROM tables t
            LEFT JOIN sessions s ON t.current_session_id = s.id
            ORDER BY t.name ASC
        `;
        const result = await pool.query(query);
        console.log("Query Success! Rows:", result.rows.length);
    } catch (err) {
        console.error("Query FAILED:", err);
    } finally {
        pool.end();
    }
}

debugQuery();
