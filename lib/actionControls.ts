import type { CheckoutSession, CheckoutItem } from "@/types/checkout";
import type {
  MoneyActionType,
  MoneyActionControl,
  ActionExplanation,
  ActionBoundary,
  ActionGate,
  ActionBlockedReason,
  ActionState,
} from "@/types/actionControl";
import type { Product } from "@/types/product";
import { MAX_TRANSACTION_AMOUNT, MAX_QUANTITY_PER_ORDER } from "./safety";
import { MERCHANT_NAME } from "./config";

function money(value: number): string {
  return `₹${value.toLocaleString("en-IN")}`;
}

function computeTotal(
  items: CheckoutItem[],
  catalog: Product[]
): number {
  const byId = new Map(catalog.map((p) => [p.id, p]));
  return items.reduce(
    (sum, item) => sum + (byId.get(item.productId)?.price ?? item.unitPrice) * item.quantity,
    0
  );
}

function buildExplanation(
  type: MoneyActionType,
  amount: number,
  session: CheckoutSession
): ActionExplanation {
  if (type === "CREATE_RAZORPAY_TEST_ORDER") {
    return {
      action: "Create Razorpay Test-Mode Order",
      amount,
      currency: "INR",
      reason:
        "The buyer selected these products and explicitly approved order creation after reviewing the complete order.",
      merchant: MERCHANT_NAME,
      result:
        "A Razorpay Test Mode order will be created. No payment will be completed automatically.",
    };
  }
  return {
    action: "Open Razorpay Test Payment",
    amount,
    currency: "INR",
    reason:
      "A valid Razorpay Test Mode order was successfully created for the buyer's approved checkout.",
    merchant: MERCHANT_NAME,
    result:
      "The buyer will be redirected into Razorpay's secure Test Mode payment interface. The AI agent cannot complete the payment on the buyer's behalf.",
    ...(session.razorpayOrderId ? { orderId: session.razorpayOrderId } : {}),
  } as ActionExplanation & { orderId?: string };
}

function buildBoundaries(
  type: MoneyActionType,
  amount: number,
  items: CheckoutItem[],
  catalog: Product[],
  session: CheckoutSession
): ActionBoundary[] {
  const byId = new Map(catalog.map((p) => [p.id, p]));
  const allProductsExist = items.every((item) => byId.has(item.productId));
  const allAvailable =
    allProductsExist &&
    items.every((item) => {
      const p = byId.get(item.productId)!;
      return p.stock > 0 && item.quantity <= p.stock;
    });
  const quantitiesValid = items.every(
    (item) =>
      Number.isInteger(item.quantity) &&
      item.quantity >= 1 &&
      item.quantity <= MAX_QUANTITY_PER_ORDER
  );
  const pricesVerified =
    allProductsExist &&
    items.every((item) => byId.get(item.productId)!.price === item.unitPrice);

  const boundaries: ActionBoundary[] = [
    {
      label: `Maximum transaction amount`,
      limit: money(MAX_TRANSACTION_AMOUNT),
      current: money(amount),
      passed: amount > 0 && amount <= MAX_TRANSACTION_AMOUNT,
      detail:
        amount > MAX_TRANSACTION_AMOUNT
          ? `Transaction exceeds the maximum allowed amount of ${money(MAX_TRANSACTION_AMOUNT)}.`
          : undefined,
    },
    {
      label: `Maximum quantity per item`,
      limit: `${MAX_QUANTITY_PER_ORDER}`,
      current: items.map((i) => `${i.quantity}`).join(", ") || "N/A",
      passed: quantitiesValid,
      detail: !quantitiesValid
        ? `Each item must be between 1 and ${MAX_QUANTITY_PER_ORDER}.`
        : undefined,
    },
    {
      label: "Stock validation",
      limit: "All items in stock",
      current: allAvailable ? "Passed" : "Failed",
      passed: allAvailable,
      detail: !allAvailable
        ? "One or more selected products are no longer available or stock is insufficient."
        : undefined,
    },
    {
      label: "Product existence check",
      limit: "All products exist in catalog",
      current: allProductsExist ? "Passed" : "Failed",
      passed: allProductsExist,
      detail: !allProductsExist
        ? "One or more selected products are no longer in the merchant catalog."
        : undefined,
    },
    {
      label: "Price integrity",
      limit: "Catalog price verified",
      current: pricesVerified ? "Passed" : "Failed",
      passed: pricesVerified,
      detail: !pricesVerified
        ? "Product price changed after selection. The checkout must use the current verified catalog price."
        : undefined,
    },
  ];

  if (type === "OPEN_RAZORPAY_PAYMENT") {
    const hasOrder = Boolean(session.razorpayOrderId);
    boundaries.push({
      label: "Razorpay order validity",
      limit: "Valid order exists",
      current: hasOrder ? session.razorpayOrderId! : "N/A",
      passed: hasOrder,
      detail: hasOrder
        ? undefined
        : "No valid Razorpay order has been created yet.",
    });
  }

  return boundaries;
}

