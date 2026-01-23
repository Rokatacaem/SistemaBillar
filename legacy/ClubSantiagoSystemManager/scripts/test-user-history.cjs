const http = require('http');

// Helper
function request(method, path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: { 'Content-Type': 'application/json' },
        };
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, body: data });
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function runTests() {
    console.log('--- STARTING USER HISTORY TEST ---');

    // 1. Get Users
    console.log('Fetching Users...');
    const usersRes = await request('GET', '/api/users');
    if (usersRes.status !== 200 || !usersRes.body.length) {
        console.error('Failed to users');
        return;
    }
    const user = usersRes.body[0]; // Just pick first user
    console.log(`Testing with User: ${user.full_name} (ID: ${user.id})`);

    // 2. Get Sales History
    console.log(`Fetching Sales for User ${user.id}...`);
    const salesRes = await request('GET', `/api/users/${user.id}/sales`);

    console.log('Status:', salesRes.status);
    if (salesRes.status === 200) {
        console.log(`Found ${salesRes.body.length} sales records.`);
        if (salesRes.body.length > 0) {
            console.log('First Record Sample:', JSON.stringify(salesRes.body[0], null, 2));
        }
    } else {
        console.log('Error Body:', salesRes.body);
    }
}

runTests().catch(console.error);
