/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
  AuditEvent,
  AuditEventInput,
  AuditCategory,
  AuditStatus,
} from "@/types/audit";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { DEMO_MERCHANT_ID } from "@/lib/config";

interface AuditEventRow {
  id: string;
  created_at: string;
  actor: AuditEvent["actor"];
  action: string;
  category: AuditCategory;
  status: AuditStatus;
  description: string;
  details: string | null;
  amount: number | null;
  currency: string | null;
  reference_id: string | null;
}

function rowToEvent(row: AuditEventRow): AuditEvent {
  return {
    id: row.id,
    timestamp: row.created_at,
    actor: row.actor,
    action: row.action,
    category: row.category,
    status: row.status,
    description: row.description,
    details: row.details || undefined,
    amount: row.amount != null ? Number(row.amount) : undefined,
    currency: row.currency || undefined,
    referenceId: row.reference_id || undefined,
  };
}

function q(): any {
  return getSupabaseBrowserClient();
}

export async function logAuditEvent(input: AuditEventInput): Promise<AuditEvent> {
  try {
    const { data, error } = await q().from("audit_events").insert({
      merchant_id: DEMO_MERCHANT_ID,
      actor: input.actor,
      action: input.action,
      category: input.category,
      status: input.status,
      description: input.description,
      details: input.details || null,
      amount: input.amount ?? null,
      currency: input.currency || null,
      reference_id: input.referenceId || null,
    }).select().single();

    if (error) {
      console.error("Failed to log audit event to Supabase:", error.message);
      return {
        ...input,
        id: `audit-fallback-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: new Date().toISOString(),
      };
    }

    return rowToEvent(data);
  } catch (err) {
    console.error("Supabase connection error for audit:", err);
    return {
      ...input,
      id: `audit-fallback-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: new Date().toISOString(),
    };
  }
}

export async function getAuditEvents(): Promise<AuditEvent[]> {
  try {
    const { data, error } = await q().from("audit_events").select("*").order("created_at", { ascending: false });
    if (error) {
      console.error("Failed to fetch audit events:", error.message);
      return [];
    }
    return (data || []).map(rowToEvent);
  } catch (err) {
    console.error("Supabase connection error:", err);
    return [];
  }
}

export async function getAuditEventById(id: string): Promise<AuditEvent | null> {
  try {
    const { data, error } = await q().from("audit_events").select("*").eq("id", id).single();
    if (error || !data) return null;
    return rowToEvent(data);
  } catch {
    return null;
  }
}

export async function getAuditEventsByCategory(category: AuditCategory): Promise<AuditEvent[]> {
  try {
    const { data, error } = await q().from("audit_events").select("*").eq("category", category).order("created_at", { ascending: false });
    if (error) return [];
    return (data || []).map(rowToEvent);
  } catch {
    return [];
  }
}

export async function getAuditEventsByStatus(status: AuditStatus): Promise<AuditEvent[]> {
  try {
    const { data, error } = await q().from("audit_events").select("*").eq("status", status).order("created_at", { ascending: false });
    if (error) return [];
    return (data || []).map(rowToEvent);
  } catch {
    return [];
  }
}

export async function clearAuditEvents(): Promise<void> {
  try {
    const { error } = await q().from("audit_events").delete().eq("merchant_id", DEMO_MERCHANT_ID);
    if (error) {
      console.error("Failed to clear audit events:", error.message);
    }
  } catch (err) {
    console.error("Supabase connection error:", err);
  }
}

export async function getAuditStats(): Promise<{
  total: number;
  success: number;
  failed: number;
  blocked: number;
}> {
  try {
    const { data, error } = await q().from("audit_events").select("status").eq("merchant_id", DEMO_MERCHANT_ID);
    if (error || !data) {
      return { total: 0, success: 0, failed: 0, blocked: 0 };
    }
    return {
      total: data.length,
      success: data.filter((e: any) => e.status === "success").length,
      failed: data.filter((e: any) => e.status === "failed").length,
      blocked: data.filter((e: any) => e.status === "blocked").length,
    };
  } catch {
    return { total: 0, success: 0, failed: 0, blocked: 0 };
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
