export type CheckoutStatus =
  | "draft"
  | "reviewing"
  | "pending_approval"
  | "approved"
  | "creating_order"
  | "order_created"
  | "payment_opened"
  | "payment_verifying"
  | "payment_verified"
  | "payment_failed"
  | "cancelled";

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
  razorpayOrderId?: string;
  razorpayOrderAmount?: number;
  razorpayOrderCreatedAt?: string;
  orderCreationStatus?: "pending" | "created" | "consumed";
  razorpayPaymentId?: string;
  paymentApprovalStatus?: "pending" | "approved";
  paymentApprovedAt?: string;
  paymentApprovedAmount?: number;
  paymentApprovedAction?: "OPEN_RAZORPAY_PAYMENT";
  paymentApprovedOrderId?: string;
}