function buildGate(
  type: MoneyActionType,
  session: CheckoutSession
): ActionGate {
  if (type === "CREATE_RAZORPAY_TEST_ORDER") {
    return {
      approvalRequired: true,
      approvalStatus: session.approvalStatus,
      approvedAction: session.approvedAction,
      approvedAmount: session.approvedAmount,
      approvedAt: session.approvedAt,
    };
  }
  return {
    approvalRequired: true,
    approvalStatus: session.paymentApprovalStatus ?? "pending",
    approvedAction: session.paymentApprovedAction,
    approvedAmount: session.paymentApprovedAmount,
    approvedAt: session.paymentApprovedAt,
    approvedOrderId: session.paymentApprovedOrderId,
  };
}

function evaluateBlockedReasons(
  type: MoneyActionType,
  amount: number,
  boundaries: ActionBoundary[],
  gate: ActionGate,
  session: CheckoutSession
): ActionBlockedReason[] {
  const reasons: ActionBlockedReason[] = [];

  for (const b of boundaries) {
    if (!b.passed) {
      reasons.push({ reason: b.detail ?? `${b.label} failed.`, detail: b.label });
    }
  }

  if (type === "CREATE_RAZORPAY_TEST_ORDER") {
    if (gate.approvalStatus !== "approved") {
      reasons.push({
        reason: "This action requires explicit buyer approval before execution.",
        detail: "Approval required",
      });
    }
    if (
      gate.approvedAmount != null &&
      Math.abs(gate.approvedAmount - amount) > 0.01
    ) {
      reasons.push({
        reason: "Approval amount does not match the current validated total.",
        detail: "Amount mismatch",
      });
    }
    if (gate.approvedAction && gate.approvedAction !== type) {
      reasons.push({
        reason: "This approval is for a different action type.",
        detail: "Action mismatch",
      });
    }
    if (!isOrderCreationAllowed(session)) {
      reasons.push({
        reason: "Order creation has already been consumed. Please start a new checkout.",
        detail: "Already consumed",
      });
    }
  }

  if (type === "OPEN_RAZORPAY_PAYMENT") {
    if (!session.razorpayOrderId) {
      reasons.push({
        reason: "No Razorpay order has been created yet. Create an order first.",
        detail: "No order",
      });
    }
    if (gate.approvalStatus !== "approved") {
      reasons.push({
        reason:
          "This action requires separate explicit approval. Creating an order does not automatically approve opening payment.",
        detail: "Approval required",
      });
    }
    if (
      gate.approvedOrderId &&
      gate.approvedOrderId !== session.razorpayOrderId
    ) {
      reasons.push({
        reason: "Approval was for a different Razorpay order. The order has changed.",
        detail: "Order mismatch",
      });
    }
    if (
      gate.approvedAmount != null &&
      session.razorpayOrderAmount != null &&
      Math.abs(gate.approvedAmount - session.razorpayOrderAmount) > 0.01
    ) {
      reasons.push({
        reason: "Approval amount does not match the current order amount.",
        detail: "Amount mismatch",
      });
    }
  }

  return reasons;
}

