const rules = ["AI can analyze the merchant catalog", "AI can recommend products", "AI cannot change product prices", "AI cannot make payments automatically", "Money actions will require explicit approval"];

export function SafetyCard() {
  return <aside className="safety-card"><div className="safety-heading"><div className="shield-icon">✓</div><div><p className="eyebrow">GUARDRAILS</p><h2>Agent Safety</h2></div><span className="safe-pill">All clear</span></div><div className="rules-list">{rules.map((rule) => <div className="rule" key={rule}><span>✓</span>{rule}</div>)}</div><p className="safety-note">Safety controls for Razorpay transactions and approval gates will be implemented in upcoming parts.</p></aside>;
}