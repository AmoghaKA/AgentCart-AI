"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { loadProducts } from "@/lib/catalogStorage";
import { analyzeCatalog } from "@/lib/growthEngine";
import { logAuditEvent } from "@/lib/auditLogger";
import type { Product } from "@/types/product";
import type { GrowthOpportunity } from "@/types/growth";
import { OpportunityCard } from "@/components/growth/OpportunityCard";

function money(value: number) { return `₹${value.toLocaleString("en-IN")}`; }

const CAPABILITIES = [
  { icon: "⇄", title: "Cross-sell Detection", desc: "Identifies products customers frequently buy together and surfaces bundle opportunities." },
  { icon: "↗", title: "Upsell Analysis", desc: "Finds premium alternatives and higher-value pairings for each product in your catalog." },
  { icon: "⊞", title: "Bundle Intelligence", desc: "Groups complementary products into pre-built bundles that maximize average order value." },
  { icon: "📊", title: "Revenue Projection", desc: "Estimates additional revenue from each opportunity based on catalog pricing and demand signals." },
];

const CATEGORY_ICONS: Record<string, string> = {
  Laptops: "💻",
  Monitors: "🖥",
  Accessories: "🎧",
  "Gaming Peripherals": "🎮",
  "Audio & Video": "🔊",
  Storage: "💾",
};

