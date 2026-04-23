-- ============================================================
-- MIGRATION: Lien Waiver Compliance Features
-- Adds: Form Types (K1/K2/Custom), CFR compliance, Active filters
--       Invoice linking, SSN/EIN validation for subcontractors
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── 1. UPDATE LIEN WAIVERS TABLE ───────────────────────────
-- NOTE: Using app_lien_waivers to match the application service layer
-- Add form_type for K1/K2/Custom classification
ALTER TABLE public.app_lien_waivers 
  ADD COLUMN IF NOT EXISTS form_type text DEFAULT 'K1' CHECK (form_type IN ('K1', 'K2', 'Custom'));

-- Add template_type for k1/k2/custom (lowercase for backend logic)
ALTER TABLE public.app_lien_waivers 
  ADD COLUMN IF NOT EXISTS template_type text DEFAULT 'k1' CHECK (template_type IN ('k1', 'k2', 'custom'));

-- Add CFR section for compliance tracking
ALTER TABLE public.app_lien_waivers 
  ADD COLUMN IF NOT EXISTS cfr_section text DEFAULT '14.106';

-- Add is_active for filtering
ALTER TABLE public.app_lien_waivers 
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Add invoice_id foreign key (link to pay_applications) - REQUIRED
ALTER TABLE public.app_lien_waivers 
  ADD COLUMN IF NOT EXISTS invoice_id text references public.pay_applications(id) on delete set null;

-- Add vendor_id for explicit subcontractor reference
ALTER TABLE public.app_lien_waivers 
  ADD COLUMN IF NOT EXISTS vendor_id text references public.app_subcontractors(id) on delete set null;

-- Add waiver_type computed column for 4-state classification
ALTER TABLE public.app_lien_waivers 
  ADD COLUMN IF NOT EXISTS waiver_type text GENERATED ALWAYS AS (
    CASE 
      WHEN waiver_category = 'Final' AND condition_type = 'Conditional' THEN 'Conditional Final'
      WHEN waiver_category = 'Final' AND condition_type = 'Unconditional' THEN 'Unconditional Final'
      WHEN waiver_category = 'Partial' AND condition_type = 'Conditional' THEN 'Conditional Progress'
      WHEN waiver_category = 'Partial' AND condition_type = 'Unconditional' THEN 'Unconditional Progress'
      ELSE 'Conditional Progress'
    END
  ) STORED;

-- Add signed_at timestamp
ALTER TABLE public.app_lien_waivers 
  ADD COLUMN IF NOT EXISTS signed_at timestamptz;

-- ── 2. UPDATE SUBCONTRACTORS TABLE ─────────────────────────
-- NOTE: Using app_subcontractors to match the application service layer
-- Add tax ID fields with mutual exclusivity validation
ALTER TABLE public.app_subcontractors 
  ADD COLUMN IF NOT EXISTS tax_id_type text CHECK (tax_id_type IN ('SSN', 'EIN', null));

ALTER TABLE public.app_subcontractors 
  ADD COLUMN IF NOT EXISTS ssn text;

ALTER TABLE public.app_subcontractors 
  ADD COLUMN IF NOT EXISTS ein text;

-- Add w9_on_file boolean
ALTER TABLE public.app_subcontractors 
  ADD COLUMN IF NOT EXISTS w9_on_file boolean DEFAULT false;

-- Add w9_received_date
ALTER TABLE public.app_subcontractors 
  ADD COLUMN IF NOT EXISTS w9_received_date date;

-- Add 1099_required flag
ALTER TABLE public.app_subcontractors 
  ADD COLUMN IF NOT EXISTS is_1099_required boolean DEFAULT false;

-- Add 1099_issued_year for tracking
ALTER TABLE public.app_subcontractors 
  ADD COLUMN IF NOT EXISTS issued_1099_year integer;

