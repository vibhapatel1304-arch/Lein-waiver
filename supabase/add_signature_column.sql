-- ============================================================
-- MIGRATION: Add Signature support to Lien Waivers
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Add signer_signature column to store base64 signature images
ALTER TABLE public.app_lien_waivers 
  ADD COLUMN IF NOT EXISTS signer_signature text;

-- Add signer_title and signer_company if missing (fallbacks)
ALTER TABLE public.app_lien_waivers 
  ADD COLUMN IF NOT EXISTS signer_title text;

ALTER TABLE public.app_lien_waivers 
  ADD COLUMN IF NOT EXISTS signer_company text;

-- Verify columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'app_lien_waivers' 
AND column_name IN ('signer_signature', 'signer_title', 'signer_company');
