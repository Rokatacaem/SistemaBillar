const { pool } = require('./db/connection.cjs');

async function updateConstraint() {
    try {
        // Drop existing constraint if it exists (assuming it's a check constraint on 'type')
        // First, let's try to add the value to the ENUM if it's an ENUM, or update the CHECK constraint.
        // Based on previous error, it's likely a CHECK constraint or ENUM. 
        // Let's inspect, but for speed, I'll try to drop the check constraint and re-add it with FUNDADOR.

        // However, I don't know the constraint name.
        // Let's assume it's just text and I need to add a check. OR it's an enum type.
        // Postgres error "invalid input value for enum... " would confirm enum.
        // The error was "ExecConstraints".

        // Let's try to ALTER TYPE if it is an enum.
        try {
            await pool.query("ALTER TYPE user_type ADD VALUE 'FUNDADOR'");
            console.log("Added FUNDADOR to user_type ENUM");
        } catch (e) {
            // If it fails, maybe it's not an enum or already exists.
            console.log("Could not alter enum (might not exist or already added):", e.message);
        }

        // If it's a CHECK constraint, we might need to drop and recreate.
        // Let's try to update the column to just TEXT to be safe/flexible if strictness isn't required, 
        // or just add the check.

        // Safe bet: Update the check constraint if we can find it. 
        // Or honestly, for this app, just dropping the constraint might be easiest if we validate in app.
        // But let's try to be proper.

        const res = await pool.query(`
            SELECT con.conname
            FROM pg_catalog.pg_constraint con
            INNER JOIN pg_catalog.pg_class rel ON rel.oid = con.conrelid
            INNER JOIN pg_catalog.pg_namespace nsp ON nsp.oid = con.connamespace
            WHERE nsp.nspname = 'public'
              AND rel.relname = 'users'
              AND con.contype = 'c';
        `);

        for (let row of res.rows) {
            console.log("Found constraint:", row.conname);
            // We can't easily parse the constraint logic here to know if it's the right one, 
            // but we can look for one that involves 'type'.
            // For now, let's just try to update the users table to allow 'FUNDADOR'.
        }

        // ALTERNATIVE: Just update the column to VARCHAR and remove constraint if it persists.
        // await pool.query("ALTER TABLE users ALTER COLUMN type TYPE VARCHAR(50)");
        // await pool.query("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_type_check"); 

        // Let's try the simple update first:
        await pool.query("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_type_check");
        await pool.query("ALTER TABLE users ADD CONSTRAINT users_type_check CHECK (type IN ('ADMIN', 'CAJERO', 'USER', 'CLIENTE', 'SOCIO', 'FUNDADOR'))");

        console.log("Updated users_type_check constraint.");

    } catch (err) {
        console.error('Constraint update error:', err);
    } finally {
        pool.end();
    }
}

updateConstraint();
