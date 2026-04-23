-- ============================================================
-- MIGRATION: Add contracts, contract_line_items tables
--            + client_id / contract_id on pay_applications
--
-- Run this in Supabase SQL Editor WITHOUT dropping existing data.
-- Safe to run on a live database.
-- ============================================================

-- ── contracts ────────────────────────────────────────────────
create table if not exists public.contracts (
  id text primary key,
  title text not null,
  client_id text,
  client_name text,
  company text,
  project_id text,
  project_name text,
  type text not null default 'Lump Sum',
  contract_type text,
  status text not null default 'Draft',
  contract_value numeric(14,2) default 0,
  start_date date,
  end_date date,
  signed_date date,
  sent_date date,
  scope_of_work text,
  payment_terms text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- If contracts table already exists, add missing columns safely
alter table public.contracts
  add column if not exists client_name text,
  add column if not exists company text,
  add column if not exists project_name text,
  add column if not exists contract_type text;

-- ── contract_line_items ──────────────────────────────────────
create table if not exists public.contract_line_items (
  id text primary key default 'CLI-' || substr(md5(random()::text), 1, 8),
  contract_id text,
  description text not null,
  amount numeric(14,2) default 0,
  sort_order integer default 0
);

-- ── add columns to pay_applications (safe if already exists) ─
alter table public.pay_applications
  add column if not exists client_id text,
  add column if not exists contract_id text;

-- ── RLS ──────────────────────────────────────────────────────
alter table public.contracts enable row level security;
alter table public.contract_line_items enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'contracts' and policyname = 'anon_all'
  ) then
    create policy "anon_all" on public.contracts for all to anon using (true) with check (true);
  end if;
  if not exists (
    select 1 from pg_policies
    where tablename = 'contracts' and policyname = 'auth_all'
  ) then
    create policy "auth_all" on public.contracts for all to authenticated using (true) with check (true);
  end if;
  if not exists (
    select 1 from pg_policies
    where tablename = 'contract_line_items' and policyname = 'anon_all'
  ) then
    create policy "anon_all" on public.contract_line_items for all to anon using (true) with check (true);
  end if;
  if not exists (
    select 1 from pg_policies
    where tablename = 'contract_line_items' and policyname = 'auth_all'
  ) then
    create policy "auth_all" on public.contract_line_items for all to authenticated using (true) with check (true);
  end if;
end $$;

-- ── Indexes ───────────────────────────────────────────────────
create index if not exists idx_contracts_client   on public.contracts(client_id);
create index if not exists idx_contracts_project  on public.contracts(project_id);
create index if not exists idx_contracts_status   on public.contracts(status);
create index if not exists idx_contract_line_items_contract on public.contract_line_items(contract_id);
create index if not exists idx_pay_apps_client    on public.pay_applications(client_id);
create index if not exists idx_pay_apps_contract  on public.pay_applications(contract_id);

-- ── updated_at trigger for contracts ─────────────────────────
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_updated_at on public.contracts;
create trigger set_updated_at
  before update on public.contracts
  for each row execute function public.update_updated_at();
