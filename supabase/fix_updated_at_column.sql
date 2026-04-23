-- ============================================================-- FIX: Add updated_at column to app_lien_waivers-- ============================================================

-- Add updated_at column if it doesn't exist
ALTER TABLE public.app_lien_waivers 
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create trigger to auto-update updated_at (optional but recommended)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop trigger if exists to avoid errors
DROP TRIGGER IF EXISTS update_app_lien_waivers_updated_at ON public.app_lien_waivers;

-- Create trigger
CREATE TRIGGER update_app_lien_waivers_updated_at
  BEFORE UPDATE ON public.app_lien_waivers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Verify
SELECT 'updated_at column added successfully' as status;
