/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CheckoutItem, CheckoutSession } from "@/types/checkout";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { DEMO_MERCHANT_ID } from "@/lib/config";

function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function q(): any {
  return getSupabaseBrowserClient();
}

function mapOrderStatusToCheckout(status: string): string {
  const map: Record<string, string> = {
    draft: "reviewing",
    pending_approval: "pending_approval",
    approved: "approved",
    razorpay_order_created: "order_created",
    payment_pending: "payment_opened",
    payment_verified: "payment_verified",
    payment_failed: "payment_failed",
    cancelled: "cancelled",
  };
  return map[status] || "reviewing";
}

function mapCheckoutToOrderStatus(status: string): string {
  const map: Record<string, string> = {
    draft: "draft",
    reviewing: "draft",
    pending_approval: "pending_approval",
    approved: "approved",
    creating_order: "approved",
    order_created: "razorpay_order_created",
    payment_opened: "payment_pending",
    payment_verifying: "payment_pending",
    payment_verified: "payment_verified",
    payment_failed: "payment_failed",
    cancelled: "cancelled",
  };
  return map[status] || "draft";
}

export async function loadCheckoutSession(): Promise<CheckoutSession | null> {
  try {
    const { data: order, error: orderError } = await q().from("orders").select("*").eq("merchant_id", DEMO_MERCHANT_ID).not("status", "in", "(payment_verified,cancelled)").order("created_at", { ascending: false }).limit(1).single();
    if (orderError || !order) return null;

    const { data: items } = await q().from("order_items").select("*").eq("order_id", order.id);
    const { data: approval } = await q().from("approvals").select("*").eq("order_id", order.id).eq("action", "CREATE_RAZORPAY_TEST_ORDER").order("created_at", { ascending: false }).limit(1).single();
    const { data: paymentApproval } = await q().from("approvals").select("*").eq("order_id", order.id).eq("action", "OPEN_RAZORPAY_PAYMENT").order("created_at", { ascending: false }).limit(1).single();

    const session: CheckoutSession = {
      id: order.id,
      items: (items || []).map((item: any) => ({
        productId: item.product_id,
        name: item.product_name,
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
      })),
      subtotal: Number(order.subtotal),
      currency: "INR",
      status: mapOrderStatusToCheckout(order.status) as CheckoutSession["status"],
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      activity: [],
      approvalStatus: approval?.status === "approved" ? "approved" : "pending",
      approvedAt: approval?.approved_at || undefined,
      approvedAmount: approval?.status === "approved" ? Number(approval.amount) : undefined,
      approvedAction: approval?.status === "approved" ? "CREATE_RAZORPAY_TEST_ORDER" : undefined,
      razorpayOrderId: order.razorpay_order_id || undefined,
      razorpayOrderAmount: order.razorpay_order_id ? Number(order.total) : undefined,
      razorpayOrderCreatedAt: order.razorpay_order_id ? order.updated_at : undefined,
      orderCreationStatus: order.razorpay_order_id ? "created" : "pending",
      razorpayPaymentId: order.razorpay_payment_id || undefined,
      paymentApprovalStatus: paymentApproval?.status === "approved" ? "approved" : "pending",
      paymentApprovedAt: paymentApproval?.approved_at || undefined,
      paymentApprovedAmount: paymentApproval?.status === "approved" ? Number(paymentApproval.amount) : undefined,
      paymentApprovedAction: paymentApproval?.status === "approved" ? "OPEN_RAZORPAY_PAYMENT" : undefined,
      paymentApprovedOrderId: paymentApproval?.status === "approved" ? order.razorpay_order_id || undefined : undefined,
    };

    return session;
  } catch (err) {
    console.error("Failed to load checkout session:", err);
    return null;
  }
}

export async function saveCheckoutSession(session: CheckoutSession): Promise<void> {
  try {
    const orderStatus = mapCheckoutToOrderStatus(session.status);

    await q().from("orders").upsert({
      id: session.id,
      merchant_id: DEMO_MERCHANT_ID,
      status: orderStatus,
      currency: "INR",
      subtotal: session.subtotal,
      total: session.subtotal,
      razorpay_order_id: session.razorpayOrderId || null,
      razorpay_payment_id: session.razorpayPaymentId || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });

    if (session.items.length > 0) {
      await q().from("order_items").delete().eq("order_id", session.id);

      const orderItems = session.items.map((item) => ({
        order_id: session.id,
        product_id: item.productId,
        product_name: item.name,
        unit_price: item.unitPrice,
        quantity: item.quantity,
        line_total: item.unitPrice * item.quantity,
      }));

      await q().from("order_items").insert(orderItems);
    }
  } catch (err) {
    console.error("Supabase connection error for checkout:", err);
  }
}

