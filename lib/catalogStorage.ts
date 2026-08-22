import type { Product } from "@/types/product";

const CATALOG_STORAGE_KEY = "agentcart-ai-catalog";

export const demoProducts: Product[] = [
  { id: "codepro-laptop", name: "CodePro Laptop", description: "High-performance laptop suitable for programming, development, and professional work.", category: "Laptops", price: 65000, stock: 10, image: "laptop", createdAt: "2026-08-01T09:00:00.000Z", updatedAt: "2026-08-01T09:00:00.000Z" },
  { id: "wireless-mouse", name: "Wireless Mouse", description: "Ergonomic wireless mouse designed for productivity and everyday work.", category: "Accessories", price: 1500, stock: 50, image: "mouse", createdAt: "2026-08-01T09:05:00.000Z", updatedAt: "2026-08-01T09:05:00.000Z" },
  { id: "laptop-backpack", name: "Laptop Backpack", description: "Protective backpack designed for laptops, accessories, and daily commuting.", category: "Accessories", price: 2500, stock: 30, image: "backpack", createdAt: "2026-08-01T09:10:00.000Z", updatedAt: "2026-08-01T09:10:00.000Z" },
  { id: "mechanical-keyboard", name: "Mechanical Keyboard", description: "Mechanical keyboard designed for programmers, professionals, and productivity.", category: "Accessories", price: 4000, stock: 20, image: "keyboard", createdAt: "2026-08-01T09:15:00.000Z", updatedAt: "2026-08-01T09:15:00.000Z" },
  { id: "monitor-24-inch", name: "Monitor 24-inch", description: "Full HD 24-inch monitor suitable for coding, professional work, and multitasking.", category: "Monitors", price: 12000, stock: 15, image: "monitor", createdAt: "2026-08-01T09:20:00.000Z", updatedAt: "2026-08-01T09:20:00.000Z" },
];

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

export function loadProducts(): Product[] {
  if (!canUseStorage()) return demoProducts;
  const stored = window.localStorage.getItem(CATALOG_STORAGE_KEY);
  if (!stored) {
    saveProducts(demoProducts);
    return demoProducts;
  }
  try {
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed as Product[] : demoProducts;
  } catch {
    return demoProducts;
  }
}

export function saveProducts(products: Product[]) {
  if (canUseStorage()) window.localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(products));
}

export function addProduct(product: Product) {
  const products = loadProducts();
  saveProducts([...products, product]);
}

export function updateProduct(product: Product) {
  const products = loadProducts().map((current) => current.id === product.id ? product : current);
  saveProducts(products);
}

export function deleteProduct(id: string) {
  saveProducts(loadProducts().filter((product) => product.id !== id));
}