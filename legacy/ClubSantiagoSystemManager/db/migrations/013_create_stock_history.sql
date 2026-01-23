CREATE TABLE IF NOT EXISTS stock_history (
    id SERIAL PRIMARY KEY,
    product_id INTEGER REFERENCES products(id),
    change_amount INTEGER NOT NULL,
    previous_stock INTEGER,
    new_stock INTEGER,
    type VARCHAR(50) DEFAULT 'ADJUSTMENT',
    reference_doc VARCHAR(255),
    provider VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);