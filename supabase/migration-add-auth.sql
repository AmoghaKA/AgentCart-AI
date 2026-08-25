-- ============================================================
-- Migration: Add Authentication Support
-- Run this SQL in the Supabase SQL Editor
-- ============================================================

-- 1. Add user_id column to merchants table (links to auth.users)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'merchants' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE merchants ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2. Add missing columns to merchants table (settings fields)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'merchants' AND column_name = 'store_description'
  ) THEN
    ALTER TABLE merchants ADD COLUMN store_description TEXT NOT NULL DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'merchants' AND column_name = 'public_catalog'
  ) THEN
    ALTER TABLE merchants ADD COLUMN public_catalog BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'merchants' AND column_name = 'auto_respond'
  ) THEN
    ALTER TABLE merchants ADD COLUMN auto_respond BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'merchants' AND column_name = 'show_pricing'
  ) THEN
    ALTER TABLE merchants ADD COLUMN show_pricing BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'merchants' AND column_name = 'cross_sell'
  ) THEN
    ALTER TABLE merchants ADD COLUMN cross_sell BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'merchants' AND column_name = 'safety_checks'
  ) THEN
    ALTER TABLE merchants ADD COLUMN safety_checks BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'merchants' AND column_name = 'ai_analysis'
  ) THEN
    ALTER TABLE merchants ADD COLUMN ai_analysis BOOLEAN NOT NULL DEFAULT true;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'merchants' AND column_name = 'auto_approve'
  ) THEN
    ALTER TABLE merchants ADD COLUMN auto_approve BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- 3. Create index and unique constraint on user_id
CREATE INDEX IF NOT EXISTS idx_merchants_user_id ON merchants(user_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'merchants_user_id_unique'
  ) THEN
    ALTER TABLE merchants ADD CONSTRAINT merchants_user_id_unique UNIQUE (user_id);
  END IF;
EXCEPTION WHEN others THEN
  -- Ignore if constraint already exists or if there are null values
  NULL;
END $$;

-- 4. Enable RLS on merchants table
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;

-- 5. Drop old permissive policies
DROP POLICY IF EXISTS "Allow anon read merchants" ON merchants;
DROP POLICY IF EXISTS "Service role full access merchants" ON merchants;
DROP POLICY IF EXISTS "Allow anon read products" ON products;
DROP POLICY IF EXISTS "Service role full access products" ON products;
DROP POLICY IF EXISTS "Service role full access orders" ON orders;
DROP POLICY IF EXISTS "Service role full access order_items" ON order_items;
DROP POLICY IF EXISTS "Service role full access approvals" ON approvals;
DROP POLICY IF EXISTS "Service role full access audit_events" ON audit_events;
DROP POLICY IF EXISTS "Allow anon read audit_events" ON audit_events;
DROP POLICY IF EXISTS "Allow anon insert audit_events" ON audit_events;
DROP POLICY IF EXISTS "Allow anon delete audit_events" ON audit_events;
DROP POLICY IF EXISTS "Allow anon full access orders" ON orders;
DROP POLICY IF EXISTS "Allow anon full access order_items" ON order_items;
DROP POLICY IF EXISTS "Allow anon full access approvals" ON approvals;

-- 6. Merchants policies
CREATE POLICY "Users can insert own merchant"
  ON merchants FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read own merchant"
  ON merchants FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own merchant"
  ON merchants FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Allow anon read merchants"
  ON merchants FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Service role full access merchants"
  ON merchants FOR ALL
  TO service_role
  USING (true);

-- 7. Products policies
CREATE POLICY "Users can read own products"
  ON products FOR SELECT
  TO authenticated
  USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own products"
  ON products FOR UPDATE
  TO authenticated
  USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own products"
  ON products FOR DELETE
  TO authenticated
  USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()));

CREATE POLICY "Allow anon read products"
  ON products FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Service role full access products"
  ON products FOR ALL
  TO service_role
  USING (true);

-- 8. Orders policies
CREATE POLICY "Users can read own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()));

CREATE POLICY "Users can update own orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()));

CREATE POLICY "Service role full access orders"
  ON orders FOR ALL
  TO service_role
  USING (true);

-- 9. Order items policies
CREATE POLICY "Users can read own order_items"
  ON order_items FOR SELECT
  TO authenticated
  USING (order_id IN (
    SELECT o.id FROM orders o
    JOIN merchants m ON o.merchant_id = m.id
    WHERE m.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own order_items"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (order_id IN (
    SELECT o.id FROM orders o
    JOIN merchants m ON o.merchant_id = m.id
    WHERE m.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own order_items"
  ON order_items FOR DELETE
  TO authenticated
  USING (order_id IN (
    SELECT o.id FROM orders o
    JOIN merchants m ON o.merchant_id = m.id
    WHERE m.user_id = auth.uid()
  ));

CREATE POLICY "Service role full access order_items"
  ON order_items FOR ALL
  TO service_role
  USING (true);

-- 10. Approvals policies
CREATE POLICY "Users can read own approvals"
  ON approvals FOR SELECT
  TO authenticated
  USING (order_id IN (
    SELECT o.id FROM orders o
    JOIN merchants m ON o.merchant_id = m.id
    WHERE m.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own approvals"
  ON approvals FOR INSERT
  TO authenticated
  WITH CHECK (order_id IN (
    SELECT o.id FROM orders o
    JOIN merchants m ON o.merchant_id = m.id
    WHERE m.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own approvals"
  ON approvals FOR UPDATE
  TO authenticated
  USING (order_id IN (
    SELECT o.id FROM orders o
    JOIN merchants m ON o.merchant_id = m.id
    WHERE m.user_id = auth.uid()
  ));

CREATE POLICY "Service role full access approvals"
  ON approvals FOR ALL
  TO service_role
  USING (true);

-- 11. Audit events policies
CREATE POLICY "Users can read own audit_events"
  ON audit_events FOR SELECT
  TO authenticated
  USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()));

CREATE POLICY "Users can insert own audit_events"
  ON audit_events FOR INSERT
  TO authenticated
  WITH CHECK (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete own audit_events"
  ON audit_events FOR DELETE
  TO authenticated
  USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()));

CREATE POLICY "Service role full access audit_events"
  ON audit_events FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Allow anon read audit_events"
  ON audit_events FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert audit_events"
  ON audit_events FOR INSERT
  TO anon
  WITH CHECK (true);
