-- Granite Ledger schema (safe, relational)

create extension if not exists pgcrypto; -- for gen_random_uuid on some Postgres versions

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists bank_accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null
);

create table if not exists consignments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  date date not null,
  total numeric not null,
  rtgs_expected numeric not null default 0,
  cash_expected numeric not null default 0,
  remarks text
);
create index if not exists consignments_cust_date_idx on consignments(customer_id, date);

create table if not exists transactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  date date not null,
  mode text not null check (mode in ('RTGS','CASH')),
  account_id uuid not null references bank_accounts(id),
  amount numeric not null,
  note text
);
create index if not exists transactions_cust_date_idx on transactions(customer_id, date);

-- seed banks (idempotent)
insert into bank_accounts(name)
select x.name from (values ('Avenir A/C'),('Galaxy A/C'),('Counter')) as x(name)
where not exists (select 1 from bank_accounts b where b.name = x.name);