export async function createCheckoutSession(items: CheckoutItem[]): Promise<CheckoutSession> {
  const now = new Date().toISOString();
  const subtotal = items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);

  const session: CheckoutSession = {
    id: generateUUID(),
    items,
    subtotal,
    currency: "INR",
    status: "reviewing",
    createdAt: now,
    updatedAt: now,
    activity: [
      { id: `activity-${Date.now()}`, message: "Purchase intent loaded", createdAt: now },
      { id: `activity-${Date.now()}-created`, message: "Checkout session created", createdAt: now },
    ],
    approvalStatus: "pending",
    orderCreationStatus: "pending",
    paymentApprovalStatus: "pending",
  };

  await saveCheckoutSession(session);
  return session;
}

export async function updateCheckoutSession(
  session: CheckoutSession,
  changes: Partial<CheckoutSession>
): Promise<CheckoutSession> {
  const updated = {
    ...session,
    ...changes,
    updatedAt: new Date().toISOString(),
  };

  await saveCheckoutSession(updated);
  return updated;
}

export async function addCheckoutActivity(
  session: CheckoutSession,
  message: string
): Promise<CheckoutSession> {
  const now = new Date().toISOString();
  return updateCheckoutSession(session, {
    activity: [
      ...session.activity,
      { id: `activity-${Date.now()}`, message, createdAt: now },
    ],
  });
}

export async function markOrderCreationConsumed(
  session: CheckoutSession
): Promise<CheckoutSession> {
  return updateCheckoutSession(session, { orderCreationStatus: "consumed" });
}

export function isOrderCreationAllowed(session: CheckoutSession): boolean {
  return session.orderCreationStatus !== "consumed";
}

export async function approvePayment(
  session: CheckoutSession,
  orderId: string,
  amount: number
): Promise<CheckoutSession> {
  try {
    await q().from("approvals").insert({
      order_id: session.id,
      action: "OPEN_RAZORPAY_PAYMENT",
      amount,
      status: "approved",
      approved_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Failed to save payment approval:", err);
  }

  return updateCheckoutSession(session, {
    paymentApprovalStatus: "approved",
    paymentApprovedAt: new Date().toISOString(),
    paymentApprovedAmount: amount,
    paymentApprovedAction: "OPEN_RAZORPAY_PAYMENT",
    paymentApprovedOrderId: orderId,
  });
}

export function isPaymentApprovalValid(session: CheckoutSession): boolean {
  if (session.paymentApprovalStatus !== "approved") return false;
  if (!session.paymentApprovedOrderId) return false;
  if (session.paymentApprovedOrderId !== session.razorpayOrderId) return false;
  if (
    session.paymentApprovedAmount != null &&
    session.razorpayOrderAmount != null &&
    Math.abs(session.paymentApprovedAmount - session.razorpayOrderAmount) > 0.01
  )
    return false;
  return true;
}

export async function approveOrderCreation(
  session: CheckoutSession,
  amount: number
): Promise<void> {
  try {
    await q().from("approvals").insert({
      order_id: session.id,
      action: "CREATE_RAZORPAY_TEST_ORDER",
      amount,
      status: "approved",
      approved_at: new Date().toISOString(),
    });

    await q().from("orders").update({ status: "approved", updated_at: new Date().toISOString() }).eq("id", session.id);
  } catch (err) {
    console.error("Failed to save order approval:", err);
  }
}

export async function recordRazorpayOrder(
  orderId: string,
  razorpayOrderId: string,
  amount: number
): Promise<void> {
  try {
    await q().from("orders").update({
      status: "razorpay_order_created",
      razorpay_order_id: razorpayOrderId,
      total: amount,
      updated_at: new Date().toISOString(),
    }).eq("id", orderId);

    await q().from("approvals").update({ status: "consumed" }).eq("order_id", orderId).eq("action", "CREATE_RAZORPAY_TEST_ORDER").eq("status", "approved");
  } catch (err) {
    console.error("Failed to record Razorpay order:", err);
  }
}

export async function recordPaymentVerified(
  orderId: string,
  razorpayPaymentId: string
): Promise<void> {
  try {
    await q().from("orders").update({
      status: "payment_verified",
      razorpay_payment_id: razorpayPaymentId,
      updated_at: new Date().toISOString(),
    }).eq("id", orderId);
  } catch (err) {
    console.error("Failed to record payment verification:", err);
  }
}

export async function recordPaymentFailed(orderId: string): Promise<void> {
  try {
    await q().from("orders").update({
      status: "payment_failed",
      updated_at: new Date().toISOString(),
    }).eq("id", orderId);
  } catch (err) {
    console.error("Failed to record payment failure:", err);
  }
}

export async function cancelOrder(orderId: string): Promise<void> {
  try {
    await q().from("orders").update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    }).eq("id", orderId);
  } catch (err) {
    console.error("Failed to cancel order:", err);
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
