-- Direct insert command for user Bala
-- This creates the user with the exact credentials you need

-- First, make sure the users table exists
CREATE TABLE IF NOT EXISTS users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  role text default 'USER' not null,
  created_at timestamptz default now(),
  last_login timestamptz,
  is_active boolean default true
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- Insert the user Bala with password Avenir@9669
-- The password hash was generated using bcrypt with salt rounds 12
INSERT INTO users (username, password_hash, role, is_active) 
VALUES (
  'Bala', 
  '$2b$12$CdKW.yxtkuNsOJXsYq//tu65ELYKmzsGMuBD2Wz38pP8MsczvO2ra',
  'ADMIN', 
  true
) 
ON CONFLICT (username) 
DO UPDATE SET 
  password_hash = EXCLUDED.password_hash,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;

-- Verify the user was created
SELECT id, username, role, created_at, is_active FROM users WHERE username = 'Bala';