const http = require('http');

// Helper to make requests
function request(method, path, body) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 3000, // Assuming default port
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
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

        req.on('error', (e) => reject(e));
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function runTests() {
    console.log('--- STARTING RETURN/EXCHANGE TESTS ---');

    console.log('\n1. Fetching Products...');
    const productsRes = await request('GET', '/api/products');
    if (productsRes.status !== 200 || !productsRes.body.length) {
        console.error('Failed to fetch products or empty list');
        return;
    }
    const productA = productsRes.body[0];
    const productB = productsRes.body[1] || productsRes.body[0];
    console.log(`Using Product A: ${productA.name} (Stock: ${productA.stock}, ID: ${productA.id})`);
    console.log(`Using Product B: ${productB.name} (Stock: ${productB.stock}, ID: ${productB.id})`);

    // TEST 1: Return WRONG (Stock should increase)
    console.log('\n2. Testing Return (WRONG/Restock)...');
    const returnBody = {
        productId: productA.id,
        quantity: 1,
        reason: 'WRONG',
        amount: parseFloat(productA.price_client),
        method: 'CASH'
    };
    const res1 = await request('POST', '/api/products/return', returnBody);
    console.log('Return Result:', res1.status, res1.body);

    const check1 = await request('GET', `/api/products`);
    const newA = check1.body.find(p => p.id === productA.id);
    console.log(`New Stock A: ${newA.stock} (Expected: ${parseInt(productA.stock) + 1})`);

    // TEST 2: Exchange (Stock A increase, Stock B decrease)
    if (productA.id !== productB.id) {
        console.log('\n3. Testing Exchange (Return A, Take B)...');
        const exchangeBody = {
            returnProductId: productA.id,
            newProductId: productB.id,
            quantity: 1
        };
        const res2 = await request('POST', '/api/products/exchange', exchangeBody);
        console.log('Exchange Result:', res2.status, res2.body);

        const check2 = await request('GET', `/api/products`);
        const finalA = check2.body.find(p => p.id === productA.id);
        const finalB = check2.body.find(p => p.id === productB.id);
        console.log(`Final Stock A: ${finalA.stock} (Expected: ${parseInt(newA.stock) + 1})`);
        console.log(`Final Stock B: ${finalB.stock} (Expected: ${parseInt(productB.stock) - 1})`);
    } else {
        console.log('\nSkipping Exchange test (Need 2 different products)');
    }

    console.log('\n--- TESTS COMPLETED ---');
}

runTests().catch(console.error);
