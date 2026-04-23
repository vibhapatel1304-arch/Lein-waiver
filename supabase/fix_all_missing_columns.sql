-- ============================================================-- FIX: Add ALL missing columns to app_lien_waivers-- Run this in Supabase SQL Editor to fix all schema cache errors-- ============================================================

-- Add all missing columns that the app expects
ALTER TABLE public.app_lien_waivers 
  ADD COLUMN IF NOT EXISTS waiver_type text,
  ADD COLUMN IF NOT EXISTS waiver_category text DEFAULT 'Partial',
  ADD COLUMN IF NOT EXISTS condition_type text DEFAULT 'Conditional',
  ADD COLUMN IF NOT EXISTS vendor_id text,
  ADD COLUMN IF NOT EXISTS payment_id text,
  ADD COLUMN IF NOT EXISTS form_type text DEFAULT 'K1',
  ADD COLUMN IF NOT EXISTS template_type text DEFAULT 'k1',
  ADD COLUMN IF NOT EXISTS cfr_section text DEFAULT '14.106',
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS access_token text,
  ADD COLUMN IF NOT EXISTS access_token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS viewed_at timestamptz;

-- Create all indexes
CREATE INDEX IF NOT EXISTS idx_lien_waivers_waiver_type ON public.app_lien_waivers(waiver_type);
CREATE INDEX IF NOT EXISTS idx_lien_waivers_waiver_category ON public.app_lien_waivers(waiver_category);
CREATE INDEX IF NOT EXISTS idx_lien_waivers_condition_type ON public.app_lien_waivers(condition_type);
CREATE INDEX IF NOT EXISTS idx_lien_waivers_vendor_id ON public.app_lien_waivers(vendor_id);
CREATE INDEX IF NOT EXISTS idx_lien_waivers_payment_id ON public.app_lien_waivers(payment_id);
CREATE INDEX IF NOT EXISTS idx_lien_waivers_form_type ON public.app_lien_waivers(form_type);
CREATE INDEX IF NOT EXISTS idx_lien_waivers_is_active ON public.app_lien_waivers(is_active);
CREATE INDEX IF NOT EXISTS idx_lien_waivers_access_token ON public.app_lien_waivers(access_token);

-- Add comments
COMMENT ON COLUMN public.app_lien_waivers.waiver_type IS 'Full waiver type: Conditional Progress, Unconditional Progress, Conditional Final, Unconditional Final';
COMMENT ON COLUMN public.app_lien_waivers.waiver_category IS 'Partial or Final';
COMMENT ON COLUMN public.app_lien_waivers.condition_type IS 'Conditional or Unconditional';
COMMENT ON COLUMN public.app_lien_waivers.vendor_id IS 'Reference to app_subcontractors.id';

-- Verify all columns added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'app_lien_waivers'
AND column_name IN ('waiver_type', 'waiver_category', 'condition_type', 'vendor_id', 'payment_id', 'form_type', 'is_active', 'signed_at')
ORDER BY column_name;
