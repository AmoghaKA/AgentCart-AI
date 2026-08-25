"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    setMobileOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="lp">
      {/* ── Navbar ── */}
      <nav className={`lp-nav${scrolled ? " lp-nav--scrolled" : ""}`}>
        <div className="lp-nav-inner">
          <Link href="/" className="lp-brand">
            <span className="lp-brand-mark">A</span>
            <span className="lp-brand-text">AgentCart AI</span>
          </Link>

          <div className="lp-nav-links">
            <button onClick={() => scrollTo("product")} className="lp-nav-link">Product</button>
            <button onClick={() => scrollTo("how-it-works")} className="lp-nav-link">How It Works</button>
            <button onClick={() => scrollTo("safety")} className="lp-nav-link">Safety</button>
          </div>

          <div className="lp-nav-right">
            <Link href="/auth/login" className="lp-btn lp-btn--primary lp-btn--sm">
              Sign In
            </Link>
          </div>

          <button
            className="lp-mobile-toggle"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <span className={`lp-hamburger${mobileOpen ? " open" : ""}`} />
          </button>
        </div>

        {mobileOpen && (
          <div className="lp-mobile-menu">
            <button onClick={() => scrollTo("product")}>Product</button>
            <button onClick={() => scrollTo("how-it-works")}>How It Works</button>
            <button onClick={() => scrollTo("safety")}>Safety</button>
            <Link href="/auth/login" className="lp-btn lp-btn--primary">Open Dashboard</Link>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section className="lp-hero">
        <div className="lp-container">
          <div className="lp-badge">AI GROWTH &amp; AGENTIC COMMERCE</div>
          <h1 className="lp-hero-title">
            Turn Every Buyer Into a<br />Revenue Opportunity.
          </h1>
          <p className="lp-hero-sub">
            AgentCart AI helps merchants grow order value with intelligent upsells
            and cross-sells while making their catalog discoverable and
            transactable by AI buyers.
          </p>
          <div className="lp-hero-ctas">
            <Link href="/auth/login" className="lp-btn lp-btn--primary lp-btn--lg">
              Open AgentCart AI <span className="lp-arrow">→</span>
            </Link>
            <button onClick={() => scrollTo("how-it-works")} className="lp-btn lp-btn--ghost lp-btn--lg">
              See How It Works
            </button>
          </div>

          {/* Hero Visual */}
          <div className="lp-hero-visual">
            <div className="lp-visual-card">
              <div className="lp-visual-step">
                <div className="lp-visual-icon lp-visual-icon--request">✦</div>
                <div>
                  <strong>Customer Request</strong>
                  <span>&quot;I need a laptop for coding&quot;</span>
                </div>
              </div>
              <div className="lp-visual-arrow">↓</div>
              <div className="lp-visual-step">
                <div className="lp-visual-icon lp-visual-icon--agent">⚡</div>
                <div>
                  <strong>AI Growth Agent</strong>
                  <span>Analyzes &amp; recommends products</span>
                </div>
              </div>
              <div className="lp-visual-arrow">↓</div>
              <div className="lp-visual-products">
                <div className="lp-visual-product lp-visual-product--base">
                  <span className="lp-vp-tag">BASE</span>
                  <span className="lp-vp-name">Laptop</span>
                  <span className="lp-vp-price">₹65,000</span>
                </div>
                <div className="lp-visual-plus">+</div>
                <div className="lp-visual-product">
                  <span className="lp-vp-name">Wireless Mouse</span>
                  <span className="lp-vp-price">₹1,500</span>
                </div>
                <div className="lp-visual-product">
                  <span className="lp-vp-name">Laptop Backpack</span>
                  <span className="lp-vp-price">₹2,500</span>
                </div>
              </div>
              <div className="lp-visual-arrow">↓</div>
              <div className="lp-visual-total">
                <div>
                  <strong>Potential Order</strong>
                  <span className="lp-visual-amount">₹69,000</span>
                </div>
                <div className="lp-visual-revenue">
                  <span>AI REVENUE OPPORTUNITY</span>
                  <strong>+₹4,000 potential revenue</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Product / Revenue Growth ── */}
      <section id="product" className="lp-section">
        <div className="lp-container">
          <div className="lp-section-header">
            <div className="lp-badge lp-badge--dark">REVENUE GROWTH</div>
            <h2 className="lp-section-title">Your AI Sales Agent Works While You Sell.</h2>
            <p className="lp-section-sub">
              AgentCart AI analyzes your product catalog and identifies complementary
              products that can increase average order value.
            </p>
          </div>

          <div className="lp-features-grid">
            <div className="lp-feature-card">
              <div className="lp-feature-icon">↗</div>
              <h3>Upsell</h3>
              <p>Recommend a better or higher-value option when it makes sense for the buyer.</p>
            </div>
            <div className="lp-feature-card">
              <div className="lp-feature-icon">🔀</div>
              <h3>Cross-sell</h3>
              <p>Recommend relevant products that complement the buyer&apos;s current selection.</p>
            </div>
            <div className="lp-feature-card">
              <div className="lp-feature-icon">₹</div>
              <h3>Revenue Impact</h3>
              <p>See exactly how much additional revenue an opportunity could generate.</p>
            </div>
          </div>

          {/* Revenue Example */}
          <div className="lp-revenue-example">
            <div className="lp-rev-header">
              <span className="lp-badge lp-badge--outline">EXAMPLE / DEMO</span>
            </div>
            <div className="lp-rev-body">
              <div className="lp-rev-items">
                <div className="lp-rev-item">
                  <div className="lp-rev-thumb lp-rev-thumb--laptop">💻</div>
                  <div>
                    <strong>Laptop</strong>
                    <span>₹65,000</span>
                  </div>
                </div>
                <div className="lp-rev-plus">+</div>
                <div className="lp-rev-item">
                  <div className="lp-rev-thumb">🖱</div>
                  <div>
                    <strong>Wireless Mouse</strong>
                    <span>₹1,500</span>
                  </div>
                </div>
                <div className="lp-rev-plus">+</div>
                <div className="lp-rev-item">
                  <div className="lp-rev-thumb">🎒</div>
                  <div>
                    <strong>Laptop Backpack</strong>
                    <span>₹2,500</span>
                  </div>
                </div>
              </div>
              <div className="lp-rev-divider" />
              <div className="lp-rev-totals">
                <div className="lp-rev-total-row">
                  <span>Potential Order Value</span>
                  <strong>₹69,000</strong>
                </div>
                <div className="lp-rev-total-row lp-rev-total--growth">
                  <span>Potential Revenue Growth</span>
                  <strong>+₹4,000</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── AI Buyer ── */}
      <section id="ai-buyer" className="lp-section lp-section--alt">
        <div className="lp-container">
          <div className="lp-section-header">
            <div className="lp-badge lp-badge--dark">AI BUYER</div>
            <h2 className="lp-section-title">Make Your Store Ready for AI Buyers.</h2>
            <p className="lp-section-sub">
              AI buyers should not need to understand your website UI. AgentCart AI
              exposes your merchant catalog in a structured format that AI agents can
              understand.
            </p>
          </div>

          <div className="lp-buyer-visual">
            <div className="lp-buyer-flow">
              <div className="lp-buyer-node">
                <div className="lp-buyer-node-icon lp-bni--buyer">🤖</div>
                <strong>AI Buyer</strong>
                <span>&quot;I need a laptop for coding under ₹70,000.&quot;</span>
              </div>
              <div className="lp-buyer-arrow">↓</div>
              <div className="lp-buyer-node">
                <div className="lp-buyer-node-icon lp-bni--catalog">📦</div>
                <strong>AgentCart Catalog</strong>
                <div className="lp-buyer-product">
                  <span className="lp-bp-name">CodePro Laptop</span>
                  <span className="lp-bp-price">₹65,000</span>
                  <span className="lp-bp-stock">In Stock</span>
                </div>
              </div>
              <div className="lp-buyer-arrow">↓</div>
              <div className="lp-buyer-node">
                <div className="lp-buyer-node-icon lp-bni--intent">✓</div>
                <strong>Purchase Intent</strong>
                <span>Buyer selects and proceeds to checkout</span>
              </div>
            </div>
          </div>

          <div className="lp-buyer-features">
            <div className="lp-buyer-feature">
              <span className="lp-check">✓</span>
              <span>Structured product information</span>
            </div>
            <div className="lp-buyer-feature">
              <span className="lp-check">✓</span>
              <span>Price and availability</span>
            </div>
            <div className="lp-buyer-feature">
              <span className="lp-check">✓</span>
              <span>AI-friendly discovery</span>
            </div>
          </div>

          <div className="lp-section-cta">
            <Link href="/ai-buyer" className="lp-btn lp-btn--primary">
              Explore AI Buyer <span className="lp-arrow">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── How It Works / Agentic Commerce ── */}
      <section id="how-it-works" className="lp-section">
        <div className="lp-container">
          <div className="lp-section-header">
            <div className="lp-badge lp-badge--dark">AGENTIC COMMERCE</div>
            <h2 className="lp-section-title">From Product Discovery to Payment.</h2>
            <p className="lp-section-sub">
              A complete workflow that takes AI buyers from discovery through safe,
              verified payment — all controlled by merchant-defined rules.
            </p>
          </div>

          <div className="lp-workflow">
            {[
              { step: "01", label: "Discover", desc: "AI buyer reads the merchant catalog." },
              { step: "02", label: "Recommend", desc: "Growth Agent identifies relevant products." },
              { step: "03", label: "Select", desc: "Buyer chooses products." },
              { step: "04", label: "Checkout", desc: "Agent creates a conversational checkout." },
              { step: "05", label: "Approve", desc: "Buyer explicitly approves money actions." },
              { step: "06", label: "Pay", desc: "Razorpay Test Mode handles payment." },
              { step: "07", label: "Verify", desc: "Payment is verified server-side." },
            ].map((s, i) => (
              <div key={s.step} className="lp-workflow-step">
                <div className="lp-ws-number">{s.step}</div>
                <strong>{s.label}</strong>
                <span>{s.desc}</span>
                {i < 6 && <div className="lp-ws-connector" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Safety ── */}
      <section id="safety" className="lp-section lp-section--alt">
        <div className="lp-container">
          <div className="lp-section-header">
            <div className="lp-badge lp-badge--dark">SAFETY</div>
            <h2 className="lp-section-title">
              AI That Can Sell Without Losing Control.
            </h2>
            <p className="lp-section-sub">
              Every money action is explainable, bounded and gated.
            </p>
          </div>

          <div className="lp-safety-cards">
            <div className="lp-safety-card">
              <div className="lp-sc-number">01</div>
              <h3>Explainable</h3>
              <p>
                The agent clearly shows what action it wants to perform, why it
                wants to perform it, and how much it will cost.
              </p>
            </div>
            <div className="lp-safety-card">
              <div className="lp-sc-number">02</div>
              <h3>Bounded</h3>
              <p>
                Transaction limits, quantity limits, stock checks and price
                validation prevent unsafe actions.
              </p>
            </div>
            <div className="lp-safety-card">
              <div className="lp-sc-number">03</div>
              <h3>Gated</h3>
              <p>
                Money actions require explicit approval before they can be
                executed.
              </p>
            </div>
          </div>

          <div className="lp-safety-stats">
            <div className="lp-safety-stat">
              <strong>₹1,00,000</strong>
              <span>Maximum Transaction Limit</span>
            </div>
            <div className="lp-safety-stat-divider" />
            <div className="lp-safety-stat">
              <strong>Explicit Approval</strong>
              <span>Required for Money Actions</span>
            </div>
            <div className="lp-safety-stat-divider" />
            <div className="lp-safety-stat">
              <strong>Server Verification</strong>
              <span>For Razorpay Payments</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Audit Trail ── */}
      <section id="audit" className="lp-section">
        <div className="lp-container">
          <div className="lp-section-header">
            <div className="lp-badge lp-badge--dark">AUDIT TRAIL</div>
            <h2 className="lp-section-title">Every Important Action Leaves a Trace.</h2>
            <p className="lp-section-sub">
              AgentCart AI records important AI, commerce, approval, safety and
              payment events so merchants can understand exactly what happened.
            </p>
          </div>

          <div className="lp-audit-timeline">
            {[
              { time: "10:32:04", actor: "AI Buyer", action: "Catalog Read", icon: "📋" },
              { time: "10:32:06", actor: "AI Growth Agent", action: "Revenue Opportunity Identified", icon: "⚡" },
              { time: "10:32:15", actor: "Buyer", action: "Money Action Approved", icon: "✓" },
              { time: "10:32:17", actor: "Razorpay", action: "Test Order Created", icon: "💳" },
              { time: "10:32:30", actor: "System", action: "Payment Verified", icon: "🔒" },
            ].map((e) => (
              <div key={e.time} className="lp-audit-row">
                <span className="lp-audit-time">{e.time}</span>
                <div className="lp-audit-info">
                  <span className="lp-audit-actor">{e.actor}</span>
                  <span className="lp-audit-action">{e.action}</span>
                </div>
                <span className="lp-audit-check">✓</span>
              </div>
            ))}
          </div>

          <div className="lp-section-cta">
            <Link href="/audit" className="lp-btn lp-btn--primary">
              View Audit Trail <span className="lp-arrow">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Failure Recovery ── */}
      <section className="lp-section lp-section--alt">
        <div className="lp-container">
          <div className="lp-section-header">
            <div className="lp-badge lp-badge--dark">RELIABILITY</div>
            <h2 className="lp-section-title">When Something Goes Wrong, The Agent Fails Safely.</h2>
            <p className="lp-section-sub">
              A failed or cancelled payment is never treated as successful. The
              checkout is preserved, the failure is recorded, and the buyer can
              safely retry.
            </p>
          </div>

          <div className="lp-failure-flow">
            {["Payment Failed", "Not Marked as Paid", "Checkout Preserved", "Failure Recorded", "Safe Retry"].map(
              (step, i) => (
                <div key={step} className="lp-ff-step">
                  <div className="lp-ff-box">{step}</div>
                  {i < 4 && <span className="lp-ff-arrow">→</span>}
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* ── Product Preview ── */}
      <section className="lp-section">
        <div className="lp-container">
          <div className="lp-section-header">
            <div className="lp-badge lp-badge--dark">PRODUCT PREVIEW</div>
            <h2 className="lp-section-title">See AgentCart AI in Action.</h2>
            <p className="lp-section-sub">
              A merchant dashboard designed for revenue intelligence, product
              management and AI-powered commerce insights.
            </p>
          </div>

          <div className="lp-preview">
            <div className="lp-preview-window">
              <div className="lp-preview-bar">
                <span className="lp-dot lp-dot--red" />
                <span className="lp-dot lp-dot--yellow" />
                <span className="lp-dot lp-dot--green" />
                <span className="lp-preview-url">agentcart.ai/dashboard</span>
              </div>
              <div className="lp-preview-content">
                <div className="lp-preview-sidebar">
                  <div className="lp-ps-brand">
                    <span className="lp-ps-mark">A</span>
                    <span>AgentCart AI</span>
                  </div>
                  <div className="lp-ps-nav">
                    <div className="lp-ps-nav-item lp-ps-nav-item--active">Dashboard</div>
                    <div className="lp-ps-nav-item">Catalog</div>
                    <div className="lp-ps-nav-item">AI Growth Agent</div>
                    <div className="lp-ps-nav-item">Audit Trail</div>
                  </div>
                </div>
                <div className="lp-preview-main">
                  <div className="lp-pm-header">
                    <div>
                      <div className="lp-pm-eyebrow">AI GROWTH OPPORTUNITY</div>
                      <h3>CodePro Laptop</h3>
                    </div>
                    <div className="lp-pm-badge">DEMO</div>
                  </div>
                  <div className="lp-pm-body">
                    <div className="lp-pm-recs">
                      <span className="lp-pm-rec-label">Recommended:</span>
                      <div className="lp-pm-rec">
                        <span>Wireless Mouse</span>
                        <strong>₹1,500</strong>
                      </div>
                      <div className="lp-pm-rec">
                        <span>Laptop Backpack</span>
                        <strong>₹2,500</strong>
                      </div>
                    </div>
                    <div className="lp-pm-revenue">
                      <span>Potential Revenue</span>
                      <strong>+₹4,000</strong>
                    </div>
                    <div className="lp-pm-action">
                      <span className="lp-pm-btn">View Opportunity →</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="lp-section lp-cta-section">
        <div className="lp-container lp-cta-inner">
          <h2 className="lp-cta-title">Ready to Make Your Store AI-Ready?</h2>
          <p className="lp-cta-sub">
            Give AI buyers a better way to discover, evaluate and safely purchase
            from your merchant.
          </p>
          <div className="lp-cta-actions">
            <Link href="/auth/login" className="lp-btn lp-btn--primary lp-btn--lg">
              Open AgentCart AI <span className="lp-arrow">→</span>
            </Link>
          </div>
          <span className="lp-cta-tagline">Built for AI Growth &amp; Agentic Commerce.</span>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-container lp-footer-inner">
          <div className="lp-footer-brand">
            <span className="lp-brand-mark lp-brand-mark--sm">A</span>
            <span className="lp-footer-brand-name">AgentCart AI</span>
            <span className="lp-footer-tagline">
              AI-powered revenue growth and agentic commerce.
            </span>
          </div>
          <div className="lp-footer-links">
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/growth-agent">AI Growth Agent</Link>
            <Link href="/ai-buyer">AI Buyer</Link>
            <Link href="/audit">Audit Trail</Link>
          </div>
          <div className="lp-footer-copy">© 2026 AgentCart AI</div>
        </div>
      </footer>
    </div>
  );
}
