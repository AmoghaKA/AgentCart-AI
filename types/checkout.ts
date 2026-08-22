export type CheckoutStatus = "draft" | "reviewing" | "pending_approval" | "approved" | "cancelled";

export interface CheckoutItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface CheckoutActivity {
  id: string;
  message: string;
  createdAt: string;
}

export interface CheckoutSession {
  id: string;
  items: CheckoutItem[];
  subtotal: number;
  currency: "INR";
  status: CheckoutStatus;
  createdAt: string;
  updatedAt: string;
  activity: CheckoutActivity[];
  approvalStatus: "pending" | "approved";
  approvedAt?: string;
  approvedAmount?: number;
  approvedAction?: "CREATE_RAZORPAY_TEST_ORDER";
}