"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { analyzeCatalog } from "@/lib/growthEngine";
import { loadProducts } from "@/lib/catalogStorage";
import { addCheckoutActivity, loadCheckoutSession, updateCheckoutSession, isOrderCreationAllowed } from "@/lib/checkoutStorage";
import { MAX_QUANTITY_PER_ORDER, validateCheckout, type SafetyValidation } from "@/lib/safety";
import type { CheckoutItem, CheckoutSession } from "@/types/checkout";
import type { Product } from "@/types/product";
import { ProductVisual } from "@/components/catalog/ProductCard";

function money(value: number) { return `\u20B9${value.toLocaleString("en-IN")}`; }
function itemTotal(item: CheckoutItem, products: Product[]) { return (products.find((product) => product.id === item.productId)?.price ?? item.unitPrice) * item.quantity; }

function MoneyActionDetailsUI({ session }: { session: CheckoutSession }) {
  if (session.status !== "approved" || !session.approvedAction) return null;
  const approvedAmount = session.approvedAmount ?? 0;
  const consumed = !isOrderCreationAllowed(session);
  return (
    <div>
      <div className="proposed-action-heading">
        <div className="proposed-icon">{"\u20B9"}</div>
        <div>
          <p className="eyebrow">EXPLAINABLE MONEY ACTION</p>
          <h2>Proposed Money Action</h2>
        </div>
      </div>
      <div className="proposed-grid">
        <div><span>Action</span><strong>Create Razorpay test-mode order</strong></div>
        <div><span>Amount</span><strong>{money(approvedAmount)}</strong></div>
        <div><span>Merchant</span><strong>AgentCart Demo Store</strong></div>
        <div><span>Why</span><strong>The buyer explicitly approved order creation after reviewing the selected products.</strong></div>
        <div><span>Boundary</span><strong>{consumed ? "Order creation previously consumed" : "Maximum allowed transaction: " + money(100000)}</strong></div>
        <div><span>Approval</span><strong>{session.approvedAction}</strong></div>
        <div><span>Status</span><strong>{consumed ? "Consumed" : "Ready"}</strong></div>
      </div>
    </div>
  );
}

function RazorpayOrderStatusUI({ session }: { session: CheckoutSession }) {
  if (session.status !== "order_created" || !session.razorpayOrderId) return null;
  return (
    <section className="proposed-action">
      <div className="checkout-section-heading"><div><p className="eyebrow">RAZORPAY TEST ORDER</p><h2>Secure Test Order Created</h2></div></div>
      <div className="proposed-grid">
        <div><span>Razorpay Order ID</span><strong>{session.razorpayOrderId}</strong></div>
        <div><span>Amount</span><strong>{money(session.razorpayOrderAmount ?? 0)}</strong></div>
        <div><span>Currency</span><strong>INR</strong></div>
        <div><span>Status</span><strong>Order Created</strong></div>
      </div>
    </section>
  );
}

function PaymentSuccessUI({ session }: { session: CheckoutSession }) {
  if (session.status !== "payment_verified") return null;
  return (
    <section className="proposed-action">
      <div className="proposed-action-heading">
        <div className="proposed-icon">{"\u2713"}</div>
        <div>
          <p className="eyebrow">PAYMENT VERIFIED</p>
          <h2>Payment Verified Successfully</h2>
        </div>
      </div>
      <div className="proposed-grid">
        <div><span>Order ID</span><strong>{session.razorpayOrderId ?? "N/A"}</strong></div>
        <div><span>Payment ID</span><strong>{session.razorpayPaymentId ?? "N/A"}</strong></div>
        <div><span>Amount</span><strong>{money(session.approvedAmount ?? 0)}</strong></div>
        <div><span>Status</span><strong>Payment Verified</strong></div>
      </div>
      <p className="proposed-note">The payment was verified securely on the server.</p>
    </section>
  );
}

