const { sendShiftOpenReport, sendShiftCloseReport } = require('../electron/email.cjs');
require('dotenv').config();

const mockOpenData = {
    cashier_name: 'Juan Perez',
    initial_cash: 50000,
    opened_at: new Date()
};

const mockCloseData = {
    opened_at: new Date(Date.now() - 28800000), // 8 hours ago
    closed_at: new Date(),
    cashier_name: 'Juan Perez',
    closer_name: 'Maria Gonzalez',
    total_sales_cash: 150000,
    total_sales_debit: 50000,
    total_sales_transfer: 20000,
    total_expenses: 10000,
    system_cash: 190000,
    final_cash_declared: 190000,
    notes: 'Todo en orden, turno tranquilo.',
    debtors_list: [
        { user_name: 'Carlos Cliente', total: 5000 },
        { user_name: 'Ana Fiados', total: 2500 }
    ],
    membership_payments_list: [
        { full_name: 'Pedro Socio', amount: 20000, months: 1 },
        { full_name: 'Luisa Fundadora', amount: 60000, months: 3 }
    ],
    new_members_list: [
        { full_name: 'Nuevo Usuario 1', type: 'CLIENTE' },
        { full_name: 'Nuevo Socio 1', type: 'SOCIO' }
    ]
};

async function runTest() {
    console.log('--- Probando Reporte de APERTURA ---');
    try {
        await sendShiftOpenReport(mockOpenData);
        console.log('✅ Apertura enviada (revisar correo).');
    } catch (error) {
        console.error('❌ Error apertura:', error);
    }

    console.log('\n--- Probando Reporte de CIERRE Detallado ---');
    try {
        await sendShiftCloseReport(mockCloseData);
        console.log('✅ Cierre enviado (revisar correo).');
    } catch (error) {
        console.error('❌ Error cierre:', error);
    }
}

runTest();
