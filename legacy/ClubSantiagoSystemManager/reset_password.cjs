const { pool } = require('./db/connection.cjs');
const crypto = require('crypto');

async function reset() {
    try {
        const password = '1234';
        const hash = crypto.createHash('sha256').update(password).digest('hex');
        const rut = '1-9';

        const res = await pool.query('UPDATE users SET password_hash = $1 WHERE rut = $2', [hash, rut]);
        console.log(`Password reset for ${rut}: ${res.rowCount} row(s) updated.`);

        // Also reset for the cashier
        const rut2 = '25233131-k';
        const res2 = await pool.query('UPDATE users SET password_hash = $1 WHERE rut = $2', [hash, rut2]);
        console.log(`Password reset for ${rut2}: ${res2.rowCount} row(s) updated.`);

    } catch (err) {
        console.error('Error:', err);
    } finally {
        pool.end();
    }
}

reset();
