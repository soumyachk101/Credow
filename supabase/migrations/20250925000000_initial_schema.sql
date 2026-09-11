-- ============================================================
-- CreditFlow — Supabase Database Schema
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- COMPANIES
-- ============================================================
create table companies (
 id uuid primary key default uuid_generate_v4(),
 name text not null,
 slug text unique not null,
 owner_id uuid references auth.users(id) not null,
 wallet_address text,
 x402_config jsonb default '{}'::jsonb,
 created_at timestamptz default now() not null
);

-- ============================================================
-- TEAMS
-- ============================================================
create table teams (
 id uuid primary key default uuid_generate_v4(),
 company_id uuid references companies(id) on delete cascade not null,
 name text not null,
 manager_id uuid references auth.users(id) not null,
 budget_pool numeric default 0,
 created_at timestamptz default now() not null
);

-- ============================================================
-- EMPLOYEES
-- ============================================================
create table employees (
 id uuid primary key default uuid_generate_v4(),
 company_id uuid references companies(id) on delete cascade not null,
 team_id uuid references teams(id) on delete set null,
 name text not null,
 email text not null,
 role text not null,
 wallet_address text,
 status text default 'active' not null check (status in ('active', 'suspended', 'terminated')),
 joined_at timestamptz default now() not null,
 terminated_at timestamptz,
 created_at timestamptz default now() not null
);

-- ============================================================
-- CREDIT ALLOCATIONS
-- ============================================================
create table allocations (
 id uuid primary key default uuid_generate_v4(),
 company_id uuid references companies(id) on delete cascade not null,
 team_id uuid references teams(id) on delete set null not null,
 employee_id uuid references employees(id) on delete cascade not null,
 period_start date not null,
 period_end date not null,
 total_credits numeric not null default 0,
 claimed_credits numeric not null default 0,
 unclaimed_credits numeric not null default 0,
 yield_eligible_balance numeric not null default 0,
 status text default 'active' not null check (status in ('active', 'suspended', 'terminated', 'expired')),
 created_at timestamptz default now() not null
);

-- ============================================================
-- YIELD ACCOUNTS
-- ============================================================
create table yield_accounts (
 id uuid primary key default uuid_generate_v4(),
 allocation_id uuid references allocations(id) on delete cascade not null,
 company_id uuid references companies(id) on delete cascade not null,
 employee_id uuid references employees(id) on delete set null,
 principal numeric not null default 0,
 yield_generated numeric not null default 0,
 company_share numeric not null default 0,
 employee_share numeric not null default 0,
 strategy text default 'algorand_tinyman',
 apy numeric not null default 0.05, -- 5% default
 last_calculated_at timestamptz default now() not null,
 created_at timestamptz default now() not null
);

-- ============================================================
-- TRANSACTIONS (IMMUTABLE LEDGER)
-- ============================================================
create table transactions (
 id uuid primary key default uuid_generate_v4(),
 allocation_id uuid references allocations(id) on delete set null,
 company_id uuid references companies(id) on delete cascade not null,
 team_id uuid references teams(id) on delete set null,
 employee_id uuid references employees(id) on delete set null,
 type text not null check (type in ('allocate', 'claim', 'yield_accrue', 'yield_distribute', 'reclaim', 'adjust', 'x402_payment')),
 amount numeric not null,
 from_entity text not null,
 to_entity text not null,
 tx_hash text,
 metadata jsonb default '{}'::jsonb,
 created_at timestamptz default now() not null
);

-- ============================================================
-- PAYMENT RECORDS (x402)
-- ============================================================
create table payment_records (
 id uuid primary key default uuid_generate_v4(),
 allocation_id uuid references allocations(id) on delete set null,
 company_id uuid references companies(id) on delete cascade not null,
 employee_id uuid references employees(id) on delete set null,
 service_id text not null,
 service_name text not null,
 amount numeric not null,
 currency text not null default 'USDC',
 x402_tx_hash text,
 status text not null default 'pending' check (status in ('pending', 'confirmed', 'failed', 'cancelled')),
 error_message text,
 consumed_at timestamptz,
 created_at timestamptz default now() not null
);

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_employees_company on employees(company_id);
create index idx_employees_team on employees(team_id);
create index idx_employees_email on employees(email);
create index idx_allocations_company on allocations(company_id);
create index idx_allocations_employee on allocations(employee_id);
create index idx_allocations_status on allocations(status);
create index idx_yield_accounts_allocation on yield_accounts(allocation_id);
create index idx_yield_accounts_company on yield_accounts(company_id);
create index idx_transactions_company on transactions(company_id);
create index idx_transactions_allocation on transactions(allocation_id);
create index idx_transactions_created on transactions(created_at desc);
create index idx_payment_records_allocation on payment_records(allocation_id);
create index idx_payment_records_status on payment_records(status);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Companies: users can only see companies they own
alter table companies enable row level security;
create policy "Users can view own companies" on companies for select using (auth.uid() = owner_id);
create policy "Users can create companies" on companies for insert with check (auth.uid() = owner_id);
create policy "Users can update own companies" on companies for update using (auth.uid() = owner_id);

