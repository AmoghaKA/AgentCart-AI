const rules = [
  "AI can analyze the merchant catalog",
  "AI can recommend products",
  "AI cannot change product prices",
  "AI cannot make payments automatically",
  "Every money action is explained, bounded, and requires explicit approval",
];

export function SafetyCard() {
  return (
    <aside className="safety-card">
      <div className="safety-heading">
        <div className="shield-icon">{"\u2713"}</div>
        <div>
          <p className="eyebrow">GUARDRAILS</p>
          <h2>Agent Safety</h2>
        </div>
        <span className="safe-pill">All clear</span>
      </div>
      <div className="rules-list">
        {rules.map((rule) => (
          <div className="rule" key={rule}>
            <span>{"\u2713"}</span>
            {rule}
          </div>
        ))}
      </div>
      <p className="safety-note">
        All safety controls are active. Every Razorpay transaction is validated
        against boundaries, requires explicit buyer approval, and is recorded in
        the audit trail.
      </p>
    </aside>
  );
}
