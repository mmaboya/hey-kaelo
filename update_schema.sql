-- Run this in your Supabase SQL Editor to enable Custom Links & Profiles

-- 1. Add 'Slug' (e.g. 'classic-cuts') for custom links
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- 2. Add Business Name and Context (for AI Instructions)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_context TEXT;

-- 3. (Optional) Ensure Onboarding columns exist if you missed them earlier
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role_category TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role_type TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS slot_granularity INTEGER DEFAULT 60;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS approval_required BOOLEAN DEFAULT TRUE;
