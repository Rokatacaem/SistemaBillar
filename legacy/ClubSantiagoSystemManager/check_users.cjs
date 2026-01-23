const { pool } = require('./db/connection.cjs');
const fs = require('fs');
const path = require('path');

async function checkUsers() {
    try {
        const res = await pool.query('SELECT rut, full_name, role FROM users');
        const filePath = path.join(__dirname, 'users.json');
        fs.writeFileSync(filePath, JSON.stringify(res.rows, null, 2), 'utf8');
        console.log('Written to users.json');
    } catch (err) {
        console.error('Error querying users:', err);
    } finally {
        pool.end();
    }
}

checkUsers();
