const { checkDebts } = require('../electron/debt-monitor.cjs');
const { calculatePrice } = require('../electron/pricing.cjs');
const db = require('../db/connection.cjs');
const crypto = require('crypto');

async function runScenario() {
    console.log('--- EMPEZANDO ESCENARIO DE PRUEBA: MOROSIDAD ---');

    // 1. Crear Usuario Socio
    const testRut = '99.999.999-9';
    const testName = 'Juan Perez Moroso';

    console.log(`1. Creando usuario/reseteando: ${testName}`);
    await db.query('DELETE FROM users WHERE rut = $1', [testRut]);

    const insertRes = await db.query(`
        INSERT INTO users (rut, full_name, role, type, status, last_payment_date, debt_status)
        VALUES ($1, $2, 'USER', 'SOCIO', 'ACTIVE', CURRENT_DATE - INTERVAL '60 days', FALSE)
        RETURNING *
    `, [testRut, testName]); // Set payment date to 60 days ago

    let user = insertRes.rows[0];
    console.log(`   Usuario creado. Tipo: ${user.type}, Estado Deuda: ${user.debt_status}, Ultimo Pago: ${user.last_payment_date}`);

    // 2. Probar Precio ANTES del check (Debería ser SOCIO)
    let product = { name: 'Hora Billar', price_socio: 5000, price_client: 8000 };
    let price = calculatePrice(product, user);
    console.log(`2. Precio preliminar (Deuda FALSE): $${price} (Esperado: $5000)`);

    // 3. Ejecutar Monitor de Deuda
    console.log('3. Ejecutando Monitor de Deuda...');
    await checkDebts();

    // 4. Refrescar Usuario
    const refreshRes = await db.query('SELECT * FROM users WHERE rut = $1', [testRut]);
    user = refreshRes.rows[0];
    console.log(`   Estado Actualizado. Deuda: ${user.debt_status}`);

    // 5. Probar Precio DESPUES del check (Debería ser CLIENTE por Castigo)
    price = calculatePrice(product, user);
    console.log(`5. Precio FINAL (Deuda TRUE): $${price} (Esperado: $8000)`);

    if (price === 8000 && user.debt_status === true) {
        console.log('✅ PRUEBA EXITOSA: El sistema detectó la morosidad y aplicó el precio de castigo.');
    } else {
        console.log('❌ PRUEBA FALLIDA: Revisar lógica.');
    }

    process.exit(0);
}

runScenario();
