import { getFlowStage } from "@/lib/actionControls";
import { MAX_TRANSACTION_AMOUNT } from "@/lib/safety";
import type { MoneyActionControl } from "@/types/actionControl";

export function CommerceSafetyOverview({
  orderControl,
  paymentControl,
}: {
  orderControl: MoneyActionControl;
  paymentControl: MoneyActionControl;
}) {
  const { stages, label } = getFlowStage(orderControl, paymentControl);

  return (
    <section className="commerce-safety-overview">
      <div className="safety-overview-header">
        <div>
          <p className="eyebrow">COMMERCE SAFETY FLOW</p>
          <h2>Why This Transaction Is Safe</h2>
        </div>
        <span className="safety-overview-label">{label}</span>
      </div>

      <div className="safety-flow">
        {stages.map((stage, index) => (
          <div className={`safety-flow-step ${stage.status}`} key={index}>
            <div className="flow-step-number">{index + 1}</div>
            <div className="flow-step-content">
              <strong>{stage.label}</strong>
              {stage.status === "done" && (
                <span className="flow-step-check">✓</span>
              )}
              {stage.status === "current" && (
                <span className="flow-step-current">→</span>
              )}
            </div>
            {index < stages.length - 1 && (
              <div className="flow-step-connector" />
            )}
          </div>
        ))}
      </div>

      <div className="safety-checklist">
        <div className="safety-check-item">
          <span className="check-icon">✓</span>
          <span>Every money action is explained</span>
        </div>
        <div className="safety-check-item">
          <span className="check-icon">✓</span>
          <span>Transaction amount is limited to ₹{MAX_TRANSACTION_AMOUNT.toLocaleString("en-IN")}</span>
        </div>
        <div className="safety-check-item">
          <span className="check-icon">✓</span>
          <span>Product prices are verified</span>
        </div>
        <div className="safety-check-item">
          <span className="check-icon">✓</span>
          <span>Stock is checked before execution</span>
        </div>
        <div className="safety-check-item">
          <span className="check-icon">✓</span>
          <span>Each action requires explicit approval</span>
        </div>
        <div className="safety-check-item">
          <span className="check-icon">✓</span>
          <span>Approvals are action-specific</span>
        </div>
        <div className="safety-check-item">
          <span className="check-icon">✓</span>
          <span>Approval expires when transaction details change</span>
        </div>
        <div className="safety-check-item">
          <span className="check-icon">✓</span>
          <span>Payment success is verified server-side</span>
        </div>
      </div>
    </section>
  );
}
