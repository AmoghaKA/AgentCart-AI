import type { Product } from "@/types/product";
import { DEMO_MERCHANT } from "@/lib/config";

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
  return { merchant: { name: DEMO_MERCHANT.name, description: DEMO_MERCHANT.description, currency: DEMO_MERCHANT.currency }, products: products.map(toAgentReadableProduct) };
}