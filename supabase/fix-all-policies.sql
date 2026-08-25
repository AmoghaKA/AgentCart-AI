-- ============================================================
-- FIX: Complete reset of all RLS policies
-- Run this SQL in the Supabase SQL Editor
-- This fixes catalog products not being saved
-- ============================================================

-- 1. Ensure user_id column exists on merchants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'merchants' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE merchants ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2. Ensure merchant_settings columns exist on merchants (moved from separate table)
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

-- 3. Create index on user_id
CREATE INDEX IF NOT EXISTS idx_merchants_user_id ON merchants(user_id);

-- 4. Enable RLS on ALL tables
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- 5. DROP ALL existing policies on ALL tables (clean slate)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname, tablename
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- 6. Merchants policies
CREATE POLICY "merchants_insert_auth"
  ON merchants FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "merchants_select_auth"
  ON merchants FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "merchants_update_auth"
  ON merchants FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "merchants_select_anon"
  ON merchants FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "merchants_all_service"
  ON merchants FOR ALL
  TO service_role
  USING (true);

-- 7. Products policies
CREATE POLICY "products_select_auth"
  ON products FOR SELECT
  TO authenticated
  USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()));

CREATE POLICY "products_insert_auth"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()));

CREATE POLICY "products_update_auth"
  ON products FOR UPDATE
  TO authenticated
  USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()));

CREATE POLICY "products_delete_auth"
  ON products FOR DELETE
  TO authenticated
  USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()));

CREATE POLICY "products_select_anon"
  ON products FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "products_all_service"
  ON products FOR ALL
  TO service_role
  USING (true);

-- 8. Orders policies
CREATE POLICY "orders_select_auth"
  ON orders FOR SELECT
  TO authenticated
  USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()));

CREATE POLICY "orders_insert_auth"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()));

CREATE POLICY "orders_update_auth"
  ON orders FOR UPDATE
  TO authenticated
  USING (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()));

CREATE POLICY "orders_all_service"
  ON orders FOR ALL
  TO service_role
  USING (true);

-- 9. Order items policies
CREATE POLICY "order_items_select_auth"
  ON order_items FOR SELECT
  TO authenticated
  USING (order_id IN (
    SELECT o.id FROM orders o
    JOIN merchants m ON o.merchant_id = m.id
    WHERE m.user_id = auth.uid()
  ));

CREATE POLICY "order_items_insert_auth"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (order_id IN (
    SELECT o.id FROM orders o
    JOIN merchants m ON o.merchant_id = m.id
    WHERE m.user_id = auth.uid()
  ));

CREATE POLICY "order_items_delete_auth"
  ON order_items FOR DELETE
  TO authenticated
  USING (order_id IN (
    SELECT o.id FROM orders o
    JOIN merchants m ON o.merchant_id = m.id
    WHERE m.user_id = auth.uid()
  ));

CREATE POLICY "order_items_all_service"
  ON order_items FOR ALL
  TO service_role
  USING (true);

-- 10. Approvals policies
CREATE POLICY "approvals_select_auth"
  ON approvals FOR SELECT
  TO authenticated
  USING (order_id IN (
    SELECT o.id FROM orders o
    JOIN merchants m ON o.merchant_id = m.id
    WHERE m.user_id = auth.uid()
  ));

CREATE POLICY "approvals_insert_auth"
  ON approvals FOR INSERT
  TO authenticated
  WITH CHECK (order_id IN (
    SELECT o.id FROM orders o
    JOIN merchants m ON o.merchant_id = m.id
    WHERE m.user_id = auth.uid()
  ));

CREATE POLICY "approvals_update_auth"
  ON approvals FOR UPDATE
  TO authenticated
  USING (order_id IN (
    SELECT o.id FROM orders o
    JOIN merchants m ON o.merchant_id = m.id
    WHERE m.user_id = auth.uid()
  ));

CREATE POLICY "approvals_all_service"
  ON approvals FOR ALL
  TO service_role
  USING (true);

-- 11. Audit events policies
CREATE POLICY "audit_select_auth"
  ON audit_events FOR SELECT
  TO authenticated
  USING (
    merchant_id IS NULL
    OR merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

CREATE POLICY "audit_insert_auth"
  ON audit_events FOR INSERT
  TO authenticated
  WITH CHECK (
    merchant_id IS NULL
    OR merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

CREATE POLICY "audit_select_anon"
  ON audit_events FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "audit_insert_anon"
  ON audit_events FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "audit_delete_anon"
  ON audit_events FOR DELETE
  TO anon
  USING (true);

CREATE POLICY "audit_all_service"
  ON audit_events FOR ALL
  TO service_role
  USING (true);

-- 12. Verify: Show all policies
SELECT tablename, policyname, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
