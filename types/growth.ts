import type { Product } from "@/types/product";

export type RecommendationType = "Cross-sell" | "Upsell";
export type Confidence = "High" | "Medium";

export interface GrowthOpportunity {
  id: string;
  mainProduct: Product;
  recommendedProducts: Product[];
  recommendationType: RecommendationType;
  reason: string;
  originalOrderValue: number;
  additionalRevenue: number;
  potentialOrderValue: number;
  confidence: Confidence;
  createdAt: string;
}