/* eslint-disable @typescript-eslint/no-explicit-any */
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { DEMO_MERCHANT_ID } from "@/lib/config";

function q(): any {
  return getSupabaseBrowserClient();
}

export interface DashboardMetrics {
  totalRevenue: string;
  totalRevenueNum: number;
  aiInfluencedRevenue: string;
  aiInfluencedRevenueNum: number;
  potentialUpsell: string;
  potentialUpsellNum: number;
  totalOrders: number;
  totalProducts: number;
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  try {
    // Query real orders for total revenue and order count
    const { data: orders } = await q()
      .from("orders")
      .select("total, status")
      .eq("merchant_id", DEMO_MERCHANT_ID) as any;

    const completedOrders = (orders || []).filter(
      (o: any) => o.status === "payment_verified"
    );
    const totalRevenue = completedOrders.reduce(
      (sum: number, o: any) => sum + Number(o.total || 0),
      0
    );
    const totalOrders = completedOrders.length;

    // Query products count
    const { count: totalProducts } = await q()
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("merchant_id", DEMO_MERCHANT_ID) as any;

    // Query successful payment events for AI-influenced revenue
    const { data: paymentEvents } = await q()
      .from("audit_events")
      .select("amount")
      .eq("merchant_id", DEMO_MERCHANT_ID)
      .eq("category", "payment")
      .eq("status", "success") as any;

    const aiInfluencedRevenue = (paymentEvents || []).reduce(
      (sum: number, e: any) => sum + Number(e.amount || 0),
      0
    );

    // Query growth opportunities for potential upsell
    const { data: growthEvents } = await q()
      .from("audit_events")
      .select("amount")
      .eq("merchant_id", DEMO_MERCHANT_ID)
      .eq("category", "growth")
      .eq("status", "success") as any;

    const potentialUpsell = (growthEvents || []).reduce(
      (sum: number, e: any) => sum + Number(e.amount || 0),
      0
    );

    return {
      totalRevenue: `\u20B9${totalRevenue.toLocaleString("en-IN")}`,
      totalRevenueNum: totalRevenue,
      aiInfluencedRevenue: `\u20B9${aiInfluencedRevenue.toLocaleString("en-IN")}`,
      aiInfluencedRevenueNum: aiInfluencedRevenue,
      potentialUpsell: `\u20B9${potentialUpsell.toLocaleString("en-IN")}`,
      potentialUpsellNum: potentialUpsell,
      totalOrders,
      totalProducts: totalProducts || 0,
    };
  } catch (err) {
    console.error("Failed to fetch dashboard metrics:", err);
    return {
      totalRevenue: "\u20B90",
      totalRevenueNum: 0,
      aiInfluencedRevenue: "\u20B90",
      aiInfluencedRevenueNum: 0,
      potentialUpsell: "\u20B90",
      potentialUpsellNum: 0,
      totalOrders: 0,
      totalProducts: 0,
    };
  }
}

export async function getRecentAuditActivity(limit = 4): Promise<{
  title: string;
  detail: string;
  status: string;
  time: string;
  icon: string;
}[]> {
  try {
    const { data: events } = await q()
      .from("audit_events")
      .select("action, description, status, created_at")
      .eq("merchant_id", DEMO_MERCHANT_ID)
      .order("created_at", { ascending: false })
      .limit(limit) as any;

    return (events || []).map((e: any) => ({
      title: e.action,
      detail: e.description,
      status: e.status === "success" ? "Success" : e.status === "failed" ? "Failed" : "Blocked",
      time: formatTimeAgo(e.created_at),
      icon: e.status === "success" ? "\u2713" : e.status === "failed" ? "\u2717" : "\u26A0",
    }));
  } catch {
    return [];
  }
}

export async function getTopGrowthOpportunity(): Promise<{
  mainProduct: string;
  mainProductPrice: number;
  recommendedProducts: { name: string; price: number }[];
  additionalRevenue: number;
} | null> {
  try {
    const { data: events } = await q()
      .from("audit_events")
      .select("description, details, amount")
      .eq("merchant_id", DEMO_MERCHANT_ID)
      .eq("category", "growth")
      .eq("status", "success")
      .order("created_at", { ascending: false })
      .limit(1) as any;

    if (!events || events.length === 0) return null;

    const event = events[0];
    // Parse growth opportunity from the audit event details
    const details = event.details || "";
    const match = details.match(/^(.+) \u2192 (.+)$/);
    if (!match) return null;

    const mainProduct = match[1].trim();
    const recs = match[2].split(", ").map((r: string) => r.trim());

    return {
      mainProduct,
      mainProductPrice: 0,
      recommendedProducts: recs.map((name: string) => ({ name, price: 0 })),
      additionalRevenue: Number(event.amount || 0),
    };
  } catch {
    return null;
  }
}

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
