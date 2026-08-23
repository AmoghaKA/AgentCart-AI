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
        <div className="opportunity-visual">
          <div className="visual-orbit orbit-one" />
          <div className="visual-orbit orbit-two" />
          <div className="visual-core">
            <span>{"\u2726"}</span>
            <strong>—</strong>
            <small>loading</small>
          </div>
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
        <div className="opportunity-visual">
          <div className="visual-orbit orbit-one" />
          <div className="visual-orbit orbit-two" />
          <div className="visual-core">
            <span>{"\u2726"}</span>
            <strong>AI</strong>
            <small>ready</small>
          </div>
        </div>
      </article>
    );
  }

  const totalPotential = opportunity.recommendedProducts.reduce(
    (sum, p) => sum + (p.price || 0),
    0
  );

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
      <div className="opportunity-visual">
        <div className="visual-orbit orbit-one" />
        <div className="visual-orbit orbit-two" />
        <div className="visual-core">
          <span>{"\u20B9"}</span>
          <strong>{opportunity.additionalRevenue > 0 ? opportunity.additionalRevenue.toLocaleString("en-IN") : "0"}</strong>
          <small>potential lift</small>
        </div>
        <div className="visual-label visual-label-top">
          Customer signal <span>···</span>
        </div>
        <div className="visual-label visual-label-bottom">
          <span className="tiny-dot" /> {opportunity.recommendedProducts.length} products matched
        </div>
      </div>
    </article>
  );
}
