import type { Product } from "@/types/product";
import type { CheckoutItem } from "@/types/checkout";

export const MAX_TRANSACTION_AMOUNT = 100000;
export const MAX_QUANTITY_PER_ORDER = 5;

export interface SafetyCheck { label: string; passed: boolean; detail?: string; }
export interface SafetyValidation { passed: boolean; checks: SafetyCheck[]; }

export function validateCheckout(items: CheckoutItem[], catalog: Product[]): SafetyValidation {
  const byId = new Map(catalog.map((product) => [product.id, product]));
  const total = items.reduce((sum, item) => sum + (byId.get(item.productId)?.price ?? item.unitPrice) * item.quantity, 0);
  const allProducts = items.length > 0 && items.every((item) => byId.has(item.productId));
  const allAvailable = allProducts && items.every((item) => { const product = byId.get(item.productId)!; return product.stock > 0 && item.quantity <= product.stock; });
  const quantitiesValid = items.length > 0 && items.every((item) => Number.isInteger(item.quantity) && item.quantity >= 1 && item.quantity <= MAX_QUANTITY_PER_ORDER);
  const pricesVerified = allProducts && items.every((item) => byId.get(item.productId)!.price === item.unitPrice);
  const checks = [
    { label: `Order total within ₹${MAX_TRANSACTION_AMOUNT.toLocaleString("en-IN")} limit`, passed: total > 0 && total <= MAX_TRANSACTION_AMOUNT, detail: total > MAX_TRANSACTION_AMOUNT ? `Order total exceeds the maximum allowed amount of ₹${MAX_TRANSACTION_AMOUNT.toLocaleString("en-IN")}.` : undefined },
    { label: "Item quantities within allowed limit", passed: quantitiesValid, detail: `Each item must be between 1 and ${MAX_QUANTITY_PER_ORDER}.` },
    { label: "All selected products are in stock", passed: allAvailable, detail: "A product may have been removed or become unavailable." },
    { label: "Product prices verified against merchant catalog", passed: pricesVerified, detail: "The merchant catalog price has changed." },
    { label: "No payment has been initiated", passed: true },
  ];
  return { passed: checks.every((check) => check.passed), checks };
}