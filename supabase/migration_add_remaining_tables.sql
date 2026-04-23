-- ============================================================
-- MIGRATION: Add remaining tables for full Supabase migration
-- (employees, subcontractors, documents, timesheets, schedule,
--  communications, job costs, materials, revenue, notifications,
--  sub pay applications)
--
-- Run this in Supabase SQL Editor. Safe to run on a live database.
-- ============================================================

-- ── Employees ───────────────────────────────────────────────
create table if not exists public.app_employees (
  id text primary key,
  name text not null,
  role text,
  email text,
  phone text,
  status text not null default 'Active',
  initials text,
  hire_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Subcontractors ──────────────────────────────────────────
create table if not exists public.app_subcontractors (
  id text primary key,
  name text not null,
  trade text,
  contact text,
  phone text,
  email text,
  address text,
  license text,
  insurance text,
  rating numeric(2,1) default 0,
  active_projects integer default 0,
  status text not null default 'Active',
  certifications text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── Documents ───────────────────────────────────────────────
create table if not exists public.app_documents (
  id text primary key,
  name text not null,
  type text,
  project text,
  project_id text,
  upload_date date default current_date,
  uploaded_by text,
  size text,
  category text,
  file_url text,
  created_at timestamptz default now()
);

-- ── Timesheets ──────────────────────────────────────────────
create table if not exists public.app_timesheets (
  id text primary key,
  employee text,
  employee_id text,
  project text,
  project_id text,
  phase text,
  date date not null,
  clock_in text,
  clock_out text,
  hours numeric(5,2) default 0,
  status text not null default 'Pending Approval',
  created_at timestamptz default now()
);

-- ── Schedule Events ─────────────────────────────────────────
create table if not exists public.app_schedule_events (
  id text primary key,
  title text not null,
  project text,
  project_id text,
  date date not null,
  end_date date,
  color text default '#3b82f6',
  type text default 'task',
  created_at timestamptz default now()
);

-- ── Communications ──────────────────────────────────────────
create table if not exists public.app_communications (
  id text primary key,
  client_id text,
  date date,
  type text,
  subject text,
  notes text,
  created_at timestamptz default now()
);

-- ── Job Costs ───────────────────────────────────────────────
create table if not exists public.app_job_costs (
  id text primary key default 'JC-' || substr(md5(random()::text), 1, 8),
  project_id text,
  project_name text,
  category text not null,
  budgeted numeric(14,2) default 0,
  actual numeric(14,2) default 0,
  created_at timestamptz default now()
);

-- ── Materials ───────────────────────────────────────────────
create table if not exists public.app_materials (
  id text primary key,
  name text not null,
  unit text,
  cost numeric(10,2) default 0,
  created_at timestamptz default now()
);

-- ── Revenue Data ────────────────────────────────────────────
create table if not exists public.app_revenue_data (
  id text primary key default 'REV-' || substr(md5(random()::text), 1, 8),
  month text not null,
  revenue numeric(14,2) default 0,
  created_at timestamptz default now()
);

-- ── Notifications ───────────────────────────────────────────
create table if not exists public.app_notifications (
  id text primary key,
  message text not null,
  type text default 'info',
  read boolean default false,
  time text,
  created_at timestamptz default now()
);

-- ── Sub Pay Applications ────────────────────────────────────
create table if not exists public.app_sub_pay_applications (
  id text primary key,
  application_no integer,
  is_subcontractor_version boolean default true,
  project_id text,
  project_name text,
  project_location text,
  subcontractor text,
  subcontractor_id text,
  owner text,
  owner_address text,
  contract_for text,
  contract_date date,
  period_to date,
  application_date date,
  original_contract_sum numeric(14,2) default 0,
  net_change_orders numeric(14,2) default 0,
  contract_sum_to_date numeric(14,2) default 0,
  total_completed_and_stored numeric(14,2) default 0,
  retainage_percent text default '10',
  retainage_on_completed numeric(14,2) default 0,
  retainage_on_stored numeric(14,2) default 0,
  total_retainage numeric(14,2) default 0,
  total_earned_less_retainage numeric(14,2) default 0,
  less_previous_certificates numeric(14,2) default 0,
  current_payment_due numeric(14,2) default 0,
  balance_to_finish numeric(14,2) default 0,
  status text default 'Draft',
  co_previous_additions numeric(14,2) default 0,
  co_previous_deductions numeric(14,2) default 0,
  co_this_month_additions numeric(14,2) default 0,
  co_this_month_deductions numeric(14,2) default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.sub_pay_application_line_items (
  id text primary key default 'SPLI-' || substr(md5(random()::text), 1, 8),
  sub_pay_application_id text,
  item_no integer,
  description text,
  scheduled_value numeric(14,2) default 0,
  previous_application numeric(14,2) default 0,
  this_period numeric(14,2) default 0,
  materials_stored numeric(14,2) default 0,
  total_completed numeric(14,2) default 0,
  percent_complete numeric(5,1) default 0,
  balance_to_finish numeric(14,2) default 0,
  retainage numeric(14,2) default 0,
  sort_order integer default 0
);

create table if not exists public.sub_pay_app_draw_history (
  id text primary key default 'SPDH-' || substr(md5(random()::text), 1, 8),
  sub_pay_application_id text,
  draw_number integer,
  g703_item_no integer,
  description text,
  commentary text,
  amount numeric(14,2) default 0,
  retainage numeric(14,2) default 0,
  net_amount numeric(14,2) default 0,
  sort_order integer default 0
);

-- ── RLS (development — full access) ─────────────────────────
do $$
declare
  tbl text;
begin
  for tbl in select unnest(array[
    'app_employees', 'app_subcontractors', 'app_documents', 'app_timesheets',
    'app_schedule_events', 'app_communications', 'app_job_costs', 'app_materials',
    'app_revenue_data', 'app_notifications', 'app_sub_pay_applications',
    'sub_pay_application_line_items', 'sub_pay_app_draw_history'
  ])
  loop
    execute format('alter table public.%I enable row level security', tbl);
    if not exists (select 1 from pg_policies where tablename = tbl and policyname = 'anon_all') then
      execute format('create policy "anon_all" on public.%I for all to anon using (true) with check (true)', tbl);
    end if;
    if not exists (select 1 from pg_policies where tablename = tbl and policyname = 'auth_all') then
      execute format('create policy "auth_all" on public.%I for all to authenticated using (true) with check (true)', tbl);
    end if;
  end loop;
end $$;

-- ── Add missing columns to existing tables ──────────────────

-- app_projects
ALTER TABLE public.app_projects ADD COLUMN IF NOT EXISTS phase text;
ALTER TABLE public.app_projects ADD COLUMN IF NOT EXISTS progress integer default 0;
ALTER TABLE public.app_projects ADD COLUMN IF NOT EXISTS budget numeric(14,2) default 0;
ALTER TABLE public.app_projects ADD COLUMN IF NOT EXISTS spent numeric(14,2) default 0;
ALTER TABLE public.app_projects ADD COLUMN IF NOT EXISTS start_date date;
ALTER TABLE public.app_projects ADD COLUMN IF NOT EXISTS deadline date;
ALTER TABLE public.app_projects ADD COLUMN IF NOT EXISTS client_name text;
ALTER TABLE public.app_projects ADD COLUMN IF NOT EXISTS contract_type text;
ALTER TABLE public.app_projects ADD COLUMN IF NOT EXISTS team text[];
ALTER TABLE public.app_projects ADD COLUMN IF NOT EXISTS phases text[];

-- app_change_orders
ALTER TABLE public.app_change_orders ADD COLUMN IF NOT EXISTS co_date date;
ALTER TABLE public.app_change_orders ADD COLUMN IF NOT EXISTS requested_by text;
ALTER TABLE public.app_change_orders ADD COLUMN IF NOT EXISTS amount numeric(14,2) default 0;
ALTER TABLE public.app_change_orders ADD COLUMN IF NOT EXISTS project_id text;
ALTER TABLE public.app_change_orders ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.app_change_orders ADD COLUMN IF NOT EXISTS status text default 'Pending';

-- app_estimates
ALTER TABLE public.app_estimates ADD COLUMN IF NOT EXISTS project_name text;
ALTER TABLE public.app_estimates ADD COLUMN IF NOT EXISTS estimate_date date;
ALTER TABLE public.app_estimates ADD COLUMN IF NOT EXISTS subtotal numeric(14,2) default 0;
ALTER TABLE public.app_estimates ADD COLUMN IF NOT EXISTS tax numeric(14,2) default 0;
ALTER TABLE public.app_estimates ADD COLUMN IF NOT EXISTS grand_total numeric(14,2) default 0;
ALTER TABLE public.app_estimates ADD COLUMN IF NOT EXISTS valid_until date;
ALTER TABLE public.app_estimates ADD COLUMN IF NOT EXISTS client_id text;
ALTER TABLE public.app_estimates ADD COLUMN IF NOT EXISTS status text default 'Draft';

-- app_contracts
ALTER TABLE public.app_contracts ADD COLUMN IF NOT EXISTS client_name text;
ALTER TABLE public.app_contracts ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE public.app_contracts ADD COLUMN IF NOT EXISTS project_name text;
ALTER TABLE public.app_contracts ADD COLUMN IF NOT EXISTS scope_of_work text;
ALTER TABLE public.app_contracts ADD COLUMN IF NOT EXISTS payment_terms text;
ALTER TABLE public.app_contracts ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE public.app_contracts ADD COLUMN IF NOT EXISTS signed_date date;
ALTER TABLE public.app_contracts ADD COLUMN IF NOT EXISTS sent_date date;

-- app_lien_waivers
ALTER TABLE public.app_lien_waivers ADD COLUMN IF NOT EXISTS invoice_id text;
ALTER TABLE public.app_lien_waivers ADD COLUMN IF NOT EXISTS waiver_category text;
ALTER TABLE public.app_lien_waivers ADD COLUMN IF NOT EXISTS condition_type text;
ALTER TABLE public.app_lien_waivers ADD COLUMN IF NOT EXISTS project_name text;
ALTER TABLE public.app_lien_waivers ADD COLUMN IF NOT EXISTS signer_name text;
ALTER TABLE public.app_lien_waivers ADD COLUMN IF NOT EXISTS furnisher text;
ALTER TABLE public.app_lien_waivers ADD COLUMN IF NOT EXISTS owner_contractor text;
ALTER TABLE public.app_lien_waivers ADD COLUMN IF NOT EXISTS job_name_address text;
ALTER TABLE public.app_lien_waivers ADD COLUMN IF NOT EXISTS waiver_amount numeric(14,2) default 0;
ALTER TABLE public.app_lien_waivers ADD COLUMN IF NOT EXISTS final_balance numeric(14,2) default 0;
ALTER TABLE public.app_lien_waivers ADD COLUMN IF NOT EXISTS signer_company text;
ALTER TABLE public.app_lien_waivers ADD COLUMN IF NOT EXISTS signer_title text;
ALTER TABLE public.app_lien_waivers ADD COLUMN IF NOT EXISTS waiver_date date;

-- change_order_versions
ALTER TABLE public.change_order_versions ADD COLUMN IF NOT EXISTS version_date date;

-- pay_applications
ALTER TABLE public.pay_applications ADD COLUMN IF NOT EXISTS paid_date date;
ALTER TABLE public.pay_applications ADD COLUMN IF NOT EXISTS paid_amount numeric(14,2);
ALTER TABLE public.pay_applications ADD COLUMN IF NOT EXISTS payment_status text;

-- ── Indexes ─────────────────────────────────────────────────
create index if not exists idx_app_timesheets_date on public.app_timesheets(date);
create index if not exists idx_app_timesheets_employee on public.app_timesheets(employee_id);
create index if not exists idx_app_documents_project on public.app_documents(project_id);
create index if not exists idx_app_schedule_events_date on public.app_schedule_events(date);
create index if not exists idx_app_job_costs_project on public.app_job_costs(project_id);
create index if not exists idx_app_communications_client on public.app_communications(client_id);
create index if not exists idx_app_sub_pay_apps_project on public.app_sub_pay_applications(project_id);
