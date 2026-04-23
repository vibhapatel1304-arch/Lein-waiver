-- ============================================================
-- Boulder Construction CRM — Supabase Database Schema
-- Run this in the Supabase SQL Editor to create all tables
--
-- NOTE: Uses TEXT primary keys (not UUID) to support app-generated
-- IDs like CLI-001, INV-011, PRJ-001, etc.
-- ============================================================

-- Drop existing tables if re-running (order matters for foreign keys)
drop table if exists public.pay_app_draw_history cascade;
drop table if exists public.pay_application_line_items cascade;
drop table if exists public.pay_applications cascade;
drop table if exists public.lien_waivers cascade;
drop table if exists public.change_order_versions cascade;
drop table if exists public.change_orders cascade;
drop table if exists public.rfis cascade;
drop table if exists public.invoice_line_items cascade;
drop table if exists public.invoices cascade;
drop table if exists public.estimate_line_items cascade;
drop table if exists public.estimates cascade;
drop table if exists public.contract_line_items cascade;
drop table if exists public.contracts cascade;
drop table if exists public.documents cascade;
drop table if exists public.timesheet_entries cascade;
drop table if exists public.daily_logs cascade;
drop table if exists public.tasks cascade;
drop table if exists public.project_members cascade;
drop table if exists public.schedule_events cascade;
drop table if exists public.job_costs cascade;
drop table if exists public.material_catalog cascade;
drop table if exists public.communication_log cascade;
drop table if exists public.notifications cascade;
drop table if exists public.subcontractors cascade;
drop table if exists public.projects cascade;
drop table if exists public.clients cascade;
drop table if exists public.users cascade;


