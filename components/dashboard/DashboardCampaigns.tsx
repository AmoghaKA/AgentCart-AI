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
  return `\u20B9${value.toLocaleString("en-IN")}`;
}

export function DashboardCampaigns() {
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
    return (
      <section className="activity-panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">CAMPAIGN ORCHESTRATOR</p>
            <h2>Campaigns</h2>
          </div>
        </div>
        <p style={{ color: "#6b7280", fontSize: 14 }}>Loading campaigns...</p>
      </section>
    );
  }

  return (
    <section className="activity-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">CAMPAIGN ORCHESTRATOR</p>
          <h2>Campaigns</h2>
        </div>
        <button
          className="primary-button"
          onClick={generateAICampaignsHandler}
          disabled={generating || !merchantId}
          style={{ fontSize: 13, padding: "8px 16px" }}
        >
          {generating ? "Generating..." : "Generate AI Campaigns"}
        </button>
      </div>

      {metrics.totalCampaigns > 0 && (
        <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, color: "#6b7280" }}>
            <strong style={{ color: "#111" }}>{metrics.totalCampaigns}</strong> total
          </div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>
            <strong style={{ color: "#16a34a" }}>{metrics.activeCampaigns}</strong> active
          </div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>
            <strong style={{ color: "#d97706" }}>{metrics.totalImpressions}</strong> impressions
          </div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>
            <strong style={{ color: "#7c3aed" }}>{metrics.conversionRate}%</strong> conversion
          </div>
        </div>
      )}

      {campaigns.length === 0 ? (
        <div style={{ textAlign: "center", padding: "24px 0", color: "#9ca3af" }}>
          <p style={{ fontSize: 14, marginBottom: 8 }}>No campaigns yet.</p>
          <p style={{ fontSize: 13 }}>Click &quot;Generate AI Campaigns&quot; to create targeted marketing campaigns from your catalog.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {campaigns.slice(0, 5).map((campaign) => {
            const isGlowing = glowingId === campaign.id;
            const isActive = campaign.status === "active";
            return (
            <div
              key={campaign.id}
              className={isGlowing ? (isActive ? "campaign-card-glow-active" : "campaign-card-glow-paused") : ""}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                background: "#fafafa",
                transition: "border-color .3s, box-shadow .3s",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                  <span
                    className={pillPopId === campaign.id ? "campaign-status-pill-pop" : ""}
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: isActive ? "#dcfce7" : "#f3f4f6",
                      color: isActive ? "#16a34a" : "#6b7280",
                      display: "inline-block",
                    }}
                  >
                    {campaign.status}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      textTransform: "uppercase",
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: "#f0f9ff",
                      color: "#0369a1",
                    }}
                  >
                    {campaign.type.replace("_", " ")}
                  </span>
                </div>
                <strong style={{ fontSize: 14 }}>{campaign.name}</strong>
                <p style={{ fontSize: 12, color: "#6b7280", margin: "2px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {campaign.message}
                </p>
              </div>
              <div style={{ display: "flex", gap: 6, marginLeft: 12, flexShrink: 0 }}>
                <button
                  className={`secondary-button ${togglingId === campaign.id ? "loading" : ""}`}
                  onClick={() => toggleStatus(campaign)}
                  disabled={togglingId === campaign.id}
                  style={{ fontSize: 11, padding: "4px 10px" }}
                >
                  {campaign.status === "active" ? "Pause" : "Activate"}
                </button>
                <button
                  className="danger-button"
                  onClick={() => handleDelete(campaign.id)}
                  style={{ fontSize: 11, padding: "4px 10px" }}
                >
                  Delete
                </button>
              </div>
            </div>
            );
          })}
          {campaigns.length > 5 && (
            <p style={{ fontSize: 12, color: "#9ca3af", textAlign: "center" }}>
              +{campaigns.length - 5} more campaigns
            </p>
          )}
        </div>
      )}

      {toast && (
        <div className={`campaign-toast campaign-toast-${toast.type} ${toast.exiting ? "campaign-toast-exit" : ""}`}>
          {toast.type === "success" ? "✓ " : toast.type === "pause" ? "⏸ " : "🗑 "}
          {toast.message}
        </div>
      )}
    </section>
  );
}
