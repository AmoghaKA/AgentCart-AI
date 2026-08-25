import type { AgentReadableProduct } from "@/types/agentCatalog";

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
    cheapest: normalized.includes("cheapest") || normalized.includes("lowest price"),
  };
}

function fallbackSearch(products: AgentReadableProduct[], request: string): { matches: BuyerMatch[]; response: string } {
  const normalized = request.toLowerCase();
  const maxPrice = parseBudget(request);
  const matches: BuyerMatch[] = products
    .filter((p) => p.available && p.stock > 0)
    .map((p) => {
      const text = `${p.name} ${p.description} ${p.category}`.toLowerCase();
      let score = 0;
      const words = normalized.split(/[^a-z0-9]+/).filter((w) => w.length > 2);
      score += words.filter((w) => text.includes(w)).length * 10;
      if (maxPrice && p.price <= maxPrice) score += 20;
      if (maxPrice && p.price > maxPrice) score -= 50;
      return { product: p, score: Math.max(0, score), reason: `Matches your search for "${request}".` };
    })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map(({ score: _, ...rest }) => rest);

  return {
    matches,
    response: matches.length > 0
      ? `I found ${matches.length} product${matches.length === 1 ? "" : "s"} matching your request.`
      : `I couldn't find products matching "${request}". Try different keywords.`,
  };
}

export async function searchBuyerCatalog(
  products: AgentReadableProduct[],
  request: string
): Promise<BuyerSearchResult> {
  const intent = parseBuyerIntent(request);

  if (!products.length) {
    return { intent, matches: [], budgetExceeded: false, aiResponse: "The catalog is empty." };
  }

  try {
    const res = await fetch("/api/ai/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ products, query: request }),
    });

    if (!res.ok) throw new Error(`API returned ${res.status}`);

    const data = await res.json();

    if (data.fallback || !data.matches) {
      const fb = fallbackSearch(products, request);
      return { intent, ...fb, budgetExceeded: false, aiResponse: fb.response };
    }

    const productMap = new Map(products.map((p) => [p.id, p]));
    const matches: BuyerMatch[] = (data.matches || [])
      .map((m: any) => {
        const product = productMap.get(m.productId);
        if (!product) return null;
        return { product, reason: m.reason };
      })
      .filter(Boolean);

    const closest = intent.maxPrice
      ? products.filter((p) => p.available).sort((a, b) => Math.abs(a.price - intent.maxPrice!) - Math.abs(b.price - intent.maxPrice!))[0]
      : undefined;

    return {
      intent,
      matches,
      closestMatch: closest ? { product: closest, reason: `Closest to your ₹${intent.maxPrice!.toLocaleString("en-IN")} budget.` } : undefined,
      budgetExceeded: Boolean(intent.maxPrice && matches.length === 0 && products.some((p) => p.price > intent.maxPrice!)),
      aiResponse: data.response || "Here are the best matches I found.",
    };
  } catch (error) {
    console.error("AI catalog search failed, using fallback:", error);
    const fb = fallbackSearch(products, request);
    return { intent, ...fb, budgetExceeded: false, aiResponse: fb.response };
  }
}