-- Create constraint: SSN and EIN cannot both be set (XOR logic)
CREATE OR REPLACE FUNCTION check_ssn_ein_exclusive()
RETURNS TRIGGER AS $$
BEGIN
  -- If both SSN and EIN have values, raise error
  IF NEW.ssn IS NOT NULL AND NEW.ein IS NOT NULL THEN
    RAISE EXCEPTION 'Subcontractor cannot have both SSN and EIN. Only one tax ID is allowed.';
  END IF;
  
  -- Auto-set tax_id_type based on which field is populated
  IF NEW.ssn IS NOT NULL THEN
    NEW.tax_id_type := 'SSN';
  ELSIF NEW.ein IS NOT NULL THEN
    NEW.tax_id_type := 'EIN';
  ELSE
    NEW.tax_id_type := NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to enforce SSN/EIN exclusivity
DROP TRIGGER IF EXISTS enforce_ssn_ein_exclusive ON public.app_subcontractors;
CREATE TRIGGER enforce_ssn_ein_exclusive
  BEFORE INSERT OR UPDATE ON public.app_subcontractors
  FOR EACH ROW
  EXECUTE FUNCTION check_ssn_ein_exclusive();

-- ── 3. CREATE WAiver AUTO-GENERATION FUNCTION ──────────────
CREATE OR REPLACE FUNCTION public.auto_generate_lien_waiver()
RETURNS TRIGGER AS $$
DECLARE
  v_waiver_category text;
  v_vendor_id text;
  v_project_name text;
  v_contractor_name text;
  v_owner_name text;
BEGIN
  -- Only generate waiver when payment status changes to 'Completed'
  IF NEW.status = 'Completed' AND (OLD.status IS NULL OR OLD.status != 'Completed') THEN
    
    -- Get project details from pay application
    SELECT 
      pa.project_name,
      pa.subcontractor_id,
      pa.contractor_name,
      pa.owner_name
    INTO 
      v_project_name,
      v_vendor_id,
      v_contractor_name,
      v_owner_name
    FROM public.app_pay_applications pa
    WHERE pa.id = NEW.invoice_id;
    
    -- Determine if this is final payment (check if balance to finish is 0 or small)
    SELECT 
      CASE 
        WHEN pa.balance_to_finish <= 0.01 OR pa.balance_to_finish IS NULL THEN 'Final'
        ELSE 'Partial'
      END
    INTO v_waiver_category
    FROM public.app_pay_applications pa
    WHERE pa.id = NEW.invoice_id;
    
    -- Create the lien waiver
    INSERT INTO public.app_lien_waivers (
      id,
      waiver_category,
      condition_type,
      form_type,
      invoice_id,
      vendor_id,
      project_name,
      owner_contractor,
      job_name_address,
      waiver_amount,
      final_balance,
      signer_company,
      waiver_date,
      status,
      is_active,
      cfr_section,
      created_at
    ) VALUES (
      'LW-' || substr(md5(random()::text), 1, 8),
      v_waiver_category,
      'Conditional', -- Default to conditional until payment fully cleared
      'K1', -- Default form type
      NEW.invoice_id,
      v_vendor_id,
      v_project_name,
      COALESCE(v_owner_name, v_contractor_name, 'Owner/Contractor'),
      v_project_name,
      NEW.amount_paid,
      CASE WHEN v_waiver_category = 'Final' THEN NEW.amount_paid ELSE 0 END,
      v_vendor_id, -- Will be replaced with actual company name via trigger
      CURRENT_DATE,
      'Draft',
      true,
      '14.106', -- Default CFR section
      NOW()
    );
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to payments table
DROP TRIGGER IF EXISTS auto_generate_waiver_on_payment ON public.app_payments;
CREATE TRIGGER auto_generate_waiver_on_payment
  AFTER UPDATE ON public.app_payments
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.auto_generate_lien_waiver();