export function GrowthWorkspace() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [opportunities, setOpportunities] = useState<GrowthOpportunity[]>([]);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const data = await loadProducts();
      if (mounted) {
        setProducts(data);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    const latestProducts = await loadProducts();
    setProducts(latestProducts);
    try {
      const results = await analyzeCatalog(latestProducts);
      setOpportunities(results);
      setHasAnalyzed(true);
      await logAuditEvent({
        actor: "agent",
        action: "AI Growth analysis executed",
        category: "growth",
        status: results.length > 0 ? "success" : "blocked",
        description: `AI analyzed ${latestProducts.length} products — ${results.length} growth opportunit${results.length === 1 ? "y" : "ies"} identified`,
        details: results.length > 0 ? results.map((r) => `${r.mainProduct.name} → ${r.recommendedProducts.map((p) => p.name).join(", ")}`).join("; ") : "No opportunities found",
        amount: results.reduce((sum, r) => sum + r.additionalRevenue, 0),
        currency: "INR",
      });
    } catch (error) {
      console.error("AI analysis failed:", error);
    }
    setIsAnalyzing(false);
  };

  const totalAdditionalRevenue = useMemo(() => opportunities.reduce((total, o) => total + o.additionalRevenue, 0), [opportunities]);
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => map.set(p.category, (map.get(p.category) || 0) + 1));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [products]);

  if (loading) {
    return (
      <div className="growth-page">
        <div className="growth-loading-state">
          <div className="growth-loading-spinner" />
          <p>Loading catalog data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="growth-page">
      <header className="growth-header">
        <div>
          <p className="eyebrow">REVENUE INTELLIGENCE <span className="eyebrow-slash">/</span> AI GROWTH AGENT</p>
          <h1>AI Growth Agent</h1>
          <p className="header-subtitle">LLM-powered analysis identifies intelligent upsell and cross-sell opportunities to increase merchant revenue.</p>
        </div>
        <button className="primary-button analyze-button" onClick={runAnalysis} disabled={isAnalyzing}>
          <span className={isAnalyzing ? "spin-icon" : "spark-button-icon"}>{isAnalyzing ? "◌" : "✦"}</span>
          {isAnalyzing ? "AI is analyzing..." : "Run AI Analysis"}
        </button>
      </header>

      {isAnalyzing && (
        <div className="growth-analyzing-banner">
          <div className="analyzing-pulse" />
          <div className="analyzing-text">
            <strong>AI is analyzing your catalog</strong>
            <span>Scanning product relationships, identifying cross-sell & upsell opportunities, calculating revenue impact...</span>
          </div>
        </div>
      )}

      {!hasAnalyzed && !isAnalyzing && (
        <>
          <section className="growth-hero">
            <div className="growth-hero-content">
              <div className="growth-hero-badge">✦ AI-POWERED</div>
              <h2>Discover hidden revenue in your catalog</h2>
              <p>The Growth Agent analyzes product relationships, customer buying patterns, and catalog structure to find untapped revenue opportunities you might be missing.</p>
              <button className="primary-button analyze-button" onClick={runAnalysis}>
                <span className="spark-button-icon">✦</span> Run AI Analysis
              </button>
            </div>
            <div className="growth-hero-stats">
              {products.length > 0 && (
                <div className="growth-hero-stat-card">
                  <span className="growth-hero-stat-icon">📦</span>
                  <strong>{products.length}</strong>
                  <span>Products in catalog</span>
                </div>
              )}
              {categoryBreakdown.length > 0 && (
                <div className="growth-hero-stat-card">
                  <span className="growth-hero-stat-icon">📂</span>
                  <strong>{categoryBreakdown.length}</strong>
                  <span>Categories detected</span>
                </div>
              )}
              <div className="growth-hero-stat-card">
                <span className="growth-hero-stat-icon">✦</span>
                <strong>AI</strong>
                <span>Analysis engine</span>
              </div>
            </div>
          </section>

          <section className="growth-capabilities">
            <div className="growth-capabilities-header">
              <p className="eyebrow">HOW IT WORKS</p>
              <h3>What the AI analyzes</h3>
            </div>
            <div className="growth-capabilities-grid">
              {CAPABILITIES.map((cap) => (
                <div className="growth-capability-card" key={cap.title}>
                  <span className="growth-capability-icon">{cap.icon}</span>
                  <h4>{cap.title}</h4>
                  <p>{cap.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {categoryBreakdown.length > 0 && (
            <section className="growth-catalog-preview">
              <div className="growth-capabilities-header">
                <p className="eyebrow">CATALOG SNAPSHOT</p>
                <h3>Products ready for analysis</h3>
              </div>
              <div className="growth-category-chips">
                {categoryBreakdown.map(([cat, count]) => (
                  <span className="growth-category-chip" key={cat}>
                    <span className="chip-icon">{CATEGORY_ICONS[cat] || "📦"}</span>
                    <span className="chip-label">{cat}</span>
                    <span className="chip-count">{count}</span>
                  </span>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {hasAnalyzed && (
        <>
          <section className="growth-summary">
            <div className="growth-summary-card">
              <span className="summary-icon summary-icon-blue">⌘</span>
              <div>
                <strong>{products.length}</strong>
                <span>Products scanned</span>
              </div>
            </div>
            <div className="growth-summary-card">
              <span className="summary-icon summary-icon-mint">✦</span>
              <div>
                <strong>{opportunities.length}</strong>
                <span>Bundles suggested</span>
              </div>
            </div>
            <div className="growth-summary-card summary-revenue">
              <span className="summary-icon summary-icon-amber">↗</span>
              <div>
                <strong>+{money(totalAdditionalRevenue)}</strong>
                <span>Extra revenue potential</span>
              </div>
            </div>
          </section>
          <section className="opportunities-heading">
            <div>
              <p className="eyebrow">AI SUGGESTIONS</p>
              <h2>Products that sell better together <span>{opportunities.length}</span></h2>
            </div>
          </section>
          {opportunities.length ? (
            <div className="growth-opportunity-list">
              {opportunities.map((opp) => (
                <OpportunityCard key={opp.id} opportunity={opp} />
              ))}
            </div>
          ) : (
            <div className="growth-empty">
              <div className="growth-empty-icon">✦</div>
              <h2>No strong revenue opportunities found</h2>
              <p>Add complementary product categories to your catalog to help the AI identify cross-sell and upsell opportunities.</p>
              <div className="growth-empty-actions">
                <Link href="/catalog" className="primary-button">Go to Catalog <span>↗</span></Link>
                <button className="secondary-button" onClick={runAnalysis}>Analyze Again</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
