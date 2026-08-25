"use client";

import { useEffect, useState } from "react";
import { loadProducts } from "@/lib/catalogStorage";
import { getMerchantIdForUser } from "@/lib/auth";
import {
  getCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  generateAICampaigns,
  getCampaignMetrics,
  type Campaign,
} from "@/lib/campaignOrchestrator";
import { logAuditEvent } from "@/lib/auditLogger";

function money(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

export function CampaignWorkspace() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalImpressions: 0,
    totalClicks: 0,
    totalConversions: 0,
    totalRevenue: 0,
    conversionRate: 0,
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      const mid = await getMerchantIdForUser();
      if (!mounted) return;
      setMerchantId(mid);
      if (mid) {
        const data = await getCampaigns(mid);
        const m = await getCampaignMetrics(mid);
        if (mounted) {
          setCampaigns(data);
          setMetrics(m);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const generateAICampaignsHandler = async () => {
    if (!merchantId) return;
    setGenerating(true);
    const products = await loadProducts();
    const aiCampaigns = await generateAICampaigns(
      merchantId,
      products.map((p) => ({ id: p.id, name: p.name, category: p.category, price: p.price, stock: p.stock }))
    );

    for (const c of aiCampaigns) {
      await createCampaign(merchantId, c);
    }

    const updated = await getCampaigns(merchantId);
    const m = await getCampaignMetrics(merchantId);
    setCampaigns(updated);
    setMetrics(m);
    setGenerating(false);

    await logAuditEvent({
      actor: "agent",
      action: "AI campaigns generated",
      category: "growth",
      status: "success",
      description: `AI generated ${aiCampaigns.length} campaign${aiCampaigns.length === 1 ? "" : "s"} from catalog analysis`,
      details: aiCampaigns.map((c) => c.name).join(", "),
      currency: "INR",
    });
  };

  const toggleStatus = async (campaign: Campaign) => {
    const nextStatus = campaign.status === "active" ? "paused" : "active";
    const updated = await updateCampaign(campaign.id, { status: nextStatus });
    if (updated) {
      setCampaigns((prev) => prev.map((c) => c.id === campaign.id ? updated : c));
      const m = await getCampaignMetrics(merchantId!);
      setMetrics(m);
    }
  };

  const handleDelete = async (campaignId: string) => {
    const ok = await deleteCampaign(campaignId);
    if (ok) {
      setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
      const m = await getCampaignMetrics(merchantId!);
      setMetrics(m);
    }
  };

  if (loading) {
    return <div className="growth-page"><div className="loading-state"><p>Loading campaigns...</p></div></div>;
  }

  return (
    <div className="growth-page">
      <header className="growth-header">
        <div>
          <p className="eyebrow">REVENUE INTELLIGENCE <span className="eyebrow-slash">/</span> CAMPAIGN ORCHESTRATOR</p>
          <h1>Campaign Orchestrator</h1>
          <p className="header-subtitle">AI-generated marketing campaigns to drive cross-sell, upsell, and bundle revenue.</p>
        </div>
        <button className="primary-button analyze-button" onClick={generateAICampaignsHandler} disabled={generating || !merchantId}>
          <span className={generating ? "spin-icon" : "spark-button-icon"}>{generating ? "◌" : "✦"}</span>
          {generating ? "Generating campaigns..." : "Generate AI Campaigns"}
        </button>
      </header>

      <section className="growth-summary">
        <div className="growth-summary-card"><span className="summary-icon summary-icon-blue">⌘</span><div><strong>{metrics.totalCampaigns}</strong><span>Total campaigns</span></div></div>
        <div className="growth-summary-card"><span className="summary-icon summary-icon-mint">✦</span><div><strong>{metrics.activeCampaigns}</strong><span>Active campaigns</span></div></div>
        <div className="growth-summary-card"><span className="summary-icon summary-icon-amber">↗</span><div><strong>{metrics.totalImpressions}</strong><span>Total impressions</span></div></div>
        <div className="growth-summary-card"><span className="summary-icon summary-icon-purple">◒</span><div><strong>{metrics.conversionRate}%</strong><span>Conversion rate</span></div></div>
      </section>

      {campaigns.length === 0 ? (
        <div className="growth-empty">
          <div className="growth-empty-icon">✦</div>
          <h2>No campaigns yet</h2>
          <p>Click "Generate AI Campaigns" to let the AI analyze your catalog and create targeted marketing campaigns.</p>
        </div>
      ) : (
        <div className="growth-opportunity-list">
          {campaigns.map((campaign) => (
            <div className="opportunity-card" key={campaign.id}>
              <div className="opportunity-header">
                <div>
                  <span className={`confidence-badge ${campaign.status === "active" ? "confidence-high" : "confidence-low"}`}>
                    {campaign.status.toUpperCase()}
                  </span>
                  <span className="recommendation-type">{campaign.type.replace("_", " ")}</span>
                </div>
                <span className="opportunity-revenue">+{campaign.target_products.length} products targeted</span>
              </div>
              <h3>{campaign.name}</h3>
              <p>{campaign.message}</p>
              <div className="opportunity-metrics">
                <div><span>Impressions</span><strong>{campaign.impressions}</strong></div>
                <div><span>Clicks</span><strong>{campaign.clicks}</strong></div>
                <div><span>Conversions</span><strong>{campaign.conversions}</strong></div>
                <div><span>Revenue</span><strong>{money(campaign.revenue)}</strong></div>
                {campaign.discount_percent ? <div><span>Discount</span><strong>{campaign.discount_percent}%</strong></div> : null}
              </div>
              <div className="opportunity-actions">
                <button className="secondary-button" onClick={() => toggleStatus(campaign)}>
                  {campaign.status === "active" ? "Pause" : "Activate"}
                </button>
                <button className="danger-button" onClick={() => handleDelete(campaign.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
