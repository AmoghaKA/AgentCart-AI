import type {
  AuditEvent,
  AuditEventInput,
  AuditCategory,
  AuditStatus,
} from "@/types/audit";

const AUDIT_STORAGE_KEY = "agentcart_audit_events";

function canUseStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function loadEvents(): AuditEvent[] {
  if (!canUseStorage()) return [];
  const stored = window.localStorage.getItem(AUDIT_STORAGE_KEY);
  if (!stored) return [];
  try {
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) ? (parsed as AuditEvent[]) : [];
  } catch {
    return [];
  }
}

function saveEvents(events: AuditEvent[]) {
  if (canUseStorage()) {
    window.localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(events));
  }
}

export function logAuditEvent(input: AuditEventInput): AuditEvent {
  const event: AuditEvent = {
    ...input,
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
  };
  const events = loadEvents();
  events.unshift(event);
  saveEvents(events);
  return event;
}

export function getAuditEvents(): AuditEvent[] {
  return loadEvents().sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

export function getAuditEventById(id: string): AuditEvent | null {
  return loadEvents().find((e) => e.id === id) ?? null;
}

export function getAuditEventsByCategory(
  category: AuditCategory
): AuditEvent[] {
  return getAuditEvents().filter((e) => e.category === category);
}

export function getAuditEventsByStatus(status: AuditStatus): AuditEvent[] {
  return getAuditEvents().filter((e) => e.status === status);
}

export function clearAuditEvents() {
  saveEvents([]);
}

export function getAuditStats(): {
  total: number;
  success: number;
  failed: number;
  blocked: number;
} {
  const events = loadEvents();
  return {
    total: events.length,
    success: events.filter((e) => e.status === "success").length,
    failed: events.filter((e) => e.status === "failed").length,
    blocked: events.filter((e) => e.status === "blocked").length,
  };
}
