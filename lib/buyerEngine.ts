import type { AgentReadableProduct } from "@/types/agentCatalog";
import { aiSearchCatalog, type AIProductMatch } from "@/lib/ai";

export interface BuyerIntent {
  keywords: string[];
  category?: string;
  useCase?: string;
  maxPrice?: number;
  cheapest: boolean;
}

export interface BuyerMatch {
  product: AgentReadableProduct;
  reason: string;
}

export interface BuyerSearchResult {
  intent: BuyerIntent;
  matches: BuyerMatch[];
  closestMatch?: BuyerMatch;
  budgetExceeded: boolean;
  aiResponse?: string;
}

function parseBudget(request: string) {
  const match = request.toLowerCase().match(
    /(?:under|below|max(?:imum)?|budget(?: of)?)\s*(?:₹|rs\.?|inr)?\s*([\d,]+)/
  );
  return match ? Number(match[1].replace(/,/g, "")) : undefined;
}

export function parseBuyerIntent(request: string): BuyerIntent {
  const normalized = request.toLowerCase();
  const categoryWords: Record<string, string> = {
    laptop: "Laptops",
    laptops: "Laptops",
    monitor: "Monitors",
    monitors: "Monitors",
    keyboard: "Accessories",
    mouse: "Accessories",
    accessory: "Accessories",
    accessories: "Accessories",
  };
  const category = Object.keys(categoryWords).find((w) =>
    new RegExp(`\\b${w}\\b`).test(normalized)
  );
  const keywords = normalized.split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  const useCaseWords = ["coding", "programming", "development", "work", "productivity"];
  const useCase = useCaseWords.find((w) => normalized.includes(w));

  return {
    keywords,
    category: category ? categoryWords[category] : undefined,
    useCase,
    maxPrice: parseBudget(request),
    cheapest:
      normalized.includes("cheapest") || normalized.includes("lowest price"),
  };
}

export async function searchBuyerCatalog(
  products: AgentReadableProduct[],
  request: string
): Promise<BuyerSearchResult> {
  const intent = parseBuyerIntent(request);
  const aiResult = await aiSearchCatalog(products, request);

  const matches: BuyerMatch[] = aiResult.matches.map((m: AIProductMatch) => ({
    product: m.product,
    reason: m.reason,
  }));

  const closest = intent.maxPrice
    ? products
        .filter((p) => p.available)
        .sort(
          (a, b) =>
            Math.abs(a.price - intent.maxPrice!) -
            Math.abs(b.price - intent.maxPrice!)
        )[0]
    : undefined;

  return {
    intent,
    matches,
    closestMatch: closest
      ? { product: closest, reason: `Closest to your ₹${intent.maxPrice!.toLocaleString("en-IN")} budget.` }
      : undefined,
    budgetExceeded: Boolean(
      intent.maxPrice && matches.length === 0 && products.some((p) => p.price > intent.maxPrice!)
    ),
    aiResponse: aiResult.response,
  };
}
