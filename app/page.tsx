"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";

export default function LandingPage() {
  return (
    <AppShell>
      <div className="landing-page">
        <header className="landing-hero">
          <p className="eyebrow">
            AGENT-POWERED COMMERCE
          </p>
          <h1>
            Grow revenue with <span>AI commerce</span>
          </h1>
          <p className="landing-subtitle">
            AgentCart AI helps merchants increase order value with AI-powered
            upselling, and lets AI buyers discover and purchase products
            through a safe, transparent checkout.
          </p>
        </header>

        <section className="landing-choices">
          <p className="eyebrow" style={{ textAlign: "center", marginBottom: 24 }}>
            CHOOSE YOUR EXPERIENCE
          </p>
          <div className="landing-cards">
            <Link href="/dashboard" className="landing-card merchant-card">
              <div className="landing-card-icon merchant-icon">{"\u25A6"}</div>
              <h2>Merchant Console</h2>
              <p>
                Grow your store&apos;s revenue with AI-powered upselling,
                cross-selling, catalog management and commerce insights.
              </p>
              <div className="landing-card-features">
                <span>{"\u2713"} Revenue Growth</span>
                <span>{"\u2713"} Product Catalog</span>
                <span>{"\u2713"} AI Growth Agent</span>
                <span>{"\u2713"} Audit Trail</span>
              </div>
              <span className="landing-card-button merchant-button">
                Open Merchant Console <span>{"\u2192"}</span>
              </span>
            </Link>

            <Link href="/ai-buyer" className="landing-card buyer-card">
              <div className="landing-card-icon buyer-icon">{"\u2726"}</div>
              <h2>AI Buyer</h2>
              <p>
                Discover merchant products through an AI agent and create a
                safe purchase intent.
              </p>
              <div className="landing-card-features">
                <span>{"\u2713"} AI Product Discovery</span>
                <span>{"\u2713"} Agent-readable Catalog</span>
                <span>{"\u2713"} Product Recommendations</span>
                <span>{"\u2713"} Conversational Checkout</span>
              </div>
              <span className="landing-card-button buyer-button">
                Enter AI Buyer <span>{"\u2192"}</span>
              </span>
            </Link>
          </div>
        </section>

        <section className="landing-flow">
          <p className="eyebrow" style={{ textAlign: "center", marginBottom: 20 }}>
            HOW IT WORKS
          </p>
          <div className="landing-flow-steps">
            <div className="flow-step">
              <span className="flow-step-num">1</span>
              <strong>Merchant adds products</strong>
              <p>Catalog managed through the Merchant Console</p>
            </div>
            <i />
            <div className="flow-step">
              <span className="flow-step-num">2</span>
              <strong>AI Growth Agent analyzes</strong>
              <p>Finds upsell and cross-sell opportunities</p>
            </div>
            <i />
            <div className="flow-step">
              <span className="flow-step-num">3</span>
              <strong>AI Buyer discovers</strong>
              <p>Buyer searches and finds matching products</p>
            </div>
            <i />
            <div className="flow-step">
              <span className="flow-step-num">4</span>
              <strong>Safe checkout</strong>
              <p>Explain, validate, approve, execute, verify</p>
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
