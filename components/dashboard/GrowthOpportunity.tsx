"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getTopGrowthOpportunity } from "@/lib/dashboardStats";

function formatCurrency(value: number): string {
  return `\u20B9${value.toLocaleString("en-IN")}`;
}

export function GrowthOpportunity() {
  const [opportunity, setOpportunity] = useState<{
    mainProduct: string;
    mainProductPrice: number;
    recommendedProducts: { name: string; price: number }[];
    additionalRevenue: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const data = await getTopGrowthOpportunity();
      if (mounted) {
        setOpportunity(data);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (loading) {
    return (
      <article className="opportunity-card">
        <div className="opportunity-main">
          <div className="section-kicker">
            <span className="spark-dot">{"\u2726"}</span>
            <span>AI Growth Opportunity</span>
          </div>
          <p style={{ color: "#6b7280", fontSize: 14, marginTop: 12 }}>
            Analyzing your catalog for cross-sell opportunities...
          </p>
        </div>
        <div className="opportunity-stats-panel">
          <div className="stats-placeholder" />
        </div>
      </article>
    );
  }

  if (!opportunity) {
    return (
      <article className="opportunity-card">
        <div className="opportunity-main">
          <div className="section-kicker">
            <span className="spark-dot">{"\u2726"}</span>
            <span>AI Growth Opportunity</span>
          </div>
          <h2>
            Turn every order into a <span>growth signal.</span>
          </h2>
          <p className="opportunity-copy">
            Run the AI Growth Agent to identify cross-sell opportunities from your catalog.
          </p>
          <Link href="/growth-agent" className="primary-button">
            Analyze Catalog <span>↗</span>
          </Link>
        </div>
        <div className="opportunity-stats-panel">
          <div className="stats-empty-visual">
            <div className="stats-ai-icon">{"\u2726"}</div>
            <p>Ready to analyze</p>
          </div>
        </div>
      </article>
    );
  }

  const totalPotential = opportunity.recommendedProducts.reduce(
    (sum, p) => sum + (p.price || 0),
    0
  );
  const recCount = opportunity.recommendedProducts.length;

  return (
    <article className="opportunity-card">
      <div className="opportunity-main">
        <div className="section-kicker">
          <span className="spark-dot">{"\u2726"}</span>
          <span>AI Growth Opportunity</span>
          <span className="opportunity-badge">REVENUE OPPORTUNITY</span>
        </div>
        <h2>
          Turn every order into a <span>growth signal.</span>
        </h2>
        <p className="opportunity-copy">
          Customers purchasing <strong>{opportunity.mainProduct}</strong> are likely to
          benefit from complementary accessories.
        </p>
        <div className="recommendation-box">
          <div className="product-row">
            <div className="product-thumb laptop">CP</div>
            <div>
              <strong>{opportunity.mainProduct}</strong>
              {opportunity.mainProductPrice > 0 && (
                <span>{formatCurrency(opportunity.mainProductPrice)}</span>
              )}
            </div>
            <span className="base-tag">Current order</span>
          </div>
          {opportunity.recommendedProducts.map((rec, i) => (
            <div className="recommendation-line" key={i}>
              <span className="line-marker">+</span>
              <div>
                <strong>{rec.name}</strong>
                {rec.price > 0 && <span>{formatCurrency(rec.price)}</span>}
              </div>
              <span className="add-label">AI recommendation</span>
            </div>
          ))}
          {totalPotential > 0 && (
            <div className="order-total">
              <span>Potential order value</span>
              <strong>{formatCurrency(totalPotential)}</strong>
            </div>
          )}
          {opportunity.additionalRevenue > 0 && (
            <div className="additional-revenue">
              <span>Potential additional revenue</span>
              <strong>+{formatCurrency(opportunity.additionalRevenue)}</strong>
            </div>
          )}
        </div>
        <p className="explanation">
          The AI identified these products as complementary items that can
          increase the average order value.
        </p>
        <Link href="/growth-agent" className="primary-button">
          View AI Recommendation <span>↗</span>
        </Link>
      </div>
      <div className="opportunity-stats-panel">
        <div className="stats-panel-header">
          <span className="stats-panel-icon">{"\u2191"}</span>
          <span>Revenue Impact</span>
        </div>
        <div className="stats-hero">
          <span className="stats-hero-label">Potential Lift</span>
          <strong className="stats-hero-value">
            {opportunity.additionalRevenue > 0 ? `+${formatCurrency(opportunity.additionalRevenue)}` : "\u20B90"}
          </strong>
          <span className="stats-hero-sub">additional per order</span>
        </div>
        <div className="stats-grid">
          <div className="stat-box">
            <span className="stat-box-label">Products Matched</span>
            <strong className="stat-box-value">{recCount}</strong>
          </div>
          <div className="stat-box">
            <span className="stat-box-label">Base Product</span>
            <strong className="stat-box-value">
              {opportunity.mainProductPrice > 0 ? formatCurrency(opportunity.mainProductPrice) : "\u20B90"}
            </strong>
          </div>
          <div className="stat-box">
            <span className="stat-box-label">Upsell Value</span>
            <strong className="stat-box-value accent">
              {totalPotential > 0 ? formatCurrency(totalPotential) : "\u20B90"}
            </strong>
          </div>
          <div className="stat-box">
            <span className="stat-box-label">Margin Impact</span>
            <strong className="stat-box-value positive">
              {opportunity.mainProductPrice > 0
                ? `+${Math.round((totalPotential / opportunity.mainProductPrice) * 100)}%`
                : "0%"}
            </strong>
          </div>
        </div>
        <div className="stats-products-strip">
          <span className="strip-label">Recommended Add-ons</span>
          <div className="strip-items">
            {opportunity.recommendedProducts.map((rec, i) => (
              <div className="strip-item" key={i}>
                <span className="strip-item-dot" />
                <span className="strip-item-name">{rec.name}</span>
                <span className="strip-item-price">
                  {rec.price > 0 ? formatCurrency(rec.price) : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
