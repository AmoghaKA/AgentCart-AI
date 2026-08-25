import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getMerchantIdForUser } from "@/lib/auth";

export interface Campaign {
  id: string;
  merchant_id: string;
  name: string;
  type: "upsell" | "cross_sell" | "discount" | "bundle";
  status: "draft" | "active" | "paused" | "completed";
  target_products: string[];
  discount_percent?: number;
  message: string;
  created_at: string;
  updated_at: string;
  starts_at?: string;
  ends_at?: string;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
}

function q() {
  return getSupabaseBrowserClient();
}

export async function createCampaign(
  merchantId: string,
  campaign: Omit<Campaign, "id" | "merchant_id" | "created_at" | "updated_at" | "impressions" | "clicks" | "conversions" | "revenue">
): Promise<Campaign | null> {
  const now = new Date().toISOString();
  const { data, error } = await q()
    .from("campaigns")
    .insert({
      merchant_id: merchantId,
      name: campaign.name,
      type: campaign.type,
      status: campaign.status || "draft",
      target_products: campaign.target_products,
      discount_percent: campaign.discount_percent || 0,
      message: campaign.message,
      starts_at: campaign.starts_at,
      ends_at: campaign.ends_at,
      impressions: 0,
      clicks: 0,
      conversions: 0,
      revenue: 0,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create campaign:", JSON.stringify(error));
    return null;
  }
  return data as Campaign;
}

export async function getCampaigns(merchantId: string): Promise<Campaign[]> {
  const { data, error } = await q()
    .from("campaigns")
    .select("*")
    .eq("merchant_id", merchantId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to load campaigns:", JSON.stringify(error));
    return [];
  }
  return (data || []) as Campaign[];
}

export async function updateCampaign(
  campaignId: string,
  updates: Partial<Campaign>
): Promise<Campaign | null> {
  const { data, error } = await q()
    .from("campaigns")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", campaignId)
    .select()
    .single();

  if (error) {
    console.error("Failed to update campaign:", JSON.stringify(error));
    return null;
  }
  return data as Campaign;
}

export async function deleteCampaign(campaignId: string): Promise<boolean> {
  const { error } = await q().from("campaigns").delete().eq("id", campaignId);
  if (error) console.error("Failed to delete campaign:", JSON.stringify(error));
  return !error;
}

export async function generateAICampaigns(
  merchantId: string,
  products: { id: string; name: string; category: string; price: number; stock: number }[]
): Promise<Omit<Campaign, "id" | "merchant_id" | "created_at" | "updated_at" | "impressions" | "clicks" | "conversions" | "revenue">[]> {
  try {
    const res = await fetch("/api/campaigns/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ products }),
    });

    if (!res.ok) {
      console.error("AI campaign API failed:", res.status);
      return fallbackCampaigns(products);
    }

    const data = await res.json();
    if (data.campaigns && data.campaigns.length > 0) {
      return data.campaigns.map((c: any) => ({
        name: c.name,
        type: c.type,
        status: "draft" as const,
        target_products: c.target_products || [],
        discount_percent: c.discount_percent || 0,
        message: c.message,
      }));
    }
    return fallbackCampaigns(products);
  } catch (error) {
    console.error("AI campaign generation failed:", error);
    return fallbackCampaigns(products);
  }
}

function fallbackCampaigns(
  products: { id: string; name: string; category: string; price: number; stock: number }[]
) {
  const inStock = products.filter((p) => p.stock > 0);
  const campaigns: any[] = [];

  const accessories = inStock.filter((p) => p.category === "Accessories");
  if (accessories.length > 0) {
    campaigns.push({
      name: "Complete Your Setup",
      type: "cross_sell",
      target_products: accessories.slice(0, 3).map((p) => p.id),
      discount_percent: 0,
      message: "Complete your workspace with premium accessories.",
    });
  }

  const laptops = inStock.filter((p) => p.category === "Laptops");
  if (laptops.length > 0 && accessories.length > 0) {
    campaigns.push({
      name: "Laptop Essentials Bundle",
      type: "bundle",
      target_products: [laptops[0].id, ...accessories.slice(0, 2).map((p) => p.id)],
      discount_percent: 5,
      message: "Get 5% off when you bundle a laptop with accessories.",
    });
  }

  return campaigns;
}

export async function getCampaignMetrics(merchantId: string) {
  const { data } = await q()
    .from("campaigns")
    .select("impressions, clicks, conversions, revenue, status")
    .eq("merchant_id", merchantId);

  if (!data || data.length === 0) {
    return { totalCampaigns: 0, activeCampaigns: 0, totalImpressions: 0, totalClicks: 0, totalConversions: 0, totalRevenue: 0, conversionRate: 0 };
  }

  return {
    totalCampaigns: data.length,
    activeCampaigns: data.filter((c) => c.status === "active").length,
    totalImpressions: data.reduce((s, c) => s + (c.impressions || 0), 0),
    totalClicks: data.reduce((s, c) => s + (c.clicks || 0), 0),
    totalConversions: data.reduce((s, c) => s + (c.conversions || 0), 0),
    totalRevenue: data.reduce((s, c) => s + (c.revenue || 0), 0),
    conversionRate: data.reduce((s, c) => s + (c.impressions || 0), 0) > 0
      ? Math.round((data.reduce((s, c) => s + (c.conversions || 0), 0) / data.reduce((s, c) => s + (c.impressions || 0), 0)) * 100)
      : 0,
  };
}
