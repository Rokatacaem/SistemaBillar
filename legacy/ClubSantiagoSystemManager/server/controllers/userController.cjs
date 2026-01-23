const { pool } = require('../../db/connection');

// Using standard Node crypto for basic hashing (SHA256) to avoid native dependency issues with electron-rebuild
const crypto = require('crypto');

const hashPassword = (password) => {
    return crypto.createHash('sha256').update(password).digest('hex');
};

const login = async (req, res) => {
    const { username, password } = req.body;
    // Username can be RUT or a simple username field? Schema has RUT and Full Name.
    // Let's assume login by RUT or we add a username field. 
    // Schema: rut, full_name, role. 
    // Let's add password field to users table! It was missing in initial schema.
    
    try {
        // We need to check if we have a password column. If not, we should rely on a "pin" or similar?
        // The prompt asked for RBAC.
        // I will assume we login by RUT and a Password.
        // I need to alter table to add password if not exists.
        
        const result = await pool.query('SELECT * FROM users WHERE rut = $1', [username]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        
        const user = result.rows[0];
        
        // For MVP/Demo purposes, check plain hash
        const inputHash = hashPassword(password);
        
        // Allow a "master" password for dev? OR check DB password
        if (user.password_hash !== inputHash) {
             return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        
        res.json({ 
            user: { 
                id: user.id, 
                rut: user.rut, 
                name: user.full_name, 
                role: user.role 
            } 
        });
        
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error del servidor' });
    }
};

const getUsers = async (req, res) => {
    try {
        const result = await pool.query('SELECT id, rut, full_name, role, type, status FROM users ORDER BY full_name');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
};

const createUser = async (req, res) => {
    const { rut, full_name, role, type, password } = req.body;
    try {
        const password_hash = hashPassword(password || '1234'); // Default pass
        const result = await pool.query(
            'INSERT INTO users (rut, full_name, role, type, password_hash) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [rut, full_name, role, type, password_hash]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al crear usuario' });
    }
};

module.exports = { login, getUsers, createUser };
