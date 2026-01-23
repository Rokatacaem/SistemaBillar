ALTER TABLE users
ADD COLUMN IF NOT EXISTS last_payment_date DATE DEFAULT CURRENT_DATE;
-- Track when the system last checked for debts to avoid redundant processing if needed
CREATE TABLE IF NOT EXISTS system_logs (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(50),
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);