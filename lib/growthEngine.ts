import type { Product } from "@/types/product";
import type { Confidence, GrowthOpportunity } from "@/types/growth";
import { analyzeGrowthOpportunities, type AIGrowthOpportunity } from "@/lib/ai";

export async function analyzeCatalog(products: Product[]): Promise<GrowthOpportunity[]> {
  const analyzedAt = new Date().toISOString();

  const aiResults = await analyzeGrowthOpportunities(products);

  return aiResults.map((opp: AIGrowthOpportunity, index: number) => ({
    id: `opportunity-${opp.mainProduct.id}-${index}`,
    mainProduct: opp.mainProduct,
    recommendedProducts: opp.recommendedProducts,
    recommendationType: opp.recommendationType,
    reason: opp.reason,
    originalOrderValue: opp.mainProduct.price,
    additionalRevenue: opp.additionalRevenue,
    potentialOrderValue: opp.mainProduct.price + opp.additionalRevenue,
    confidence: opp.confidence as Confidence,
    createdAt: analyzedAt,
  }));
}
