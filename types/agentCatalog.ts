import type { Product } from "@/types/product";

export interface MerchantProfile {
  name: string;
  description: string;
  currency: "INR";
}

export interface AgentReadableProduct {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  currency: "INR";
  stock: number;
  available: boolean;
}

export interface AgentCatalog {
  merchant: MerchantProfile;
  products: AgentReadableProduct[];
}

export function toAgentReadableProduct(product: Product): AgentReadableProduct {
  return { id: product.id, name: product.name, description: product.description, category: product.category, price: product.price, currency: "INR", stock: product.stock, available: product.stock > 0 };
}

export function toAgentCatalog(products: Product[]): AgentCatalog {
  return { merchant: { name: "AgentCart Demo Store", description: "AI-ready merchant catalog for agentic commerce.", currency: "INR" }, products: products.map(toAgentReadableProduct) };
}