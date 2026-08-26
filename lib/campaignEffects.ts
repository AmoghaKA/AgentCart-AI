import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Campaign } from "@/lib/campaignOrchestrator";

export interface ProductDiscount {
  campaignId: string;
  campaignName: string;
  campaignType: Campaign["type"];
  discountPercent: number;
  discountedPrice: number;
  originalPrice: number;
}

function q() {
  return getSupabaseBrowserClient();
}

export async function getActiveCampaignDiscounts(): Promise<Map<string, ProductDiscount[]>> {
  const { data } = await q()
    .from("campaigns")
    .select("id, name, type, target_products, discount_percent")
    .eq("status", "active")
    .gt("discount_percent", 0);

  if (!data || data.length === 0) return new Map();

  const discountMap = new Map<string, ProductDiscount[]>();

  for (const campaign of data as Campaign[]) {
    if (!campaign.discount_percent || !campaign.target_products?.length) continue;
    for (const productId of campaign.target_products) {
      const existing = discountMap.get(productId) || [];
      existing.push({
        campaignId: campaign.id,
        campaignName: campaign.name,
        campaignType: campaign.type,
        discountPercent: campaign.discount_percent,
        discountedPrice: 0,
        originalPrice: 0,
      });
      discountMap.set(productId, existing);
    }
  }

  return discountMap;
}

export function getBestDiscountForProduct(productId: string, discountMap: Map<string, ProductDiscount[]>, originalPrice: number): ProductDiscount | null {
  const discounts = discountMap.get(productId);
  if (!discounts || discounts.length === 0) return null;

  let best = discounts[0];
  for (const d of discounts) {
    if (d.discountPercent > best.discountPercent) best = d;
  }

  return {
    ...best,
    originalPrice,
    discountedPrice: Math.round(originalPrice * (1 - best.discountPercent / 100)),
  };
}

export function calculateDiscountedTotal(
  items: { productId: string; quantity: number; unitPrice: number }[],
  discountMap: Map<string, ProductDiscount[]>
): { subtotal: number; discount: number; total: number; appliedDiscounts: { name: string; amount: number }[] } {
  let subtotal = 0;
  let discount = 0;
  const appliedDiscounts: { name: string; amount: number }[] = [];
  const seenCampaigns = new Map<string, number>();

  for (const item of items) {
    const originalLine = item.unitPrice * item.quantity;
    subtotal += originalLine;

    const best = getBestDiscountForProduct(item.productId, discountMap, item.unitPrice);
    if (best) {
      const lineDiscount = originalLine - (best.discountedPrice * item.quantity);
      discount += lineDiscount;
      const key = best.campaignName;
      seenCampaigns.set(key, (seenCampaigns.get(key) || 0) + lineDiscount);
    }
  }

  for (const [name, amount] of seenCampaigns) {
    appliedDiscounts.push({ name, amount: Math.round(amount) });
  }

  return {
    subtotal,
    discount: Math.round(discount),
    total: Math.round(subtotal - discount),
    appliedDiscounts,
  };
}
