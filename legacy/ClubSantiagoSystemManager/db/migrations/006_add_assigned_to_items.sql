ALTER TABLE session_items
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES users(id);
ALTER TABLE session_items
ADD COLUMN IF NOT EXISTS assigned_name VARCHAR(100);