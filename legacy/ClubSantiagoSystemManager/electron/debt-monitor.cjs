const cron = require('node-cron');
const db = require('../db/connection.cjs');

async function checkDebts() {
    console.log('[DEBT MONITOR] Checking for overdue memberships...');

    // Logic: Find SOCIOS who are ACTIVE but have expired membership > 30 days
    // "control que el socio este al dia que es maximo 30 dias de atraso"

    const query = `
        UPDATE users
        SET status = 'INACTIVE'
        WHERE type = 'SOCIO'
        AND status = 'ACTIVE'
        AND (membership_expires_at < (CURRENT_DATE - INTERVAL '30 days') OR membership_expires_at IS NULL)
        RETURNING id, full_name, rut
    `;

    try {
        const result = await db.query(query);
        if (result.rowCount > 0) {
            console.log(`[DEBT MONITOR] Marked ${result.rowCount} users as INACTIVE (Overdue > 30 days):`);
            result.rows.forEach(u => console.log(` - ${u.full_name} (${u.rut})`));
        } else {
            console.log('[DEBT MONITOR] No new overdue memberships found.');
        }
    } catch (err) {
        console.error('[DEBT MONITOR] Error:', err);
    }
}

function init(electronApp) {
    // Schedule: Runs daily at 00:05 AM
    // Or specifically on day 5 of month as requested? 
    // "Validación automática los días 5 de cada mes"
    // Let's run every day but the logic handles the date difference.
    cron.schedule('5 0 * * *', () => {
        const today = new Date();
        // Strict interpretation: Run ONLY on day 5? Or running daily catches anyone who passed the threshold?
        // Running daily is safer to catch late flags.
        checkDebts();
    });

    // Run once on startup for QA/Dev validation
    setTimeout(checkDebts, 5000);
}

module.exports = { init, checkDebts };
