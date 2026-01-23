CREATE TABLE IF NOT EXISTS tables (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    type VARCHAR(20) NOT NULL,
    -- 'POOL', 'SNOOKER', 'CARAMBOLA'
    status VARCHAR(20) DEFAULT 'AVAILABLE',
    -- 'AVAILABLE', 'OCCUPIED', 'MAINTENANCE'
    current_session_id UUID REFERENCES sessions(id)
);
-- Initial Seed (Idempotent-ish: ON CONFLICT DO NOTHING if name constraint existed, but here we just rely on IF NOT EXISTS for table.
-- For data, we use simple inserts. Ideally we check existence, but for dev specific updates:
INSERT INTO tables (name, type)
VALUES ('Mesa 1', 'POOL') ON CONFLICT (name) DO NOTHING;
INSERT INTO tables (name, type)
VALUES ('Mesa 2', 'POOL') ON CONFLICT (name) DO NOTHING;
INSERT INTO tables (name, type)
VALUES ('Mesa 3', 'CARAMBOLA') ON CONFLICT (name) DO NOTHING;
INSERT INTO tables (name, type)
VALUES ('Mesa 4', 'SNOOKER') ON CONFLICT (name) DO NOTHING;
INSERT INTO tables (name, type)
VALUES ('Mesa 5', 'POOL') ON CONFLICT (name) DO NOTHING;
INSERT INTO tables (name, type)
VALUES ('Mesa 6', 'POOL') ON CONFLICT (name) DO NOTHING;