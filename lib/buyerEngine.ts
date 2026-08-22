import type { AgentReadableProduct } from "@/types/agentCatalog";

export interface BuyerIntent { keywords: string[]; category?: string; useCase?: string; maxPrice?: number; cheapest: boolean; }
export interface BuyerMatch { product: AgentReadableProduct; reason: string; }
export interface BuyerSearchResult { intent: BuyerIntent; matches: BuyerMatch[]; closestMatch?: BuyerMatch; budgetExceeded: boolean; }

const categoryAliases: Record<string, string> = { laptop: "Laptops", laptops: "Laptops", accessory: "Accessories", accessories: "Accessories", monitor: "Monitors", monitors: "Monitors", keyboard: "Accessories", mouse: "Accessories" };
const useCaseWords = ["coding", "programming", "development", "work", "productivity"];

function parseBudget(request: string) {
  const match = request.toLowerCase().match(/(?:under|below|within|max(?:imum)?|budget(?: of)?)\s*(?:₹|rs\.?|inr)?\s*([\d,]+)/);
  return match ? Number(match[1].replace(/,/g, "")) : undefined;
}

export function parseBuyerIntent(request: string): BuyerIntent {
  const normalized = request.toLowerCase();
  const category = Object.keys(categoryAliases).find((alias) => new RegExp(`\\b${alias}\\b`).test(normalized));
  const keywords = normalized.split(/[^a-z0-9]+/).filter((word) => word.length > 2);
  return { keywords, category: category ? categoryAliases[category] : undefined, useCase: useCaseWords.find((word) => normalized.includes(word)), maxPrice: parseBudget(request), cheapest: normalized.includes("cheapest") || normalized.includes("lowest price") };
}

function matchScore(product: AgentReadableProduct, intent: BuyerIntent) {
  const text = `${product.name} ${product.description} ${product.category}`.toLowerCase();
  let score = 0;
  if (intent.category && product.category === intent.category) score += 5;
  if (intent.useCase && text.includes(intent.useCase)) score += 3;
  score += intent.keywords.filter((keyword) => text.includes(keyword)).length;
  return score;
}

function reasonFor(product: AgentReadableProduct, intent: BuyerIntent) {
  const details = [intent.category ? `matches the ${intent.category.toLowerCase()} category` : "matches the requested product signals", intent.useCase ? `is suitable for ${intent.useCase}` : "fits the buyer's product intent", "is in stock", intent.maxPrice ? `and is within the ${intent.maxPrice.toLocaleString("en-IN")} budget` : "and is available now"];
  return `${product.name} ${details.join(", ")}.`;
}

export function searchBuyerCatalog(products: AgentReadableProduct[], request: string): BuyerSearchResult {
  const intent = parseBuyerIntent(request);
  const available = products.filter((product) => product.available);
  const scored = available.map((product) => ({ product, score: matchScore(product, intent) })).filter((item) => item.score > 0).sort((a, b) => b.score - a.score || a.product.price - b.product.price);
  const categoryMatches = intent.category ? available.filter((product) => product.category === intent.category).sort((a, b) => a.price - b.price) : [];
  const relevant = scored.length ? scored : categoryMatches.map((product) => ({ product, score: 1 }));
  const withinBudget = intent.maxPrice ? relevant.filter((item) => item.product.price <= intent.maxPrice!) : relevant;
  const chosen = (intent.cheapest ? [...withinBudget].sort((a, b) => a.product.price - b.product.price) : withinBudget).slice(0, 6).map(({ product }) => ({ product, reason: reasonFor(product, intent) }));
  const closest = intent.maxPrice ? relevant.map(({ product }) => product).sort((a, b) => Math.abs(a.price - intent.maxPrice!) - Math.abs(b.price - intent.maxPrice!))[0] : undefined;
  return { intent, matches: chosen, closestMatch: closest ? { product: closest, reason: reasonFor(closest, intent) } : undefined, budgetExceeded: Boolean(intent.maxPrice && relevant.length && !withinBudget.length) };
}