const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const db = require('../db/connection.cjs'); // Use the connection file we created

function createServer(port, userDataPath) {
    const app = express();
    app.use(cors());
    app.use(express.json());

    // Helper hash function (MUST MATCH SEED)
    function hashPassword(password) {
        return crypto.createHash('sha256').update(password).digest('hex');
    }

    // File Upload Setup
    const multer = require('multer');
    const path = require('path');
    const fs = require('fs');

    // Ensure uploads directory exists
    // In Production (userDataPath provided): AppData/Local/Programs/.../uploads/members
    // In Dev: ./public/uploads/members
    const baseUploadPath = userDataPath ? path.join(userDataPath, 'uploads') : path.join(__dirname, '../public/uploads');
    const uploadDir = path.join(baseUploadPath, 'members');

    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Serve Uploads Static Folder
    app.use('/api/uploads', express.static(baseUploadPath));

    const storage = multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, uploadDir)
        },
        filename: function (req, file, cb) {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
            cb(null, 'member-' + uniqueSuffix + path.extname(file.originalname))
        }
    });

    const upload = multer({ storage: storage });

    // Upload Endpoint
    app.post('/api/upload', upload.single('image'), (req, res) => {
        if (!req.file) {
            return res.status(400).json({ error: 'No image uploaded' });
        }
        // Return relative path for frontend usage
        const fileUrl = `/uploads/members/${req.file.filename}`;
        res.json({ url: fileUrl });
    });

    // Auth Route
    app.post('/api/login', async (req, res) => {
        const { rut, password } = req.body;

        try {
            const result = await db.query('SELECT * FROM users WHERE rut = $1', [rut]);
            if (result.rows.length === 0) {
                return res.status(401).json({ error: 'Usuario no encontrado' });
            }

            const user = result.rows[0];
            const hashedInput = hashPassword(password);

            if (user.password_hash === hashedInput) {
                // In production: Issue JWT. Here: Return user info simple.
                res.json({
                    success: true,
                    user: {
                        id: user.id,
                        name: user.full_name,
                        role: user.role,
                        rut: user.rut,
                        type: user.type
                    }
                });
            } else {
                res.status(401).json({ error: 'Contraseña incorrecta' });
            }
        } catch (err) {
            console.error('Login Error:', err);
            res.status(500).json({ error: 'Error interno del servidor' });
        }
    });

    // Change Password Endpoint
    app.put('/api/users/change-password', async (req, res) => {
        const { userId, currentPassword, newPassword } = req.body;
        try {
            const result = await db.query('SELECT * FROM users WHERE id = $1', [userId]);
            if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

            const user = result.rows[0];
            if (user.password_hash !== hashPassword(currentPassword)) {
                return res.status(401).json({ error: 'Contraseña actual incorrecta' });
            }

            const newHash = hashPassword(newPassword);
            await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, userId]);
            res.json({ success: true });
        } catch (err) {
            console.error('Change Password Error:', err);
            res.status(500).json({ error: 'Error interno' });
        }
    });


    // USERS Routes
    app.get('/api/users', async (req, res) => {
        try {
            const { type, role } = req.query;
            let query = "SELECT id, rut, full_name, role, type, status, debt_status, flag_country, photo_url, credit_limit, current_debt FROM users WHERE status != 'DELETED'";
            const params = [];

            // Note: Since we moved WHERE to base query, we use AND for subsequent conditions

            if (type) {
                query += ` AND type = $${params.length + 1}`;
                params.push(type);
            }
            if (role) {
                query += ` AND role = $${params.length + 1}`;
                params.push(role);
            }

            query += ' ORDER BY full_name ASC';

            const result = await db.query(query, params);
            res.json(result.rows);
        } catch (err) {
            console.error('Get Users Error:', err);
            res.status(500).json({ error: 'Error al obtener usuarios' });
        }
    });

    app.post('/api/users', async (req, res) => {
        try {
            const { rut, full_name, role, type, flag_country, photo_url } = req.body;
            // Basic validation
            if (!rut || !full_name) {
                return res.status(400).json({ error: 'RUT y Nombre requeridos' });
            }

            // Defaults
            const userRole = role || 'USER';
            const userType = type || 'CLIENTE';

            const query = `
                INSERT INTO users (rut, full_name, role, type, flag_country, photo_url)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING id, rut, full_name
            `;
            const result = await db.query(query, [rut, full_name, userRole, userType, flag_country, photo_url]);
            res.status(201).json(result.rows[0]);
        } catch (err) {
            console.error('Create User Error:', err);
            if (err.code === '23505') { // Unique violation
                return res.status(409).json({ error: 'El RUT ya está registrado' });
            }
            res.status(500).json({ error: 'Error al crear usuario' });
        }
    });

    // Get User by ID
    app.get('/api/users/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const result = await db.query('SELECT * FROM users WHERE id = $1', [id]);
            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }
            res.json(result.rows[0]);
        } catch (err) {
            console.error('Get User Error:', err);
            res.status(500).json({ error: 'Error al obtener usuario' });
        }
    });

    // Update User
    app.put('/api/users/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { full_name, role, type, flag_country, photo_url, credit_limit, password } = req.body;

            // Note: RUT is not typically updated, but could be added if needed

            if (password && password.trim() !== '') {
                const hashedPassword = hashPassword(password);
                await db.query(`
                    UPDATE users 
                    SET full_name = $1, role = $2, type = $3, flag_country = $4, photo_url = $5, credit_limit = $6, password_hash = $7, incorporation_date = $8
                    WHERE id = $9
                `, [full_name, role, type, flag_country, photo_url, credit_limit || 0, hashedPassword, incorporation_date || null, id]);
            } else {
                await db.query(`
                    UPDATE users 
                    SET full_name = $1, role = $2, type = $3, flag_country = $4, photo_url = $5, credit_limit = $6, incorporation_date = $7
                    WHERE id = $8
                `, [full_name, role, type, flag_country, photo_url, credit_limit || 0, incorporation_date || null, id]);
            }

            res.json({ success: true });
        } catch (err) {
            console.error('Update User Error:', err);
            res.status(500).json({ error: 'Error al actualizar usuario' });
        }
    });

    // Delete User (Soft Delete)
    app.delete('/api/users/:id', async (req, res) => {
        try {
            const { id } = req.params;
            // First check if user exists
            const check = await db.query('SELECT id FROM users WHERE id = $1', [id]);
            if (check.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' });

            // Perform Soft Delete
            await db.query("UPDATE users SET status = 'DELETED' WHERE id = $1", [id]);
            res.json({ success: true });
        } catch (err) {
            console.error('Delete User Error:', err);
            res.status(500).json({ error: 'Error al eliminar usuario' });
        }
    });

    // MEMBER MANAGEMENT Routes

    // Get all Members (Socios) with status
    app.get('/api/members', async (req, res) => {
        try {
            const result = await db.query(`
                SELECT id, rut, full_name, membership_expires_at, type, incorporation_date, created_at,
                    CASE 
                        WHEN membership_expires_at IS NULL THEN 'EXPIRED'
                        WHEN membership_expires_at < CURRENT_DATE THEN 'EXPIRED'
                        ELSE 'ACTIVE' 
                    END as status
                FROM users 
                WHERE type IN ('SOCIO', 'FUNDADOR') AND status != 'DELETED'
                ORDER BY full_name ASC
            `);
            res.json(result.rows);
        } catch (err) {
            console.error('Get Members Error:', err);
            res.status(500).json({ error: 'Error al obtener socios' });
        }
    });

    // Pay Membership
    app.post('/api/members/:id/pay-membership', async (req, res) => {
        const { id } = req.params;
        const { amount, months, method } = req.body;

        try {
            await db.query('BEGIN');

            // 1. Get current expiry
            const userRes = await db.query('SELECT membership_expires_at FROM users WHERE id = $1', [id]);
            if (userRes.rows.length === 0) {
                await db.query('ROLLBACK');
                return res.status(404).json({ error: 'Socio no encontrado' });
            }

            const currentExpiry = userRes.rows[0].membership_expires_at ? new Date(userRes.rows[0].membership_expires_at) : new Date();
            const now = new Date();

            // If expired, start from today. If active, query from existing expiry.
            // Logic: If expiry < now, new date = now + months. If expiry > now, new date = expiry + months.
            const startDate = (currentExpiry < now) ? now : currentExpiry;

            const newExpiry = new Date(startDate);
            newExpiry.setMonth(newExpiry.getMonth() + parseInt(months));

            // 2. Update User
            await db.query('UPDATE users SET membership_expires_at = $1 WHERE id = $2', [newExpiry, id]);

            // 3. Record Payment (Shift aware?)
            // Just inserting into membership_payments for record. 
            // Ideally should also be an Income in Cash Shift if method is CASH.
            await db.query(`
                INSERT INTO membership_payments (user_id, amount, months, method)
                VALUES ($1, $2, $3, $4)
            `, [id, amount, months, method]);

            // 4. If PAID by CASH/DEBIT, it technically enters the store's cash flow.
            // We'll log it as a special sale or just leave it separate. For now separate table.
            // NOTE: If user wants this in "Caja", we should insert into expenses or sales.
            // Let's insert into 'sales' as a service to be safe and visible in Shift Report.
            const saleItems = [{
                type: 'MEMBERSHIP',
                name: `Mensualidad (${months} meses)`,
                quantity: 1,
                price: parseFloat(amount),
                id: 'MEMBERSHIP'
            }];

            await db.query(`
                 INSERT INTO sales (items, total, method, created_at, user_id, payment_status)
                 VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, 'PAID')
            `, [JSON.stringify(saleItems), amount, method, id]);

            await db.query('COMMIT');
            res.json({ success: true, new_expiry: newExpiry });

        } catch (err) {
            await db.query('ROLLBACK');
            console.error('Pay Membership Error:', err);
            res.status(500).json({ error: 'Error al registrar pago' });
        }
    });

    // SHIFT MANAGEMENT Routes

    // Get Active Shift (or null if none) with Current Totals
    app.get('/api/shifts/current', async (req, res) => {
        try {
            // Find open shift
            const shiftRes = await db.query(`
                SELECT s.*, u.full_name as cashier_name 
                FROM shifts s
                JOIN users u ON s.cashier_id = u.id
                WHERE s.status = 'OPEN' 
                ORDER BY s.opened_at DESC LIMIT 1
            `);

            if (shiftRes.rows.length === 0) {
                return res.json(null);
            }

            const currentShift = shiftRes.rows[0];

            // Calculate totals since opened_at
            // 1. Sales by Method
            const salesRes = await db.query(`
                SELECT 
                    COALESCE(SUM(CASE WHEN method = 'CASH' THEN total ELSE 0 END), 0) as total_sales_cash,
                    COALESCE(SUM(CASE WHEN method = 'DEBIT' THEN total ELSE 0 END), 0) as total_sales_debit,
                    COALESCE(SUM(CASE WHEN method = 'TRANSFER' THEN total ELSE 0 END), 0) as total_sales_transfer
                FROM sales 
                WHERE created_at >= $1 
            `, [currentShift.opened_at]);

            // 2. Expenses
            const expensesRes = await db.query(`
                SELECT COALESCE(SUM(amount), 0) as total_expenses
                FROM expenses 
                WHERE shift_id = $1
            `, [currentShift.id]);

            const totalSalesCash = parseFloat(salesRes.rows[0].total_sales_cash);
            const totalSalesDebit = parseFloat(salesRes.rows[0].total_sales_debit);
            const totalSalesTransfer = parseFloat(salesRes.rows[0].total_sales_transfer);
            const totalExpenses = parseFloat(expensesRes.rows[0].total_expenses);
            const initialCash = parseFloat(currentShift.initial_cash);

            const systemCash = initialCash + totalSalesCash - totalExpenses;

            res.json({
                ...currentShift,
                total_sales_cash: totalSalesCash,
                total_sales_debit: totalSalesDebit,
                total_sales_transfer: totalSalesTransfer,
                total_expenses: totalExpenses,
                system_cash: systemCash
            });

        } catch (err) {
            console.error('Get Shift Error:', err);
            res.status(500).json({ error: 'Error getting shift' });
        }
    });

    // OPEN SHIFT
    app.post('/api/shifts/open', async (req, res) => {
        const { cashier_id, initial_cash } = req.body;
        try {
            const result = await db.query(
                "INSERT INTO shifts (cashier_id, initial_cash, status, opened_at) VALUES ($1, $2, 'OPEN', NOW()) RETURNING opened_at",
                [cashier_id, initial_cash]
            );

            // Get cashier name for email
            const uRes = await db.query('SELECT full_name FROM users WHERE id = $1', [cashier_id]);
            const cashier_name = uRes.rows[0]?.full_name || 'Desconocido';
            const opened_at = result.rows[0].opened_at;

            // Send Email
            const { sendShiftOpenReport } = require('./email.cjs');
            sendShiftOpenReport({ cashier_name, initial_cash, opened_at }).catch(e => console.error('Email Open Error:', e));

            res.json({ success: true });
        } catch (err) {
            console.error('Open Shift Error:', err);
            res.status(500).json({ error: 'Error opening shift' });
        }
    });

    // EMAIL HELPER
    const { sendShiftCloseReport } = require('./email.cjs');

    // Close Shift
    app.post('/api/shifts/close', async (req, res) => {
        const { shift_id, closer_id, final_cash_declared, final_cash_system, expenses_total, notes } = req.body;
        try {
            // 1. Close the shift in DB
            await db.query(`
                UPDATE shifts 
                SET status = 'CLOSED', 
                    closed_at = NOW(), 
                    closer_id = $1, 
                    final_cash_declared = $2, 
                    final_cash_system = $3,
                    expenses_total = $4,
                    notes = $5
                WHERE id = $6
            `, [closer_id, final_cash_declared, final_cash_system, expenses_total, notes, shift_id]);

            // 2. Fetch full data for Email Report
            const shiftRes = await db.query(`
                SELECT s.*, u1.full_name as cashier_name, u2.full_name as closer_name
                FROM shifts s
                JOIN users u1 ON s.cashier_id = u1.id
                LEFT JOIN users u2 ON s.closer_id = u2.id
                WHERE s.id = $1
            `, [shift_id]);

            if (shiftRes.rows.length > 0) {
                const shiftData = shiftRes.rows[0];

                // RE-QUERY TOTALS for accuracy within the shift timeframe
                const salesRes = await db.query(`
                    SELECT 
                        COALESCE(SUM(CASE WHEN method = 'CASH' THEN total ELSE 0 END), 0) as total_sales_cash,
                        COALESCE(SUM(CASE WHEN method = 'DEBIT' THEN total ELSE 0 END), 0) as total_sales_debit,
                        COALESCE(SUM(CASE WHEN method = 'TRANSFER' THEN total ELSE 0 END), 0) as total_sales_transfer
                    FROM sales 
                    WHERE created_at >= $1 AND created_at <= $2 AND payment_status = 'PAID'
                `, [shiftData.opened_at, shiftData.closed_at]);
                const r = salesRes.rows[0];

                // 3. EXTRA REPORTS DATA

                // A. Debtors (Sales on Account / Fiados)
                const debtorsRes = await db.query(`
                    SELECT user_name, SUM(total) as total
                    FROM sales
                    WHERE created_at >= $1 AND created_at <= $2 
                      AND (method = 'ACCOUNT' OR payment_status = 'PENDING')
                    GROUP BY user_name
                `, [shiftData.opened_at, shiftData.closed_at]);

                // B. Membership Payments
                const memberPayRes = await db.query(`
                    SELECT u.full_name, mp.amount, mp.months
                    FROM membership_payments mp
                    JOIN users u ON mp.user_id = u.id
                    -- Assuming we can filter by some timestamp. 
                    -- membership_payments doesn't have created_at in the CREATE statement I saw earlier?
                    -- Wait, if it doesn't have created_at, I can't filter by shift!
                    -- Let's check schema via SQL or assumption. 'sales' has created_at properly.
                    -- If mp tracks separately, I hope it has created_at. 
                    -- If not, I'll rely on the 'sales' record created for membership (type='MEMBERSHIP').
                    -- Let's use the SALES table for this to be safe as it definitely has timestamp.
                `);

                // Better approach for Memberships: Query 'sales' where items JSON contains type: 'MEMBERSHIP'
                // Or just query membership_payments assuming it might have defaults or I can add it?
                // Using Sales is safer for "Money movement during shift".
                const membershipsFromSales = await db.query(`
                    SELECT user_name as full_name, total as amount, items
                    FROM sales
                    WHERE created_at >= $1 AND created_at <= $2
                    AND items::text ILIKE '%MEMBERSHIP%' -- Simple check
                `, [shiftData.opened_at, shiftData.closed_at]);

                const membership_payments_list = membershipsFromSales.rows.map(row => {
                    let months = 1;
                    try {
                        const items = JSON.parse(row.items);
                        const memItem = items.find(i => i.type === 'MEMBERSHIP');
                        if (memItem && memItem.name.includes('meses')) {
                            // Extract number from "Mensualidad (X meses)"
                            const match = memItem.name.match(/\((\d+) meses\)/);
                            if (match) months = match[1];
                        }
                    } catch (e) { }
                    return { full_name: row.full_name, amount: row.amount, months };
                });

                // C. New Registrations
                const newUsersRes = await db.query(`
                    SELECT full_name, type 
                    FROM users 
                    WHERE created_at >= $1 AND created_at <= $2
                `, [shiftData.opened_at, shiftData.closed_at]);


                // Send Email Async
                sendShiftCloseReport({
                    ...shiftData,
                    total_sales_cash: r.total_sales_cash,
                    total_sales_debit: r.total_sales_debit,
                    total_sales_transfer: r.total_sales_transfer,
                    total_expenses: expenses_total,
                    system_cash: final_cash_system,
                    final_cash_declared: final_cash_declared,
                    notes: notes,
                    debtors_list: debtorsRes.rows,
                    membership_payments_list: membership_payments_list,
                    new_members_list: newUsersRes.rows
                }).catch(err => console.error('Email Fail:', err));
            }

            res.json({ success: true });
        } catch (err) {
            console.error('Close Shift Error:', err);
            res.status(500).json({ error: 'Error closing shift' });
        }
    });

    // Add Expense
    app.post('/api/expenses', async (req, res) => {
        const { shift_id, amount, description, created_by } = req.body;
        try {
            await db.query(`
                INSERT INTO expenses (shift_id, amount, description, created_by)
                VALUES ($1, $2, $3, $4)
            `, [shift_id, amount, description, created_by]);

            // Update shift total expenses cache (optional, but good for quick lookup)
            await db.query('UPDATE shifts SET expenses_total = expenses_total + $1 WHERE id = $2', [amount, shift_id]);

            res.json({ success: true });
        } catch (err) {
            console.error('Add Expense Error:', err);
            res.status(500).json({ error: 'Error adding expense' });
        }
    });

    // Register Debt Payment (Existing - Keeping reference)
    app.post('/api/users/:id/pay', async (req, res) => {
        const { id } = req.params;
        const { amount, method } = req.body;

        try {
            await db.query('BEGIN');

            // 1. Get current user debt
            const userRes = await db.query('SELECT current_debt, full_name FROM users WHERE id = $1', [id]);
            if (userRes.rows.length === 0) {
                await db.query('ROLLBACK');
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }
            const user = userRes.rows[0];

            // 2. Register "Sale" as Payment (positive total, method as chosen)
            // We use a special flag or just a product line item
            const saleQuery = `
                INSERT INTO sales (total, method, items, user_id, user_name, payment_status, created_at)
                VALUES ($1, $2, $3, $4, $5, 'PAID', NOW())
                RETURNING id
            `;
            const paymentItem = [{
                id: 'PAYMENT',
                name: 'Abono Deuda',
                price: parseFloat(amount),
                quantity: 1
            }];
            await db.query(saleQuery, [amount, method, JSON.stringify(paymentItem), id, user.full_name]);

            // 3. Reduce Debt
            await db.query('UPDATE users SET current_debt = current_debt - $1 WHERE id = $2', [amount, id]);

            await db.query('COMMIT');
            res.json({ success: true, new_debt: parseFloat(user.current_debt) - parseFloat(amount) });

        } catch (err) {
            await db.query('ROLLBACK');
            console.error('Payment Error:', err);
            res.status(500).json({ error: 'Error al procesar pago' });
        }
    });

    // TABLES Routes
    app.get('/api/tables', async (req, res) => {
        try {
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
            const result = await db.query(query);
            res.json(result.rows);
        } catch (err) {
            console.error('Get Tables Error:', err);
            res.status(500).json({ error: 'Error al obtener mesas: ' + err.message });
        }
    });

    app.post('/api/tables', async (req, res) => {
        const { name, type } = req.body;
        try {
            const result = await db.query(
                "INSERT INTO tables (name, type, status) VALUES ($1, $2, 'AVAILABLE') RETURNING *",
                [name, type]
            );
            res.status(201).json(result.rows[0]);
        } catch (err) {
            console.error('Create Table Error:', err);
            if (err.code === '23505') {
                return res.status(409).json({ error: 'Ya existe una mesa con ese nombre' });
            }
            res.status(500).json({ error: 'Error al crear mesa: ' + err.message });
        }
    });

    app.put('/api/tables/:id', async (req, res) => {
        const { id } = req.params;
        const { name, type } = req.body;
        try {
            const result = await db.query(
                "UPDATE tables SET name = $1, type = $2 WHERE id = $3 RETURNING *",
                [name, type, id]
            );
            if (result.rows.length === 0) return res.status(404).json({ error: 'Mesa no encontrada' });
            res.json(result.rows[0]);
        } catch (err) {
            console.error('Update Table Error:', err);
            if (err.code === '23505') {
                return res.status(409).json({ error: 'Ya existe una mesa con ese nombre' });
            }
            res.status(500).json({ error: 'Error al actualizar mesa: ' + err.message });
        }
    });

    app.delete('/api/tables/:id', async (req, res) => {
        const { id } = req.params;
        try {
            const check = await db.query("SELECT status FROM tables WHERE id = $1", [id]);
            if (check.rows.length === 0) return res.status(404).json({ error: 'Mesa no encontrada' });
            if (check.rows[0].status === 'OCCUPIED') return res.status(400).json({ error: 'No se puede eliminar una mesa ocupada' });

            await db.query("DELETE FROM tables WHERE id = $1", [id]);
            res.json({ success: true });
        } catch (err) {
            console.error('Delete Table Error:', err);
            res.status(500).json({ error: 'Error al eliminar mesa' });
        }
    });

    // Start Session
    app.post('/api/sessions/start', async (req, res) => {
        const { table_id, players } = req.body;

        try {
            await db.query('BEGIN');

            const tableRes = await db.query("SELECT type FROM tables WHERE id = $1", [table_id]);
            if (tableRes.rows.length === 0) throw new Error('Mesa no encontrada');
            const tableType = tableRes.rows[0].type;

            if (tableType === 'CARDS') {
                if (!players || !Array.isArray(players) || players.length < 2) {
                    throw new Error('Las mesas de cartas requieren mínimo 2 jugadores');
                }
            }

            // 1. Create Session
            const playersWithTime = players ? players.map(p => ({ ...p, startAt: new Date() })) : [];
            const sessionRes = await db.query(`
                INSERT INTO sessions (table_id, type, status, players, is_training)
                VALUES ($1, $2, 'ACTIVE', $3, $4)
                RETURNING id
            `, [table_id, tableType, JSON.stringify(playersWithTime), !!req.body.is_training]);
            const sessionId = sessionRes.rows[0].id;

            // 2. Initialize Session Players for CARDS
            if (tableType === 'CARDS') {
                for (const p of players) {
                    // Get rate snapshot
                    let uRes = await db.query('SELECT type FROM users WHERE id = $1', [p.id]);
                    let uType = uRes.rows.length > 0 ? uRes.rows[0].type : 'CLIENTE';

                    // Get Rate
                    let rateRes = await db.query("SELECT * FROM products WHERE name ILIKE 'Hora de Juego' LIMIT 1");
                    let rate = 4000;
                    if (rateRes.rows.length > 0) rate = (uType === 'SOCIO' || uType === 'FUNDADOR') ? parseFloat(rateRes.rows[0].price_socio) : parseFloat(rateRes.rows[0].price_client);


                    await db.query(`
                        INSERT INTO session_players (session_id, user_id, start_time, rate)
                        VALUES ($1, $2, NOW(), $3)
                    `, [sessionId, p.id, rate]);
                }
            }

            // 3. Update Table
            await db.query(`
                UPDATE tables 
                SET status = 'OCCUPIED', current_session_id = $1 
                WHERE id = $2
            `, [sessionId, table_id]);

            await db.query('COMMIT');
            res.json({ success: true, sessionId });
        } catch (err) {
            await db.query('ROLLBACK');
            console.error('Start Session Error:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // Add Player to Session (Cards)
    app.post('/api/sessions/:id/players', async (req, res) => {
        const { id } = req.params;
        const { user_id, full_name, full_nameShort } = req.body; // Player info object

        try {
            await db.query('BEGIN');

            // Get rate
            let uRes = await db.query('SELECT type FROM users WHERE id = $1', [user_id]);
            let uType = uRes.rows.length > 0 ? uRes.rows[0].type : 'CLIENTE';
            let rateRes = await db.query("SELECT * FROM products WHERE name ILIKE 'Hora de Juego' LIMIT 1");
            let rate = 4000;
            if (rateRes.rows.length > 0) rate = (uType === 'SOCIO' || uType === 'FUNDADOR') ? parseFloat(rateRes.rows[0].price_socio) : parseFloat(rateRes.rows[0].price_client);

            await db.query(`
                INSERT INTO session_players (session_id, user_id, start_time, rate)
                VALUES ($1, $2, NOW(), $3)
            `, [id, user_id, rate]);

            // Update session players JSON for UI sync
            const sessionRes = await db.query('SELECT players FROM sessions WHERE id = $1', [id]);
            let currentPlayers = sessionRes.rows[0].players || [];
            if (typeof currentPlayers === 'string') currentPlayers = JSON.parse(currentPlayers);

            currentPlayers.push({ id: user_id, full_name, full_nameShort, startAt: new Date() });

            await db.query('UPDATE sessions SET players = $1 WHERE id = $2', [JSON.stringify(currentPlayers), id]);

            await db.query('COMMIT');
            res.json({ success: true });
        } catch (err) {
            await db.query('ROLLBACK');
            res.status(500).json({ error: err.message });
        }
    });

    // End Player Turn (Cards)
    // End Player Turn (Cards) - CHARGE & REMOVE
    app.post('/api/sessions/:id/players/:userId/end', async (req, res) => {
        const { id, userId } = req.params;
        try {
            await db.query('BEGIN');

            // 1. Get Player Info & Rate
            let player = null;
            let pRes = await db.query('SELECT * FROM session_players WHERE session_id = $1 AND user_id = $2 AND end_time IS NULL', [id, userId]);

            if (pRes.rows.length === 0) {
                // FALLBACK FOR LEGACY SESSIONS (Started before session_players population)
                const sRes = await db.query('SELECT players FROM sessions WHERE id = $1', [id]);
                let foundInJson = false;
                if (sRes.rows.length > 0) {
                    let playersArr = sRes.rows[0].players || [];
                    if (typeof playersArr === 'string') playersArr = JSON.parse(playersArr);
                    const pJson = playersArr.find(p => p.id == userId);
                    if (pJson && !pJson.endedAt) {
                        // FOUND in JSON but not in SQL -> Legacy Mode
                        player = {
                            id: null, // No SQL ID
                            start_time: pJson.startAt || new Date(), // Use JSON start time
                            rate: 2000 // Default Rate if unknown
                            // We should probably fetch the rate? But for legacy fallback, a default or current rate is safer than crashing.
                        };
                        // Fetch current rate to be nicer
                        const rateRes = await db.query('SELECT price_client FROM products WHERE name ILIKE \'%hora de juego%\' LIMIT 1');
                        if (rateRes.rows.length > 0) player.rate = rateRes.rows[0].price_client;
                        foundInJson = true;
                    }
                }

                if (!foundInJson) {
                    await db.query('ROLLBACK');
                    // Check if already ended
                    const checkEnded = await db.query('SELECT * FROM session_players WHERE session_id = $1 AND user_id = $2', [id, userId]);
                    if (checkEnded.rows.length > 0) return res.status(400).json({ error: 'Jugador ya finalizado' });
                    return res.status(404).json({ error: 'Jugador no activo en esta sesión' });
                }
            } else {
                player = pRes.rows[0];
                // 2. Set End Time & Charged Flag (Only if SQL record exists)
                await db.query(`UPDATE session_players SET end_time = NOW(), charged = true WHERE id = $1`, [player.id]);
            }

            // 3. Calculate Cost
            const endTime = new Date();
            const startTime = new Date(player.start_time);
            const durationMs = endTime - startTime;
            const durationHours = durationMs / (1000 * 60 * 60);
            const cost = Math.ceil(durationHours * parseFloat(player.rate));

            // 4. Create Sale Record (Charged to Account)
            const uRes = await db.query('SELECT full_name FROM users WHERE id = $1', [userId]);
            const pName = uRes.rows[0]?.full_name || 'Jugador';

            const salesItems = [{
                type: 'TIME',
                quantity: 1,
                price: cost,
                name: `Tiempo ${pName} (${Math.floor(durationHours * 60)} min) - Salida Anticipada`
            }];

            await db.query(`
                INSERT INTO sales (session_id, items, total, method, created_at, user_id, payment_status)
                VALUES ($1, $2, $3, 'ACCOUNT', CURRENT_TIMESTAMP, $4, 'PENDING')
            `, [id, JSON.stringify(salesItems), cost, userId]);

            // 5. Update User Debt
            await db.query('UPDATE users SET current_debt = COALESCE(current_debt, 0) + $1 WHERE id = $2', [cost, userId]);

            // 6. Update JSON in Sessions table: REMOVE the player completely
            const sRes = await db.query('SELECT players FROM sessions WHERE id = $1', [id]);
            if (sRes.rows.length > 0) {
                let playersArr = sRes.rows[0].players || [];
                if (typeof playersArr === 'string') playersArr = JSON.parse(playersArr);

                // Filter out the ended player to REMOVE them from UI
                const newPlayersArr = playersArr.filter(p => p.id != userId);
                await db.query('UPDATE sessions SET players = $1 WHERE id = $2', [JSON.stringify(newPlayersArr), id]);
            }



            await db.query('COMMIT');
            res.json({ success: true, cost });
        } catch (err) {
            await db.query('ROLLBACK');
            console.error('End Player Error:', err);
            res.status(500).json({ error: err.message });
        }
    });

    // End Session (Close Table)
    app.post('/api/sessions/end', async (req, res) => {
        const { table_id, paymentMethod, payerId, payments, type } = req.body;
        // type: 'SINGLE' or 'SPLIT'
        // payments: Array of { payerId, percentage, method } (Only if type === 'SPLIT')

        try {
            await db.query('BEGIN');

            // 1. Get Session Info & Rates
            const tableRes = await db.query(`
                SELECT t.current_session_id, t.type as table_type, s.start_time, s.players 
                FROM tables t 
                JOIN sessions s ON t.current_session_id = s.id 
                WHERE t.id = $1
            `, [table_id]);

            if (tableRes.rows.length === 0 || !tableRes.rows[0].current_session_id) {
                throw new Error('No active session found');
            }

            const { current_session_id: sessionId, start_time, table_type, players } = tableRes.rows[0];

            let finalTotalAmount = 0;
            let salesItems = [];

            // 2. Calculate Consumption Total
            const itemsRes = await db.query('SELECT * FROM session_items WHERE session_id = $1', [sessionId]);
            const totalConsumption = itemsRes.rows.reduce((sum, item) => sum + (parseFloat(item.price) * item.quantity), 0);

            let hourlyRateClient = 4000;
            let hourlyRateSocio = 4000;
            let durationHours = 0;

            if (table_type === 'CARDS') {
                // CARDS LOGIC: Sum individual player times

                // Close any open players
                await db.query(`UPDATE session_players SET end_time = NOW() WHERE session_id = $1 AND end_time IS NULL`, [sessionId]);

                // Select ONLY those not yet charged
                const playersRes = await db.query('SELECT * FROM session_players WHERE session_id = $1 AND (charged IS NULL OR charged = false)', [sessionId]);

                let totalTimeCost = 0;

                for (const p of playersRes.rows) {
                    const pStart = new Date(p.start_time);
                    const pEnd = new Date(p.end_time);
                    const durationMs = pEnd - pStart;
                    const pxHours = durationMs / (1000 * 60 * 60);
                    const pCost = Math.ceil(pxHours * parseFloat(p.rate));

                    totalTimeCost += pCost;

                    let pName = 'Jugador';
                    if (p.user_id) {
                        const uRes = await db.query('SELECT full_name FROM users WHERE id = $1', [p.user_id]);
                        if (uRes.rows.length > 0) pName = uRes.rows[0].full_name;
                    }

                    salesItems.push({
                        type: 'TIME',
                        quantity: 1,
                        price: pCost,
                        name: `Tiempo ${pName} (${Math.floor(pxHours * 60)} min)`
                    });
                }

                // Consumption items
                itemsRes.rows.forEach(i => {
                    salesItems.push({
                        type: 'PRODUCT',
                        quantity: i.quantity,
                        price: parseFloat(i.price),
                        name: i.product_name,
                        id: i.product_id
                    });
                });

                finalTotalAmount = totalTimeCost + totalConsumption;

            } else {
                // POOL LOGIC (Legacy)
                // Get Hourly Rate Product (Create if not exists default to $4000)
                let rateRes = await db.query("SELECT * FROM products WHERE name ILIKE 'Hora de Juego' LIMIT 1");
                // hourlyRateClient and hourlyRateSocio already initialized to 4000

                if (rateRes.rows.length > 0) {
                    hourlyRateClient = parseFloat(rateRes.rows[0].price_client);
                    hourlyRateSocio = parseFloat(rateRes.rows[0].price_socio);
                }

                const endTime = new Date();
                const startTime = new Date(start_time);
                const durationMs = endTime - startTime;
                durationHours = durationMs / (1000 * 60 * 60);

                let rateToUse = hourlyRateClient;
                let payerType = 'CLIENTE';

                if (payerId) {
                    const uRes = await db.query('SELECT type FROM users WHERE id = $1', [payerId]);
                    if (uRes.rows.length > 0) payerType = uRes.rows[0].type;
                }

                if (payerType === 'SOCIO') rateToUse = hourlyRateSocio;

                const timeCost = Math.ceil(durationHours * rateToUse);
                finalTotalAmount = timeCost + totalConsumption;

                salesItems.push({ type: 'TIME', quantity: 1, price: timeCost, name: `Tiempo de Juego (${Math.floor(durationHours * 60)} min)` });
                itemsRes.rows.forEach(i => {
                    salesItems.push({
                        type: 'PRODUCT',
                        quantity: i.quantity,
                        price: parseFloat(i.price),
                        name: i.product_name,
                        id: i.product_id
                    });
                });
            }

            let processedPayments = []; // To store created legacy sales records or just track totals

            // 3. Process Payments
            if (type === 'SPLIT' && Array.isArray(payments) && payments.length > 0) {
                // SPLIT PAYMENT BY PERCENTAGE

                // Helper to check user type
                const getUserType = async (uid) => {
                    if (!uid) return 'CLIENTE'; // Anonymous is Client
                    const uRes = await db.query('SELECT type FROM users WHERE id = $1', [uid]);
                    return uRes.rows.length > 0 ? uRes.rows[0].type : 'CLIENTE';
                };

                for (const p of payments) {
                    const payerType = await getUserType(p.payerId);
                    const rateToUse = payerType === 'SOCIO' ? hourlyRateSocio : hourlyRateClient;

                    // Calculate strict costs for this payer
                    const timeCost = Math.ceil(durationHours * (p.percentage / 100) * rateToUse);
                    const consumptionCost = Math.ceil(totalConsumption * (p.percentage / 100));
                    const totalPayer = timeCost + consumptionCost;

                    finalTotalAmount += totalPayer;

                    // Handle Debt (Account)
                    const paymentStatus = p.method === 'ACCOUNT' ? 'PENDING' : 'PAID';
                    if (p.method === 'ACCOUNT') {
                        if (!p.payerId) throw new Error('Usuario requerido para cargar a cuenta');
                        await db.query('UPDATE users SET current_debt = COALESCE(current_debt, 0) + $1 WHERE id = $2', [totalPayer, p.payerId]);
                    }

                    // Create Sale Record
                    const salesItems = [
                        { type: 'TIME', quantity: 1, price: timeCost, name: `Tiempo de Juego (${p.percentage}%)` },
                        { type: 'CONSUMPTION_SHARE', quantity: 1, price: consumptionCost, name: `Consumo (${p.percentage}%)` }
                    ];

                    await db.query(`
                        INSERT INTO sales (session_id, items, total, method, created_at, user_id, payment_status)
                        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6)
                    `, [sessionId, JSON.stringify(salesItems), totalPayer, p.method, p.payerId || null, paymentStatus]);
                }

            } else {
                // SINGLE PAYMENT
                // Use finalTotalAmount and salesItems calculated in CARDS or POOL logic above.

                const paymentStatus = paymentMethod === 'ACCOUNT' ? 'PENDING' : 'PAID';

                if (paymentMethod === 'ACCOUNT') {
                    if (!payerId) {
                        await db.query('ROLLBACK');
                        return res.status(400).json({ error: 'Debe seleccionar un cliente para Cargar a Cuenta' });
                    }
                    await db.query('UPDATE users SET current_debt = COALESCE(current_debt, 0) + $1 WHERE id = $2', [finalTotalAmount, payerId]);
                }

                await db.query(`
                    INSERT INTO sales (session_id, items, total, method, created_at, user_id, payment_status)
                    VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6)
                `, [sessionId, JSON.stringify(salesItems), finalTotalAmount, paymentMethod || 'CASH', payerId || null, paymentStatus]);
            }


            // 4. Update Session & Table
            await db.query(`
                UPDATE sessions 
                SET status = 'CLOSED', 
                    end_time = CURRENT_TIMESTAMP, 
                    total_amount = $1 
                WHERE id = $2
            `, [finalTotalAmount, sessionId]);

            await db.query('UPDATE tables SET status = \'AVAILABLE\', current_session_id = NULL WHERE id = $1', [table_id]);

            await db.query('COMMIT');
            res.json({ success: true, total: finalTotalAmount });
        } catch (err) {
            await db.query('ROLLBACK');
            console.error('End Session Error:', err);
            res.status(500).json({ error: 'Error al cerrar sesión', details: err.message });
        }
    });

    // DIRECT SALES (Mostrador)
    app.post('/api/sales/direct', async (req, res) => {
        const { items, total, method, user_id, user_name } = req.body;

        try {
            await db.query('BEGIN');

            const paymentStatus = method === 'ACCOUNT' ? 'PENDING' : 'PAID';

            // Check Credit Limit (if payment is ACCOUNT)
            if (method === 'ACCOUNT') {
                if (!user_id) throw new Error('Usuario requerido para cargar a cuenta');

                const userRes = await db.query('SELECT credit_limit, current_debt FROM users WHERE id = $1', [user_id]);
                const user = userRes.rows[0];

                // We removed the strict credit limit check per user request.
                // It just accumulates debt now.

                // Update Debt
                await db.query('UPDATE users SET current_debt = COALESCE(current_debt, 0) + $1 WHERE id = $2', [total, user_id]);
            }

            await db.query(`
                INSERT INTO sales (items, total, method, created_at, session_id, user_id, user_name, payment_status)
                VALUES ($1, $2, $3, CURRENT_TIMESTAMP, NULL, $4, $5, $6)
            `, [JSON.stringify(items), total, method || 'CASH', user_id || null, user_name || null, paymentStatus]);

            // Update Stock for each item
            for (const item of items) {
                if (item.id) { // Only update if product has an ID (custom items might not)
                    const prod = await db.query('SELECT stock_control, stock FROM products WHERE id = $1', [item.id]);
                    if (prod.rows.length > 0) {
                        const { stock_control, stock } = prod.rows[0];
                        if (stock_control) {
                            if (stock < item.quantity) {
                                await db.query('ROLLBACK');
                                return res.status(400).json({ error: `Stock insuficiente para ${item.name}` });
                            }
                            await db.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [item.quantity, item.id]);
                        }
                    }
                }
            }

            await db.query('COMMIT');
            res.json({ success: true });
        } catch (err) {
            await db.query('ROLLBACK'); // Ensure rollback on logic error (like credit exceeded)
            console.error('Direct Sale Error:', err);
            res.status(500).json({ error: err.message || 'Error al procesar venta' });
        }
    });

    // SESSION ITEMS (Orders)
    app.get('/api/sessions/:id/items', async (req, res) => {
        try {
            const { id } = req.params;
            const result = await db.query('SELECT * FROM session_items WHERE session_id = $1 ORDER BY created_at DESC', [id]);
            res.json(result.rows);
        } catch (err) {
            console.error('Get Items Error:', err);
            res.status(500).json({ error: 'Error' });
        }
    });

    app.post('/api/sessions/:id/items', async (req, res) => {
        try {
            const { id } = req.params; // session_id
            const { product_id, product_name, price, quantity, assigned_to, assigned_name } = req.body;

            await db.query('BEGIN');

            await db.query(`
                INSERT INTO session_items (session_id, product_id, product_name, price, quantity, assigned_to, assigned_name)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
            `, [id, product_id, product_name, price, quantity || 1, assigned_to || null, assigned_name || null]);

            // Update Stock
            // Update Stock
            const prod = await db.query('SELECT stock_control, stock FROM products WHERE id = $1', [product_id]);
            if (prod.rows.length > 0) {
                const { stock_control, stock } = prod.rows[0];
                if (stock_control) {
                    if (stock < (quantity || 1)) {
                        await db.query('ROLLBACK');
                        return res.status(400).json({ error: `Stock insuficiente` });
                    }
                    await db.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [quantity || 1, product_id]);
                }
            }

            await db.query('COMMIT');
            res.json({ success: true });
        } catch (err) {
            await db.query('ROLLBACK');
            console.error('Add Item Error:', err);
            res.status(500).json({ error: 'Error agregando producto: ' + err.message, details: err });
        }
    });

    // PRODUCTS Routes
    app.get('/api/products', async (req, res) => {
        try {
            const result = await db.query('SELECT * FROM products ORDER BY name ASC');
            res.json(result.rows);
        } catch (err) {
            console.error('Get Products Error:', err);
            res.status(500).json({ error: 'Error al obtener productos' });
        }
    });

    app.post('/api/products', async (req, res) => {
        try {
            const { name, price_socio, price_client, stock, category, stock_control } = req.body;
            const result = await db.query(
                'INSERT INTO products (name, price_socio, price_client, stock, category, stock_control) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
                [name, price_socio, price_client, stock || 0, category, stock_control !== undefined ? stock_control : true]
            );
            res.status(201).json(result.rows[0]);
        } catch (err) {
            console.error('Create Product Error:', err);
            res.status(500).json({ error: 'Error al crear producto' });
        }
    });

    app.post('/api/products/:id/stock', async (req, res) => {
        try {
            const { id } = req.params;
            const { amount, type, reference_doc, provider, user_id } = req.body;
            // type: 'PURCHASE', 'ADJUSTMENT'

            await db.query('BEGIN');

            // 1. Get current stock
            const prodRes = await db.query('SELECT stock FROM products WHERE id = $1', [id]);
            if (prodRes.rows.length === 0) {
                await db.query('ROLLBACK');
                return res.status(404).json({ error: 'Producto no encontrado' });
            }
            const currentStock = prodRes.rows[0].stock;
            const newStock = currentStock + parseInt(amount);

            // 2. Update Product
            await db.query('UPDATE products SET stock = $1 WHERE id = $2', [newStock, id]);

            // 3. Log History
            await db.query(`
            INSERT INTO stock_history (product_id, change_amount, previous_stock, new_stock, type, reference_doc, provider, created_by, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP)
        `, [id, amount, currentStock, newStock, type || 'ADJUSTMENT', reference_doc, provider, user_id]);

            await db.query('COMMIT');
            res.json({ success: true, new_stock: newStock });
        } catch (err) {
            await db.query('ROLLBACK');
            console.error('Add Stock Error:', err);
            res.status(500).json({ error: 'Error al agregar stock' });
        }
    });

    app.get('/api/products/:id/stock', async (req, res) => {
        try {
            const { id } = req.params;
            const result = await db.query(`
            SELECT h.*, u.full_name as created_by_name 
            FROM stock_history h
            LEFT JOIN users u ON h.created_by = u.id
            WHERE h.product_id = $1 
            ORDER BY h.created_at DESC
        `, [id]);
            res.json(result.rows);
        } catch (err) {
            console.error('Get Stock History Error:', err);
            res.status(500).json({ error: 'Error al obtener historial' });
        }
    });

    app.put('/api/products/:id', async (req, res) => {
        try {
            const { id } = req.params;
            const { name, price_socio, price_client, stock, category } = req.body;
            const query = `
                UPDATE products 
                SET name = $1, price_socio = $2, price_client = $3, stock = $4, category = $5
                WHERE id = $6
                RETURNING *
            `;
            const result = await db.query(query, [name, price_socio, price_client, stock, category, id]);
            res.json(result.rows[0]);
        } catch (err) {
            console.error('Update Product Error:', err);
            res.status(500).json({ error: 'Error al actualizar producto' });
        }
    });

    app.delete('/api/products/:id', async (req, res) => {
        try {
            const { id } = req.params;
            await db.query('DELETE FROM products WHERE id = $1', [id]);
            res.json({ success: true });
        } catch (err) {
            console.error('Delete Product Error:', err);
            res.status(500).json({ error: 'Error al eliminar producto' });
        }
    });

    // PRODUCT RETURNS & EXCHANGES

    // Return Product (Refund)
    app.post('/api/products/return', async (req, res) => {
        const { productId, quantity, reason, amount, method, userId } = req.body;
        // reason: 'WRONG' (Restock) or 'DEFECTIVE' (Loss)

        try {
            await db.query('BEGIN');

            const prodRes = await db.query('SELECT name, stock, stock_control FROM products WHERE id = $1', [productId]);
            if (prodRes.rows.length === 0) {
                await db.query('ROLLBACK');
                return res.status(404).json({ error: 'Producto no encontrado' });
            }
            const product = prodRes.rows[0];

            // 1. Handle Stock
            if (product.stock_control) {
                if (reason === 'WRONG') {
                    // Restock (It was a mistake, item is good)
                    await db.query('UPDATE products SET stock = stock + $1 WHERE id = $2', [quantity, productId]);

                    // Log History
                    await db.query(`
                        INSERT INTO stock_history (product_id, change_amount, previous_stock, new_stock, type, reference_doc, created_by, created_at)
                        VALUES ($1, $2, $3, $4, 'RETURN_RESTOCK', 'Devolución Cliente', $5, CURRENT_TIMESTAMP)
                    `, [productId, quantity, product.stock, product.stock + parseInt(quantity), userId || null]);
                } else if (reason === 'DEFECTIVE') {
                    // Defective: Stock does NOT increase (it remains "sold" from inventory perspective as it's gone/trash)
                    await db.query(`
                        INSERT INTO stock_history (product_id, change_amount, previous_stock, new_stock, type, reference_doc, created_by, created_at)
                        VALUES ($1, 0, $2, $2, 'RETURN_DEFECTIVE', 'Devolución Defectuoso', $3, CURRENT_TIMESTAMP)
                    `, [productId, product.stock, userId || null]);
                }
            }

            // 2. Financial Refund (Negative Sale)
            const refundAmount = parseFloat(amount); // Positive value passed, we make it negative for sale
            const negativeTotal = -Math.abs(refundAmount);

            const salesItems = [{
                type: 'RETURN',
                quantity: quantity,
                price: negativeTotal,
                name: `Devolución: ${product.name} (${reason === 'WRONG' ? 'Equivocación' : 'Defectuoso'})`,
                id: productId
            }];

            const paymentStatus = method === 'ACCOUNT' ? 'PENDING' : 'PAID';

            if (method === 'ACCOUNT') {
                if (!userId) {
                    await db.query('ROLLBACK');
                    return res.status(400).json({ error: 'Usuario requerido para abono a cuenta' });
                }
                // Reducing Debt
                await db.query('UPDATE users SET current_debt = current_debt + $1 WHERE id = $2', [negativeTotal, userId]);
            }

            await db.query(`
                INSERT INTO sales (items, total, method, created_at, user_id, payment_status)
                VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5)
            `, [JSON.stringify(salesItems), negativeTotal, method || 'CASH', userId || null, paymentStatus]);

            await db.query('COMMIT');
            res.json({ success: true });

        } catch (err) {
            await db.query('ROLLBACK');
            console.error('Product Return Error:', err);
            res.status(500).json({ error: 'Error al procesar devolución' });
        }
    });

    // Exchange Product (Swap)
    app.post('/api/products/exchange', async (req, res) => {
        const { returnProductId, newProductId, quantity, userId } = req.body;

        try {
            await db.query('BEGIN');

            // 1. Get Products
            const oldProdRes = await db.query('SELECT * FROM products WHERE id = $1', [returnProductId]);
            const newProdRes = await db.query('SELECT * FROM products WHERE id = $1', [newProductId]);

            if (oldProdRes.rows.length === 0 || newProdRes.rows.length === 0) {
                await db.query('ROLLBACK');
                return res.status(404).json({ error: 'Producto no encontrado' });
            }

            const oldProd = oldProdRes.rows[0];
            const newProd = newProdRes.rows[0];

            // 2. Adjust Stock
            // Return Old (Restock)
            if (oldProd.stock_control) {
                await db.query('UPDATE products SET stock = stock + $1 WHERE id = $2', [quantity, returnProductId]);
            }
            // Sell New (Deduct)
            if (newProd.stock_control) {
                if (newProd.stock < quantity) {
                    await db.query('ROLLBACK');
                    return res.status(400).json({ error: `Stock insuficiente para ${newProd.name}` });
                }
                await db.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [quantity, newProductId]);
            }

            // 3. Financials
            let userType = 'CLIENTE';
            if (userId) {
                const uRes = await db.query('SELECT type FROM users WHERE id = $1', [userId]);
                if (uRes.rows.length > 0) userType = uRes.rows[0].type;
            }

            const oldPrice = userType === 'SOCIO' ? parseFloat(oldProd.price_socio) : parseFloat(oldProd.price_client);
            const newPrice = userType === 'SOCIO' ? parseFloat(newProd.price_socio) : parseFloat(newProd.price_client);

            const diffUnit = newPrice - oldPrice;
            const totalDiff = diffUnit * quantity;

            const salesItems = [{
                type: 'EXCHANGE',
                quantity: quantity,
                price: totalDiff,
                name: `Cambio: ${oldProd.name} -> ${newProd.name}`,
                details: { oldId: returnProductId, newId: newProductId }
            }];

            await db.query(`
                INSERT INTO sales (items, total, method, created_at, user_id, payment_status)
                VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, 'PAID')
            `, [JSON.stringify(salesItems), totalDiff, 'CASH', userId || null]);

            await db.query('COMMIT');
            res.json({ success: true, difference: totalDiff });

        } catch (err) {
            await db.query('ROLLBACK');
            console.error('Product Exchange Error:', err);
            res.status(500).json({ error: 'Error al procesar cambio' });
        }
    });

    // SALES HISTORY
    app.get('/api/users/:id/sales', async (req, res) => {
        const { id } = req.params;
        try {
            const result = await db.query(`
                SELECT id, total, method, payment_status, created_at, items 
                FROM sales 
                WHERE user_id = $1 
                ORDER BY created_at DESC
            `, [id]);
            res.json(result.rows);
        } catch (err) {
            console.error('Get User Sales Error:', err);
            res.status(500).json({ error: 'Error al obtener historial de compras' });
        }
    });

    // WAITING LIST Routes
    app.get('/api/waiting-list', async (req, res) => {
        try {
            const result = await db.query(`
                SELECT w.*, u.full_name 
                FROM waiting_list w
                JOIN users u ON w.user_id = u.id
                WHERE w.status = 'WAITING'
                ORDER BY w.created_at ASC
            `);
            res.json(result.rows);
        } catch (err) {
            console.error('Get Waiting List Error:', err);
            res.status(500).json({ error: 'Error al obtener lista de espera' });
        }
    });

    app.post('/api/waiting-list', async (req, res) => {
        const { user_id, game_type } = req.body;
        try {
            // Check if already waiting?
            const check = await db.query("SELECT id FROM waiting_list WHERE user_id = $1 AND status = 'WAITING'", [user_id]);
            if (check.rows.length > 0) return res.status(400).json({ error: 'El usuario ya está en lista de espera' });

            const result = await db.query(
                "INSERT INTO waiting_list (user_id, game_type) VALUES ($1, $2) RETURNING *",
                [user_id, game_type]
            );
            res.status(201).json(result.rows[0]);
        } catch (err) {
            console.error('Add to Waiting List Error:', err);
            res.status(500).json({ error: 'Error al agregar a lista de espera' });
        }
    });

    app.delete('/api/waiting-list/:id', async (req, res) => {
        const { id } = req.params;
        try {
            await db.query("UPDATE waiting_list SET status = 'CANCELLED' WHERE id = $1", [id]);
            res.json({ success: true });
        } catch (err) {
            console.error('Remove from Waiting List Error:', err);
            res.status(500).json({ error: 'Error al eliminar de lista de espera' });
        }
    });

    // Health Check
    app.get('/api/status', (req, res) => {
        res.json({ status: 'online', time: new Date() });
    });

    const server = app.listen(port, '0.0.0.0', () => {
        console.log(`[API] Server listening on port ${port}`);
    });


    // Membership Payment
    app.post('/api/members/:id/pay-membership', async (req, res) => {
        const { id } = req.params;
        const { amount, months, method } = req.body;

        const client = await db.pool.connect();

        try {
            await client.query('BEGIN');

            // 1. Get Current User Info
            const userRes = await client.query('SELECT membership_expires_at FROM users WHERE id = $1', [id]);
            if (userRes.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            const currentExpireDate = userRes.rows[0].membership_expires_at ? new Date(userRes.rows[0].membership_expires_at) : new Date();
            const now = new Date();

            // 2. Calculate New Expiration Date
            // If current date is in future, add to it. If in past, start from NOW.
            let baseDate = currentExpireDate > now ? currentExpireDate : now;
            let newExpireDate = new Date(baseDate);
            newExpireDate.setMonth(newExpireDate.getMonth() + parseInt(months));

            // 3. Record Payment
            await client.query(`
                INSERT INTO membership_payments (user_id, amount, months, method, created_by)
                VALUES ($1, $2, $3, $4, $5)
            `, [id, amount, months, method, null]); // TODO: Pass admin ID if available in request

            // 4. Update User
            await client.query(`
                UPDATE users 
                SET membership_expires_at = $1, status = 'ACTIVE'
                WHERE id = $2
            `, [newExpireDate, id]);

            await client.query('COMMIT');
            res.json({ success: true, new_expires_at: newExpireDate });

        } catch (err) {
            await client.query('ROLLBACK');
            console.error('Membership Payment Error:', err);
            res.status(500).json({ error: 'Error al procesar pago de membresía' });
        } finally {
            client.release();
        }
    });

    // SYSTEM RESET (Admin Only)
    app.post('/api/admin/reset-transactions', async (req, res) => {
        const { adminName } = req.body;

        // Security Check
        const ALLOWED_ADMIN = 'Rodrigo Enrique Zúñiga Lobos';
        if (adminName !== ALLOWED_ADMIN) {
            return res.status(403).json({ error: 'No autorizado para realizar esta acción.' });
        }

        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Truncate Transaction Tables
            await client.query('TRUNCATE sales, sessions, session_items, session_players, membership_payments, waiting_list RESTART IDENTITY CASCADE');

            // 2. Reset User Debts
            await client.query('UPDATE users SET current_debt = 0');

            // 3. Reset Tables Status
            await client.query("UPDATE tables SET status = 'AVAILABLE', current_session_id = NULL");

            await client.query('COMMIT');
            console.log(`[SYSTEM RESET] System reset performed by ${adminName}`);
            res.json({ success: true, message: 'Sistema restablecido correctamente.' });

        } catch (err) {
            await client.query('ROLLBACK');
            console.error('System Reset Error:', err);
            res.status(500).json({ error: 'Error crítico al restablecer el sistema.' });
        } finally {
            client.release();
        }
    });

    return server;
}

module.exports = { createServer };
