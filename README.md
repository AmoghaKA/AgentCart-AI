# AgentCart AI

AI-powered merchant revenue growth and agentic commerce platform. Identifies revenue opportunities through upsell and cross-sell, exposes an agent-readable catalog, enables AI buyers to discover products, and enables safe Razorpay Test Mode checkout with explainable, bounded, and gated money actions.

## Key Features

- **AI Revenue Growth Engine** — Analyzes the merchant catalog to identify cross-sell and upsell opportunities that increase average order value
- **Agent-Readable Catalog** — Structured JSON catalog endpoint that AI agents can consume programmatically
- **AI Buyer** — Simulates an AI buyer that discovers products, parses buyer intent, and prepares purchase intents
- **Conversational Checkout** — Agent-guided checkout flow with real-time safety validation
- **Explainable Money Actions** — Every money action is explained with what it does, why it is needed, and what the result will be
- **Transaction Boundaries** — Hard limits on transaction amount (INR 1,00,000), quantity per item (5), and stock availability
- **Explicit Approval Gates** — Every money action requires separate, action-specific buyer approval before execution
- **Razorpay Test Mode** — Secure test-mode order creation and payment via Razorpay, with server-side signature verification
- **Full Audit Trail** — Every significant action across the application is recorded with actor, category, status, and timestamp
- **Graceful Payment Failure** — When payment fails or is cancelled, the application preserves checkout state, logs the failure, and provides safe retry options

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript 5
- **UI:** React 19, Tailwind CSS 4
- **Payments:** Razorpay Test Mode SDK
- **Storage:** localStorage for client-side persistence
- **Deployment:** Vercel-ready

## Local Setup

```bash
git clone <repository-url>
cd agentcart-ai
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

Create a `.env.local` file in the project root:

```env
# Server-side only (never exposed to browser)
RAZORPAY_KEY_ID=your_test_key_id
RAZORPAY_KEY_SECRET=your_test_key_secret

# Client-side (safe to expose in browser)
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_test_key_id
```

See `.env.example` for the template.

## Razorpay Test Mode

1. Create a free account at [Razorpay](https://razorpay.com)
2. Switch to **Test Mode** in the Razorpay Dashboard
3. Go to **Settings > API Keys** and generate a Test Mode key pair
4. Copy the Key ID and Key Secret into your `.env.local`
5. Use Razorpay's [test card numbers](https://razorpay.com/docs/payments/payments/test-card-upi-details/) for testing (e.g., 4111 1111 1111 1111)

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

## Demo Flow

1. **Dashboard** — See the revenue-growth story at a glance
2. **Catalog** — View, add, edit, or delete products in the merchant catalog
3. **AI Growth Agent** — Analyze the catalog to find cross-sell and upsell opportunities
4. **AI Buyer** — Enter a buyer request (e.g., "Find me a laptop for coding under 70000"), select products, and create a purchase intent
5. **Conversational Checkout** — Review the order, accept or decline cross-sell suggestions, see safety validation pass
6. **Approve Order** — Explicitly approve the creation of a Razorpay test-mode order
7. **Create Order** — The agent creates a Razorpay test order for the approved amount
8. **Approve Payment** — Explicitly approve opening the Razorpay payment interface
9. **Pay** — Complete the test payment through Razorpay's secure interface
10. **Verify** — The server verifies the payment signature
11. **Audit Trail** — View every event recorded during the transaction

To test payment failure: cancel or close the Razorpay payment window. The application will show a graceful failure screen with retry options.

## Challenge Requirements

| Requirement | Implementation |
|---|---|
| Grow merchant revenue | AI upsell/cross-sell engine with revenue impact calculations |
| Agent-readable catalog | Structured JSON catalog served via `/api/catalog` |
| AI buyer | AI Buyer simulation with intent parsing and catalog search |
| Conversational checkout | Agent-guided checkout with chat-style interaction |
| Razorpay Test Mode | Test order creation + Razorpay Checkout integration |
| Explainable money action | Action explanation panel showing what, why, and result |
| Bounded action | INR 1,00,000 max + quantity/stock/price validation |
| Gated action | Explicit action-specific approval before every money action |
| Audit trail | Global event logger with category, status, actor, and timestamp |
| Graceful failure | Payment failure preserves state, logs event, offers retry |
