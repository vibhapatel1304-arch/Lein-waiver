-- ============================================================-- FIX: Add ALL missing columns to app_lien_waivers-- Run this in Supabase SQL Editor-- ============================================================

-- Add all payment and amount columns
ALTER TABLE public.app_lien_waivers 
  ADD COLUMN IF NOT EXISTS invoice_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS paid_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS remaining_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS waiver_amount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS final_balance numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Add waiver metadata columns
ALTER TABLE public.app_lien_waivers 
  ADD COLUMN IF NOT EXISTS waiver_category text DEFAULT 'Partial',
  ADD COLUMN IF NOT EXISTS condition_type text DEFAULT 'Conditional',
  ADD COLUMN IF NOT EXISTS waiver_type text,
  ADD COLUMN IF NOT EXISTS payment_condition text;

-- Add signer/vendor columns
ALTER TABLE public.app_lien_waivers 
  ADD COLUMN IF NOT EXISTS signer_name text,
  ADD COLUMN IF NOT EXISTS signer_title text,
  ADD COLUMN IF NOT EXISTS signer_company text,
  ADD COLUMN IF NOT EXISTS signer_signature text,
  ADD COLUMN IF NOT EXISTS vendor_id text,
  ADD COLUMN IF NOT EXISTS payment_id text;

-- Add workflow columns
ALTER TABLE public.app_lien_waivers 
  ADD COLUMN IF NOT EXISTS signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS access_token text,
  ADD COLUMN IF NOT EXISTS access_token_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS viewed_at timestamptz;

-- Add project/location columns
ALTER TABLE public.app_lien_waivers 
  ADD COLUMN IF NOT EXISTS project_name text,
  ADD COLUMN IF NOT EXISTS job_name_address text,
  ADD COLUMN IF NOT EXISTS owner_contractor text,
  ADD COLUMN IF NOT EXISTS furnisher text;

-- Add template/form columns
ALTER TABLE public.app_lien_waivers 
  ADD COLUMN IF NOT EXISTS form_type text DEFAULT 'K1',
  ADD COLUMN IF NOT EXISTS template_type text DEFAULT 'k1',
  ADD COLUMN IF NOT EXISTS cfr_section text DEFAULT '14.106',
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- Create function for auto-updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS update_app_lien_waivers_updated_at ON public.app_lien_waivers;
CREATE TRIGGER update_app_lien_waivers_updated_at
  BEFORE UPDATE ON public.app_lien_waivers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Verify all columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'app_lien_waivers'
ORDER BY column_name;
