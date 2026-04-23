-- ============================================================-- FIX: Add vendor_id column to app_lien_waivers-- Run this in Supabase SQL Editor to fix the schema cache error-- ============================================================

-- 1. Add vendor_id column if it doesn't exist
ALTER TABLE public.app_lien_waivers 
  ADD COLUMN IF NOT EXISTS vendor_id text;

-- 2. Add comment to document the column
COMMENT ON COLUMN public.app_lien_waivers.vendor_id IS 'Reference to app_subcontractors.id for the vendor/furnisher';

-- 3. Create index for faster vendor lookups
CREATE INDEX IF NOT EXISTS idx_lien_waivers_vendor_id ON public.app_lien_waivers(vendor_id);

-- 4. Verify the column was added (should return 1 row)
SELECT 'vendor_id column added successfully' as status
WHERE EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND table_name = 'app_lien_waivers'
  AND column_name = 'vendor_id'
);