-- Teams: visible to employees of the same company
alter table teams enable row level security;
create policy "Employees can view company teams" on teams for select using (
 exists (select 1 from employees where employees.company_id = teams.company_id and employees.email = auth.jwt()->>'email')
);
create policy "Managers can manage teams" on teams for all using (
 exists (select 1 from employees where employees.company_id = teams.company_id and employees.id = auth.uid())
);

-- Employees: visible within company
alter table employees enable row level security;
create policy "Employees can view company colleagues" on employees for select using (
 exists (select 1 from companies where companies.id = employees.company_id and companies.owner_id = auth.uid())
);
create policy "Admins can manage employees" on employees for all using (
 exists (select 1 from companies where companies.id = employees.company_id and companies.owner_id = auth.uid())
);

-- Allocations: visible within company
alter table allocations enable row level security;
create policy "Users can view company allocations" on allocations for select using (
 exists (select 1 from companies where companies.id = allocations.company_id and companies.owner_id = auth.uid())
);
create policy "Users can create allocations" on allocations for insert with check (
 exists (select 1 from companies where companies.id = allocations.company_id and companies.owner_id = auth.uid())
);
create policy "Users can update allocations" on allocations for update using (
 exists (select 1 from companies where companies.id = allocations.company_id and companies.owner_id = auth.uid())
);

-- Yield accounts: visible within company
alter table yield_accounts enable row level security;
create policy "Users can view company yield" on yield_accounts for select using (
 exists (select 1 from companies where companies.id = yield_accounts.company_id and companies.owner_id = auth.uid())
);
create policy "Users can update yield accounts" on yield_accounts for update using (
 exists (select 1 from companies where companies.id = yield_accounts.company_id and companies.owner_id = auth.uid())
);

-- Transactions: visible within company
alter table transactions enable row level security;
create policy "Users can view company transactions" on transactions for select using (
 exists (select 1 from companies where companies.id = transactions.company_id and companies.owner_id = auth.uid())
);
create policy "System can create transactions" on transactions for insert with check (
 exists (select 1 from companies where companies.id = transactions.company_id and companies.owner_id = auth.uid())
);

-- Payment records: visible within company
alter table payment_records enable row level security;
create policy "Users can view company payments" on payment_records for select using (
 exists (select 1 from companies where companies.id = payment_records.company_id and companies.owner_id = auth.uid())
);
create policy "System can create payments" on payment_records for insert with check (
 exists (select 1 from companies where companies.id = payment_records.company_id and companies.owner_id = auth.uid())
);
create policy "System can update payments" on payment_records for update using (
 exists (select 1 from companies where companies.id = payment_records.company_id and companies.owner_id = auth.uid())
);

-- ============================================================
-- STORED FUNCTIONS
-- ============================================================

-- Calculate total unclaimed credits for a company
create or replace function get_company_balance(p_company_id uuid)
 returns numeric as $$
 begin
 return coalesce(
 (select sum(unclaimed_credits) from allocations where company_id = p_company_id and status = 'active'),
 0
 );
 end;
 $$ language plpgsql stable;

-- Calculate yield for an allocation (server-side, accurate)
create or replace function calculate_yield_for_allocation(p_allocation_id uuid)
 returns table (
 gross_yield numeric,
 company_share numeric,
 employee_share numeric
 ) as $$
 declare
 v_principal numeric;
 v_apy numeric;
 v_days integer;
 v_gross numeric;
 v_company_share numeric;
 v_employee_share numeric;
 begin
 select unclaimed_credits, ya.apy, extract(day from now() - ya.last_calculated_at)::integer
 into v_principal, v_apy, v_days
 from allocations a
 join yield_accounts ya on ya.allocation_id = a.id
 where a.id = p_allocation_id;

 if v_principal is null or v_days is null or v_days <= 0 then
 gross_yield := 0;
 company_share := 0;
 employee_share := 0;
 return next;
 end if;

 v_gross := v_principal * v_apy * v_days / 365;
 v_company_share := v_gross * 0.7;
 v_employee_share := v_gross * 0.3;

 gross_yield := v_gross;
 company_share := v_company_share;
 employee_share := v_employee_share;
 return next;
 end;
 $$ language plpgsql;
