// Centralized configuration for AgentCart AI

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