-- ── 1. USERS / AUTH ─────────────────────────────────────────
create table public.users (
  id text primary key,
  email text unique not null,
  name text not null,
  role text not null default 'User',
  phone text,
  initials text,
  avatar_url text,
  status text not null default 'Active',
  hire_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── 2. CLIENTS ──────────────────────────────────────────────
create table public.clients (
  id text primary key,
  name text not null,
  company text,
  phone text,
  email text,
  address text,
  status text not null default 'Active',
  last_contact date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── 3. PROJECTS ─────────────────────────────────────────────
create table public.projects (
  id text primary key,
  name text not null,
  client_id text ,
  status text not null default 'Planning',
  progress integer default 0,
  budget numeric(14,2) default 0,
  spent numeric(14,2) default 0,
  start_date date,
  deadline date,
  description text,
  phase text,
  contract_type text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── 4. PROJECT TEAM MEMBERS ─────────────────────────────────
create table public.project_members (
  id text primary key default 'PM-' || substr(md5(random()::text), 1, 8),
  project_id text ,
  user_id text ,
  role text,
  unique(project_id, user_id)
);

-- ── 5. PROJECT TASKS ────────────────────────────────────────
create table public.tasks (
  id text primary key default 'TSK-' || substr(md5(random()::text), 1, 8),
  project_id text ,
  name text not null,
  phase text,
  status text not null default 'Pending',
  assignee_id text ,
  assignee_name text,
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- ── 6. DAILY LOGS ───────────────────────────────────────────
create table public.daily_logs (
  id text primary key default 'DL-' || substr(md5(random()::text), 1, 8),
  project_id text ,
  log_date date not null,
  summary text,
  crew_count integer default 0,
  created_by text ,
  created_at timestamptz default now()
);

-- ── 7. ESTIMATES ────────────────────────────────────────────
create table public.estimates (
  id text primary key,
  client_id text ,
  project_name text,
  status text not null default 'Draft',
  subtotal numeric(14,2) default 0,
  tax numeric(14,2) default 0,
  grand_total numeric(14,2) default 0,
  valid_until date,
  estimate_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── 8. ESTIMATE LINE ITEMS ──────────────────────────────────
create table public.estimate_line_items (
  id text primary key default 'ELI-' || substr(md5(random()::text), 1, 8),
  estimate_id text ,
  description text not null,
  quantity numeric(10,2) default 1,
  unit_cost numeric(14,2) default 0,
  total numeric(14,2) default 0,
  sort_order integer default 0
);

-- ── 9. INVOICES ─────────────────────────────────────────────
create table public.invoices (
  id text primary key,
  invoice_number text unique,
  client_id text,
  project_id text,
  amount numeric(14,2) not null default 0,
  due_date date,
  issue_date date,
  paid_date date,
  status text not null default 'Pending',
  terms text default 'Net 30',
  notes text,
  -- G702 fields
  original_contract_sum numeric(14,2) default 0,
  net_change_orders numeric(14,2) default 0,
  retainage_percent numeric(5,2) default 2.5,
  stored_materials_retainage numeric(5,2) default 0,
  previous_payments numeric(14,2) default 0,
  contract_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── 10. INVOICE LINE ITEMS ──────────────────────────────────
create table public.invoice_line_items (
  id text primary key default 'ILI-' || substr(md5(random()::text), 1, 8),
  invoice_id text ,
  description text not null,
  quantity numeric(10,2) default 1,
  unit_cost numeric(14,2) default 0,
  total numeric(14,2) default 0,
  -- G703 fields
  scheduled_value numeric(14,2) default 0,
  previously_completed numeric(14,2) default 0,
  this_period numeric(14,2) default 0,
  materials_stored numeric(14,2) default 0,
  sort_order integer default 0
);

-- ── 11. SUBCONTRACTORS ──────────────────────────────────────
create table public.subcontractors (
  id text primary key,
  name text not null,
  trade text,
  contact_person text,
  phone text,
  email text,
  address text,
  license_number text,
  insurance_expiry date,
  rating numeric(2,1) default 0,
  status text not null default 'Active',
  certifications text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── 12. TIMESHEET ENTRIES ───────────────────────────────────
create table public.timesheet_entries (
  id text primary key,
  user_id text ,
  employee_name text,
  project_id text ,
  project_name text,
  phase text,
  entry_date date not null,
  clock_in time,
  clock_out time,
  hours numeric(5,2) default 0,
  status text not null default 'Pending Approval',
  created_at timestamptz default now()
);

-- ── 13. CHANGE ORDERS ───────────────────────────────────────
create table public.change_orders (
  id text primary key,
  co_number text unique,
  project_id text ,
  description text not null,
  amount numeric(14,2) default 0,
  status text not null default 'Pending',
  requested_by text,
  co_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── 14. CHANGE ORDER VERSIONS ───────────────────────────────
create table public.change_order_versions (
  id text primary key default 'COV-' || substr(md5(random()::text), 1, 8),
  change_order_id text ,
  version_number integer not null,
  amount numeric(14,2) default 0,
  notes text,
  version_date date,
  created_at timestamptz default now()
);

-- ── 15. RFIs ────────────────────────────────────────────────
create table public.rfis (
  id text primary key,
  rfi_number text unique,
  project_id text ,
  subject text not null,
  status text not null default 'Open',
  submitted_by text,
  date_submitted date,
  date_responded date,
  response text,
  created_at timestamptz default now()
);

-- ── 16. DOCUMENTS ───────────────────────────────────────────
create table public.documents (
  id text primary key default 'DOC-' || substr(md5(random()::text), 1, 8),
  name text not null,
  file_type text,
  project_id text ,
  category text,
  file_size text,
  file_url text,
  uploaded_by text ,
  uploaded_by_name text,
  upload_date date default current_date,
  created_at timestamptz default now()
);

-- ── 17. PAY APPLICATIONS (AIA G702) ────────────────────────
create table public.pay_applications (
  id text primary key,
  application_no integer not null,
  project_id text ,
  is_subcontractor_version boolean default false,
  subcontractor_id text ,
  project_name text,
  project_location text,
  subcontractor text,
  owner_name text,
  owner_address text,
  contractor_name text default 'Boulder Construction',
  contractor_address text default '123 Commerce Way, Newark, NJ 07102',
  architect_name text,
  architect_address text,
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
  status text not null default 'Draft',
  co_previous_additions numeric(14,2) default 0,
  co_previous_deductions numeric(14,2) default 0,
  co_this_month_additions numeric(14,2) default 0,
  co_this_month_deductions numeric(14,2) default 0,
  client_id text,
  contract_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── 18. PAY APPLICATION LINE ITEMS (G703) ───────────────────
create table public.pay_application_line_items (
  id text primary key default 'PALI-' || substr(md5(random()::text), 1, 8),
  pay_application_id text ,
  item_no integer not null,
  description text not null,
  scheduled_value numeric(14,2) default 0,
  previous_application numeric(14,2) default 0,
  this_period numeric(14,2) default 0,
  materials_stored numeric(14,2) default 0,
  total_completed numeric(14,2) default 0,
  percent_complete numeric(5,1) default 0,
  balance_to_finish numeric(14,2) default 0,
  retainage numeric(14,2) default 0,
  is_change_order boolean default false,
  sort_order integer default 0
);

-- ── 19. PAY APP BACKUP / DRAW HISTORY ───────────────────────
create table public.pay_app_draw_history (
  id text primary key default 'PADH-' || substr(md5(random()::text), 1, 8),
  pay_application_id text ,
  draw_number integer not null,
  g703_item_no integer,
  description text,
  commentary text,
  amount numeric(14,2) default 0,
  retainage numeric(14,2) default 0,
  net_amount numeric(14,2) default 0,
  sort_order integer default 0
);

-- ── 20. LIEN WAIVERS (Affidavit, Release and Waiver of Lien) ─
create table public.lien_waivers (
  id text primary key,
  waiver_category text not null default 'Partial',   -- 'Partial' or 'Final'
  condition_type text not null default 'Conditional', -- 'Conditional' or 'Unconditional'
  project_id text,
  project_name text,
  pay_application_id text,
  signer_name text,
  furnisher text,
  owner_contractor text,
  job_name_address text,
  waiver_amount numeric(14,2) default 0,
  final_balance numeric(14,2) default 0,
  payment_condition text,
  signer_company text,
  signer_title text,
  waiver_date date,
  status text not null default 'Draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── 21. COMMUNICATION LOG ───────────────────────────────────
create table public.communication_log (
  id text primary key default 'COM-' || substr(md5(random()::text), 1, 8),
  client_id text ,
  comm_date date,
  comm_type text,
  subject text,
  notes text,
  created_by text ,
  created_at timestamptz default now()
);

-- ── 22. NOTIFICATIONS ───────────────────────────────────────
create table public.notifications (
  id text primary key default 'NOT-' || substr(md5(random()::text), 1, 8),
  user_id text ,
  message text not null,
  type text default 'info',
  read boolean default false,
  created_at timestamptz default now()
);

-- ── 23. SCHEDULE EVENTS ─────────────────────────────────────
create table public.schedule_events (
  id text primary key default 'SCH-' || substr(md5(random()::text), 1, 8),
  title text not null,
  project_id text ,
  start_date date not null,
  end_date date,
  color text default '#3b82f6',
  event_type text default 'task',
  created_at timestamptz default now()
);

-- ── 24. MATERIAL CATALOG ────────────────────────────────────
create table public.material_catalog (
  id text primary key,
  name text not null,
  unit text,
  cost_per_unit numeric(10,2) default 0,
  created_at timestamptz default now()
);

-- ── 25. JOB COST DATA ───────────────────────────────────────
create table public.job_costs (
  id text primary key default 'JC-' || substr(md5(random()::text), 1, 8),
  project_id text ,
  category text not null,
  budgeted numeric(14,2) default 0,
  actual numeric(14,2) default 0,
  created_at timestamptz default now()
);

-- ── 26. CONTRACTS ────────────────────────────────────────────
create table public.contracts (
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

-- ── 27. CONTRACT LINE ITEMS (SOV) ────────────────────────────
create table public.contract_line_items (
  id text primary key default 'CLI-' || substr(md5(random()::text), 1, 8),
  contract_id text,
  description text not null,
  amount numeric(14,2) default 0,
  sort_order integer default 0
);


-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
alter table public.users enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.tasks enable row level security;
alter table public.daily_logs enable row level security;
alter table public.estimates enable row level security;
alter table public.estimate_line_items enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_line_items enable row level security;
alter table public.subcontractors enable row level security;
alter table public.timesheet_entries enable row level security;
alter table public.change_orders enable row level security;
alter table public.change_order_versions enable row level security;
alter table public.rfis enable row level security;
alter table public.documents enable row level security;
alter table public.pay_applications enable row level security;
alter table public.pay_application_line_items enable row level security;
alter table public.pay_app_draw_history enable row level security;
alter table public.lien_waivers enable row level security;
alter table public.communication_log enable row level security;
alter table public.notifications enable row level security;
alter table public.schedule_events enable row level security;
alter table public.material_catalog enable row level security;
alter table public.job_costs enable row level security;
alter table public.contracts enable row level security;
alter table public.contract_line_items enable row level security;

-- Allow full access for anon/authenticated (development — tighten for production)
create policy "anon_all" on public.users for all to anon using (true) with check (true);
create policy "auth_all" on public.users for all to authenticated using (true) with check (true);
create policy "anon_all" on public.clients for all to anon using (true) with check (true);
create policy "auth_all" on public.clients for all to authenticated using (true) with check (true);
create policy "anon_all" on public.projects for all to anon using (true) with check (true);
create policy "auth_all" on public.projects for all to authenticated using (true) with check (true);
create policy "anon_all" on public.project_members for all to anon using (true) with check (true);
create policy "auth_all" on public.project_members for all to authenticated using (true) with check (true);
create policy "anon_all" on public.tasks for all to anon using (true) with check (true);
create policy "auth_all" on public.tasks for all to authenticated using (true) with check (true);
create policy "anon_all" on public.daily_logs for all to anon using (true) with check (true);
create policy "auth_all" on public.daily_logs for all to authenticated using (true) with check (true);
create policy "anon_all" on public.estimates for all to anon using (true) with check (true);
create policy "auth_all" on public.estimates for all to authenticated using (true) with check (true);
create policy "anon_all" on public.estimate_line_items for all to anon using (true) with check (true);
create policy "auth_all" on public.estimate_line_items for all to authenticated using (true) with check (true);
create policy "anon_all" on public.invoices for all to anon using (true) with check (true);
create policy "auth_all" on public.invoices for all to authenticated using (true) with check (true);
create policy "anon_all" on public.invoice_line_items for all to anon using (true) with check (true);
create policy "auth_all" on public.invoice_line_items for all to authenticated using (true) with check (true);
create policy "anon_all" on public.subcontractors for all to anon using (true) with check (true);
create policy "auth_all" on public.subcontractors for all to authenticated using (true) with check (true);
create policy "anon_all" on public.timesheet_entries for all to anon using (true) with check (true);
create policy "auth_all" on public.timesheet_entries for all to authenticated using (true) with check (true);
create policy "anon_all" on public.change_orders for all to anon using (true) with check (true);
create policy "auth_all" on public.change_orders for all to authenticated using (true) with check (true);
create policy "anon_all" on public.change_order_versions for all to anon using (true) with check (true);
create policy "auth_all" on public.change_order_versions for all to authenticated using (true) with check (true);
create policy "anon_all" on public.rfis for all to anon using (true) with check (true);
create policy "auth_all" on public.rfis for all to authenticated using (true) with check (true);
create policy "anon_all" on public.documents for all to anon using (true) with check (true);
create policy "auth_all" on public.documents for all to authenticated using (true) with check (true);
create policy "anon_all" on public.pay_applications for all to anon using (true) with check (true);
create policy "auth_all" on public.pay_applications for all to authenticated using (true) with check (true);
create policy "anon_all" on public.pay_application_line_items for all to anon using (true) with check (true);
create policy "auth_all" on public.pay_application_line_items for all to authenticated using (true) with check (true);
create policy "anon_all" on public.pay_app_draw_history for all to anon using (true) with check (true);
create policy "auth_all" on public.pay_app_draw_history for all to authenticated using (true) with check (true);
create policy "anon_all" on public.lien_waivers for all to anon using (true) with check (true);
create policy "auth_all" on public.lien_waivers for all to authenticated using (true) with check (true);
create policy "anon_all" on public.communication_log for all to anon using (true) with check (true);
create policy "auth_all" on public.communication_log for all to authenticated using (true) with check (true);
create policy "anon_all" on public.notifications for all to anon using (true) with check (true);
create policy "auth_all" on public.notifications for all to authenticated using (true) with check (true);
create policy "anon_all" on public.schedule_events for all to anon using (true) with check (true);
create policy "auth_all" on public.schedule_events for all to authenticated using (true) with check (true);
create policy "anon_all" on public.material_catalog for all to anon using (true) with check (true);
create policy "auth_all" on public.material_catalog for all to authenticated using (true) with check (true);
create policy "anon_all" on public.job_costs for all to anon using (true) with check (true);
create policy "auth_all" on public.job_costs for all to authenticated using (true) with check (true);
create policy "anon_all" on public.contracts for all to anon using (true) with check (true);
create policy "auth_all" on public.contracts for all to authenticated using (true) with check (true);
create policy "anon_all" on public.contract_line_items for all to anon using (true) with check (true);
create policy "auth_all" on public.contract_line_items for all to authenticated using (true) with check (true);


-- ============================================================
-- INDEXES
-- ============================================================
create index idx_projects_client on public.projects(client_id);
create index idx_projects_status on public.projects(status);
create index idx_invoices_client on public.invoices(client_id);
create index idx_invoices_project on public.invoices(project_id);
create index idx_invoices_status on public.invoices(status);
create index idx_tasks_project on public.tasks(project_id);
create index idx_timesheet_user on public.timesheet_entries(user_id);
create index idx_timesheet_project on public.timesheet_entries(project_id);
create index idx_pay_apps_project on public.pay_applications(project_id);
create index idx_lien_waivers_project on public.lien_waivers(project_id);
create index idx_change_orders_project on public.change_orders(project_id);
create index idx_documents_project on public.documents(project_id);
create index idx_schedule_events_project on public.schedule_events(project_id);
create index idx_job_costs_project on public.job_costs(project_id);
create index idx_contracts_client on public.contracts(client_id);
create index idx_contracts_project on public.contracts(project_id);
create index idx_contracts_status on public.contracts(status);
create index idx_contract_line_items_contract on public.contract_line_items(contract_id);
create index idx_pay_apps_client on public.pay_applications(client_id);
create index idx_pay_apps_contract on public.pay_applications(contract_id);


-- ============================================================
-- UPDATED_AT trigger
-- ============================================================
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at before update on public.users for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.clients for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.projects for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.estimates for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.invoices for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.subcontractors for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.change_orders for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.pay_applications for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.lien_waivers for each row execute function public.update_updated_at();
create trigger set_updated_at before update on public.contracts for each row execute function public.update_updated_at();
