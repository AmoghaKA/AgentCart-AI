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

function EmptyState({ emptyCatalog, onAnalyze }: { emptyCatalog: boolean; onAnalyze: () => void }) {
  return <div className="growth-empty"><div className="growth-empty-icon">✦</div><h2>{emptyCatalog ? "No products available to analyze." : "No strong revenue opportunities found."}</h2><p>{emptyCatalog ? "Add products to your catalog before running the AI Growth Agent." : "Add complementary product categories to your catalog to help the AI identify cross-sell opportunities."}</p>{emptyCatalog ? <Link href="/catalog" className="primary-button">Go to Catalog <span>↗</span></Link> : <button className="secondary-button" onClick={onAnalyze}>Analyze Again</button>}</div>;
}

export function GrowthWorkspace() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [opportunities, setOpportunities] = useState<GrowthOpportunity[]>([]);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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

  useEffect(() => {
    let mounted = true;
    (async () => {
      const data = await loadProducts();
      if (mounted) {
        setProducts(data);
        setLoading(false);
        try {
          const results = await analyzeCatalog(data);
          setOpportunities(results);
          setHasAnalyzed(true);
          await logAuditEvent({
            actor: "agent",
            action: "AI Growth analysis executed",
            category: "growth",
            status: results.length > 0 ? "success" : "blocked",
            description: `AI analyzed ${data.length} products — ${results.length} growth opportunit${results.length === 1 ? "y" : "ies"} identified`,
            details: results.length > 0 ? results.map((r) => `${r.mainProduct.name} → ${r.recommendedProducts.map((p) => p.name).join(", ")}`).join("; ") : "No opportunities found",
            amount: results.reduce((sum, r) => sum + r.additionalRevenue, 0),
            currency: "INR",
          });
        } catch (error) {
          console.error("AI analysis failed:", error);
        }
      }
    })();
    return () => { mounted = false; };
  }, []);

  const totalAdditionalRevenue = useMemo(() => opportunities.reduce((total, o) => total + o.additionalRevenue, 0), [opportunities]);
  const averageImpact = opportunities.length ? Math.round(totalAdditionalRevenue / opportunities.length) : 0;

  if (loading) {
    return <div className="growth-page"><div className="loading-state"><p>Loading catalog from Supabase...</p></div></div>;
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
        <div className="analysis-progress">
          <span className="status-dot" /> AI is analyzing product relationships <i /> Identifying cross-sell & upsell opportunities <i /> Calculating revenue impact
        </div>
      )}
      {hasAnalyzed && (
        <>
          <section className="growth-summary">
            <div className="growth-summary-card"><span className="summary-icon summary-icon-blue">⌘</span><div><strong>{products.length}</strong><span>Products analyzed</span></div></div>
            <div className="growth-summary-card"><span className="summary-icon summary-icon-mint">✦</span><div><strong>{opportunities.length}</strong><span>Growth opportunities</span></div></div>
            <div className="growth-summary-card summary-revenue"><span className="summary-icon summary-icon-amber">↗</span><div><strong>+{money(totalAdditionalRevenue)}</strong><span>Potential revenue identified</span></div></div>
            <div className="growth-summary-card"><span className="summary-icon summary-icon-purple">◒</span><div><strong>+{money(averageImpact)}</strong><span>Average order value impact</span></div></div>
          </section>
          <section className="opportunities-heading">
            <div><p className="eyebrow">AI RECOMMENDATIONS</p><h2>Revenue opportunities <span>{opportunities.length}</span></h2></div>
            <p>AI-powered recommendations based on catalog analysis and product relationships.</p>
          </section>
          {opportunities.length ? (
            <div className="growth-opportunity-list">
              {opportunities.map((opp) => (
                <OpportunityCard key={opp.id} opportunity={opp} />
              ))}
            </div>
          ) : (
            <EmptyState emptyCatalog={products.length === 0} onAnalyze={runAnalysis} />
          )}
        </>
      )}
    </div>
  );
}
