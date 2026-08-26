import type { Product } from "@/types/product";
import type { CheckoutItem, CheckoutSession } from "@/types/checkout";
import { getBestDiscountForProduct, type ProductDiscount } from "@/lib/campaignEffects";

export const MAX_TRANSACTION_AMOUNT = 50000;
export const MAX_QUANTITY_PER_ORDER = 5;

export interface SafetyCheck {
  label: string;
  passed: boolean;
  detail?: string;
  category?: "boundary" | "product" | "price" | "approval";
}
export interface SafetyValidation {
  passed: boolean;
  checks: SafetyCheck[];
  total: number;
}

export function validateCheckout(
  items: CheckoutItem[],
  catalog: Product[],
  discountMap?: Map<string, ProductDiscount[]>
): SafetyValidation {
  const byId = new Map(catalog.map((product) => [product.id, product]));
  let total = 0;
  for (const item of items) {
    const catalogPrice = byId.get(item.productId)?.price ?? item.unitPrice;
    const discount = discountMap ? getBestDiscountForProduct(item.productId, discountMap, catalogPrice) : null;
    const effectivePrice = discount ? discount.discountedPrice : catalogPrice;
    total += effectivePrice * item.quantity;
  }
  const allProducts =
    items.length > 0 && items.every((item) => byId.has(item.productId));
  const allAvailable =
    allProducts &&
    items.every((item) => {
      const product = byId.get(item.productId)!;
      return product.stock > 0 && item.quantity <= product.stock;
    });
  const quantitiesValid =
    items.length > 0 &&
    items.every(
      (item) =>
        Number.isInteger(item.quantity) &&
        item.quantity >= 1 &&
        item.quantity <= MAX_QUANTITY_PER_ORDER
    );
  const pricesVerified =
    allProducts &&
    items.every((item) => {
      const catalogPrice = byId.get(item.productId)!.price;
      const unitPrice = item.unitPrice;
      if (catalogPrice === unitPrice) return true;
      if (discountMap) {
        const discount = getBestDiscountForProduct(item.productId, discountMap, catalogPrice);
        if (discount && discount.discountedPrice === unitPrice) return true;
      }
      return false;
    });
  const checks: SafetyCheck[] = [
    {
      label: `Order total within ₹${MAX_TRANSACTION_AMOUNT.toLocaleString("en-IN")} limit`,
      passed: total > 0 && total <= MAX_TRANSACTION_AMOUNT,
      detail:
        total > MAX_TRANSACTION_AMOUNT
          ? `Order total exceeds the maximum allowed amount of ₹${MAX_TRANSACTION_AMOUNT.toLocaleString("en-IN")}.`
          : total <= 0
            ? "Order total must be greater than zero."
            : undefined,
      category: "boundary",
    },
    {
      label: "Item quantities within allowed limit",
      passed: quantitiesValid,
      detail: `Each item must be between 1 and ${MAX_QUANTITY_PER_ORDER}.`,
      category: "boundary",
    },
    {
      label: "All selected products are in stock",
      passed: allAvailable,
      detail: "A product may have been removed or become unavailable.",
      category: "product",
    },
    {
      label: "All products exist in catalog",
      passed: allProducts,
      detail: "One or more products are no longer in the merchant catalog.",
      category: "product",
    },
    {
      label: "Product prices verified against merchant catalog",
      passed: pricesVerified,
      detail: "The merchant catalog price has changed.",
      category: "price",
    },
    {
      label: "No payment has been initiated",
      passed: true,
      detail: undefined,
      category: "boundary",
    },
  ];
  return {
    passed: checks.every((check) => check.passed),
    checks,
    total,
  };
}

export function validateAmountBoundary(amount: number): {
  valid: boolean;
  reason?: string;
} {
  if (amount <= 0) {
    return { valid: false, reason: "Transaction amount must be greater than zero." };
  }
  if (amount > MAX_TRANSACTION_AMOUNT) {
    return {
      valid: false,
      reason: `Transaction exceeds the maximum allowed amount of ₹${MAX_TRANSACTION_AMOUNT.toLocaleString("en-IN")}.`,
    };
  }
  return { valid: true };
}

export function validateQuantityBoundary(quantity: number): {
  valid: boolean;
  reason?: string;
} {
  if (!Number.isInteger(quantity) || quantity < 1) {
    return { valid: false, reason: "Quantity must be at least 1." };
  }
  if (quantity > MAX_QUANTITY_PER_ORDER) {
    return {
      valid: false,
      reason: `Quantity exceeds the maximum of ${MAX_QUANTITY_PER_ORDER} per item.`,
    };
  }
  return { valid: true };
}

export function validateApprovalIntegrity(
  session: CheckoutSession,
  currentTotal: number,
  actionType: "CREATE_RAZORPAY_TEST_ORDER" | "OPEN_RAZORPAY_PAYMENT"
): { valid: boolean; reason?: string } {
  if (actionType === "CREATE_RAZORPAY_TEST_ORDER") {
    if (session.approvalStatus !== "approved") {
      return { valid: false, reason: "Order creation has not been approved." };
    }
    if (session.approvedAction !== "CREATE_RAZORPAY_TEST_ORDER") {
      return { valid: false, reason: "Approval is for a different action type." };
    }
    if (
      session.approvedAmount != null &&
      Math.abs(session.approvedAmount - currentTotal) > 0.01
    ) {
      return {
        valid: false,
        reason: "Approval amount does not match the current validated total.",
      };
    }
    if (session.orderCreationStatus === "consumed") {
      return {
        valid: false,
        reason: "Order creation has already been consumed.",
      };
    }
    return { valid: true };
  }

  if (actionType === "OPEN_RAZORPAY_PAYMENT") {
    if (!session.razorpayOrderId) {
      return {
        valid: false,
        reason: "No Razorpay order has been created yet.",
      };
    }
    if (session.paymentApprovalStatus !== "approved") {
      return {
        valid: false,
        reason: "Opening payment requires separate explicit approval.",
      };
    }
    if (session.paymentApprovedAction !== "OPEN_RAZORPAY_PAYMENT") {
      return { valid: false, reason: "Approval is for a different action type." };
    }
    if (
      session.paymentApprovedOrderId &&
      session.paymentApprovedOrderId !== session.razorpayOrderId
    ) {
      return {
        valid: false,
        reason: "Approval was for a different Razorpay order.",
      };
    }
    if (
      session.paymentApprovedAmount != null &&
      session.razorpayOrderAmount != null &&
      Math.abs(session.paymentApprovedAmount - session.razorpayOrderAmount) >
        0.01
    ) {
      return {
        valid: false,
        reason: "Approval amount does not match the order amount.",
      };
    }
    return { valid: true };
  }

  return { valid: false, reason: "Unknown action type." };
}