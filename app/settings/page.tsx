"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getCurrentUser } from "@/lib/auth";

interface MerchantData {
  id: string;
  name: string;
  description: string;
  currency: string;
  created_at: string;
}

interface MerchantSettings {
  store_name: string;
  store_description: string;
  currency: string;
  public_catalog: boolean;
  auto_respond: boolean;
  show_pricing: boolean;
  cross_sell: boolean;
  safety_checks: boolean;
  ai_analysis: boolean;
  auto_approve: boolean;
}

export default function SettingsPage() {
  const [merchant, setMerchant] = useState<MerchantData | null>(null);
  const [settings, setSettings] = useState<MerchantSettings>({
    store_name: "",
    store_description: "",
    currency: "INR",
    public_catalog: true,
    auto_respond: true,
    show_pricing: true,
    cross_sell: true,
    safety_checks: true,
    ai_analysis: true,
    auto_approve: false,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "agent" | "billing">("profile");

  useEffect(() => {
    (async () => {
      const user = await getCurrentUser();
      if (!user) return;

      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from("merchants")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (data) setMerchant(data);

      try {
        const res = await fetch("/api/merchant-settings");
        const s = await res.json();
        setSettings((prev) => ({ ...prev, ...s }));
      } catch {}
    })();
  }, []);

  const update = (patch: Partial<MerchantSettings>) =>
    setSettings((s) => ({ ...s, ...patch }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/merchant-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const result = await res.json();
      if (!res.ok) {
        console.error("Save failed:", result);
        alert("Save failed: " + (result.error || "Unknown error"));
        setSaving(false);
        return;
      }
      // Reload saved settings from DB to confirm
      const reload = await fetch("/api/merchant-settings");
      const reloaded = await reload.json();
      setSettings(reloaded);
    } catch (err: any) {
      console.error("Save error:", err);
      alert("Save failed: " + err.message);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!merchant) {
    return (
      <AppShell>
        <div className="settings-page">
          <div className="settings-skeleton" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="settings-page">
        <header className="settings-header">
          <div>
            <p className="eyebrow">
              SETTINGS <span className="eyebrow-slash">/</span> MERCHANT
            </p>
            <h1>Merchant Console</h1>
            <p className="settings-subtitle">
              Configure your store, agent behavior, and account settings.
            </p>
          </div>
          <div className="settings-header-meta">
            <div className="settings-status-chip">
              <span className="settings-status-dot" />
              <span>All systems operational</span>
            </div>
          </div>
        </header>

        <div className="settings-tabs">
          <button
            className={`settings-tab ${activeTab === "profile" ? "active" : ""}`}
            onClick={() => setActiveTab("profile")}
          >
            <span className="settings-tab-icon">🏪</span>
            Store Profile
          </button>
          <button
            className={`settings-tab ${activeTab === "agent" ? "active" : ""}`}
            onClick={() => setActiveTab("agent")}
          >
            <span className="settings-tab-icon">✦</span>
            Agent Config
          </button>
          <button
            className={`settings-tab ${activeTab === "billing" ? "active" : ""}`}
            onClick={() => setActiveTab("billing")}
          >
            <span className="settings-tab-icon">💳</span>
            Billing
          </button>
        </div>

        {activeTab === "profile" && (
          <div className="settings-content">
            <section className="settings-section">
              <div className="settings-section-header">
                <h2>Store Information</h2>
                <p>Your merchant profile visible to AI buyers and customers.</p>
              </div>
              <div className="settings-form">
                <div className="settings-field">
                  <label>Store Name</label>
                  <input
                    type="text"
                    value={settings.store_name}
                    onChange={(e) => update({ store_name: e.target.value })}
                    className="settings-input"
                  />
                </div>
                <div className="settings-field">
                  <label>Description</label>
                  <textarea
                    value={settings.store_description}
                    onChange={(e) => update({ store_description: e.target.value })}
                    className="settings-textarea"
                    rows={3}
                    placeholder="Tell AI buyers what your store offers..."
                  />
                </div>
                <div className="settings-field-row">
                  <div className="settings-field">
                    <label>Currency</label>
                    <div className="settings-select-wrapper">
                      <select
                        className="settings-select"
                        value={settings.currency}
                        onChange={(e) => update({ currency: e.target.value })}
                      >
                        <option value="INR">INR — Indian Rupee</option>
                        <option value="USD">USD — US Dollar</option>
                        <option value="EUR">EUR — Euro</option>
                      </select>
                    </div>
                  </div>
                  <div className="settings-field">
                    <label>Store ID</label>
                    <input
                      type="text"
                      value={merchant.id}
                      className="settings-input settings-input-disabled"
                      disabled
                    />
                  </div>
                </div>
                <div className="settings-field">
                  <label>Created</label>
                  <input
                    type="text"
                    value={new Date(merchant.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                    className="settings-input settings-input-disabled"
                    disabled
                  />
                </div>
              </div>
            </section>

            <section className="settings-section">
              <div className="settings-section-header">
                <h2>AI Catalog Access</h2>
                <p>How AI buyers discover and interact with your products.</p>
              </div>
              <div className="settings-form">
                <div className="settings-toggle-row">
                  <div className="settings-toggle-info">
                    <span className="settings-toggle-label">Public catalog</span>
                    <span className="settings-toggle-desc">Allow AI buyers to discover your products</span>
                  </div>
                  <div
                    className={`settings-toggle ${settings.public_catalog ? "active" : ""}`}
                    onClick={() => update({ public_catalog: !settings.public_catalog })}
                  >
                    <div className="settings-toggle-knob" />
                  </div>
                </div>
                <div className="settings-toggle-row">
                  <div className="settings-toggle-info">
                    <span className="settings-toggle-label">Auto-respond to buyer requests</span>
                    <span className="settings-toggle-desc">Agent automatically handles buyer inquiries</span>
                  </div>
                  <div
                    className={`settings-toggle ${settings.auto_respond ? "active" : ""}`}
                    onClick={() => update({ auto_respond: !settings.auto_respond })}
                  >
                    <div className="settings-toggle-knob" />
                  </div>
                </div>
                <div className="settings-toggle-row">
                  <div className="settings-toggle-info">
                    <span className="settings-toggle-label">Show pricing to AI agents</span>
                    <span className="settings-toggle-desc">Expose product prices in the structured catalog</span>
                  </div>
                  <div
                    className={`settings-toggle ${settings.show_pricing ? "active" : ""}`}
                    onClick={() => update({ show_pricing: !settings.show_pricing })}
                  >
                    <div className="settings-toggle-knob" />
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === "agent" && (
          <div className="settings-content">
            <section className="settings-section">
              <div className="settings-section-header">
                <h2>Agent Behavior</h2>
                <p>Configure how the AI agent manages your store and revenue.</p>
              </div>
              <div className="settings-form">
                <div className="settings-toggle-row">
                  <div className="settings-toggle-info">
                    <span className="settings-toggle-label">Cross-sell recommendations</span>
                    <span className="settings-toggle-desc">Agent suggests complementary products to buyers</span>
                  </div>
                  <div
                    className={`settings-toggle ${settings.cross_sell ? "active" : ""}`}
                    onClick={() => update({ cross_sell: !settings.cross_sell })}
                  >
                    <div className="settings-toggle-knob" />
                  </div>
                </div>
                <div className="settings-toggle-row">
                  <div className="settings-toggle-info">
                    <span className="settings-toggle-label">Safety validation</span>
                    <span className="settings-toggle-desc">Block orders exceeding transaction limits</span>
                  </div>
                  <div
                    className={`settings-toggle ${settings.safety_checks ? "active" : ""}`}
                    onClick={() => update({ safety_checks: !settings.safety_checks })}
                  >
                    <div className="settings-toggle-knob" />
                  </div>
                </div>
                <div className="settings-toggle-row">
                  <div className="settings-toggle-info">
                    <span className="settings-toggle-label">AI analysis</span>
                    <span className="settings-toggle-desc">Enable deep learning on order patterns</span>
                  </div>
                  <div
                    className={`settings-toggle ${settings.ai_analysis ? "active" : ""}`}
                    onClick={() => update({ ai_analysis: !settings.ai_analysis })}
                  >
                    <div className="settings-toggle-knob" />
                  </div>
                </div>
                <div className="settings-toggle-row">
                  <div className="settings-toggle-info">
                    <span className="settings-toggle-label">Auto-approve small orders</span>
                    <span className="settings-toggle-desc">Skip manual approval for orders under the limit</span>
                  </div>
                  <div
                    className={`settings-toggle ${settings.auto_approve ? "active" : ""}`}
                    onClick={() => update({ auto_approve: !settings.auto_approve })}
                  >
                    <div className="settings-toggle-knob" />
                  </div>
                </div>
              </div>
            </section>

            <section className="settings-section">
              <div className="settings-section-header">
                <h2>Quick Links</h2>
                <p>Access key areas of your merchant console.</p>
              </div>
              <div className="settings-quick-links">
                <a href="/catalog" className="settings-quick-link">
                  <span className="settings-quick-icon">📦</span>
                  <span className="settings-quick-text">
                    <strong>Product Catalog</strong>
                    <span>Manage your inventory and pricing</span>
                  </span>
                  <span className="settings-quick-arrow">→</span>
                </a>
                <a href="/growth-agent" className="settings-quick-link">
                  <span className="settings-quick-icon">✦</span>
                  <span className="settings-quick-text">
                    <strong>Growth Agent</strong>
                    <span>Find cross-sell opportunities</span>
                  </span>
                  <span className="settings-quick-arrow">→</span>
                </a>
                <a href="/audit" className="settings-quick-link">
                  <span className="settings-quick-icon">📋</span>
                  <span className="settings-quick-text">
                    <strong>Audit Trail</strong>
                    <span>View payment and order events</span>
                  </span>
                  <span className="settings-quick-arrow">→</span>
                </a>
                <a href="/ai-buyer" className="settings-quick-link">
                  <span className="settings-quick-icon">🛒</span>
                  <span className="settings-quick-text">
                    <strong>AI Buyer</strong>
                    <span>Test the buyer experience</span>
                  </span>
                  <span className="settings-quick-arrow">→</span>
                </a>
              </div>
            </section>
          </div>
        )}

        {activeTab === "billing" && (
          <div className="settings-content">
            <section className="settings-section">
              <div className="settings-section-header">
                <h2>Current Plan</h2>
                <p>Your subscription and usage details.</p>
              </div>
              <div className="settings-billing-card">
                <div className="settings-plan-header">
                  <div className="settings-plan-badge">PRO</div>
                  <div>
                    <strong>Pro Plan</strong>
                    <span>Full access to all features</span>
                  </div>
                </div>
                <div className="settings-plan-features">
                  <div className="settings-plan-feature">
                    <span className="settings-plan-check">✓</span>
                    <span>Unlimited AI-powered commerce</span>
                  </div>
                  <div className="settings-plan-feature">
                    <span className="settings-plan-check">✓</span>
                    <span>Cross-sell &amp; upsell analysis</span>
                  </div>
                  <div className="settings-plan-feature">
                    <span className="settings-plan-check">✓</span>
                    <span>Advanced audit trail</span>
                  </div>
                  <div className="settings-plan-feature">
                    <span className="settings-plan-check">✓</span>
                    <span>Razorpay integration</span>
                  </div>
                  <div className="settings-plan-feature">
                    <span className="settings-plan-check">✓</span>
                    <span>Priority agent support</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="settings-section">
              <div className="settings-section-header">
                <h2>Usage This Month</h2>
                <p>Your current billing cycle usage.</p>
              </div>
              <div className="settings-usage-grid">
                <div className="settings-usage-item">
                  <span className="settings-usage-label">AI Agent Requests</span>
                  <span className="settings-usage-value">142</span>
                  <div className="settings-usage-bar">
                    <div className="settings-usage-fill" style={{ width: "14%" }} />
                  </div>
                  <span className="settings-usage-limit">of 1,000 included</span>
                </div>
                <div className="settings-usage-item">
                  <span className="settings-usage-label">Catalog Products</span>
                  <span className="settings-usage-value">5</span>
                  <div className="settings-usage-bar">
                    <div className="settings-usage-fill" style={{ width: "5%" }} />
                  </div>
                  <span className="settings-usage-limit">of 100 included</span>
                </div>
                <div className="settings-usage-item">
                  <span className="settings-usage-label">Audit Events</span>
                  <span className="settings-usage-value">38</span>
                  <div className="settings-usage-bar">
                    <div className="settings-usage-fill" style={{ width: "4%" }} />
                  </div>
                  <span className="settings-usage-limit">of 1,000 included</span>
                </div>
              </div>
            </section>
          </div>
        )}

        <div className="settings-save-bar">
          <button
            className={`settings-save-btn ${saving ? "saving" : ""} ${saved ? "saved" : ""}`}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : saved ? "✓ Saved" : "Save Changes"}
          </button>
          <span className="settings-save-hint">Changes take effect immediately.</span>
        </div>
      </div>
    </AppShell>
  );
}
