"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useCallback } from "react";
import { analyzeCatalog } from "@/lib/growthEngine";
import { loadProducts } from "@/lib/catalogStorage";
import {
  addCheckoutActivity,
  loadCheckoutSession,
  updateCheckoutSession,
  isOrderCreationAllowed,
  approvePayment,
  approveOrderCreation,
} from "@/lib/checkoutStorage";
import {
  MAX_QUANTITY_PER_ORDER,
  validateCheckout,
  type SafetyValidation,
} from "@/lib/safety";
import { evaluateActionControl } from "@/lib/actionControls";
import { logAuditEvent } from "@/lib/auditLogger";
import { MERCHANT_NAME } from "@/lib/config";
import type { CheckoutItem, CheckoutSession } from "@/types/checkout";
import type { MoneyActionControl } from "@/types/actionControl";
import type { Product } from "@/types/product";
import { ProductVisual } from "@/components/catalog/ProductCard";
import { ActionControlPanel } from "./ActionControlPanel";
import { PaymentApprovalGate } from "./PaymentApprovalGate";
import { PaymentFailure } from "./PaymentFailure";
import { getActiveCampaignDiscounts, getBestDiscountForProduct, calculateDiscountedTotal, type ProductDiscount } from "@/lib/campaignEffects";

function money(value: number) {
  return `\u20B9${value.toLocaleString("en-IN")}`;
}

function getDefaultMessage(items: { name: string; quantity: number; price: number }[], total: number, phase: string): string {
  const count = items.reduce((s, i) => s + i.quantity, 0);
  switch (phase) {
    case "greeting": return `I've reviewed your purchase intent. You have ${count} item${count === 1 ? "" : "s"} totaling ₹${total.toLocaleString("en-IN")}.`;
    case "review": return `Your order total is ₹${total.toLocaleString("en-IN")}. I'll verify every item against the merchant catalog.`;
    case "safety": return `All safety checks passed — prices verified, stock confirmed, transaction limits respected.`;
    case "approval": return `Your order is ready. Please approve to create a Razorpay test-mode order for ₹${total.toLocaleString("en-IN")}.`;
    case "order_created": return `A Razorpay test order has been created. I can open the secure payment interface.`;
    case "payment": return `Payment interface is ready. Please review and complete the secure Razorpay test payment.`;
    case "complete": return `Payment verified successfully! Your transaction of ₹${total.toLocaleString("en-IN")} is complete.`;
    default: return `How can I help with your checkout?`;
  }
}

function itemTotal(item: CheckoutItem, products: Product[]) {
  return (
    (products.find((product) => product.id === item.productId)?.price ??
      item.unitPrice) * item.quantity
  );
}

