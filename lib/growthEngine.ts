import type { Product } from "@/types/product";
import type { Confidence, GrowthOpportunity } from "@/types/growth";

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findProduct(
  id: string,
  name: string,
  productMap: Map<string, Product>,
  usedIds: Set<string>,
): Product | undefined {
  // 1. Exact ID match
  if (id && productMap.has(id) && !usedIds.has(id)) {
    return productMap.get(id);
  }
  // 2. Normalize and try ID without prefix/suffix noise
  if (id) {
    const normId = normalize(id);
    for (const [pid, p] of productMap) {
      if (!usedIds.has(pid) && normalize(pid) === normId) return p;
    }
  }
  // 3. Exact name match
  if (name) {
    const normName = normalize(name);
    for (const [pid, p] of productMap) {
      if (!usedIds.has(pid) && normalize(p.name) === normName) return p;
    }
    // 4. Containment match (one contains the other)
    for (const [pid, p] of productMap) {
      if (!usedIds.has(pid)) {
        const pn = normalize(p.name);
        if (pn.includes(normName) || normName.includes(pn)) return p;
      }
    }
    // 5. Word overlap — at least 60% of significant words match
    const nameWords = normName.split(/\s+/).filter((w) => w.length > 2);
    if (nameWords.length > 0) {
      let best: Product | null = null;
      let bestScore = 0;
      for (const [pid, p] of productMap) {
        if (usedIds.has(pid)) continue;
        const pn = normalize(p.name);
        const pWords = pn.split(/\s+/).filter((w) => w.length > 2);
        if (pWords.length === 0) continue;
        const overlap = nameWords.filter((w) => pWords.includes(w)).length;
        const score = overlap / Math.max(nameWords.length, pWords.length);
        if (score > bestScore && score >= 0.6) {
          bestScore = score;
          best = p;
        }
      }
      if (best) return best;
    }
  }
  return undefined;
}

function smartFallback(products: Product[]): GrowthOpportunity[] {
  const analyzedAt = new Date().toISOString();
  const inStock = products.filter((p) => p.stock > 0);
  if (inStock.length < 2) return [];

  // Group by category
  const categories = new Map<string, Product[]>();
  inStock.forEach((p) => {
    const list = categories.get(p.category) || [];
    list.push(p);
    categories.set(p.category, list);
  });

  const catEntries = Array.from(categories.entries());
  const opportunities: GrowthOpportunity[] = [];
  const usedMainIds = new Set<string>();

  // Cross-category pairings
  for (let i = 0; i < catEntries.length && opportunities.length < 4; i++) {
    const [mainCat, mainList] = catEntries[i];
    const otherProducts = catEntries
      .filter((e) => e[0] !== mainCat)
      .flatMap((e) => e[1])
      .filter((p) => !usedMainIds.has(p.id));

    if (mainList.length === 0 || otherProducts.length === 0) continue;

    const main = mainList.find((p) => !usedMainIds.has(p.id));
    if (!main) continue;

    // Pick the most affordable complementary products (realistic add-ons)
    const recs = otherProducts
      .sort((a, b) => a.price - b.price)
      .slice(0, 2);

    usedMainIds.add(main.id);
    const recNames = recs.map((r) => r.name).join(" and ");
    const recCategories = [...new Set(recs.map((r) => r.category))];
    opportunities.push({
      id: `opportunity-${main.id}-${i}`,
      mainProduct: main,
      recommendedProducts: recs,
      recommendationType: "bundle" as const,
      reason: `The ${main.name} pairs naturally with ${recNames} — together they give the customer a complete ${main.category.toLowerCase()} experience. Customers often look for ${recCategories.join(" and ").toLowerCase()} accessories when purchasing a ${main.category.toLowerCase()} product, making this a high-conversion bundle.`,
      originalOrderValue: main.price,
      additionalRevenue: recs.reduce((s, p) => s + p.price, 0),
      potentialOrderValue: main.price + recs.reduce((s, p) => s + p.price, 0),
      confidence: "Medium" as Confidence,
      createdAt: analyzedAt,
    });
  }

  // If not enough cross-category, try within-category pairings
  if (opportunities.length < 2) {
    for (const [cat, catProducts] of catEntries) {
      if (opportunities.length >= 4) break;
      if (catProducts.length < 2) continue;
      const main = catProducts.find((p) => !usedMainIds.has(p.id));
      if (!main) continue;
      const recs = catProducts.filter((p) => p.id !== main.id && !usedMainIds.has(p.id)).slice(0, 2);
      if (recs.length === 0) continue;
      usedMainIds.add(main.id);
      const recNames = recs.map((r) => r.name).join(" and ");
      opportunities.push({
        id: `opportunity-${main.id}-within`,
        mainProduct: main,
        recommendedProducts: recs,
        recommendationType: "bundle" as const,
        reason: `Both ${main.name} and ${recNames} belong to the ${main.category} category and complement each other well. Customers shopping for ${main.category.toLowerCase()} products often need multiple items to complete their setup — bundling these together increases convenience and average order value.`,
        originalOrderValue: main.price,
        additionalRevenue: recs.reduce((s, p) => s + p.price, 0),
        potentialOrderValue: main.price + recs.reduce((s, p) => s + p.price, 0),
        confidence: "Medium" as Confidence,
        createdAt: analyzedAt,
      });
    }
  }

  return opportunities;
}

