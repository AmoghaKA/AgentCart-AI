import type { CheckoutItem, CheckoutSession } from "@/types/checkout";

const CHECKOUT_STORAGE_KEY = "agentcart-ai-active-checkout";

function canUseStorage() { return typeof window !== "undefined" && Boolean(window.localStorage); }

export function loadCheckoutSession(): CheckoutSession | null {
  if (!canUseStorage()) return null;
  const stored = window.localStorage.getItem(CHECKOUT_STORAGE_KEY);
  if (!stored) return null;
  try { return JSON.parse(stored) as CheckoutSession; } catch { return null; }
}

export function saveCheckoutSession(session: CheckoutSession) { if (canUseStorage()) window.localStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(session)); }

export function createCheckoutSession(items: CheckoutItem[]): CheckoutSession {
  const now = new Date().toISOString();
  return { id: `checkout-${Date.now()}`, items, subtotal: items.reduce((total, item) => total + item.unitPrice * item.quantity, 0), currency: "INR", status: "reviewing", createdAt: now, updatedAt: now, activity: [{ id: `activity-${Date.now()}`, message: "Purchase intent loaded", createdAt: now }, { id: `activity-${Date.now()}-created`, message: "Checkout session created", createdAt: now }], approvalStatus: "pending" };
}

export function updateCheckoutSession(session: CheckoutSession, changes: Partial<CheckoutSession>): CheckoutSession {
  const updated = { ...session, ...changes, updatedAt: new Date().toISOString() };
  saveCheckoutSession(updated);
  return updated;
}

export function addCheckoutActivity(session: CheckoutSession, message: string): CheckoutSession {
  const now = new Date().toISOString();
  return updateCheckoutSession(session, { activity: [...session.activity, { id: `activity-${Date.now()}`, message, createdAt: now }] });
}