function evaluateState(
  type: MoneyActionType,
  allowed: boolean,
  gate: ActionGate,
  session: CheckoutSession
): ActionState {
  if (!allowed) return "blocked";
  if (gate.approvalStatus !== "approved") return "awaiting_approval";

  if (type === "CREATE_RAZORPAY_TEST_ORDER") {
    if (session.status === "creating_order") return "executing";
    if (session.status === "order_created") return "completed";
    if (session.status === "approved") return "approved";
  }

  if (type === "OPEN_RAZORPAY_PAYMENT") {
    if (session.status === "payment_opened") return "executing";
    if (session.status === "payment_verified") return "completed";
    if (session.status === "payment_failed") return "failed";
    if (session.razorpayOrderId && session.paymentApprovalStatus === "approved")
      return "approved";
  }

  return "approved";
}

function isOrderCreationAllowed(session: CheckoutSession): boolean {
  return session.orderCreationStatus !== "consumed";
}

export function evaluateActionControl(
  type: MoneyActionType,
  session: CheckoutSession,
  catalog: Product[]
): MoneyActionControl {
  const items = session.items;
  const amount = computeTotal(items, catalog);
  const explanation = buildExplanation(type, amount, session);
  const boundaries = buildBoundaries(type, amount, items, catalog, session);
  const gate = buildGate(type, session);
  const blockedReasons = evaluateBlockedReasons(
    type,
    amount,
    boundaries,
    gate,
    session
  );
  const allowed = blockedReasons.length === 0;
  const status = evaluateState(type, allowed, gate, session);

  return {
    id: `${type}-${session.id}`,
    type,
    title: explanation.action,
    amount,
    currency: "INR",
    reason: explanation.reason,
    status,
    createdAt: new Date().toISOString(),
    boundaries,
    gate,
    allowed,
    blockedReasons,
  };
}

export function explainAction(
  type: MoneyActionType,
  session: CheckoutSession,
  catalog: Product[]
): { explanation: ActionExplanation; control: MoneyActionControl } {
  const control = evaluateActionControl(type, session, catalog);
  const amount = computeTotal(session.items, catalog);
  const explanation = buildExplanation(type, amount, session);
  return { explanation, control };
}

export function getFlowStage(
  orderControl: MoneyActionControl,
  paymentControl: MoneyActionControl
): {
  stage: number;
  label: string;
  stages: { label: string; status: "done" | "current" | "upcoming" }[];
} {
  const stages: { label: string; status: "done" | "current" | "upcoming" }[] = [
    { label: "Explain Action", status: "done" },
    { label: "Validate Boundaries", status: "done" },
    { label: "Request Approval", status: "upcoming" },
    { label: "Execute Action", status: "upcoming" },
    { label: "Verify Result", status: "upcoming" },
  ];

  if (!orderControl.allowed) {
    stages[1].status = "current";
    return { stage: 1, label: "Blocked", stages };
  }

  if (orderControl.gate.approvalStatus !== "approved") {
    stages[2].status = "current";
    return { stage: 2, label: "Awaiting Order Approval", stages };
  }

  if (orderControl.status === "executing") {
    stages[3].status = "current";
    return { stage: 3, label: "Creating Order", stages };
  }

  if (orderControl.status === "completed") {
    stages[3].status = "done";
    stages[4].status = "done";
  }

  if (
    orderControl.status === "completed" &&
    paymentControl.gate.approvalStatus !== "approved"
  ) {
    stages[2].status = "current";
    return { stage: 2, label: "Awaiting Payment Approval", stages };
  }

  if (paymentControl.status === "executing") {
    stages[3].status = "current";
    return { stage: 3, label: "Opening Payment", stages };
  }

  if (paymentControl.status === "completed") {
    stages[3].status = "done";
    stages[4].status = "done";
  }

  return { stage: 4, label: "Complete", stages };
}

export { isOrderCreationAllowed };