function useRazorpayCheckout() {
  const [sdkLoaded, setSdkLoaded] = useState(false);
  useEffect(() => {
    if (sdkLoaded || typeof window === "undefined") return;
    const existing = document.querySelector(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );
    if (existing) {
      queueMicrotask(() => {
        setSdkLoaded(true);
      });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => {
      setSdkLoaded(true);
    };
    document.body.appendChild(script);
  }, [sdkLoaded]);
  return { sdkLoaded };
}

function Conversation({
  session,
  total,
  recommendation,
  onAdd,
  onDecline,
}: {
  session: CheckoutSession;
  total: number;
  recommendation?: Product;
  onAdd: () => void;
  onDecline: () => void;
}) {
  const [messages, setMessages] = useState<{ greeting: string; review: string; safety: string; approval: string; orderCreated: string }>({
    greeting: `I've reviewed your purchase intent. You have ${session.items.length} item${session.items.length === 1 ? "" : "s"}.`,
    review: `Your order total is ₹${total.toLocaleString("en-IN")}. I'll verify every item against the merchant catalog.`,
    safety: "All safety checks passed — prices verified, stock confirmed, transaction limits respected.",
    approval: `Your order is ready. Please approve to create a Razorpay test-mode order for ₹${total.toLocaleString("en-IN")}.`,
    orderCreated: "A Razorpay test order has been created. I can open the secure payment interface, but I will not do so automatically.",
  });

  useEffect(() => {
    const itemDetails = session.items.map((i) => ({ name: i.name, quantity: i.quantity, price: i.unitPrice }));
    (async () => {
      const phases = ["greeting", "review", "safety", "approval", "order_created"] as const;
      const results = await Promise.all(
        phases.map(async (phase) => {
          try {
            const res = await fetch("/api/ai/checkout", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ items: itemDetails, total, phase }),
            });
            if (!res.ok) throw new Error("API failed");
            const data = await res.json();
            return data.message as string;
          } catch {
            return getDefaultMessage(itemDetails, total, phase);
          }
        })
      );
      setMessages({
        greeting: results[0],
        review: results[1],
        safety: results[2],
        approval: results[3],
        orderCreated: results[4],
      });
    })();
  }, [session.items.length, total, session.items]);

  return (
    <section className="checkout-conversation">
      <div className="conversation-heading">
        <div className="agent-avatar">✦</div>
        <div>
          <p className="eyebrow">AGENTCART COMMERCE AGENT</p>
          <h2>Conversational checkout</h2>
        </div>
        <span className="conversation-status">
          {session.status === "approved" ? "Approved" : "Reviewing"}
        </span>
      </div>
      <div className="conversation-feed">
        <div className="chat-row agent-row">
          <span className="chat-avatar">A</span>
          <div>
            <p>{messages.greeting}</p>
            <time>Just now</time>
          </div>
        </div>
        <div className="chat-row agent-row">
          <span className="chat-avatar">A</span>
          <div>
            <p>{messages.review}</p>
            <time>Just now</time>
          </div>
        </div>
        {recommendation && (
          <div className="chat-row agent-row recommendation-chat">
            <span className="chat-avatar">A</span>
            <div>
              <p>I found a complementary product that may improve your setup.</p>
              <div className="chat-recommendation">
                <ProductVisual product={recommendation} />
                <div>
                  <strong>Would you like to add {recommendation.name}?</strong>
                  <span>₹{recommendation.price.toLocaleString("en-IN")} · {recommendation.stock} in stock</span>
                </div>
              </div>
              <div className="chat-actions">
                <button className="primary-button" onClick={onAdd}>Add to Order <span>+</span></button>
                <button className="secondary-button" onClick={onDecline}>No Thanks</button>
              </div>
              <time>Suggested by AI Growth Agent</time>
            </div>
          </div>
        )}
        {session.status === "approved" && (
          <div className="chat-row agent-row">
            <span className="chat-avatar">A</span>
            <div>
              <p>{messages.approval}</p>
              <time>Just now</time>
            </div>
          </div>
        )}
        {session.status === "order_created" && (
          <div className="chat-row agent-row">
            <span className="chat-avatar">A</span>
            <div>
              <p>{messages.orderCreated}</p>
              <time>Just now</time>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function OrderSummary({
  session,
  products,
  onQuantity,
  onRemove,
  discountMap,
}: {
  session: CheckoutSession;
  products: Product[];
  onQuantity: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
  discountMap: Map<string, ProductDiscount[]>;
}) {
  const { subtotal, discount, total, appliedDiscounts } = calculateDiscountedTotal(
    session.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: products.find((p) => p.id === item.productId)?.price ?? item.unitPrice,
    })),
    discountMap
  );
  return (
    <section className="checkout-summary">
      <div className="checkout-section-heading">
        <div>
          <p className="eyebrow">ORDER REVIEW</p>
          <h2>Your order</h2>
        </div>
        <span className="order-item-count">
          {session.items.length} item
          {session.items.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="checkout-items">
        {session.items.map((item) => {
          const product = products.find(
            (current) => current.id === item.productId
          );
          const visualProduct = product ?? {
            id: item.productId,
            name: item.name,
            description: "",
            category: "Catalog item",
            price: item.unitPrice,
            currency: "INR" as const,
            stock: 0,
            available: false,
          };
          const catalogPrice = product?.price ?? item.unitPrice;
          const discount = getBestDiscountForProduct(item.productId, discountMap, catalogPrice);
          const effectiveUnitPrice = discount ? discount.discountedPrice : catalogPrice;
          const lineTotal = effectiveUnitPrice * item.quantity;
          const inStock = (product?.stock ?? 0) > 0;
          const lowStock = (product?.stock ?? 0) > 0 && (product?.stock ?? 0) <= 5;
          return (
            <div className="checkout-item-card" key={item.productId}>
              <div className="item-card-visual">
                <ProductVisual product={visualProduct} />
              </div>
              <div className="item-card-details">
                <div className="item-card-header">
                  <div className="item-card-title">
                    <strong>{product?.name ?? item.name}</strong>
                    <span className="item-category">{product?.category ?? "Catalog"}</span>
                  </div>
                  <button
                    className="item-card-remove"
                    onClick={() => onRemove(item.productId)}
                    aria-label={`Remove ${item.name}`}
                  >
                    {"\u00D7"}
                  </button>
                </div>
                <div className="item-card-body">
                  <div className="item-card-pricing">
                    {discount ? (
                      <span className="buyer-price-with-discount">
                        <span className="buyer-original-price">{money(catalogPrice)}</span>
                        <span className="buyer-discounted-price">{money(effectiveUnitPrice)}</span>
                        <span className="buyer-discount-badge">-{discount.discountPercent}%</span>
                      </span>
                    ) : (
                      <span className="item-unit-price">{money(catalogPrice)} each</span>
                    )}
                    {inStock && !lowStock && (
                      <span className="item-stock-badge in-stock">
                        <span className="stock-dot" /> In stock
                      </span>
                    )}
                    {lowStock && (
                      <span className="item-stock-badge low-stock">
                        <span className="stock-dot" /> {product?.stock} left
                      </span>
                    )}
                    {!inStock && (
                      <span className="item-stock-badge out-stock">
                        <span className="stock-dot" /> Out of stock
                      </span>
                    )}
                  </div>
                  <div className="item-card-footer">
                    <div className="item-quantity-control">
                      <button
                        onClick={() =>
                          item.quantity <= 1
                            ? onRemove(item.productId)
                            : onQuantity(item.productId, item.quantity - 1)
                        }
                        aria-label="Decrease quantity"
                      >
                        {"\u2212"}
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        onClick={() =>
                          onQuantity(item.productId, item.quantity + 1)
                        }
                        disabled={
                          item.quantity >=
                          Math.min(MAX_QUANTITY_PER_ORDER, product?.stock ?? 0)
                        }
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                    <strong className="item-line-total">
                      {money(lineTotal)}
                    </strong>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="checkout-summary-footer">
        <div className="summary-row">
          <span>Subtotal ({session.items.length} item{session.items.length === 1 ? "" : "s"})</span>
          <span>{money(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="summary-row summary-discount">
            <span>Campaign Discount</span>
            <strong className="buyer-discount-savings">-{money(discount)}</strong>
          </div>
        )}
        {appliedDiscounts.map((d) => (
          <div className="summary-row summary-discount-detail" key={d.name}>
            <span className="summary-discount-label">↳ {d.name}</span>
            <span className="summary-discount-detail-amount">-{money(d.amount)}</span>
          </div>
        ))}
        <div className="summary-row">
          <span>Shipping</span>
          <span className="shipping-free">Free</span>
        </div>
        <div className="summary-row">
          <span>Tax (GST)</span>
          <span>Included</span>
        </div>
        <div className="summary-total">
          <span>Total</span>
          <strong>{money(total)}</strong>
        </div>
      </div>
    </section>
  );
}

function SafetyCheck({ validation }: { validation: SafetyValidation }) {
  return (
    <section className="checkout-safety">
      <div className="checkout-section-heading">
        <div>
          <p className="eyebrow">TRANSACTION BOUNDARIES</p>
          <h2>Checkout Safety Check</h2>
        </div>
        <span
          className={validation.passed ? "safe-text" : "unsafe-text"}
        >
          {validation.passed ? "All checks passed" : "Action blocked"}
        </span>
      </div>
      <div className="checkout-checks">
        {validation.checks.map((check) => (
          <div
            className={
              check.passed ? "checkout-check passed" : "checkout-check failed"
            }
            key={check.label}
          >
            <span>{check.passed ? "\u2713" : "\u2715"}</span>
            <div>
              <strong>{check.label}</strong>
              {!check.passed && <small>{check.detail}</small>}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CancelModal({
  onCancel,
  onClose,
}: {
  onCancel: () => void;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation">
      <div className="cancel-checkout-modal" role="dialog" aria-modal="true">
        <div className="delete-symbol">!</div>
        <h2>Cancel this checkout?</h2>
        <p>This will cancel the current checkout. No payment has been made.</p>
        <div className="modal-actions">
          <button className="secondary-button" onClick={onClose}>
            Keep checkout
          </button>
          <button className="danger-button" onClick={onCancel}>
            Cancel Checkout
          </button>
        </div>
      </div>
    </div>
  );
}

export function CheckoutWorkspace() {
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [declinedRecommendationId, setDeclinedRecommendationId] =
    useState<string>();
  const [validation, setValidation] = useState<SafetyValidation>({
    passed: false,
    checks: [],
    total: 0,
  });
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [orderCreationInProgress, setOrderCreationInProgress] =
    useState(false);
  const [paymentAttempting, setPaymentAttempting] = useState(false);
  const [recommendation, setRecommendation] = useState<Product | undefined>();
  const [discountMap, setDiscountMap] = useState<Map<string, ProductDiscount[]>>(new Map());
  const { sdkLoaded } = useRazorpayCheckout();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [loaded, catalog, discounts] = await Promise.all([
        loadCheckoutSession(),
        loadProducts(),
        getActiveCampaignDiscounts(),
      ]);
      if (mounted) {
        setSession(loaded);
        setProducts(catalog);
        setDiscountMap(discounts);
        if (loaded) setValidation(validateCheckout(loaded.items, catalog, discounts));
      }
    })();
    return () => { mounted = false; };
  }, [refreshKey]);

  useEffect(() => {
    if (!session || !products.length) {
      setRecommendation(undefined);
      return;
    }
    const selectedIds = new Set(session.items.map((item) => item.productId));
    let cancelled = false;
    analyzeCatalog(products).then((results) => {
      if (cancelled) return;
      const found = results
        .flatMap((opp) => opp.recommendedProducts)
        .find(
          (product) =>
            !selectedIds.has(product.id) &&
            product.stock > 0 &&
            product.id !== declinedRecommendationId
        );
      setRecommendation(found);
    });
    return () => { cancelled = true; };
  }, [session, products, declinedRecommendationId]);

  const { total: discountedTotal, discount: totalDiscount } = useMemo(() => {
    if (!session) return { total: 0, discount: 0 };
    return calculateDiscountedTotal(
      session.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: products.find((p) => p.id === item.productId)?.price ?? item.unitPrice,
      })),
      discountMap
    );
  }, [session, products, discountMap]);

  const total = discountedTotal;

  const orderControl: MoneyActionControl = useMemo(() => {
    if (!session) {
      return {
        id: "CREATE_RAZORPAY_TEST_ORDER-pending",
        type: "CREATE_RAZORPAY_TEST_ORDER",
        title: "Create Razorpay Test-Mode Order",
        amount: 0,
        currency: "INR",
        reason: "",
        status: "pending",
        createdAt: new Date().toISOString(),
        boundaries: [],
        gate: { approvalRequired: true, approvalStatus: "pending" },
        allowed: false,
        blockedReasons: [],
      };
    }
    return evaluateActionControl(
      "CREATE_RAZORPAY_TEST_ORDER",
      session,
      products
    );
  }, [session, products]);

  const paymentControl: MoneyActionControl = useMemo(() => {
    if (!session) {
      return {
        id: "OPEN_RAZORPAY_PAYMENT-pending",
        type: "OPEN_RAZORPAY_PAYMENT",
        title: "Open Razorpay Test Payment",
        amount: 0,
        currency: "INR",
        reason: "",
        status: "pending",
        createdAt: new Date().toISOString(),
        boundaries: [],
        gate: { approvalRequired: true, approvalStatus: "pending" },
        allowed: false,
        blockedReasons: [],
      };
    }
    return evaluateActionControl(
      "OPEN_RAZORPAY_PAYMENT",
      session,
      products
    );
  }, [session, products]);

  const updateSession = async (nextItems: CheckoutItem[], message: string) => {
    if (!session) return;
    const next = await updateCheckoutSession(session, {
      items: nextItems,
      subtotal: nextItems.reduce(
        (sum, item) => sum + itemTotal(item, products),
        0
      ),
      status: "reviewing",
      approvalStatus: "pending",
      approvedAt: undefined,
      approvedAmount: undefined,
      approvedAction: undefined,
      razorpayOrderId: undefined,
      razorpayOrderAmount: undefined,
      razorpayOrderCreatedAt: undefined,
      orderCreationStatus: "pending",
      paymentApprovalStatus: "pending",
      paymentApprovedAt: undefined,
      paymentApprovedAmount: undefined,
      paymentApprovedAction: undefined,
      paymentApprovedOrderId: undefined,
    });
    const withActivity = await addCheckoutActivity(next, message);
    setSession(withActivity);
    setValidation(validateCheckout(nextItems, products, discountMap));
  };

  const addSuggestion = () => {
    if (!session || !recommendation) return;
    updateSession(
      [
        ...session.items,
        {
          productId: recommendation.id,
          name: recommendation.name,
          quantity: 1,
          unitPrice: recommendation.price,
        },
      ],
      `${recommendation.name} added to checkout`
    );
    setDeclinedRecommendationId(undefined);
  };

  const declineSuggestion = async () => {
    if (!session || !recommendation) return;
    setSession(
      await addCheckoutActivity(session, `Buyer declined ${recommendation.name}`)
    );
    setDeclinedRecommendationId(recommendation.id);
  };

  const changeQuantity = (id: string, quantity: number) => {
    if (!session) return;
    const product = products.find((item) => item.id === id);
    const nextQuantity = Math.max(
      1,
      Math.min(MAX_QUANTITY_PER_ORDER, product?.stock ?? 0, quantity)
    );
    updateSession(
      session.items.map((item) =>
        item.productId === id ? { ...item, quantity: nextQuantity } : item
      ),
      `Quantity updated for ${product?.name ?? id}`
    );
  };

  const removeItem = (id: string) => {
    if (!session) return;
    const item = session.items.find(
      (current) => current.productId === id
    );
    updateSession(
      session.items.filter((current) => current.productId !== id),
      `${item?.name ?? "Product"} removed from checkout`
    );
  };

  const approve = async () => {
    if (!session) return;
    const [latestProducts, latestDiscounts] = await Promise.all([loadProducts(), getActiveCampaignDiscounts()]);
    const latestValidation = validateCheckout(session.items, latestProducts, latestDiscounts);
    setProducts(latestProducts);
    setDiscountMap(latestDiscounts);
    setValidation(latestValidation);
    if (!latestValidation.passed) return;
    const now = new Date().toISOString();
    const approvedAmount = latestValidation.total;
    const approved = await updateCheckoutSession(session, {
      status: "approved",
      approvalStatus: "approved",
      approvedAt: now,
      approvedAmount,
      approvedAction: "CREATE_RAZORPAY_TEST_ORDER",
    });
    await approveOrderCreation(approved, approvedAmount);
    const withActivity = await addCheckoutActivity(
      approved,
      "Buyer approved Razorpay order creation"
    );
    setSession(withActivity);
    setDeclinedRecommendationId(undefined);
    await logAuditEvent({ actor: "buyer", action: "Buyer approved order creation", category: "checkout", status: "success", description: `Buyer approved creation of Razorpay test-mode order for ₹${approvedAmount.toLocaleString("en-IN")}`, amount: approvedAmount, currency: "INR", referenceId: session.id });
  };

  const approvePaymentAction = async () => {
    if (!session || !session.razorpayOrderId) return;
    const amount = session.razorpayOrderAmount ?? 0;
    const updated = await approvePayment(session, session.razorpayOrderId, amount);
    const withActivity = await addCheckoutActivity(
      updated,
      `Buyer approved opening Razorpay payment for ${money(amount)}`
    );
    setSession(withActivity);
    await logAuditEvent({ actor: "buyer", action: "Buyer approved payment", category: "payment", status: "success", description: `Buyer approved opening Razorpay payment for ₹${amount.toLocaleString("en-IN")} (order: ${session.razorpayOrderId})`, amount, currency: "INR", referenceId: session.razorpayOrderId });
  };

  const cancelCheckout = async () => {
    if (!session) return;
    const next = await updateCheckoutSession(session, {
      status: "cancelled",
    });
    const withActivity = await addCheckoutActivity(
      next,
      "Checkout cancelled by buyer"
    );
    setSession(withActivity);
    setCancelled(true);
    setCancelOpen(false);
    await logAuditEvent({ actor: "buyer", action: "Checkout cancelled", category: "checkout", status: "success", description: `Checkout ${session.id} cancelled by buyer — no payment was made`, referenceId: session.id });
  };

  const createRazorpayOrder = async () => {
    if (
      !session ||
      session.status !== "approved" ||
      session.approvedAction !== "CREATE_RAZORPAY_TEST_ORDER"
    )
      return;
    if (!isOrderCreationAllowed(session)) {
      alert(
        "Order creation has already been consumed. Please start a new checkout."
      );
      return;
    }
    const [latestProducts, latestDiscounts] = await Promise.all([loadProducts(), getActiveCampaignDiscounts()]);
    const { total: currentTotal } = calculateDiscountedTotal(
      session.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: latestProducts.find((p) => p.id === item.productId)?.price ?? item.unitPrice,
      })),
      latestDiscounts
    );
    if (
      Math.abs(currentTotal - (session.approvedAmount ?? 0)) > 0.01
    ) {
      alert(
        "Checkout has been modified since approval. Please review and re-approve."
      );
      return;
    }
    setOrderCreationInProgress(true);
    try {
      const res = await fetch(
        `${window.location.origin}/api/razorpay/create-order`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            checkoutId: session.id,
            approvalAmount: session.approvedAmount,
            actionType: "CREATE_RAZORPAY_TEST_ORDER",
          }),
        }
      );
      const data = await res.json();
      if (res.ok && data.orderId) {
        const now = new Date().toISOString();
        const updated = await updateCheckoutSession(session, {
          razorpayOrderId: data.orderId,
          razorpayOrderAmount: data.amount / 100,
          razorpayOrderCreatedAt: now,
          status: "order_created",
          orderCreationStatus: "created",
        });
        const withActivity = await addCheckoutActivity(
          updated,
          `Razorpay test order created: ${data.orderId}`
        );
        setSession(withActivity);
        await logAuditEvent({ actor: "agent", action: "Razorpay order created", category: "payment", status: "success", description: `Razorpay test-mode order ${data.orderId} created for ₹${(data.amount / 100).toLocaleString("en-IN")}`, amount: data.amount / 100, currency: "INR", referenceId: data.orderId });
      } else {
        const errorMsg = data.error || "Failed to create Razorpay order. Please try again.";
        alert(errorMsg);
        await logAuditEvent({ actor: "system", action: "Order creation failed", category: "payment", status: "failed", description: `Razorpay order creation failed: ${errorMsg}`, referenceId: session.id });
      }
    } catch (error: unknown) {
      console.error("Razorpay order creation error:", error);
      alert(
        "Failed to create Razorpay order. Please try again."
      );
      await logAuditEvent({ actor: "system", action: "Order creation failed", category: "payment", status: "failed", description: `Razorpay order creation request failed: ${error instanceof Error ? error.message : "Network or server error"}`, referenceId: session?.id });
    } finally {
      setOrderCreationInProgress(false);
    }
  };

  const handlePaymentVerification = async (
    paymentId: string,
    orderId: string,
    signature: string
  ) => {
    if (!session) return;
    try {
      const res = await fetch(
        `${window.location.origin}/api/razorpay/verify-payment`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpay_payment_id: paymentId,
            razorpay_order_id: orderId,
            razorpay_signature: signature,
          }),
        }
      );
      const data = await res.json();
      if (res.ok && data.verified) {
        const updated = await updateCheckoutSession(session, {
          status: "payment_verified",
        });
        const withActivity = await addCheckoutActivity(
          updated,
          "Razorpay payment verified successfully"
        );
        setSession(withActivity);
        await logAuditEvent({ actor: "system", action: "Payment verified successfully", category: "payment", status: "success", description: `Razorpay payment verified — order: ${orderId}, payment: ${paymentId}`, amount: session.razorpayOrderAmount ?? session.approvedAmount ?? 0, currency: "INR", referenceId: paymentId });
      } else {
        const updated = await updateCheckoutSession(session, {
          status: "payment_failed",
        });
        const withActivity = await addCheckoutActivity(
          updated,
          "Razorpay payment verification failed"
        );
        setSession(withActivity);
        await logAuditEvent({ actor: "system", action: "Payment verification failed", category: "payment", status: "failed", description: `Razorpay payment verification failed — order: ${orderId}, payment: ${paymentId}`, referenceId: paymentId });
      }
    } catch (error: unknown) {
      console.error("Payment verification error:", error);
      const updated = await updateCheckoutSession(session, {
        status: "payment_failed",
      });
      const withActivity = await addCheckoutActivity(
        updated,
        "Payment verification request failed"
      );
      setSession(withActivity);
      await logAuditEvent({ actor: "system", action: "Payment verification failed", category: "payment", status: "failed", description: `Payment verification request failed: ${error instanceof Error ? error.message : "Network or server error"}`, referenceId: session.id });
    }
  };

  const openRazorpayPayment = async () => {
    if (
      !session ||
      !session.razorpayOrderId ||
      !sdkLoaded ||
      paymentAttempting
    )
      return;
    const displayAmount =
      session.razorpayOrderAmount ?? session.approvedAmount ?? 0;
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
    if (!keyId) {
      alert(
        "Razorpay is not configured. Please add NEXT_PUBLIC_RAZORPAY_KEY_ID to .env.local"
      );
      return;
    }
    setPaymentAttempting(true);
    await logAuditEvent({ actor: "agent", action: "Razorpay payment opened", category: "payment", status: "success", description: `Razorpay payment interface opened for ₹${displayAmount.toLocaleString("en-IN")} (order: ${session.razorpayOrderId})`, amount: displayAmount, currency: "INR", referenceId: session.razorpayOrderId });
    const options = {
      key: keyId,
      order_id: session.razorpayOrderId,
      currency: "INR",
      name: MERCHANT_NAME,
      description: "Safe AI-assisted commerce checkout",
      theme: { color: "#d97706" },
      prefill: { name: "", email: "", contact: "" },
      notes: { merchant: "AgentCart" },
      handler: async function (response: {
        razorpay_payment_id?: string;
        razorpay_order_id?: string;
        razorpay_signature?: string;
        error?: { description?: string };
      }) {
        setPaymentAttempting(false);
        if (
          response.error ||
          !response.razorpay_payment_id ||
          !response.razorpay_order_id ||
          !response.razorpay_signature
        ) {
          if (session) {
            const updated = await updateCheckoutSession(session, {
              status: "payment_failed",
            });
            const withActivity = await addCheckoutActivity(
              updated,
              "Razorpay payment was not completed"
            );
            setSession(withActivity);
            await logAuditEvent({ actor: "system", action: "Payment failed", category: "payment", status: "failed", description: `Razorpay payment was not completed — order: ${session.razorpayOrderId ?? "N/A"}`, amount: session.razorpayOrderAmount ?? session.approvedAmount ?? 0, currency: "INR", referenceId: session.razorpayOrderId ?? undefined });
          }
          return;
        }
        handlePaymentVerification(
          response.razorpay_payment_id,
          response.razorpay_order_id,
          response.razorpay_signature
        );
      },
    };
    try {
      const RazorpayCtor = window.Razorpay;
      if (!RazorpayCtor) {
        setPaymentAttempting(false);
        alert("Razorpay SDK not loaded.");
        return;
      }
      const rzp = new RazorpayCtor(options);
      (rzp as any).on("payment.failed", async (response: { error?: { description?: string } }) => {
        setPaymentAttempting(false);
        if (session) {
          const updated = await updateCheckoutSession(session, { status: "payment_failed" });
          const withActivity = await addCheckoutActivity(updated, `Razorpay payment failed: ${response.error?.description ?? "Payment was not completed"}`);
          setSession(withActivity);
          await logAuditEvent({ actor: "system", action: "Payment failed", category: "payment", status: "failed", description: `Razorpay payment failed: ${response.error?.description ?? "Unknown error"} — order: ${session.razorpayOrderId ?? "N/A"}`, amount: session.razorpayOrderAmount ?? session.approvedAmount ?? 0, currency: "INR", referenceId: session.razorpayOrderId ?? undefined });
        }
      });
      rzp.open();
    } catch {
      setPaymentAttempting(false);
      alert("Failed to open Razorpay Checkout.");
      await logAuditEvent({ actor: "system", action: "Payment failed", category: "payment", status: "failed", description: `Failed to open Razorpay Checkout for order: ${session?.razorpayOrderId ?? "N/A"}`, amount: session?.razorpayOrderAmount ?? session?.approvedAmount ?? 0, currency: "INR", referenceId: session?.razorpayOrderId ?? undefined });
    }
  };

  const retryPayment = async () => {
    if (!session || !session.razorpayOrderId) return;
    const updated = await updateCheckoutSession(session, {
      status: "order_created",
    });
    const withActivity = await addCheckoutActivity(
      updated,
      "Buyer initiated payment retry"
    );
    setSession(withActivity);
    await logAuditEvent({ actor: "buyer", action: "Payment retry initiated", category: "payment", status: "success", description: `Buyer initiated payment retry for order: ${session.razorpayOrderId}`, amount: session.razorpayOrderAmount ?? session.approvedAmount ?? 0, currency: "INR", referenceId: session.razorpayOrderId });
  };

  if (!session || cancelled || session.status === "cancelled")
    return (
      <div className="checkout-page">
        <div className="checkout-empty-state">
          <div className="checkout-empty-icon">{"\u25C7"}</div>
          <p className="eyebrow">SAFE CHECKOUT</p>
          <h1>
            {cancelled || session
              ? "Checkout cancelled"
              : "No active checkout"}
          </h1>
          <p>
            {cancelled || session
              ? "No payment has been made. Your purchase intent is still available in the AI Buyer."
              : "Select products using the AI Buyer before starting a safe checkout."}
          </p>
          <Link href="/ai-buyer" className="primary-button">
            Go to AI Buyer <span>{"\u2197"}</span>
          </Link>
        </div>
      </div>
    );

  return (
    <div className="checkout-page">
      <header className="checkout-header">
        <div>
          <p className="eyebrow">
            AI BUYER CHECKOUT{" "}
            <span className="eyebrow-slash">/</span> SAFE PAYMENT
          </p>
          <h1>Review your purchase</h1>
          <p className="header-subtitle">
            Review your order, approve each step, and complete a safe
            Razorpay Test Mode payment.
          </p>
        </div>
        <div className="checkout-header-actions">
          <span className="draft-badge">
            {"\u25CF"}{" "}
            {session.status === "approved"
              ? "Approval recorded"
              : session.status === "order_created"
                ? "Order created"
                : session.status === "payment_verified"
                  ? "Payment verified"
                  : "Draft checkout"}
          </span>
          <button
            className="cancel-link"
            onClick={() => setCancelOpen(true)}
          >
            Cancel Checkout
          </button>
        </div>
      </header>

      <div className="checkout-steps">
        <div className={`checkout-step ${session.status === "reviewing" ? "active" : ["approved","order_created","payment_verified"].includes(session.status) ? "done" : ""}`}>
          <span className="step-number">{["approved","order_created","payment_verified"].includes(session.status) ? "✓" : "1"}</span>
          <span className="step-label">Review</span>
        </div>
        <div className={`checkout-step ${validation.passed && session.status !== "reviewing" ? "done" : session.status === "reviewing" ? "active" : ""}`}>
          <span className="step-number">{validation.passed && session.status !== "reviewing" ? "✓" : "2"}</span>
          <span className="step-label">Safety Check</span>
        </div>
        <div className={`checkout-step ${["approved","order_created","payment_verified"].includes(session.status) ? "done" : session.status === "reviewing" ? "active" : ""}`}>
          <span className="step-number">{["order_created","payment_verified"].includes(session.status) ? "✓" : "3"}</span>
          <span className="step-label">Approval</span>
        </div>
        <div className={`checkout-step ${["order_created","payment_verified"].includes(session.status) ? "done" : session.status === "approved" ? "active" : ""}`}>
          <span className="step-number">{session.status === "payment_verified" ? "✓" : "4"}</span>
          <span className="step-label">Create Order</span>
        </div>
        <div className={`checkout-step ${session.status === "payment_verified" ? "done" : session.status === "order_created" ? "active" : ""}`}>
          <span className="step-number">{session.status === "payment_verified" ? "✓" : "5"}</span>
          <span className="step-label">Payment</span>
        </div>
      </div>

      <div className="checkout-safety-bar">
        <div className="safety-bar-icon">{"\u2713"}</div>
        <span className="safety-bar-text">All safety checks passed — prices verified, stock confirmed, transaction limits respected</span>
        <div className="safety-bar-items">
          {validation.checks.map((check) => (
            <span className="safety-bar-item" key={check.label}>
              {check.passed ? "\u2713" : "\u2717"} {check.label}
            </span>
          ))}
        </div>
      </div>

      <div className="checkout-layout">
        <div className="checkout-main">
          <Conversation
            session={session}
            total={total}
            recommendation={recommendation}
            onAdd={addSuggestion}
            onDecline={declineSuggestion}
          />
          <OrderSummary
            session={session}
            products={products}
            onQuantity={changeQuantity}
            onRemove={removeItem}
            discountMap={discountMap}
          />
          <div className="checkout-actions-row">
            <button
              className="refresh-catalog-button"
              onClick={() => setRefreshKey((key) => key + 1)}
            >
              {"\u21BB"} Refresh catalog validation
            </button>
            <span>
              Prices and stock are always checked against the merchant
              catalog.
            </span>
          </div>
        </div>
        <aside className="checkout-sidebar">
          <SafetyCheck validation={validation} />
        </aside>
      </div>

      {/* Action Control Panel — Explains the current money action */}
      {(session.status === "reviewing" || session.status === "approved") && (
        <ActionControlPanel
          control={orderControl}
          explanation={{
            action: "Create Razorpay Test-Mode Order",
            amount: total,
            currency: "INR",
            reason:
              "The buyer selected these products and explicitly approved order creation after reviewing the complete order.",
            merchant: MERCHANT_NAME,
            result:
              "A Razorpay Test Mode order will be created. No payment will be completed automatically.",
          }}
        />
      )}

      {/* Payment Action Control Panel — After order is created */}
      {(session.status === "order_created" ||
        session.status === "payment_opened" ||
        session.status === "payment_verifying" ||
        session.status === "payment_verified" ||
        session.status === "payment_failed") && (
        <ActionControlPanel
          control={paymentControl}
          explanation={{
            action: "Open Razorpay Test Payment",
            amount:
              session.razorpayOrderAmount ??
              session.approvedAmount ??
              total,
            currency: "INR",
            reason:
              "A valid Razorpay Test Mode order was successfully created for the buyer's approved checkout.",
            merchant: MERCHANT_NAME,
            result:
              "The buyer will be redirected into Razorpay's secure Test Mode payment interface. The AI agent cannot complete the payment on the buyer's behalf.",
          }}
          orderId={session.razorpayOrderId}
        />
      )}

      {/* Order Approval Gate */}
      {session.status === "reviewing" && (
        <section className="approval-gate">
          <div>
            <p className="eyebrow">APPROVAL REQUIRED</p>
            <h2>Ready for Approval</h2>
            <p>
              Your order has passed all safety checks. Approve to create a
              Razorpay test-mode order for <strong>{money(total)}</strong>.
              No payment will be made without a separate approval step.
            </p>
          </div>
          <div className="approval-buttons">
            <button
              className="secondary-button"
              onClick={() => setCancelOpen(true)}
            >
              Cancel
            </button>
            <button
              className="primary-button"
              onClick={approve}
              disabled={!validation.passed}
            >
              Approve & Create Order <span>{"\u2192"}</span>
            </button>
          </div>
        </section>
      )}

      {/* Approval Recorded */}
      {session.status === "approved" && (
        <section className="approval-recorded">
          <span>{"\u2713"}</span>
          <div>
            <strong>Approval recorded successfully</strong>
            <p>Razorpay test-mode order creation is ready.</p>
          </div>
        </section>
      )}

      {/* Create Order Button */}
      {session.status === "approved" &&
        session.approvedAction === "CREATE_RAZORPAY_TEST_ORDER" &&
        isOrderCreationAllowed(session) &&
        !session.razorpayOrderId && (
          <section className="proposed-action">
            <div className="proposed-action-heading">
              <div className="proposed-icon">{"\u2192"}</div>
              <div>
                <p className="eyebrow">CREATE SECURE TEST ORDER</p>
                <h2>Create Razorpay Test Order</h2>
              </div>
            </div>
            <p className="proposed-note">
              Create a Razorpay test-mode order for{" "}
              <strong>{money(session.approvedAmount ?? total)}</strong>.
              This does not charge any money — it only creates the order.
            </p>
            <div className="proposed-grid">
              <div>
                <span>Amount</span>
                <strong>{money(session.approvedAmount ?? total)}</strong>
              </div>
              <div>
                <span>Currency</span>
                <strong>INR</strong>
              </div>
              <div>
                <span>Mode</span>
                <strong>Test (no real charges)</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>Ready to create</strong>
              </div>
            </div>
            <div className="approval-buttons">
              <button
                className="primary-button"
                onClick={createRazorpayOrder}
                disabled={orderCreationInProgress}
              >
                {orderCreationInProgress
                  ? "Creating order..."
                  : "Create Razorpay Test Order"}{" "}
                <span>{"\u2192"}</span>
              </button>
            </div>
          </section>
        )}

      {/* Order Created Status */}
      {session.status === "order_created" &&
        session.razorpayOrderId && (
          <section className="proposed-action">
            <div className="proposed-action-heading">
              <div className="proposed-icon">{"\u2713"}</div>
              <div>
                <p className="eyebrow">RAZORPAY TEST ORDER</p>
                <h2>Order Created Successfully</h2>
              </div>
            </div>
            <p className="proposed-note">
              A Razorpay test-mode order has been created. Next, approve to
              open the secure payment interface.
            </p>
            <div className="proposed-grid">
              <div>
                <span>Order ID</span>
                <strong>{session.razorpayOrderId}</strong>
              </div>
              <div>
                <span>Amount</span>
                <strong>
                  {money(session.razorpayOrderAmount ?? 0)}
                </strong>
              </div>
              <div>
                <span>Mode</span>
                <strong>Test (no real charges)</strong>
              </div>
              <div>
                <span>Status</span>
                <strong>Awaiting payment</strong>
              </div>
            </div>
          </section>
        )}

      {/* Payment Approval Gate */}
      {session.status === "order_created" && (
        <PaymentApprovalGate
          session={session}
          onApprovePayment={approvePaymentAction}
          sdkLoaded={sdkLoaded}
          onOpenPayment={openRazorpayPayment}
          paymentAttempting={paymentAttempting}
        />
      )}

      {/* Payment Verified */}
      {session.status === "payment_verified" && (
        <section className="proposed-action">
          <div className="proposed-action-heading">
            <div className="proposed-icon">{"\u2713"}</div>
            <div>
              <p className="eyebrow">PAYMENT VERIFIED</p>
              <h2>Payment Complete</h2>
            </div>
          </div>
          <p className="proposed-note">
            Your payment has been verified securely on the server. The
            transaction is complete.
          </p>
          <div className="proposed-grid">
            <div>
              <span>Order ID</span>
              <strong>{session.razorpayOrderId ?? "N/A"}</strong>
            </div>
            <div>
              <span>Payment ID</span>
              <strong>{session.razorpayPaymentId ?? "N/A"}</strong>
            </div>
            <div>
              <span>Amount</span>
              <strong>{money(session.approvedAmount ?? 0)}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>Verified</strong>
            </div>
          </div>
        </section>
      )}

      {/* Payment Failed */}
      {session.status === "payment_failed" && (
        <PaymentFailure
          session={session}
          onRetryPayment={retryPayment}
          retrying={false}
        />
      )}

      {/* Activity Log */}
      <section className="checkout-activity">
        <div className="checkout-section-heading">
          <div>
            <p className="eyebrow">SESSION TRACE</p>
            <h2>Checkout Activity</h2>
          </div>
          <span>Current checkout only</span>
        </div>
        <div className="checkout-activity-list">
          {session.activity.map((event) => (
            <div key={event.id}>
              <span>{"\u26A1"}</span>
              <strong>{event.message}</strong>
              <time>
                {new Intl.DateTimeFormat("en-IN", {
                  hour: "numeric",
                  minute: "2-digit",
                }).format(new Date(event.createdAt))}
              </time>
            </div>
          ))}
        </div>
      </section>

      {cancelOpen && (
        <CancelModal
          onCancel={cancelCheckout}
          onClose={() => setCancelOpen(false)}
        />
      )}
    </div>
  );
}
