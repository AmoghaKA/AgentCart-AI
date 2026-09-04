# AgentCart AI

AI-powered merchant revenue growth and agentic commerce platform. Identifies revenue opportunities through upsell and cross-sell, runs AI marketing campaigns, exposes an agent-readable catalog, enables AI buyers to discover products, and enables safe Razorpay Test Mode checkout with explainable, bounded, and gated money actions — all protected by authentication and a full audit trail.

## Key Features

- **Authentication & Multi-Merchant** — Email/password auth via Supabase; each user is scoped to their own merchant workspace
- **AI Revenue Growth Engine** — Analyzes the merchant catalog to identify cross-sell and upsell opportunities that increase average order value, with confidence scores and revenue impact
- **AI Campaign Management** — Generate upsell, cross-sell, discount, and bundle campaigns with AI; activate, pause, and track impressions/clicks/conversions/revenue
- **Discount Engine** — Active campaigns apply discounts to products and checkout totals in real time, with best-discount resolution
- **Agent-Readable Catalog** — Structured JSON catalog endpoint that AI agents can consume programmatically
- **AI Buyer** — Simulates an AI buyer that discovers products, parses buyer intent, and prepares purchase intents via streaming chat
- **Conversational Checkout** — Agent-guided checkout flow with real-time safety validation
- **Explainable Money Actions** — Every money action is explained with what it does, why it is needed, and what the result will be
- **Transaction Boundaries** — Hard limits on transaction amount (₹50,000), quantity per item (5), and stock/price integrity validation
- **Explicit Approval Gates** — Every money action requires separate, action-specific buyer approval before execution
- **Razorpay Test Mode** — Secure test-mode order creation and payment via Razorpay, with server-side signature verification and webhook handling
- **Full Audit Trail** — Every significant action across the application is recorded with actor, category, status, and timestamp
- **Graceful Payment Failure** — When payment fails or is cancelled, the application preserves checkout state, logs the failure, and provides safe retry options

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript 5
- **UI:** React 19, Tailwind CSS 4
- **Backend / Auth / Database:** Supabase (PostgreSQL, Auth, Row-Level Security)
- **AI:** Vercel AI SDK with Groq (GPT-OSS) or Google Gemini
- **Payments:** Razorpay Test Mode SDK + webhooks
- **Deployment:** Vercel-ready

## Project Structure

```
app/
├── api/                    # Route handlers (REST endpoints)
│   ├── ai/                 # AI growth, search, checkout message generation
│   ├── auth/               # Login & signup API routes
│   ├── campaigns/          # AI campaign generation
│   ├── catalog/            # Agent-readable catalog JSON
│   ├── chat/               # AI buyer streaming chat
│   ├── merchant-settings/  # Merchant configuration
│   ├── razorpay/           # create-order, verify-payment
│   └── webhooks/           # Razorpay payment webhooks
├── ai-buyer/               # AI buyer workspace
├── audit/                  # Audit trail page
├── auth/                   # Login / signup / callback screens
├── campaigns/              # Campaign management page
├── catalog/                # Product catalog management
├── checkout/               # Conversational checkout page
├── dashboard/              # Merchant dashboard
├── growth-agent/           # Revenue growth workspace
└── settings/               # Merchant settings page
components/                 # UI components (buyer, campaigns, catalog,
                            #  checkout, dashboard, growth, layout)
lib/                        # Business logic
├── ai.ts                   # AI model helpers & prompts
├── actionControls.ts       # Money action control evaluation
├── auditLogger.ts          # Audit event logging
├── auth.ts                 # Merchant/user helpers
├── buyerEngine.ts          # AI buyer intent engine
├── campaign*.ts            # Campaign orchestration, effects, tracking
├── catalogStorage.ts       # Catalog persistence (Supabase)
├── checkoutStorage.ts      # Checkout session persistence
├── safety.ts               # Transaction boundary validation
└── supabase/               # Client / server / session clients
supabase/                   # SQL migrations & schema
types/                      # TypeScript types
scripts/                    # Utility scripts
```

## Local Setup

```bash
git clone <repository-url>
cd agentcart-ai
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Supabase Setup

1. Create a free project at [Supabase](https://supabase.com)
2. Copy the project URL and anon key from **Project Settings > API**
3. Generate a **service_role** key (stored server-side only)
4. Run the SQL files in `supabase/` against your project:
   - `schema.sql` / `schema-full.sql` — core tables
   - `migration-add-auth.sql` — authentication tables
   - `migration-add-campaigns.sql` — campaign tables
   - `fix-all-policies.sql` — Row-Level Security policies
5. Enable **Email** provider under **Authentication > Providers** for email/password signup

## Environment Variables

Create a `.env.local` file in the project root (see `.env.example`):

```env
# Supabase (Project Settings > API)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Razorpay Test Mode (https://dashboard.razorpay.com/app/keys — use Test Mode)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
NEXT_PUBLIC_RAZORPAY_KEY_ID=

