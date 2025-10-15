-- Create users table for authentication
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  role text default 'USER' not null,
  created_at timestamptz default now(),
  last_login timestamptz,
  is_active boolean default true
);

-- Create index for faster username lookups
create index if not exists idx_users_username on users(username);
create index if not exists idx_users_active on users(is_active);

-- Note: The initial user will be created by the authentication API
-- This ensures the password is properly hashed using bcrypt