export async function analyzeCatalog(products: Product[]): Promise<GrowthOpportunity[]> {
  if (!products.length || products.length < 2) return [];

  try {
    const res = await fetch("/api/ai/growth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ products }),
    });

    if (!res.ok) throw new Error(`API returned ${res.status}`);

    const data = await res.json();

    if (data.fallback || !data.opportunities?.length) {
      console.log("Growth AI: using smart fallback (API returned fallback or empty)");
      return smartFallback(products);
    }

    const analyzedAt = new Date().toISOString();
    const productMap = new Map(products.map((p) => [p.id, p]));
    const usedMainIds = new Set<string>();

    const results = data.opportunities
      .map((opp: any, index: number) => {
        const main = findProduct(opp.mainProductId, opp.mainProductName || "", productMap, usedMainIds);
        if (!main || main.stock <= 0) return null;
        usedMainIds.add(main.id);

        const recIds: string[] = opp.recommendedProductIds || [];
        const recNames: string[] = opp.recommendedProductNames || [];
        const recUsedIds = new Set<string>();
        const recs: Product[] = [];

        for (let j = 0; j < Math.max(recIds.length, recNames.length) && recs.length < 2; j++) {
          const found = findProduct(recIds[j] || "", recNames[j] || "", productMap, new Set([...usedMainIds, ...recUsedIds]));
          if (found && found.stock > 0) {
            recs.push(found);
            recUsedIds.add(found.id);
          }
        }
        if (recs.length === 0) return null;

        return {
          id: `opportunity-${main.id}-${index}`,
          mainProduct: main,
          recommendedProducts: recs,
          recommendationType: opp.type || "bundle",
          reason: opp.reason || `Buy ${main.name} with ${recs.map((r) => r.name).join(", ")}.`,
          originalOrderValue: main.price,
          additionalRevenue: recs.reduce((sum: number, p: Product) => sum + p.price, 0),
          potentialOrderValue: main.price + recs.reduce((sum: number, p: Product) => sum + p.price, 0),
          confidence: (opp.confidence || "Medium") as Confidence,
          createdAt: analyzedAt,
        };
      })
      .filter(Boolean) as GrowthOpportunity[];

    if (results.length > 0) {
      console.log(`Growth AI: matched ${results.length} opportunities from AI response`);
      return results;
    }

    console.log("Growth AI: AI results matched 0 products, using smart fallback");
    return smartFallback(products);
  } catch (error) {
    console.error("Growth AI analysis failed, using smart fallback:", error);
    return smartFallback(products);
  }
}
