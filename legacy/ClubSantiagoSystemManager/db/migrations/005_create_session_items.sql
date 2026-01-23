CREATE TABLE IF NOT EXISTS session_items (
    id SERIAL PRIMARY KEY,
    session_id UUID REFERENCES sessions(id),
    product_id INTEGER REFERENCES products(id),
    product_name VARCHAR(100),
    quantity INTEGER DEFAULT 1,
    price DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);