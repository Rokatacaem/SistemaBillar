-- Add membership_expires_at to users
ALTER TABLE users
ADD COLUMN IF NOT EXISTS membership_expires_at DATE;
-- Create membership_payments table
CREATE TABLE IF NOT EXISTS membership_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    amount DECIMAL(10, 2) NOT NULL,
    months INTEGER NOT NULL,
    method VARCHAR(20) NOT NULL,
    -- CASH, TRANSFER, DEBIT
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id) -- Optional: who registered the payment
);