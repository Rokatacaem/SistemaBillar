const nodemailer = require('nodemailer');
require('dotenv').config();

// Configurar transporte
// Se asume Gmail por defecto, pero es configurable
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, // Tu correo Gmail
        pass: process.env.EMAIL_PASS  // Tu contraseña de aplicación
    }
});

// Función para enviar reporte de APERTURA de caja
const sendShiftOpenReport = async (shiftData) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_TO) return;

    const { cashier_name, initial_cash, opened_at } = shiftData;

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ccc; max-width: 600px;">
            <h2 style="color: #2e7d32; border-bottom: 2px solid #2e7d32;">Apertura de Caja</h2>
            <p><strong>Local:</strong> Club de Billar Santiago</p>
            <p><strong>Fecha Inicio:</strong> ${new Date(opened_at).toLocaleString()}</p>
            <hr/>
            
            <table style="width: 100%; border-collapse: collapse;">
                <tr><td><strong>Cajero:</strong></td><td>${cashier_name}</td></tr>
                <tr><td><strong>Efectivo Inicial:</strong></td><td style="font-weight: bold;">$${parseInt(initial_cash).toLocaleString()}</td></tr>
            </table>
            
            <p style="font-size: 0.8em; color: #888; margin-top: 30px;">Turno iniciado.</p>
        </div>
    `;

    const mailOptions = {
        from: `"Club Santiago System" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_TO.split(/[,;]/).map(e => e.trim()).join(','),
        subject: `🟢 Apertura de Caja - ${cashier_name}`,
        html: htmlContent
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('EMAIL: Open Report Sent');
    } catch (error) {
        console.error('EMAIL: Error sending open report', error);
    }
};

// Función para enviar reporte de CIERRE de caja
const sendShiftCloseReport = async (shiftData) => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_TO) {
        console.warn('EMAIL: No credentials or recipient configured. Skipping email.');
        return;
    }

    const {
        opened_at, closed_at, cashier_name, closer_name,
        total_sales_cash, total_sales_debit, total_sales_transfer,
        total_expenses, system_cash, final_cash_declared, notes,
        debtors_list, new_members_list, membership_payments_list
    } = shiftData;

    const difference = final_cash_declared - system_cash;
    const diffColor = difference === 0 ? 'green' : (difference > 0 ? 'blue' : 'red');

    // Helper to generate list rows
    const generateListRows = (list, formatter) => {
        if (!list || list.length === 0) return '<tr><td colspan="2" style="font-style: italic; color: #777;">Ninguno registrado.</td></tr>';
        return list.map(formatter).join('');
    };

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #ccc; max-width: 600px;">
            <h2 style="color: #0f2040; border-bottom: 2px solid #0f2040;">Reporte Cierre de Caja</h2>
            <p><strong>Local:</strong> Club de Billar Santiago</p>
            <p><strong>Fecha Cierre:</strong> ${new Date(closed_at).toLocaleString()}</p>
            <hr/>
            
            <h3>Resumen de Turno</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr><td><strong>Apertura:</strong></td><td>${new Date(opened_at).toLocaleString()}</td></tr>
                <tr><td><strong>Cajero:</strong></td><td>${cashier_name}</td></tr>
                <tr><td><strong>Cerrado Por:</strong></td><td>${closer_name}</td></tr>
            </table>

            <h3>Movimientos Financieros</h3>
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                <tr><td>(+) Ventas Efectivo:</td><td style="text-align: right;">$${parseInt(total_sales_cash).toLocaleString()}</td></tr>
                <tr><td>(+) Ventas Débito:</td><td style="text-align: right;">$${parseInt(total_sales_debit).toLocaleString()}</td></tr>
                <tr><td>(+) Ventas Transf.:</td><td style="text-align: right;">$${parseInt(total_sales_transfer).toLocaleString()}</td></tr>
                <tr><td>(-) Gastos:</td><td style="text-align: right; color: red;">$${parseInt(total_expenses).toLocaleString()}</td></tr>
                <tr style="border-top: 1px solid #000; font-weight: bold;">
                    <td>(=) Total Sistema (Efectivo):</td><td style="text-align: right;">$${parseInt(system_cash).toLocaleString()}</td>
                </tr>
            </table>

            <h3>Cuadratura</h3>
            <table style="width: 100%; margin-top: 10px; background-color: #f9f9f9; padding: 10px;">
                <tr>
                    <td><strong>Efectivo Declarado:</strong></td>
                    <td style="text-align: right; font-size: 1.2em;">$${parseInt(final_cash_declared).toLocaleString()}</td>
                </tr>
                <tr>
                    <td><strong>Diferencia:</strong></td>
                    <td style="text-align: right; font-weight: bold; color: ${diffColor};">$${parseInt(difference).toLocaleString()}</td>
                </tr>
            </table>

            <h3>Deudores del Turno (Fiados)</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 0.9em; margin-bottom: 10px;">
                ${generateListRows(debtors_list, (item) => `
                    <tr>
                        <td style="border-bottom: 1px solid #eee;">${item.user_name}</td>
                        <td style="text-align: right; border-bottom: 1px solid #eee;">$${parseInt(item.total).toLocaleString()}</td>
                    </tr>
                `)}
            </table>

            <h3>Pagos de Membresía</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 0.9em; margin-bottom: 10px;">
                 ${generateListRows(membership_payments_list, (item) => `
                    <tr>
                        <td style="border-bottom: 1px solid #eee;">${item.full_name} (${item.months} mes)</td>
                        <td style="text-align: right; border-bottom: 1px solid #eee;">$${parseInt(item.amount).toLocaleString()}</td>
                    </tr>
                `)}
            </table>

            <h3>Nuevos Registros</h3>
            <ul style="font-size: 0.9em; color: #555;">
                ${(!new_members_list || new_members_list.length === 0) ? '<li>Ninguno nuevo.</li>' : new_members_list.map(u => `<li>${u.full_name} (${u.type})</li>`).join('')}
            </ul>

            ${notes ? `<div style="margin-top: 20px; padding: 10px; background-color: #fff3cd;"><strong>Notas:</strong> ${notes}</div>` : ''}
            
            <p style="font-size: 0.8em; color: #888; margin-top: 30px;">Este reporte fue generado automáticamente por el sistema.</p>
        </div>
    `;

    const mailOptions = {
        from: `"Club Santiago System" <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_TO.split(/[,;]/).map(e => e.trim()).join(','),
        subject: `📊 Cierre de Caja - ${new Date(closed_at).toLocaleDateString()} - ${cashier_name}`,
        html: htmlContent
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('EMAIL: Report Sent', info.messageId);
        return true;
    } catch (error) {
        console.error('EMAIL: Error sending report', error);
        return false;
    }
};

module.exports = { sendShiftCloseReport, sendShiftOpenReport };