function PaymentFailureUI() {
  return (
    <section className="proposed-action">
      <div className="proposed-action-heading">
        <div className="proposed-icon">{"\u2717"}</div>
        <div>
          <p className="eyebrow">PAYMENT FAILED</p>
          <h2>Payment Not Completed</h2>
        </div>
      </div>
      <p className="proposed-note">The payment could not be completed or verified. Your payment status has not been marked as successful.</p>
    </section>
  );
}

function useRazorpayCheckout() {
  const [sdkLoaded, setSdkLoaded] = useState(false);
  useEffect(() => {
    if (sdkLoaded || typeof window === "undefined") return;
    const existing = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
    if (existing) {
      queueMicrotask(() => { setSdkLoaded(true); });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => { setSdkLoaded(true); };
    document.body.appendChild(script);
  }, [sdkLoaded]);
  return { sdkLoaded };
}

function Conversation({ session, total, recommendation, onAdd, onDecline }: { session: CheckoutSession; total: number; recommendation?: Product; onAdd: () => void; onDecline: () => void }) {
  return <section className="checkout-conversation"><div className="conversation-heading"><div className="agent-avatar">✦</div><div><p className="eyebrow">AGENTCART COMMERCE AGENT</p><h2>Conversational checkout</h2></div><span className="conversation-status">{session.status === "approved" ? "Approved" : "Reviewing"}</span></div><div className="conversation-feed"><div className="chat-row agent-row"><span className="chat-avatar">A</span><div><p>I&apos;ve reviewed your purchase intent. You currently have {session.items.length} item{session.items.length === 1 ? "" : "s"} selected.</p><time>Just now</time></div></div><div className="chat-row agent-row"><span className="chat-avatar">A</span><div><p>Your current order total is <strong>{money(total)}</strong>. I&apos;ll verify every item against the merchant catalog before approval.</p><time>Just now</time></div></div>{recommendation && <div className="chat-row agent-row recommendation-chat"><span className="chat-avatar">A</span><div><p>I found a complementary product that may improve your setup.</p><div className="chat-recommendation"><ProductVisual product={recommendation} /><div><strong>Would you like to add {recommendation.name}?</strong><span>{money(recommendation.price)} · {recommendation.stock} in stock</span></div></div><div className="chat-actions"><button className="primary-button" onClick={onAdd}>Add to Order <span>+</span></button><button className="secondary-button" onClick={onDecline}>No Thanks</button></div><time>Suggested by Growth Agent</time></div></div>}{session.status === "approved" && <div className="chat-row agent-row"><span className="chat-avatar">A</span><div><p>You explicitly approved the creation of a Razorpay test-mode order for {money(session.approvedAmount ?? total)}. The amount and items are locked to your approved checkout.</p><time>Just now</time></div></div>}</div></section>;
}

function OrderSummary({ session, products, onQuantity, onRemove }: { session: CheckoutSession; products: Product[]; onQuantity: (id: string, quantity: number) => void; onRemove: (id: string) => void }) {
  const total = session.items.reduce((sum, item) => sum + itemTotal(item, products), 0);
  return <section className="checkout-summary"><div className="checkout-section-heading"><div><p className="eyebrow">ORDER REVIEW</p><h2>Your order</h2></div><span>{session.items.length} item{session.items.length === 1 ? "" : "s"}</span></div><div className="checkout-items">{session.items.map((item) => { const product = products.find((current) => current.id === item.productId); const visualProduct = product ?? { id: item.productId, name: item.name, description: "", category: "Catalog item", price: item.unitPrice, currency: "INR" as const, stock: 0, available: false }; return <div className="checkout-item" key={item.productId}><ProductVisual product={visualProduct} /><div className="checkout-item-name"><strong>{product?.name ?? item.name}</strong><span>{money(product?.price ?? item.unitPrice)} each</span></div><div className="checkout-quantity"><button onClick={() => onQuantity(item.productId, item.quantity - 1)} disabled={item.quantity <= 1}>−</button><span>{item.quantity}</span><button onClick={() => onQuantity(item.productId, item.quantity + 1)} disabled={item.quantity >= Math.min(MAX_QUANTITY_PER_ORDER, product?.stock ?? 0)}>+</button></div><strong className="checkout-line-total">{money(itemTotal(item, products))}</strong><button className="checkout-remove" onClick={() => onRemove(item.productId)} aria-label={`Remove ${item.name}`}>×</button></div>; })}</div><div className="checkout-total"><span>Subtotal</span><strong>{money(total)}</strong></div><div className="checkout-total final-total"><span>Total</span><strong>{money(total)}</strong></div></section>;
}

function SafetyCheck({ validation }: { validation: SafetyValidation }) {
  return <section className="checkout-safety"><div className="checkout-section-heading"><div><p className="eyebrow">TRANSACTION BOUNDARIES</p><h2>Checkout Safety Check</h2></div><span className={validation.passed ? "safe-text" : "unsafe-text"}>{validation.passed ? "All checks passed" : "Action blocked"}</span></div><div className="checkout-checks">{validation.checks.map((check) => <div className={check.passed ? "checkout-check passed" : "checkout-check failed"} key={check.label}><span>{check.passed ? "✓" : "✕"}</span><div><strong>{check.label}</strong>{!check.passed && <small>{check.detail}</small>}</div></div>)}</div></section>;
}

function CancelModal({ onCancel, onClose }: { onCancel: () => void; onClose: () => void }) {
  return <div className="modal-backdrop" role="presentation"><div className="cancel-checkout-modal" role="dialog" aria-modal="true"><div className="delete-symbol">!</div><h2>Cancel this checkout?</h2><p>This will cancel the current checkout. No payment has been made.</p><div className="modal-actions"><button className="secondary-button" onClick={onClose}>Keep checkout</button><button className="danger-button" onClick={onCancel}>Cancel Checkout</button></div></div></div>;
}

export function CheckoutWorkspace() {
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [declinedRecommendationId, setDeclinedRecommendationId] = useState<string>();
  const [validation, setValidation] = useState<SafetyValidation>({ passed: false, checks: [] });
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [orderCreationInProgress, setOrderCreationInProgress] = useState(false);
  const [paymentAttempting, setPaymentAttempting] = useState(false);
  const { sdkLoaded } = useRazorpayCheckout();

  useEffect(() => { const frame = window.requestAnimationFrame(() => { const loaded = loadCheckoutSession(); const catalog = loadProducts(); setSession(loaded); setProducts(catalog); if (loaded) setValidation(validateCheckout(loaded.items, catalog)); }); return () => window.cancelAnimationFrame(frame); }, [refreshKey]);
  const recommendation = useMemo(() => { if (!session || !products.length) return undefined; const selectedIds = new Set(session.items.map((item) => item.productId)); return analyzeCatalog(products).flatMap((opportunity) => opportunity.recommendedProducts).find((product) => !selectedIds.has(product.id) && product.stock > 0 && product.id !== declinedRecommendationId); }, [session, products, declinedRecommendationId]);
  const total = session?.items.reduce((sum, item) => sum + itemTotal(item, products), 0) ?? 0;

  const updateSession = (nextItems: CheckoutItem[], message: string) => {
    if (!session) return;
    const next = updateCheckoutSession(session, {
      items: nextItems,
      subtotal: nextItems.reduce((sum, item) => sum + itemTotal(item, products), 0),
      status: "reviewing",
      approvalStatus: "pending",
      approvedAt: undefined,
      approvedAmount: undefined,
      approvedAction: undefined,
      razorpayOrderId: undefined,
      razorpayOrderAmount: undefined,
      razorpayOrderCreatedAt: undefined,
      orderCreationStatus: "pending",
    });
    const withActivity = addCheckoutActivity(next, message);
    setSession(withActivity);
    setValidation(validateCheckout(nextItems, products));
  };

  const addSuggestion = () => { if (!session || !recommendation) return; updateSession([...session.items, { productId: recommendation.id, name: recommendation.name, quantity: 1, unitPrice: recommendation.price }], `${recommendation.name} added to checkout`); setDeclinedRecommendationId(undefined); };
  const declineSuggestion = () => { if (!session || !recommendation) return; setSession(addCheckoutActivity(session, `Buyer declined ${recommendation.name}`)); setDeclinedRecommendationId(recommendation.id); };
  const changeQuantity = (id: string, quantity: number) => { if (!session) return; const product = products.find((item) => item.id === id); const nextQuantity = Math.max(1, Math.min(MAX_QUANTITY_PER_ORDER, product?.stock ?? 0, quantity)); updateSession(session.items.map((item) => item.productId === id ? { ...item, quantity: nextQuantity } : item), `Quantity updated for ${product?.name ?? id}`); };
  const removeItem = (id: string) => { if (!session) return; const item = session.items.find((current) => current.productId === id); updateSession(session.items.filter((current) => current.productId !== id), `${item?.name ?? "Product"} removed from checkout`); };
  const approve = () => { if (!session) return; const latestProducts = loadProducts(); const latestValidation = validateCheckout(session.items, latestProducts); setProducts(latestProducts); setValidation(latestValidation); if (!latestValidation.passed) return; const now = new Date().toISOString(); const approved = updateCheckoutSession(session, { status: "approved", approvalStatus: "approved", approvedAt: now, approvedAmount: session.items.reduce((sum, item) => sum + itemTotal(item, latestProducts), 0), approvedAction: "CREATE_RAZORPAY_TEST_ORDER" }); const withActivity = addCheckoutActivity(approved, "Buyer approved Razorpay order creation"); setSession(withActivity); setDeclinedRecommendationId(undefined); };
  const cancelCheckout = () => { if (!session) return; const next = updateCheckoutSession(session, { status: "cancelled" }); const withActivity = addCheckoutActivity(next, "Checkout cancelled by buyer"); setSession(withActivity); setCancelled(true); setCancelOpen(false); };

  const createRazorpayOrder = async () => {
    if (!session || session.status !== "approved" || session.approvedAction !== "CREATE_RAZORPAY_TEST_ORDER") return;
    if (!isOrderCreationAllowed(session)) { alert("Order creation has already been consumed. Please start a new checkout."); return; }
    const latestProducts = loadProducts();
    const currentTotal = session.items.reduce((sum, item) => sum + itemTotal(item, latestProducts), 0);
    if (Math.abs(currentTotal - (session.approvedAmount ?? 0)) > 0.01) { alert("Checkout has been modified since approval. Please review and re-approve."); return; }
    setOrderCreationInProgress(true);
    try {
      const res = await fetch(`${window.location.origin}/api/razorpay/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checkoutId: session.id, approvalAmount: session.approvedAmount }),
      });
      const data = await res.json();
      if (res.ok && data.orderId) {
        const now = new Date().toISOString();
        const updated = updateCheckoutSession(session, {
          razorpayOrderId: data.orderId,
          razorpayOrderAmount: data.amount,
          razorpayOrderCreatedAt: now,
          status: "order_created",
          orderCreationStatus: "created",
        });
        const withActivity = addCheckoutActivity(updated, `Razorpay test order created: ${data.orderId}`);
        setSession(withActivity);
      } else {
        alert(data.error || "Failed to create Razorpay order. Please try again.");
      }
    } catch (error: unknown) {
      console.error("Razorpay order creation error:", error);
      alert("Failed to create Razorpay order. Please try again.");
    } finally {
      setOrderCreationInProgress(false);
    }
  };

  const handlePaymentVerification = async (paymentId: string, orderId: string, signature: string) => {
    if (!session) return;
    try {
      const res = await fetch(`${window.location.origin}/api/razorpay/verify-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ razorpay_payment_id: paymentId, razorpay_order_id: orderId, razorpay_signature: signature }),
      });
      const data = await res.json();
      if (res.ok && data.verified) {
        const updated = updateCheckoutSession(session, { status: "payment_verified" });
        const withActivity = addCheckoutActivity(updated, "Razorpay payment verified successfully");
        setSession(withActivity);
      } else {
        const updated = updateCheckoutSession(session, { status: "payment_failed" });
        const withActivity = addCheckoutActivity(updated, "Razorpay payment verification failed");
        setSession(withActivity);
      }
    } catch (error: unknown) {
      console.error("Payment verification error:", error);
      const updated = updateCheckoutSession(session, { status: "payment_failed" });
      const withActivity = addCheckoutActivity(updated, "Payment verification request failed");
      setSession(withActivity);
    }
  };

  const openRazorpayPayment = () => {
    if (!session || !session.razorpayOrderId || !sdkLoaded || paymentAttempting) return;
    const amount = (session.razorpayOrderAmount ?? session.approvedAmount ?? 0);
    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "";
    if (!keyId) { alert("Razorpay is not configured. Please add NEXT_PUBLIC_RAZORPAY_KEY_ID to .env.local"); return; }
    setPaymentAttempting(true);
    const options = {
      key: keyId,
      order_id: session.razorpayOrderId,
      amount: amount,
      currency: "INR",
      name: "AgentCart Demo Store",
      description: "Safe AI-assisted commerce checkout",
      theme: { color: "#F37254" },
      prefill: { name: "", email: "", contact: "" },
      notes: { merchant: "AgentCart" },
      handler: function (response: { razorpay_payment_id?: string; razorpay_order_id?: string; razorpay_signature?: string; error?: { description?: string } }) {
        setPaymentAttempting(false);
        if (response.error || !response.razorpay_payment_id || !response.razorpay_order_id || !response.razorpay_signature) {
          if (session) {
            const updated = updateCheckoutSession(session, { status: "payment_failed" });
            const withActivity = addCheckoutActivity(updated, "Razorpay payment was not completed");
            setSession(withActivity);
          }
          return;
        }
        handlePaymentVerification(response.razorpay_payment_id, response.razorpay_order_id, response.razorpay_signature);
      },
    };
    try {
      const RazorpayCtor = window.Razorpay;
      if (!RazorpayCtor) { setPaymentAttempting(false); alert("Razorpay SDK not loaded."); return; }
      const rzp = new RazorpayCtor(options);
      rzp.open();
    } catch {
      setPaymentAttempting(false);
      alert("Failed to open Razorpay Checkout.");
    }
  };

  if (!session || cancelled || session.status === "cancelled") return <div className="checkout-page"><div className="checkout-empty-state"><div className="checkout-empty-icon">◇</div><p className="eyebrow">SAFE CHECKOUT</p><h1>{cancelled || session ? "Checkout cancelled" : "No active checkout"}</h1><p>{cancelled || session ? "No payment has been made. Your purchase intent is still available in the AI Buyer." : "Select products using the AI Buyer before starting a safe checkout."}</p><Link href="/ai-buyer" className="primary-button">Go to AI Buyer <span>↗</span></Link></div></div>;
  return <div className="checkout-page"><header className="checkout-header"><div><p className="eyebrow">AGENTIC COMMERCE <span className="eyebrow-slash">/</span> SAFE CHECKOUT</p><h1>Complete your purchase intent</h1><p className="header-subtitle">Your Commerce Agent is guiding this order through review, validation, and explicit approval.</p></div><div className="checkout-header-actions"><span className="draft-badge">● {session.status === "approved" ? "Approval recorded" : "Draft checkout"}</span><button className="cancel-link" onClick={() => setCancelOpen(true)}>Cancel Checkout</button></div></header><div className="checkout-flow"><span className="flow-active">01 Review</span><i /><span className={validation.passed ? "flow-active" : ""}>02 Safety Check</span><i /><span className={session.status === "approved" ? "flow-active" : ""}>03 Approval</span></div><div className="checkout-layout"><div className="checkout-main"><Conversation session={session} total={total} recommendation={recommendation} onAdd={addSuggestion} onDecline={declineSuggestion} /><div className="checkout-actions-row"><button className="refresh-catalog-button" onClick={() => setRefreshKey((key) => key + 1)}>↻ Refresh catalog validation</button><span>Prices and stock are always checked against the merchant catalog.</span></div></div><aside className="checkout-sidebar"><OrderSummary session={session} products={products} onQuantity={changeQuantity} onRemove={removeItem} /><SafetyCheck validation={validation} /></aside></div><section className="proposed-action"><MoneyActionDetailsUI session={session} /></section>{session.status === "approved" ? <section className="approval-recorded"><span>✓</span><div><strong>Approval recorded successfully.</strong><p>Razorpay test-mode order creation is ready.</p></div></section> : <section className="approval-gate"><div><p className="eyebrow">EXPLICIT APPROVAL GATE</p><h2>Ready for Approval</h2><p>Your order has passed all safety checks. I am ready to create a Razorpay test-mode order for <strong>{money(total)}</strong>, but I cannot perform this money action without your explicit approval.</p></div><div className="approval-buttons"><button className="secondary-button" onClick={() => setCancelOpen(true)}>Cancel Checkout</button><button className="primary-button" onClick={approve} disabled={!validation.passed}>Approve Order Creation <span>→</span></button></div></section>}{session.status === "order_created" && <RazorpayOrderStatusUI session={session} />}{session.status === "payment_verified" && <PaymentSuccessUI session={session} />}{session.status === "payment_failed" && <PaymentFailureUI />}{session.status === "approved" && session.approvedAction === "CREATE_RAZORPAY_TEST_ORDER" && isOrderCreationAllowed(session) && !session.razorpayOrderId && <section className="proposed-action"><div className="proposed-action-heading"><div className="proposed-icon">→</div><div><p className="eyebrow">CREATE SECURE TEST ORDER</p><h2>Create Razorpay Test Order</h2></div></div><p className="proposed-note">You explicitly approved the creation of a Razorpay test-mode order for {money(session.approvedAmount ?? total)}. The amount and items are locked to your approved checkout.</p><div className="proposed-grid"><div><span>Approved Action</span><strong>Create Razorpay Test Order</strong></div><div><span>Approved Amount</span><strong>{money(session.approvedAmount ?? total)}</strong></div><div><span>Status</span><strong>Ready to create order</strong></div></div><div className="approval-buttons" style={{ marginTop: "1rem" }}><button className="primary-button" onClick={createRazorpayOrder} disabled={orderCreationInProgress}>{orderCreationInProgress ? "Creating order..." : "Create Razorpay Test Order"}</button></div></section>}{session.razorpayOrderId && session.status !== "order_created" && session.status !== "payment_verified" && session.status !== "payment_failed" && <section className="proposed-action"><p className="proposed-note">Razorpay Order {session.razorpayOrderId} exists. Status: {session.status}</p></section>}{session.status === "order_created" && <section className="proposed-action"><div className="proposed-action-heading"><div className="proposed-icon">✓</div><div><p className="eyebrow">RAZORPAY TEST PAYMENT READY</p><h2>Open Secure Test Payment</h2></div></div><p className="proposed-note">Razorpay Test Mode — No real money is charged.</p><div className="approval-buttons" style={{ marginTop: "1rem" }}><button className="primary-button" onClick={openRazorpayPayment} disabled={paymentAttempting || !sdkLoaded}>{!sdkLoaded ? "Loading Razorpay..." : paymentAttempting ? "Waiting for payment..." : "Open Secure Test Payment"}</button></div></section>}<section className="checkout-activity"><div className="checkout-section-heading"><div><p className="eyebrow">SESSION TRACE</p><h2>Checkout Activity</h2></div><span>Current checkout only</span></div><div className="checkout-activity-list">{session.activity.map((event) => <div key={event.id}><span>✓</span><strong>{event.message}</strong><time>{new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(new Date(event.createdAt))}</time></div>)}</div></section>{cancelOpen && <CancelModal onCancel={cancelCheckout} onClose={() => setCancelOpen(false)} />}</div>;
}
