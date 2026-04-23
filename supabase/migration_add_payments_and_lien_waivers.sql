-- ============================================================
-- MIGRATION: Add Payments table and update Lien Waivers schema
-- for proper Invoice-Payment-LienWaiver workflow integration
--
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── PAYMENTS TABLE ───────────────────────────────────────────
-- Links to invoices and tracks actual payments received/made
create table if not exists public.app_payments (
  id text primary key,
  invoice_id text not null references public.pay_applications(id) on delete cascade,
  project_id text references public.app_projects(id),
  vendor_id text references public.app_subcontractors(id),
  amount_paid numeric(14,2) not null default 0,
  payment_date date not null,
  payment_method text not null default 'Check', -- Check, ACH, Wire, Credit Card, Cash
  reference_number text,
  status text not null default 'Pending', -- Pending, Completed, Failed, Refunded
  notes text,
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ── UPDATE LIEN WAIVERS TABLE ───────────────────────────────
-- Add payment_id foreign key and waiver_type column
ALTER TABLE public.app_lien_waivers 
  ADD COLUMN IF NOT EXISTS payment_id text references public.app_payments(id) on delete set null;

-- Add waiver_type column for new 4-state classification
-- (Conditional Progress | Unconditional Progress | Conditional Final | Unconditional Final)
ALTER TABLE public.app_lien_waivers 
  ADD COLUMN IF NOT EXISTS waiver_type text;

-- Add vendor_id for explicit vendor reference
ALTER TABLE public.app_lien_waivers 
  ADD COLUMN IF NOT EXISTS vendor_id text references public.app_subcontractors(id) on delete set null;

-- Add signed_at timestamp for bonus feature
ALTER TABLE public.app_lien_waivers 
  ADD COLUMN IF NOT EXISTS signed_at timestamptz;

-- Update existing records to set waiver_type based on category and condition
UPDATE public.app_lien_waivers 
SET waiver_type = CASE 
  WHEN waiver_category = 'Final' AND condition_type = 'Conditional' THEN 'Conditional Final'
  WHEN waiver_category = 'Final' AND condition_type = 'Unconditional' THEN 'Unconditional Final'
  WHEN waiver_category = 'Partial' AND condition_type = 'Conditional' THEN 'Conditional Progress'
  WHEN waiver_category = 'Partial' AND condition_type = 'Unconditional' THEN 'Unconditional Progress'
  ELSE 'Conditional Progress'
END
WHERE waiver_type IS NULL;

-- ── RLS POLICIES ───────────────────────────────────────────
alter table public.app_payments enable row level security;

-- Full access for development (tighten for production)
create policy "anon_all_payments" on public.app_payments for all to anon using (true) with check (true);
create policy "auth_all_payments" on public.app_payments for all to authenticated using (true) with check (true);

-- ── INDEXES ─────────────────────────────────────────────────
create index if not exists idx_payments_invoice on public.app_payments(invoice_id);
create index if not exists idx_payments_project on public.app_payments(project_id);
create index if not exists idx_payments_vendor on public.app_payments(vendor_id);
create index if not exists idx_payments_status on public.app_payments(status);
create index if not exists idx_lien_waivers_payment on public.app_lien_waivers(payment_id);
create index if not exists idx_lien_waivers_vendor on public.app_lien_waivers(vendor_id);
create index if not exists idx_lien_waivers_waiver_type on public.app_lien_waivers(waiver_type);

-- ── TRIGGER FOR UPDATED_AT ──────────────────────────────────
create trigger if not exists set_updated_at_payments 
  before update on public.app_payments 
  for each row 
  execute function public.update_updated_at();

-- ── UNIQUE CONSTRAINT TO PREVENT DUPLICATE WAIVERS ─────────
-- Prevent duplicate waivers for the same payment
CREATE UNIQUE INDEX IF NOT EXISTS idx_lien_waivers_unique_payment 
  ON public.app_lien_waivers(payment_id) 
  WHERE payment_id IS NOT NULL;

-- ── FUNCTION: Auto-set waiver_type on insert/update ─────────
create or replace function public.set_waiver_type()
returns trigger as $$
begin
  -- Auto-calculate waiver_type from category and condition
  IF NEW.waiver_category IS NOT NULL AND NEW.condition_type IS NOT NULL THEN
    NEW.waiver_type := CASE 
      WHEN NEW.waiver_category = 'Final' AND NEW.condition_type = 'Conditional' THEN 'Conditional Final'
      WHEN NEW.waiver_category = 'Final' AND NEW.condition_type = 'Unconditional' THEN 'Unconditional Final'
      WHEN NEW.waiver_category = 'Partial' AND NEW.condition_type = 'Conditional' THEN 'Conditional Progress'
      WHEN NEW.waiver_category = 'Partial' AND NEW.condition_type = 'Unconditional' THEN 'Unconditional Progress'
      ELSE NEW.waiver_type
    END;
  END IF;
  
  -- Auto-set signed_at when status changes to Signed
  IF NEW.status = 'Signed' AND (OLD.status IS NULL OR OLD.status != 'Signed') THEN
    NEW.signed_at := now();
  END IF;
  
  return new;
end;
$$ language plpgsql;

-- Apply trigger
DROP TRIGGER IF EXISTS set_waiver_type_trigger ON public.app_lien_waivers;
CREATE TRIGGER set_waiver_type_trigger
  BEFORE INSERT OR UPDATE ON public.app_lien_waivers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_waiver_type();

-- ── VIEW: Payment with Invoice Details ──────────────────────
create or replace view public.v_payments_with_invoice as
select 
  p.*,
  pa.project_name,
  pa.project_id as pa_project_id,
  pa.contractor_name,
  pa.owner_name,
  pa.current_payment_due as invoice_total,
  pa.status as invoice_status,
  pa.application_no,
  pa.contract_id
from public.app_payments p
left join public.pay_applications pa on p.invoice_id = pa.id;

-- ── VIEW: Lien Waiver with All Related Data ────────────────
create or replace view public.v_lien_waivers_full as
select 
  lw.*,
  p.amount_paid,
  p.payment_date,
  p.payment_method,
  p.status as payment_status,
  pa.project_name,
  pa.application_no,
  s.name as vendor_name,
  s.trade as vendor_trade
from public.app_lien_waivers lw
left join public.app_payments p on lw.payment_id = p.id
left join public.pay_applications pa on lw.invoice_id = pa.id
left join public.app_subcontractors s on lw.vendor_id = s.id;
