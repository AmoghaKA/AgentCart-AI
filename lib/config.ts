// Centralized configuration for AgentCart AI
// The demo merchant ID is stored here so it's not scattered across the codebase.

export const DEMO_MERCHANT_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

export const MERCHANT_NAME = "AgentCart Demo Store";

export const DEMO_MERCHANT = {
  name: MERCHANT_NAME,
  description: "AI-ready merchant catalog for agentic commerce.",
  currency: "INR" as const,
};

// Currency formatting helper
export function formatCurrency(amount: number): string {
  return `\u20B9${amount.toLocaleString("en-IN")}`;
}
