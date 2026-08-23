"use client";

import Link from "next/link";
import type { CheckoutSession } from "@/types/checkout";

function money(value: number) {
  return `\u20B9${value.toLocaleString("en-IN")}`;
}

export function PaymentFailure({
  session,
  onRetryPayment,
  retrying,
}: {
  session: CheckoutSession;
  onRetryPayment: () => void;
  retrying: boolean;
}) {
  return (
    <section className="payment-failure">
      <div className="payment-failure-header">
        <div className="payment-failure-icon">{"\u2717"}</div>
        <div>
          <p className="eyebrow">GRACEFUL FAILURE</p>
          <h2>Payment was not completed</h2>
        </div>
      </div>

      <div className="payment-failure-explanation">
        <div className="failure-explanation-card">
          <div className="failure-explanation-label">
            <span className="failure-label-icon">{"\u25B6"}</span>
            <strong>What happened</strong>
          </div>
          <p>
            The payment through Razorpay was not completed. This can happen if
            the payment was cancelled, the session timed out, or the payment
            could not be verified. Your payment status has not been marked as
            successful.
          </p>
        </div>

        <div className="failure-explanation-card">
          <div className="failure-explanation-label">
            <span className="failure-label-icon safe">{"\u2713"}</span>
            <strong>What AgentCart did</strong>
          </div>
          <p>
            AgentCart created a valid Razorpay Test Mode order for{" "}
            {money(session.razorpayOrderAmount ?? session.approvedAmount ?? 0)}{" "}
            after your explicit approval. The order remains valid. AgentCart did
            NOT complete the payment on your behalf — the payment interface was
            opened for you to review and complete.
          </p>
        </div>

        <div className="failure-explanation-card">
          <div className="failure-explanation-label">
            <span className="failure-label-icon">{"\u25B6"}</span>
            <strong>What you can do next</strong>
          </div>
          <p>
            You can retry the payment using the same Razorpay order, return to
            the AI Buyer to start a new search, or start a fresh checkout. No
            money has been deducted.
          </p>
        </div>
      </div>

      <div className="payment-failure-details">
        <div className="failure-detail-row">
          <span>Razorpay Order ID</span>
          <strong>{session.razorpayOrderId ?? "N/A"}</strong>
        </div>
        <div className="failure-detail-row">
          <span>Amount</span>
          <strong>
            {money(session.razorpayOrderAmount ?? session.approvedAmount ?? 0)}
          </strong>
        </div>
        <div className="failure-detail-row">
          <span>Status</span>
          <strong className="failure-status-text">Payment not completed</strong>
        </div>
      </div>

      <div className="payment-failure-options">
        <Link href="/ai-buyer" className="secondary-button">
          Return to AI Buyer <span>{"\u2197"}</span>
        </Link>
        <Link href="/" className="secondary-button">
          Start New Checkout <span>{"\u2197"}</span>
        </Link>
        <button
          className="primary-button"
          onClick={onRetryPayment}
          disabled={retrying}
        >
          {retrying ? "Retrying..." : "Retry Payment"} <span>{"\u2192"}</span>
        </button>
      </div>
    </section>
  );
}
