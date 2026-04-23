-- ============================================================-- FIX: Add vendor_id column to app_lien_waivers-- This ensures the column exists and refreshes Supabase schema cache-- ============================================================

-- 1. Add vendor_id column if it doesn't exist (idempotent)ALTER TABLE public.app_lien_waivers 
  ADD COLUMN IF NOT EXISTS vendor_id text;

-- 2. Add foreign key constraint separately (if table exists)DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'app_subcontractors'
  ) THEN
    -- Add FK constraint if not exists
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_schema = 'public' 
      AND constraint_name = 'app_lien_waivers_vendor_id_fkey'
    ) THEN
      ALTER TABLE public.app_lien_waivers 
        ADD CONSTRAINT app_lien_waivers_vendor_id_fkey 
        FOREIGN KEY (vendor_id) REFERENCES public.app_subcontractors(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- 3. Create index for vendor lookupsCREATE INDEX IF NOT EXISTS idx_lien_waivers_vendor_id ON public.app_lien_waivers(vendor_id);

-- 4. Refresh Supabase schema cache (important!)
-- This forces Supabase to refresh its column metadata
NOTIFY pgrst, 'reload schema';

-- Alternative: Use this if NOTIFY doesn't work
SELECT pg_sleep(0.1);

-- 5. Verify column exists (for debugging)
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'app_lien_waivers'
AND column_name = 'vendor_id';
