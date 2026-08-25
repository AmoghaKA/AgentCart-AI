-- ============================================================
-- Migration: Add Campaigns Table
-- Run this SQL in the Supabase SQL Editor
-- ============================================================

-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('upsell', 'cross_sell', 'discount', 'bundle')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
  target_products TEXT[] DEFAULT '{}',
  discount_percent INTEGER DEFAULT 0,
  message TEXT NOT NULL,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  revenue NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view own campaigns" ON campaigns;
  DROP POLICY IF EXISTS "Users can insert own campaigns" ON campaigns;
  DROP POLICY IF EXISTS "Users can update own campaigns" ON campaigns;
  DROP POLICY IF EXISTS "Users can delete own campaigns" ON campaigns;
  DROP POLICY IF EXISTS "Service role full access on campaigns" ON campaigns;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- RLS policies: Users can only access their own campaigns
CREATE POLICY "Users can view own campaigns"
  ON campaigns FOR SELECT
  USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own campaigns"
  ON campaigns FOR INSERT
  WITH CHECK (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own campaigns"
  ON campaigns FOR UPDATE
  USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own campaigns"
  ON campaigns FOR DELETE
  USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()));

-- Service role full access
CREATE POLICY "Service role full access on campaigns"
  ON campaigns FOR ALL
  USING (auth.role() = 'service_role');

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_campaigns_merchant_id ON campaigns(merchant_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
