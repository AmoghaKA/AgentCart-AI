"use client";

import type { CheckoutSession } from "@/types/checkout";

function money(value: number): string {
  return `\u20B9${value.toLocaleString("en-IN")}`;
}

export function PaymentApprovalGate({
  session,
  onApprovePayment,
  sdkLoaded,
  onOpenPayment,
  paymentAttempting,
}: {
  session: CheckoutSession;
  onApprovePayment: () => void;
  sdkLoaded: boolean;
  onOpenPayment: () => void;
  paymentAttempting: boolean;
}) {
  const isApproved = session.paymentApprovalStatus === "approved";
  const hasOrder = Boolean(session.razorpayOrderId);
  const amount = session.razorpayOrderAmount ?? session.approvedAmount ?? 0;

  return (
    <section className="proposed-action">
      <div className="proposed-action-heading">
        <div className="proposed-icon">{"\u26A1"}</div>
        <div>
          <p className="eyebrow">APPROVE PAYMENT</p>
          <h2>Open Secure Test Payment</h2>
        </div>
      </div>
      <p className="proposed-note">
        Review the order details and approve to open Razorpay&apos;s secure
        payment interface. This is a separate approval from order creation.
      </p>
      <div className="proposed-grid">
        <div>
          <span>Amount</span>
          <strong>{money(amount)}</strong>
        </div>
        <div>
          <span>Order ID</span>
          <strong>{session.razorpayOrderId ?? "N/A"}</strong>
        </div>
        <div>
          <span>Mode</span>
          <strong>Test (no real charges)</strong>
        </div>
        <div>
          <span>Status</span>
          <strong>{isApproved ? "Approved" : "Awaiting approval"}</strong>
        </div>
      </div>

      {!isApproved ? (
        <div className="approval-buttons" style={{ marginTop: 20 }}>
          <button
            className="primary-button"
            onClick={onApprovePayment}
            disabled={!hasOrder}
          >
            Approve Opening Payment <span>{"\u2192"}</span>
          </button>
        </div>
      ) : (
        <div className="approval-buttons" style={{ marginTop: 20 }}>
          <button
            className="primary-button"
            onClick={onOpenPayment}
            disabled={paymentAttempting || !sdkLoaded}
          >
            {!sdkLoaded
              ? "Loading Razorpay..."
              : paymentAttempting
                ? "Waiting for payment..."
                : "Open Secure Test Payment"}{" "}
            <span>{"\u2192"}</span>
          </button>
        </div>
      )}
    </section>
  );
}
