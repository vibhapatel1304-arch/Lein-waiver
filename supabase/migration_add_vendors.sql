-- ── Migration: Add Vendor Management System ──────────────────
-- This migration creates the vendors table and adds vendor_id 
-- to invoices and lien waivers for proper vendor tracking
-- with W-9/1099 compliance support.

-- ── 1. Create Vendors Table ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.app_vendors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  
  -- Tax Information (SSN/EIN mutual exclusivity enforced)
  tax_type TEXT CHECK (tax_type IN ('SSN', 'EIN')),
  tax_id TEXT,
  
  -- W-9 Compliance
  w9_completed BOOLEAN DEFAULT FALSE,
  w9_received_date DATE,
  
  -- 1099 Tracking (calculated field)
  total_paid_amount NUMERIC(14,2) DEFAULT 0,
  is_1099_eligible BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_tax_type CHECK (tax_type IN ('SSN', 'EIN')),
  CONSTRAINT tax_id_required CHECK (tax_id IS NOT NULL AND tax_id <> ''),
  CONSTRAINT tax_type_required CHECK (tax_type IS NOT NULL)
);

-- ── 2. Add Indexes ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_vendors_name ON public.app_vendors(name);
CREATE INDEX IF NOT EXISTS idx_vendors_tax_type ON public.app_vendors(tax_type);
CREATE INDEX IF NOT EXISTS idx_vendors_w9 ON public.app_vendors(w9_completed);
CREATE INDEX IF NOT EXISTS idx_vendors_1099 ON public.app_vendors(is_1099_eligible);

-- ── 3. Add vendor_id to Invoices ───────────────────────────
ALTER TABLE public.app_invoices 
ADD COLUMN IF NOT EXISTS vendor_id TEXT REFERENCES public.app_vendors(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_vendor ON public.app_invoices(vendor_id);

-- ── 4. Update Lien Waivers vendor_id reference ──────────────
-- Note: vendor_id already exists in app_lien_waivers
-- This ensures proper foreign key relationship

-- Create index for vendor lookups in lien waivers if not exists
CREATE INDEX IF NOT EXISTS idx_lien_waivers_vendor ON public.app_lien_waivers(vendor_id);

-- ── 5. Function: Calculate 1099 Eligibility ────────────────
CREATE OR REPLACE FUNCTION calculate_vendor_1099_eligibility(p_vendor_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_total_paid NUMERIC(14,2);
  v_w9_completed BOOLEAN;
  v_threshold NUMERIC(14,2) := 600;
BEGIN
  -- Get total paid amount from paid invoices
  SELECT COALESCE(SUM(
    CASE 
      WHEN status = 'Paid' THEN COALESCE(paid_amount, current_payment_due, amount, 0)
      ELSE 0
    END
  ), 0)
  INTO v_total_paid
  FROM public.app_invoices
  WHERE vendor_id = p_vendor_id;
  
  -- Get W-9 status
  SELECT w9_completed INTO v_w9_completed
  FROM public.app_vendors
  WHERE id = p_vendor_id;
  
  -- Return eligibility (paid > $600 AND W-9 completed)
  RETURN v_total_paid > v_threshold AND COALESCE(v_w9_completed, FALSE);
END;
$$ LANGUAGE plpgsql;

-- ── 6. Function: Update Vendor Payment Totals ───────────────
CREATE OR REPLACE FUNCTION update_vendor_payment_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Only proceed if vendor_id is set
  IF NEW.vendor_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Update vendor totals
  UPDATE public.app_vendors
  SET 
    total_paid_amount = (
      SELECT COALESCE(SUM(
        CASE 
          WHEN status = 'Paid' THEN COALESCE(paid_amount, current_payment_due, amount, 0)
          ELSE 0
        END
      ), 0)
      FROM public.app_invoices
      WHERE vendor_id = NEW.vendor_id
    ),
    is_1099_eligible = calculate_vendor_1099_eligibility(NEW.vendor_id),
    updated_at = NOW()
  WHERE id = NEW.vendor_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── 7. Trigger: Update Vendor Totals on Invoice Change ───
DROP TRIGGER IF EXISTS tr_update_vendor_totals ON public.app_invoices;
CREATE TRIGGER tr_update_vendor_totals
  AFTER INSERT OR UPDATE OF status, paid_amount, vendor_id ON public.app_invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_vendor_payment_totals();

-- ── 8. View: Vendor Summary with 1099 Info ──────────────────
CREATE OR REPLACE VIEW public.v_vendor_summary AS
SELECT 
  v.*,
  (SELECT COUNT(*) FROM public.app_invoices WHERE vendor_id = v.id) as invoice_count,
  (SELECT COUNT(*) FROM public.app_invoices WHERE vendor_id = v.id AND status = 'Paid') as paid_invoice_count,
  calculate_vendor_1099_eligibility(v.id) as calculated_1099_eligible
FROM public.app_vendors v;

-- ── 9. RLS Policies (if RLS is enabled) ───────────────────
-- Allow all operations for authenticated users
ALTER TABLE public.app_vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users" ON public.app_vendors
  FOR ALL USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ── 10. Grant Permissions ─────────────────────────────────
GRANT ALL ON public.app_vendors TO authenticated;
GRANT ALL ON public.v_vendor_summary TO authenticated;

-- ── Comments ───────────────────────────────────────────────
COMMENT ON TABLE public.app_vendors IS 'Vendor management table with W-9/1099 compliance tracking';
COMMENT ON COLUMN public.app_vendors.tax_type IS 'SSN for individuals, EIN for businesses - mutually exclusive';
COMMENT ON COLUMN public.app_vendors.tax_id IS 'Formatted tax ID (XXX-XX-XXXX for SSN, XX-XXXXXXX for EIN)';
COMMENT ON COLUMN public.app_vendors.w9_completed IS 'Whether W-9 form has been received and verified';
COMMENT ON COLUMN public.app_vendors.is_1099_eligible IS 'Auto-calculated: true if paid > $600 and W-9 completed';
