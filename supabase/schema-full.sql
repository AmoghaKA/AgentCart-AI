-- ============================================================
-- AgentCart AI — Complete Supabase Schema
-- ============================================================
-- Run this entire SQL in the Supabase SQL Editor.
-- It creates all tables, RLS policies, and seed data.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: merchants
-- ============================================================
CREATE TABLE IF NOT EXISTS merchants (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  currency    TEXT NOT NULL DEFAULT 'INR',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: merchant_settings
-- ============================================================
CREATE TABLE IF NOT EXISTS merchant_settings (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id       UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE UNIQUE,
  store_description TEXT NOT NULL DEFAULT '',
  currency          TEXT NOT NULL DEFAULT 'INR',
  public_catalog    BOOLEAN NOT NULL DEFAULT true,
  auto_respond      BOOLEAN NOT NULL DEFAULT true,
  show_pricing      BOOLEAN NOT NULL DEFAULT true,
  cross_sell        BOOLEAN NOT NULL DEFAULT true,
  safety_checks     BOOLEAN NOT NULL DEFAULT true,
  ai_analysis       BOOLEAN NOT NULL DEFAULT true,
  auto_approve      BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_merchant_settings_merchant_id ON merchant_settings(merchant_id);

-- ============================================================
-- TABLE: products
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category    TEXT NOT NULL DEFAULT '',
  price       NUMERIC NOT NULL CHECK (price >= 0),
  stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image       TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_merchant_id ON products(merchant_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- ============================================================
-- TABLE: orders
-- ============================================================
DO $$ BEGIN
  CREATE TYPE order_status AS ENUM (
    'draft','pending_approval','approved','razorpay_order_created',
    'payment_pending','payment_verified','payment_failed','cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS orders (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id          UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  status               order_status NOT NULL DEFAULT 'draft',
  currency             TEXT NOT NULL DEFAULT 'INR',
  subtotal             NUMERIC NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  total                NUMERIC NOT NULL DEFAULT 0 CHECK (total >= 0),
  razorpay_order_id    TEXT,
  razorpay_payment_id  TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_merchant_id ON orders(merchant_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_razorpay_order_id ON orders(razorpay_order_id);

-- ============================================================
-- TABLE: order_items
-- ============================================================
CREATE TABLE IF NOT EXISTS order_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id   UUID NOT NULL,
  product_name TEXT NOT NULL,
  unit_price   NUMERIC NOT NULL CHECK (unit_price >= 0),
  quantity     INTEGER NOT NULL CHECK (quantity > 0),
  line_total   NUMERIC NOT NULL CHECK (line_total >= 0),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- ============================================================
-- TABLE: approvals
-- ============================================================
DO $$ BEGIN
  CREATE TYPE approval_action AS ENUM ('CREATE_RAZORPAY_TEST_ORDER','OPEN_RAZORPAY_PAYMENT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE approval_status AS ENUM ('pending','approved','consumed','expired','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS approvals (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id     UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  action       approval_action NOT NULL,
  amount       NUMERIC NOT NULL CHECK (amount >= 0),
  status       approval_status NOT NULL DEFAULT 'pending',
  approved_at  TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approvals_order_id ON approvals(order_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);

-- ============================================================
-- TABLE: audit_events
-- ============================================================
DO $$ BEGIN
  CREATE TYPE audit_actor AS ENUM ('agent','buyer','system');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE audit_category AS ENUM ('catalog','growth','buyer','checkout','payment','system');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE audit_event_status AS ENUM ('success','failed','blocked');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS audit_events (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id  UUID REFERENCES merchants(id) ON DELETE SET NULL,
  order_id     UUID REFERENCES orders(id) ON DELETE SET NULL,
  actor        audit_actor NOT NULL,
  action       TEXT NOT NULL,
  category     audit_category NOT NULL,
  status       audit_event_status NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  amount       NUMERIC,
  currency     TEXT,
  reference_id TEXT,
  details      JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_merchant_id ON audit_events(merchant_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_order_id ON audit_events(order_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_category ON audit_events(category);
CREATE INDEX IF NOT EXISTS idx_audit_events_status ON audit_events(status);
CREATE INDEX IF NOT EXISTS idx_audit_events_created_at ON audit_events(created_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE merchant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- anon read access (catalog, audit, settings)
CREATE POLICY "anon read merchants" ON merchants FOR SELECT TO anon USING (true);
CREATE POLICY "anon read products" ON products FOR SELECT TO anon USING (true);
CREATE POLICY "anon read audit_events" ON audit_events FOR SELECT TO anon USING (true);
CREATE POLICY "anon insert audit_events" ON audit_events FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon delete audit_events" ON audit_events FOR DELETE TO anon USING (true);

-- anon full access (no-auth prototype)
CREATE POLICY "anon full orders" ON orders FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon full order_items" ON order_items FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon full approvals" ON approvals FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "anon full merchant_settings" ON merchant_settings FOR ALL TO anon USING (true) WITH CHECK (true);

-- service role bypass
CREATE POLICY "service merchants" ON merchants FOR ALL TO service_role USING (true);
CREATE POLICY "service merchant_settings" ON merchant_settings FOR ALL TO service_role USING (true);
CREATE POLICY "service products" ON products FOR ALL TO service_role USING (true);
CREATE POLICY "service orders" ON orders FOR ALL TO service_role USING (true);
CREATE POLICY "service order_items" ON order_items FOR ALL TO service_role USING (true);
CREATE POLICY "service approvals" ON approvals FOR ALL TO service_role USING (true);
CREATE POLICY "service audit_events" ON audit_events FOR ALL TO service_role USING (true);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Demo Merchant
INSERT INTO merchants (id, name, description, currency)
VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'AgentCart Demo Store',
  'AI-ready merchant catalog for agentic commerce.',
  'INR'
) ON CONFLICT (id) DO NOTHING;

-- Default merchant settings
INSERT INTO merchant_settings (merchant_id)
VALUES ('a1b2c3d4-e5f6-7890-abcd-ef1234567890')
ON CONFLICT (merchant_id) DO NOTHING;

-- Demo Products
INSERT INTO products (id, merchant_id, name, description, category, price, stock, image, created_at, updated_at)
VALUES
  ('11111111-1111-1111-1111-111111111111','a1b2c3d4-e5f6-7890-abcd-ef1234567890','CodePro Laptop','High-performance laptop for programming and professional work.','Laptops',18500,10,'laptop','2026-08-01T09:00:00Z','2026-08-01T09:00:00Z'),
  ('22222222-2222-2222-2222-222222222222','a1b2c3d4-e5f6-7890-abcd-ef1234567890','Wireless Mouse','Ergonomic wireless mouse for productivity.','Accessories',499,50,'mouse','2026-08-01T09:05:00Z','2026-08-01T09:05:00Z'),
  ('33333333-3333-3333-3333-333333333333','a1b2c3d4-e5f6-7890-abcd-ef1234567890','Laptop Backpack','Protective backpack for laptops and daily commuting.','Accessories',799,30,'backpack','2026-08-01T09:10:00Z','2026-08-01T09:10:00Z'),
  ('44444444-4444-4444-4444-444444444444','a1b2c3d4-e5f6-7890-abcd-ef1234567890','Mechanical Keyboard','Mechanical keyboard for programmers and professionals.','Accessories',1299,20,'keyboard','2026-08-01T09:15:00Z','2026-08-01T09:15:00Z'),
  ('55555555-5555-5555-5555-555555555555','a1b2c3d4-e5f6-7890-abcd-ef1234567890','Monitor 24-inch','Full HD 24-inch monitor for coding and multitasking.','Monitors',3499,15,'monitor','2026-08-01T09:20:00Z','2026-08-01T09:20:00Z')
ON CONFLICT (id) DO NOTHING;
