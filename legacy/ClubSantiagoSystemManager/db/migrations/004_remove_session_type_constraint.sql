-- Remove the restrictive CHECK constraint on 'type' column in 'sessions' table
-- Since we don't know the exact name, we find it dynamically.
DO $$
DECLARE r RECORD;
BEGIN FOR r IN (
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'sessions'::regclass
        AND contype = 'c'
        AND pg_get_constraintdef(oid) LIKE '%type%BILLAR%'
) LOOP EXECUTE 'ALTER TABLE sessions DROP CONSTRAINT ' || quote_ident(r.conname);
END LOOP;
END $$;
-- Optional: Add a new constraint if we want, or just leave it open as we validate in code/UI.
-- For now, leaving it open to allow 'POOL', 'SNOOKER', 'CARAMBOLA'.