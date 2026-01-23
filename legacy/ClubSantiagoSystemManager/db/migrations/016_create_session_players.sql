CREATE TABLE IF NOT EXISTS session_players (
    id SERIAL PRIMARY KEY,
    session_id UUID REFERENCES sessions(id),
    user_id UUID REFERENCES users(id),
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    rate INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_session_players_session_id ON session_players(session_id);
CREATE INDEX IF NOT EXISTS idx_session_players_user_id ON session_players(user_id);