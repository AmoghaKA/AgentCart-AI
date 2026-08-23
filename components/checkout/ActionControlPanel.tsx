import type { MoneyActionControl, ActionExplanation } from "@/types/actionControl";

function money(value: number): string {
  return `₹${value.toLocaleString("en-IN")}`;
}

function StateBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "#6b7280",
    blocked: "#dc2626",
    awaiting_approval: "#d97706",
    approved: "#059669",
    executing: "#2563eb",
    completed: "#059669",
    failed: "#dc2626",
  };
  const labels: Record<string, string> = {
    pending: "Pending",
    blocked: "Blocked",
    awaiting_approval: "Awaiting Approval",
    approved: "Approved",
    executing: "Executing",
    completed: "Completed",
    failed: "Failed",
  };
  return (
    <span
      className="action-state-badge"
      style={{ background: colors[status] ?? "#6b7280" }}
    >
      {labels[status] ?? status}
    </span>
  );
}

export function ActionControlPanel({
  control,
  explanation,
  orderId,
}: {
  control: MoneyActionControl;
  explanation: ActionExplanation;
  orderId?: string;
}) {
  return (
    <section className="action-control-panel">
      <div className="action-panel-header">
        <div className="action-panel-icon">₹</div>
        <div>
          <p className="eyebrow">EXPLAINABLE MONEY ACTION</p>
          <h2>{control.title}</h2>
        </div>
        <StateBadge status={control.status} />
      </div>

      <div className="action-explanation">
        <h3>Why</h3>
        <div className="explanation-grid">
          <div className="explanation-item">
            <span>Action</span>
            <strong>{explanation.action}</strong>
          </div>
          <div className="explanation-item">
            <span>Amount</span>
            <strong>{money(explanation.amount)}</strong>
          </div>
          <div className="explanation-item">
            <span>Merchant</span>
            <strong>{explanation.merchant}</strong>
          </div>
          <div className="explanation-item">
            <span>Why</span>
            <strong>{explanation.reason}</strong>
          </div>
          {orderId && (
            <div className="explanation-item">
              <span>Order</span>
              <strong>{orderId}</strong>
            </div>
          )}
          <div className="explanation-item">
            <span>Result</span>
            <strong>{explanation.result}</strong>
          </div>
        </div>
      </div>

      <div className="action-boundaries">
        <h3>Limits</h3>
        <div className="boundaries-list">
          {control.boundaries.map((boundary, index) => (
            <div
              className={`boundary-item ${boundary.passed ? "passed" : "failed"}`}
              key={index}
            >
              <span className="boundary-status">
                {boundary.passed ? "✓" : "✕"}
              </span>
              <div className="boundary-detail">
                <strong>{boundary.label}</strong>
                <div className="boundary-values">
                  <span>Limit: {boundary.limit}</span>
                  <span>Current: {boundary.current}</span>
                </div>
                {boundary.detail && (
                  <small className="boundary-fail-detail">
                    {boundary.detail}
                  </small>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="action-gate">
        <h3>Approval</h3>
        <div className="gate-grid">
          <div className="gate-item">
            <span>Explicit approval required</span>
            <strong>Yes</strong>
          </div>
          <div className="gate-item">
            <span>Current approval status</span>
            <strong
              className={
                control.gate.approvalStatus === "approved"
                  ? "gate-approved"
                  : "gate-pending"
              }
            >
              {control.gate.approvalStatus === "approved"
                ? "Approved"
                : "Pending"}
            </strong>
          </div>
          {control.gate.approvedAction && (
            <div className="gate-item">
              <span>Approved action</span>
              <strong>{control.gate.approvedAction}</strong>
            </div>
          )}
          {control.gate.approvedAmount != null && (
            <div className="gate-item">
              <span>Approved amount</span>
              <strong>{money(control.gate.approvedAmount)}</strong>
            </div>
          )}
          {control.gate.approvedAt && (
            <div className="gate-item">
              <span>Approved at</span>
              <strong>
                {new Intl.DateTimeFormat("en-IN", {
                  hour: "numeric",
                  minute: "2-digit",
                  second: "2-digit",
                }).format(new Date(control.gate.approvedAt))}
              </strong>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
