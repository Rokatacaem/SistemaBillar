-- SHIFTS Table (Turnos de Caja)
CREATE TABLE IF NOT EXISTS shifts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP,
    cashier_id UUID REFERENCES users(id),
    -- Quien abre
    closer_id UUID REFERENCES users(id),
    -- Quien cierra (usualmente el mismo, pero puede ser supervisor)
    initial_cash DECIMAL(10, 2) NOT NULL DEFAULT 0,
    -- Fondos iniciales
    final_cash_system DECIMAL(10, 2),
    -- Calculado por sistema (Initial + Ventas Efectivo - Gastos)
    final_cash_declared DECIMAL(10, 2),
    -- Contado por el cajero
    expenses_total DECIMAL(10, 2) DEFAULT 0,
    -- Total gastos registrados
    status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
    notes TEXT
);
-- EXPENSES Table (Gastos Menores / Egresos de Caja)
CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    shift_id UUID REFERENCES shifts(id),
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id) -- Quién registró el gasto
);