"use client";

import type { CheckoutSession } from "@/types/checkout";

function money(value: number): string {
  return `₹${value.toLocaleString("en-IN")}`;
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
  const orderId = session.razorpayOrderId ?? "N/A";

  return (
    <section className="payment-approval-gate">
      <div className="payment-gate-header">
        <div className="payment-gate-icon">⚡</div>
        <div>
          <p className="eyebrow">RAZORPAY TEST PAYMENT READY</p>
          <h2>Open Secure Test Payment</h2>
        </div>
      </div>

      <div className="payment-gate-explanation">
        <div className="payment-explanation-grid">
          <div className="payment-explanation-item">
            <span>Action</span>
            <strong>Open Razorpay Test Payment</strong>
          </div>
          <div className="payment-explanation-item">
            <span>Amount</span>
            <strong>{money(amount)}</strong>
          </div>
          <div className="payment-explanation-item">
            <span>Order</span>
            <strong>{orderId}</strong>
          </div>
          <div className="payment-explanation-item">
            <span>Why</span>
            <strong>
              A valid Razorpay Test Mode order was successfully created for the
              buyer&apos;s approved checkout.
            </strong>
          </div>
          <div className="payment-explanation-item">
            <span>Result</span>
            <strong>
              The buyer will be redirected into Razorpay&apos;s secure Test Mode
              payment interface. The AI agent cannot complete the payment on the
              buyer&apos;s behalf.
            </strong>
          </div>
        </div>
      </div>

      <div className="payment-gate-boundaries">
        <div className="payment-boundary-item">
          <span className="boundary-status">✓</span>
          <div>
            <strong>Valid Razorpay order exists</strong>
            <small>{orderId}</small>
          </div>
        </div>
        <div className="payment-boundary-item">
          <span className="boundary-status">✓</span>
          <div>
            <strong>Order amount verified</strong>
            <small>{money(amount)}</small>
          </div>
        </div>
        <div className="payment-boundary-item">
          <span className="boundary-status">✓</span>
          <div>
            <strong>Separate approval required</strong>
            <small>
              Creating an order does not automatically approve opening payment
            </small>
          </div>
        </div>
      </div>

      {!isApproved ? (
        <div className="payment-gate-approval">
          <div className="approval-prompt">
            <div className="approval-prompt-icon">!</div>
            <div>
              <strong>Explicit approval required</strong>
              <p>
                Review the action details above and explicitly approve before the
                payment interface can be opened. This is a separate approval from
                order creation.
              </p>
            </div>
          </div>
          <div className="payment-approval-buttons">
            <button
              className="primary-button"
              onClick={onApprovePayment}
              disabled={!hasOrder}
            >
              Approve Opening Test Payment <span>→</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="payment-gate-approved">
          <div className="approval-recorded">
            <span>✓</span>
            <div>
              <strong>Explicit payment approval recorded</strong>
              <p>
                Approved at{" "}
                {session.paymentApprovedAt
                  ? new Intl.DateTimeFormat("en-IN", {
                      hour: "numeric",
                      minute: "2-digit",
                      second: "2-digit",
                    }).format(new Date(session.paymentApprovedAt))
                  : "N/A"}{" "}
                for {money(session.paymentApprovedAmount ?? amount)}
              </p>
            </div>
          </div>
          <div className="payment-execution">
            <button
              className="primary-button"
              onClick={onOpenPayment}
              disabled={paymentAttempting || !sdkLoaded}
            >
              {!sdkLoaded
                ? "Loading Razorpay..."
                : paymentAttempting
                  ? "Waiting for payment..."
                  : "Open Secure Test Payment"}
            </button>
            <p className="proposed-note">
              Razorpay Test Mode — No real money is charged.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
