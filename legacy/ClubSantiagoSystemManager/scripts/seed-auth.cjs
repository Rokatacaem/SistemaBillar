const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto'); // Built-in node crypto for simple hashing (or use bcrypt/argon2 in real app)
require('dotenv').config();

// Simple hash function for this stage (User requested "Desarrollo/QA" environment)
// In production, use bcrypt. For now, simple SHA256 or similar to separate concerns.
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

const dbConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
};

async function seed() {
    console.log(`[SEED] Connecting to ${dbConfig.database}...`);
    const client = new Client(dbConfig);

    try {
        await client.connect();

        // 1. Apply Migration
        // 1. Apply Migrations
        const migrationsDir = path.join(__dirname, '../db/migrations');
        if (fs.existsSync(migrationsDir)) {
            const files = fs.readdirSync(migrationsDir)
                .filter(file => file.endsWith('.sql'))
                .sort();

            console.log(`[SEED] Found ${files.length} migrations.`);

            for (const file of files) {
                const filePath = path.join(migrationsDir, file);
                const sql = fs.readFileSync(filePath, 'utf8');
                try {
                    await client.query(sql);
                    console.log(`[SEED] Migration applied: ${file}`);
                } catch (err) {
                    // Ignore "column already exists" or similar idempotent errors if possible, 
                    // or just log it. ensuring idempotency in SQL is better but this is a seed script.
                    console.log(`[SEED] Note on ${file}: ${err.message.split('\n')[0]}`);
                }
            }
        }

        // 2. Create Super Admin
        const adminRut = '1-9'; // Dummy RUT
        const adminPass = hashPassword('admin123'); // Default password

        const checkRes = await client.query('SELECT id FROM users WHERE role = $1', ['SUPERUSER']);
        if (checkRes.rowCount === 0) {
            await client.query(`
                INSERT INTO users (rut, full_name, role, type, password_hash)
                VALUES ($1, $2, $3, $4, $5)
            `, [adminRut, 'Super Admin', 'SUPERUSER', 'SOCIO', adminPass]);
            console.log('[SEED] SuperUser created. RUT: 1-9, Pass: admin123');
        } else {
            console.log('[SEED] SuperUser already exists.');
        }

    } catch (err) {
        console.error('[SEED] Error:', err);
    } finally {
        await client.end();
    }
}

seed();