-- ── 4. FUNCTION: Mark waiver unconditional when payment clears
CREATE OR REPLACE FUNCTION public.update_waiver_on_payment_clear()
RETURNS TRIGGER AS $$
BEGIN
  -- When payment is marked Completed, update linked waiver to Unconditional
  UPDATE public.app_lien_waivers
  SET condition_type = 'Unconditional',
      updated_at = NOW()
  WHERE invoice_id = NEW.invoice_id 
    AND condition_type = 'Conditional'
    AND NEW.status = 'Completed';
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_waiver_on_payment_clear ON public.app_payments;
CREATE TRIGGER update_waiver_on_payment_clear
  AFTER UPDATE ON public.app_payments
  FOR EACH ROW
  WHEN (NEW.status = 'Completed' AND OLD.status != 'Completed')
  EXECUTE FUNCTION public.update_waiver_on_payment_clear();

-- ── 5. INDEXES FOR NEW FIELDS ─────────────────────────────
CREATE INDEX IF NOT EXISTS idx_lien_waivers_form_type ON public.app_lien_waivers(form_type);
CREATE INDEX IF NOT EXISTS idx_lien_waivers_is_active ON public.app_lien_waivers(is_active);
CREATE INDEX IF NOT EXISTS idx_lien_waivers_invoice_id ON public.app_lien_waivers(invoice_id);
CREATE INDEX IF NOT EXISTS idx_lien_waivers_vendor_id ON public.app_lien_waivers(vendor_id);
CREATE INDEX IF NOT EXISTS idx_lien_waivers_waiver_type ON public.app_lien_waivers(waiver_type);
CREATE INDEX IF NOT EXISTS idx_subcontractors_tax_id ON public.app_subcontractors(tax_id_type);
CREATE INDEX IF NOT EXISTS idx_subcontractors_w9 ON public.app_subcontractors(w9_on_file);

-- ── 6. VIEW: Lien Waiver with Full Details ────────────────
CREATE OR REPLACE VIEW public.v_lien_waivers_complete AS
SELECT 
  lw.*,
  s.name as vendor_name,
  s.trade as vendor_trade,
  s.tax_id_type,
  s.ssn,
  s.ein,
  s.w9_on_file,
  s.is_1099_required,
  pa.application_no,
  pa.contractor_name,
  pa.owner_name,
  pa.current_payment_due as invoice_amount,
  pa.status as invoice_status
FROM public.lien_waivers lw
LEFT JOIN public.subcontractors s ON lw.vendor_id = s.id
LEFT JOIN public.pay_applications pa ON lw.invoice_id = pa.id;

-- ── 7. VIEW: Subcontractors with Compliance Status ──────
CREATE OR REPLACE VIEW public.v_subcontractors_compliance AS
SELECT 
  s.*,
  CASE 
    WHEN s.w9_on_file AND (s.ssn IS NOT NULL OR s.ein IS NOT NULL) THEN 'Compliant'
    WHEN s.w9_on_file AND s.ssn IS NULL AND s.ein IS NULL THEN 'W9 Pending Verification'
    ELSE 'W9 Missing'
  END as compliance_status,
  CASE 
    WHEN s.is_1099_required AND s.w9_on_file THEN 'Ready for 1099'
    WHEN s.is_1099_required AND NOT s.w9_on_file THEN 'Need W9 before 1099'
    ELSE '1099 Not Required'
  END as tax_status
FROM public.subcontractors s;

-- ── 8. UPDATE EXISTING DATA ───────────────────────────────
-- Set default form_type for existing waivers
UPDATE public.lien_waivers 
SET form_type = 'K1' 
WHERE form_type IS NULL;

-- Set default is_active
UPDATE public.lien_waivers 
SET is_active = true 
WHERE is_active IS NULL;

-- Set default CFR section
UPDATE public.lien_waivers 
SET cfr_section = '14.106' 
WHERE cfr_section IS NULL;

-- Update waiver signed_at from existing data if status is Signed
UPDATE public.lien_waivers 
SET signed_at = updated_at 
WHERE status = 'Signed' AND signed_at IS NULL;