# AI providers (optional — supply at least one)
GROQ_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
NEXT_PUBLIC_GOOGLE_GENERATIVE_AI_API_KEY=
```

> **Note:** All AI features gracefully fall back to deterministic rules-based logic if no AI provider key is configured, so the app remains fully functional without AI keys.

## Razorpay Test Mode

1. Create a free account at [Razorpay](https://razorpay.com)
2. Switch to **Test Mode** in the Razorpay Dashboard
3. Go to **Settings > API Keys** and generate a Test Mode key pair
4. Copy the Key ID and Key Secret into your `.env.local`
5. (Optional) Configure a webhook URL pointing to `/api/webhooks/razorpay` for payment event tracking
6. Use Razorpay's [test card numbers](https://razorpay.com/docs/payments/payments/test-card-upi-details/) for testing (e.g., 4111 1111 1111 1111)

## Safety Model

Every money action follows this flow:

```
Explain    →  What will happen and why
Validate   →  Check transaction boundaries (amount, quantity, stock, price)
Approve    →  Buyer explicitly approves the specific action
Execute    →  Action is performed only after approval
Verify     →  Server-side verification of the result
Audit      →  Event is recorded in the audit trail
```

### Transaction Boundaries

| Boundary | Limit |
|---|---|
| Max transaction amount | ₹50,000 |
| Max quantity per item | 5 |
| Stock availability | Must be > 0 and >= ordered quantity |
| Product existence | Must exist in the merchant catalog |
| Price integrity | Must match verified catalog (or valid campaign discount) |

### Approval Gates

Money actions block until approved, and each approval is scoped to a specific action type, amount, and (for payments) Razorpay order. Creating an order does **not** automatically approve opening payment — two separate explicit approvals are required.

## AI Capabilities

AgentCart supports two interchangeable AI providers:

- **Groq** — uses `openai/gpt-oss-120b` when `GROQ_API_KEY` is set
- **Google Gemini** — uses `gemini-2.0-flash` when `GOOGLE_GENERATIVE_AI_API_KEY` (or the `NEXT_PUBLIC_` variant) is set

Sources are prioritized (Groq first), and every call has a rules-based fallback when AI is unavailable or fails. AI powers:

- Revenue opportunity analysis (cross-sell / upsell)
- Campaign generation (upsell, cross-sell, discount, bundle)
- Buyer intent parsing and product matching
- Streaming buyer chat
- Conversational checkout messaging

## Demo Flow

1. **Sign Up / Log In** — Create an account; each user gets their own merchant workspace
2. **Dashboard** — See the revenue-growth story, campaign metrics, and recent activity at a glance
3. **Catalog** — View, add, edit, or delete products in the merchant catalog
4. **AI Growth Agent** — Analyze the catalog to find cross-sell and upsell opportunities
5. **Campaigns** — Generate AI campaigns, activate them, and apply discounts to products
6. **AI Buyer** — Enter a buyer request (e.g., "Find me a laptop for coding under 70000"), select products, and create a purchase intent
7. **Conversational Checkout** — Review the order, accept or decline cross-sell suggestions, and see active discounts + safety validation pass
8. **Approve Order** — Explicitly approve the creation of a Razorpay test-mode order
9. **Create Order** — The agent creates a Razorpay test order for the approved amount
10. **Approve Payment** — Explicitly approve opening the Razorpay payment interface
11. **Pay** — Complete the test payment through Razorpay's secure interface
12. **Verify** — The server verifies the payment signature
13. **Audit Trail** — View every event recorded during the transaction
14. **Settings** — Update merchant details

To test payment failure: cancel or close the Razorpay payment window. The application will show a graceful failure screen with retry options.

## API Endpoints

| Method | Route | Description |
|---|---|---|
| GET | `/api/catalog` | Agent-readable catalog JSON |
| POST | `/api/auth/login` | Log in a user |
| POST | `/api/auth/signup` | Create a user account |
| POST | `/api/ai/growth` | Analyze revenue growth opportunities |
| POST | `/api/ai/search` | Match products to buyer intent |
| POST | `/api/ai/checkout` | Generate conversational checkout messages |
| POST | `/api/campaigns/generate` | Generate AI marketing campaigns |
| POST | `/api/razorpay/create-order` | Create a Razorpay test-mode order |
| POST | `/api/razorpay/verify-payment` | Verify a Razorpay payment signature |
| POST | `/api/webhooks/razorpay` | Handle Razorpay payment webhooks |
| GET | `/api/merchant-settings` | Fetch merchant configuration |

## Scripts

```bash
npm run dev      # Start dev server (Turbopack)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Challenge Requirements

| Requirement | Implementation |
|---|---|
| Grow merchant revenue | AI upsell/cross-sell engine + AI marketing campaigns with revenue impact |
| Agent-readable catalog | Structured JSON catalog served via `/api/catalog` |
| AI buyer | AI Buyer simulation with intent parsing, streaming chat, and catalog search |
| Conversational checkout | Agent-guided checkout with chat-style interaction |
| Razorpay Test Mode | Test order creation + Razorpay Checkout integration + webhooks |
| Explainable money action | Action explanation panel showing what, why, and result |
| Bounded action | ₹50,000 max + quantity/stock/price/amount validation |
| Gated action | Explicit action-specific approval before every money action |
| Audit trail | Global event logger with category, status, actor, and timestamp |
| Graceful failure | Payment failure preserves state, logs event, offers retry |
