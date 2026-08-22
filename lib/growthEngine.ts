import type { Product } from "@/types/product";
import type { Confidence, GrowthOpportunity } from "@/types/growth";

const explicitRelationships: Record<string, string[]> = {
  Laptops: ["Accessories"],
  Monitors: ["Accessories"],
};

const keywordGroups = [
  ["laptop", "backpack", "mouse", "keyboard", "monitor", "desk"],
  ["phone", "case", "charger", "cable", "earbuds"],
  ["camera", "tripod", "lens", "bag", "memory"],
];

function productWords(product: Product) {
  return `${product.name} ${product.description}`.toLowerCase();
}

function keywordMatch(main: Product, candidate: Product) {
  const mainWords = productWords(main);
  const candidateWords = productWords(candidate);
  return keywordGroups.some((group) => {
    const mainHasGroupWord = group.some((word) => mainWords.includes(word));
    const candidateHasGroupWord = group.some((word) => candidateWords.includes(word));
    return mainHasGroupWord && candidateHasGroupWord;
  });
}

function recommendationReason(main: Product, recommendations: Product[]) {
  const names = recommendations.map((product) => product.name).join(" and ");
  if (main.category === "Laptops") return `The customer is purchasing a laptop. ${names} complement a complete laptop setup and may increase the order value.`;
  if (main.category === "Monitors") return `A monitor purchase often benefits from a productive workstation setup. ${names} are practical accessories for that use case.`;
  return `${names} share relevant product signals with ${main.name}. Presenting them together may help the customer complete their setup and increase average order value.`;
}

function getCandidates(main: Product, products: Product[]) {
  const explicitCategories = explicitRelationships[main.category];
  if (explicitCategories) {
    const candidates = products.filter((product) => explicitCategories.includes(product.category) && product.stock > 0 && product.id !== main.id);
    if (candidates.length) return { candidates, confidence: "High" as Confidence };
  }
  const candidates = products.filter((product) => product.stock > 0 && product.id !== main.id && keywordMatch(main, product));
  return { candidates, confidence: "Medium" as Confidence };
}

export function analyzeCatalog(products: Product[]): GrowthOpportunity[] {
  const analyzedAt = new Date().toISOString();
  return products.flatMap((mainProduct) => {
    if (mainProduct.stock <= 0) return [];
    const { candidates, confidence } = getCandidates(mainProduct, products);
    const recommendedProducts = Array.from(new Map(candidates.map((product) => [product.id, product])).values()).slice(0, 3);
    if (!recommendedProducts.length) return [];
    const additionalRevenue = recommendedProducts.reduce((total, product) => total + product.price, 0);
    return [{ id: `opportunity-${mainProduct.id}`, mainProduct, recommendedProducts, recommendationType: "Cross-sell" as const, reason: recommendationReason(mainProduct, recommendedProducts), originalOrderValue: mainProduct.price, additionalRevenue, potentialOrderValue: mainProduct.price + additionalRevenue, confidence, createdAt: analyzedAt }];
  });
}