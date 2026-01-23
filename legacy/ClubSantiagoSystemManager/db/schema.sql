-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- USERS Table (Socios, Clientes, Staff)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rut VARCHAR(20) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('ADMIN', 'CAJERO', 'SUPERUSER', 'USER')) DEFAULT 'USER',
    type VARCHAR(20) CHECK (type IN ('SOCIO', 'CLIENTE')) DEFAULT 'CLIENTE',
    status VARCHAR(20) DEFAULT 'ACTIVE',
    debt_status BOOLEAN DEFAULT FALSE,
    -- True if moroso
    flag_country VARCHAR(5),
    photo_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- PRODUCTS Table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price_socio DECIMAL(10, 2) NOT NULL,
    price_client DECIMAL(10, 2) NOT NULL,
    stock INTEGER DEFAULT 0,
    category VARCHAR(50)
);
-- SESSIONS Table (Game Sessions)
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_id VARCHAR(50) NOT NULL,
    -- e.g., 'Mesa 1', 'Salon'
    type VARCHAR(20) CHECK (type IN ('BILLAR', 'SALON')) NOT NULL,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    -- ACTIVE, CLOSED
    players JSONB DEFAULT '[]',
    -- List of player IDs or Names
    total_amount DECIMAL(10, 2) DEFAULT 0
);
-- SALES Table (POS)
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id),
    items JSONB NOT NULL,
    -- Array of { productId, quantity, price }
    total DECIMAL(10, 2) NOT NULL,
    method VARCHAR(20),
    -- CASH, CARD, TRANSFER
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);