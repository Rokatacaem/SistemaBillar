const { pool } = require('../db/connection');
const crypto = require('crypto');

const hashPassword = (password) => {
    return crypto.createHash('sha256').update(password).digest('hex');
};

async function migrate() {
    try {
        console.log('[MIGRATE] Adding password_hash to users...');
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT');
        
        console.log('[MIGRATE] Checking for Admin user...');
        const res = await pool.query("SELECT * FROM users WHERE role = 'ADMIN'");
        
        if (res.rowCount === 0) {
            console.log('[MIGRATE] Creating default Admin user (RUT: 1-9, Pass: admin)...');
            const passHash = hashPassword('admin');
            await pool.query(
                "INSERT INTO users (rut, full_name, role, type, password_hash) VALUES ($1, $2, $3, $4, $5)",
                ['1-9', 'Administrador Sistema', 'ADMIN', 'SOCIO', passHash]
            );
        }
        
        console.log('[MIGRATE] Done.');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

migrate();
