CREATE TABLE IF NOT EXISTS waiting_list (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    game_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'WAITING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_waiting_list_status ON waiting_list(status);