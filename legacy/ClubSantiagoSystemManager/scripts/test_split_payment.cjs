const { createServer } = require('../electron/api.cjs');
const db = require('../db/connection.cjs');

async function testSplitPayment() {
    try {
        // 1. Get an active session (or create one)
        const tables = await db.query("SELECT * FROM tables WHERE status = 'OCCUPIED' LIMIT 1");
        if (tables.rows.length === 0) {
            console.log("No occupied tables found. Please start a session first.");
            process.exit(0);
        }
        const table = tables.rows[0];
        console.log("Testing with Table:", table.name, "ID:", table.id);

        // 2. Get two users for split
        const users = await db.query("SELECT id FROM users LIMIT 2");
        if (users.rows.length < 2) {
            console.log("Not enough users.");
            process.exit(0);
        }
        const u1 = users.rows[0].id;
        const u2 = users.rows[1].id;

        // 3. Mock Payload
        const payload = {
            table_id: table.id,
            type: 'SPLIT',
            payments: [
                { payerId: u1, percentage: 50, method: 'ACCOUNT' },
                { payerId: u2, percentage: 50, method: 'ACCOUNT' }
            ]
        };

        console.log("Payload:", JSON.stringify(payload, null, 2));

        // 4. Call API logic directly (bypass Express for quick check logic, or use fetch)
        // Since we are node, let's just use fetch if server is running, or simulate DB calls.

        // Simulating the DB transaction part from api.cjs to see if it fails
        // We can't easily import the route handler. 
        // Better to use fetch against the running server.

        const res = await fetch('http://localhost:3000/api/sessions/end', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        console.log("Response Status:", res.status);
        console.log("Response Data:", data);

    } catch (err) {
        console.error("Test Error:", err);
    } finally {
        // db.pool.end(); // Don't close if server is running separately? 
        // Actually, if we require db connection, we are creating a new pool in this process.
        // We should close it.
        // process.exit(0);
    }
}

testSplitPayment();
