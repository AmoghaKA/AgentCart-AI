export type MoneyActionType =
  | "CREATE_RAZORPAY_TEST_ORDER"
  | "OPEN_RAZORPAY_PAYMENT";

export type ActionState =
  | "pending"
  | "blocked"
  | "awaiting_approval"
  | "approved"
  | "executing"
  | "completed"
  | "failed";

export interface ActionExplanation {
  action: string;
  amount: number;
  currency: string;
  reason: string;
  merchant: string;
  result: string;
}

export interface ActionBoundary {
  label: string;
  limit: string;
  current: string;
  passed: boolean;
  detail?: string;
}

export interface ActionGate {
  approvalRequired: boolean;
  approvalStatus: "pending" | "approved";
  approvedAction?: MoneyActionType;
  approvedAmount?: number;
  approvedAt?: string;
  approvedOrderId?: string;
}

export interface ActionBlockedReason {
  reason: string;
  detail?: string;
}

export interface MoneyActionControl {
  id: string;
  type: MoneyActionType;
  title: string;
  amount: number;
  currency: string;
  reason: string;
  status: ActionState;
  createdAt: string;
  boundaries: ActionBoundary[];
  gate: ActionGate;
  allowed: boolean;
  blockedReasons: ActionBlockedReason[];
}
