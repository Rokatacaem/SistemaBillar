const fs = require('fs');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
});

async function importMembers() {
    const csvPath = path.join(__dirname, '../import_socios.csv');

    if (!fs.existsSync(csvPath)) {
        console.error('ERROR: No se encontró el archivo "import_socios.csv" en la raíz del proyecto.');
        console.log('Por favor, guardar el Excel como CSV (separado por comas o punto y coma) con ese nombre.');
        process.exit(1);
    }

    const content = fs.readFileSync(csvPath, 'utf8');
    const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);

    // Attempt to detect delimiter
    const firstLine = lines[0];
    const delimiter = firstLine.includes(';') ? ';' : ',';

    const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));

    // Map Month Names to Index
    const monthsMap = {
        'ENERO': 0, 'FEBRERO': 1, 'MARZO': 2, 'ABRIL': 3, 'MAYO': 4, 'JUNIO': 5,
        'JULIO': 6, 'AGOSTO': 7, 'SEPTIEMBRE': 8, 'OCTUBRE': 9, 'NOVIEMBRE': 10, 'DICIEMBRE': 11
    };

    console.log(`Found ${lines.length - 1} rows to process.`);

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        for (let i = 1; i < lines.length; i++) {
            const cols = lines[i].split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));
            if (cols.length < 3) continue;

            const n = cols[headers.indexOf('N°')]; // Or index 0
            const nombre = cols[headers.findIndex(h => h.toLowerCase().includes('nombre'))];
            const apellido = cols[headers.findIndex(h => h.toLowerCase().includes('apellido'))];

            if (!nombre) continue;

            const fullName = `${nombre} ${apellido || ''}`.trim();

            // Determine Expiration Date
            let maxDate = null;

            headers.forEach((h, idx) => {
                const upperH = h.toUpperCase();
                // Check if header is a date column (e.g., "Enero 2025")
                const parts = upperH.split(' ');
                if (parts.length === 2 && monthsMap[parts[0]] !== undefined) {
                    const status = (cols[idx] || '').toUpperCase();
                    if (status.includes('PAGADO') || status.includes('HONORARIO')) {
                        const month = monthsMap[parts[0]];
                        const year = parseInt(parts[1]);

                        // Expiration is valid technically until the END of that month? 
                        // Or usually implies coverage FOR that month.
                        // Let's set expire date to the LAST DAY of that month.
                        const date = new Date(year, month + 1, 0); // Day 0 of next month = last day of current

                        if (!maxDate || date > maxDate) {
                            maxDate = date;
                        }
                    }
                }
            });

            // Generate Placeholder RUT if not exists
            // Format: IMPORT-{N°} if available, else random
            const numericId = n || i;
            const rut = `IMPORT-${numericId.toString().padStart(3, '0')}`;

            // Status logic
            let status = 'INACTIVE';
            let finalExpire = null;

            if (maxDate) {
                finalExpire = maxDate;
                // Active if expiration is in future or less than 30 days ago?
                // Rule: "control que el socio este al dia que es maximo 30 dias de atraso"
                const toleranceDate = new Date();
                toleranceDate.setDate(toleranceDate.getDate() - 30);

                if (finalExpire >= toleranceDate) {
                    status = 'ACTIVE';
                }
            }

            // Insert or Update
            // Check if user exists by RUT (our placeholder) or fuzzy name match?
            // For safety, let's stick to our generated RUT. User can edit later.

            // Check if name exists to avoid dupes?
            // No, names are not unique. Rely on the generated RUT which corresponds to the list number.

            const check = await client.query('SELECT id FROM users WHERE rut = $1', [rut]);

            if (check.rows.length > 0) {
                // Update
                await client.query(`
                    UPDATE users 
                    SET full_name = $1, membership_expires_at = $2, status = $3, type = 'SOCIO'
                    WHERE rut = $4
                `, [fullName, finalExpire, status, rut]);
                console.log(`Updated ${fullName} (${rut}) - Exp: ${finalExpire ? finalExpire.toISOString().split('T')[0] : 'NONE'}`);
            } else {
                // Insert
                await client.query(`
                    INSERT INTO users (rut, full_name, type, status, membership_expires_at)
                    VALUES ($1, $2, 'SOCIO', $3, $4)
                `, [rut, fullName, status, finalExpire]);
                console.log(`Inserted ${fullName} (${rut}) - Exp: ${finalExpire ? finalExpire.toISOString().split('T')[0] : 'NONE'}`);
            }
        }

        await client.query('COMMIT');
        console.log('Import completed successfully.');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Import Error:', err);
    } finally {
        client.release();
        pool.end();
    }
}

importMembers();
