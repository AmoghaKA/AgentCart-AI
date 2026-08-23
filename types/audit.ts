export type AuditCategory =
  | "catalog"
  | "growth"
  | "buyer"
  | "checkout"
  | "payment"
  | "system";

export type AuditStatus = "success" | "failed" | "blocked";

export interface AuditEvent {
  id: string;
  timestamp: string;
  actor: "agent" | "buyer" | "system";
  action: string;
  category: AuditCategory;
  status: AuditStatus;
  description: string;
  details?: string;
  amount?: number;
  currency?: string;
  referenceId?: string;
}

export type AuditEventInput = Omit<AuditEvent, "id" | "timestamp">;
