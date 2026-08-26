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
  activateCampaign,
  pauseCampaign,
  type Campaign,
} from "@/lib/campaignOrchestrator";
import { logAuditEvent } from "@/lib/auditLogger";

function money(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

const TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  upsell: { label: "Upsell", icon: "↗", color: "campaign-type-upsell" },
  cross_sell: { label: "Cross-sell", icon: "⇄", color: "campaign-type-cross" },
  discount: { label: "Discount", icon: "%", color: "campaign-type-discount" },
  bundle: { label: "Bundle", icon: "⊞", color: "campaign-type-bundle" },
};

function CampaignCard({ campaign, onToggle, onDelete, toggling, glowClass, pillPop }: {
  campaign: Campaign;
  onToggle: () => void;
  onDelete: () => void;
  toggling: boolean;
  glowClass: string;
  pillPop: boolean;
}) {
  const type = TYPE_META[campaign.type] || { label: campaign.type, icon: "•", color: "" };
  const isActive = campaign.status === "active";
  const ctr = campaign.impressions > 0 ? ((campaign.clicks / campaign.impressions) * 100).toFixed(1) : "0.0";
  const cvr = campaign.clicks > 0 ? ((campaign.conversions / campaign.clicks) * 100).toFixed(1) : "0.0";

  return (
    <div className={`campaign-result-card ${glowClass}`}>
      <div className="campaign-card-top">
        <div className="campaign-card-type">
          <span className={`campaign-type-icon ${type.color}`}>{type.icon}</span>
          <div>
            <span className="campaign-type-label">{type.label}</span>
            <h3 className="campaign-card-name">{campaign.name}</h3>
          </div>
        </div>
        <div className="campaign-card-status-row">
          <span className={`campaign-status-pill ${isActive ? "status-active" : "status-paused"} ${pillPop ? "campaign-status-pill-pop" : ""}`}>
            <span className={`status-dot ${isActive ? "dot-active" : "dot-paused"}`} />
            {campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
          </span>
          <span className="campaign-target-count">{campaign.target_products.length} products</span>
        </div>
      </div>

      <div className="campaign-card-body">
        <p className="campaign-message">{campaign.message}</p>

        {campaign.discount_percent ? (
          <div className="campaign-discount-banner">
            <span className="discount-icon">%</span>
            <span>{campaign.discount_percent}% discount applied</span>
          </div>
        ) : null}

        <div className="campaign-metrics-grid">
          <div className="campaign-metric">
            <span className="campaign-metric-label">Impressions</span>
            <strong className="campaign-metric-value">{campaign.impressions.toLocaleString()}</strong>
          </div>
          <div className="campaign-metric">
            <span className="campaign-metric-label">Clicks</span>
            <strong className="campaign-metric-value">{campaign.clicks.toLocaleString()}</strong>
          </div>
          <div className="campaign-metric">
            <span className="campaign-metric-label">Conv.</span>
            <strong className="campaign-metric-value">{campaign.conversions.toLocaleString()}</strong>
          </div>
          <div className="campaign-metric">
            <span className="campaign-metric-label">Revenue</span>
            <strong className="campaign-metric-value campaign-metric-revenue">{money(campaign.revenue)}</strong>
          </div>
          <div className="campaign-metric">
            <span className="campaign-metric-label">CTR</span>
            <strong className="campaign-metric-value">{ctr}%</strong>
          </div>
          <div className="campaign-metric">
            <span className="campaign-metric-label">CVR</span>
            <strong className="campaign-metric-value">{cvr}%</strong>
          </div>
        </div>
      </div>

      <div className="campaign-card-actions">
        <button
          className={`campaign-action-btn ${isActive ? "action-pause" : "action-activate"} ${toggling ? "loading" : ""}`}
          onClick={onToggle}
          disabled={toggling}
        >
          {isActive ? "Pause" : "Activate"}
        </button>
        <button className="campaign-action-btn action-delete" onClick={onDelete}>
          Delete
        </button>
      </div>
    </div>
  );
}

export function CampaignWorkspace() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [glowingId, setGlowingId] = useState<string | null>(null);
  const [pillPopId, setPillPopId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "pause" | "delete"; exiting: boolean } | null>(null);
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

  const showToast = (message: string, type: "success" | "pause" | "delete") => {
    setToast({ message, type, exiting: false });
    setTimeout(() => {
      setToast((prev) => (prev ? { ...prev, exiting: true } : null));
      setTimeout(() => setToast(null), 260);
    }, 2000);
  };

  const toggleStatus = async (campaign: Campaign) => {
    const nextStatus = campaign.status === "active" ? "paused" : "active";
    setTogglingId(campaign.id);
    const updated = nextStatus === "active"
      ? await activateCampaign(campaign)
      : await pauseCampaign(campaign);
    if (updated) {
      setCampaigns((prev) => prev.map((c) => c.id === campaign.id ? updated : c));
      const m = await getCampaignMetrics(merchantId!);
      setMetrics(m);
      setTogglingId(null);
      setGlowingId(campaign.id);
      setPillPopId(campaign.id);
      setTimeout(() => setGlowingId(null), 750);
      setTimeout(() => setPillPopId(null), 450);
      showToast(
        nextStatus === "active" ? `"${campaign.name}" activated` : `"${campaign.name}" paused`,
        nextStatus === "active" ? "success" : "pause"
      );
    } else {
      setTogglingId(null);
    }
  };

  const handleDelete = async (campaignId: string) => {
    const ok = await deleteCampaign(campaignId);
    if (ok) {
      const name = campaigns.find((c) => c.id === campaignId)?.name || "Campaign";
      setCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
      const m = await getCampaignMetrics(merchantId!);
      setMetrics(m);
      showToast(`"${name}" deleted`, "delete");
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
          <p>Click &quot;Generate AI Campaigns&quot; to let the AI analyze your catalog and create targeted marketing campaigns.</p>
        </div>
      ) : (
        <div className="campaign-results-list">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onToggle={() => toggleStatus(campaign)}
              onDelete={() => handleDelete(campaign.id)}
              toggling={togglingId === campaign.id}
              glowClass={glowingId === campaign.id ? (campaign.status === "active" ? "campaign-card-glow-active" : "campaign-card-glow-paused") : ""}
              pillPop={pillPopId === campaign.id}
            />
          ))}
        </div>
      )}

      {toast && (
        <div className={`campaign-toast campaign-toast-${toast.type} ${toast.exiting ? "campaign-toast-exit" : ""}`}>
          {toast.type === "success" ? "✓ " : toast.type === "pause" ? "⏸ " : "🗑 "}
          {toast.message}
        </div>
      )}
    </div>
  );
}
