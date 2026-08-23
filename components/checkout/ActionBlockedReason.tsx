import type { ActionBlockedReason } from "@/types/actionControl";

function money(value: number): string {
  return `₹${value.toLocaleString("en-IN")}`;
}

export function ActionBlockedReasons({
  reasons,
}: {
  reasons: ActionBlockedReason[];
}) {
  if (reasons.length === 0) return null;
  return (
    <div className="action-blocked-reasons">
      <div className="blocked-header">
        <span className="blocked-icon">✕</span>
        <strong>Action Blocked</strong>
      </div>
      <ul className="blocked-list">
        {reasons.map((reason, index) => (
          <li key={index} className="blocked-item">
            <span className="blocked-bullet">•</span>
            <div>
              <strong>{reason.reason}</strong>
              {reason.detail && <small>{reason.detail}</small>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
