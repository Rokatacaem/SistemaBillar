const { pool } = require('./db/connection.cjs');

async function checkUsers() {
    try {
        const res = await pool.query('SELECT id, rut, full_name, role, password_hash FROM users');
        console.log('Users found:', res.rows.length);
        console.table(res.rows);
    } catch (err) {
        console.error('Error querying users:', err);
    } finally {
        pool.end();
    }
}

checkUsers();
