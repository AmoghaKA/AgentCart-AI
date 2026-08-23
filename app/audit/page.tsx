"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  getAuditEvents,
  getAuditStats,
  clearAuditEvents,
} from "@/lib/auditLogger";
import type { AuditEvent } from "@/types/audit";

function money(value: number) {
  return `\u20B9${value.toLocaleString("en-IN")}`;
}

function EventDetailsModal({
  event,
  onClose,
}: {
  event: AuditEvent;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="audit-event-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="audit-modal-header">
          <div>
            <p className="eyebrow">AUDIT EVENT</p>
            <h2>{event.action}</h2>
          </div>
          <button className="modal-close" onClick={onClose}>
            {"\u00D7"}
          </button>
        </div>
        <div className="audit-modal-body">
          <div className="audit-modal-field">
            <span>Timestamp</span>
            <strong>
              {new Intl.DateTimeFormat("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(new Date(event.timestamp))}
            </strong>
          </div>
          <div className="audit-modal-field">
            <span>Actor</span>
            <strong>
              <span className={`audit-actor-badge audit-actor-${event.actor}`}>
                {event.actor}
              </span>
            </strong>
          </div>
          <div className="audit-modal-field">
            <span>Category</span>
            <strong style={{ textTransform: "capitalize" }}>
              {event.category}
            </strong>
          </div>
          <div className="audit-modal-field">
            <span>Status</span>
            <strong>
              <span
                className={`audit-status-badge audit-status-${event.status}`}
              >
                {event.status}
              </span>
            </strong>
          </div>
          <div className="audit-modal-field">
            <span>Description</span>
            <strong>{event.description}</strong>
          </div>
          {event.amount != null && (
            <div className="audit-modal-field">
              <span>Amount</span>
              <strong>
                {event.currency === "INR" ? money(event.amount) : event.amount}
              </strong>
            </div>
          )}
          {event.referenceId && (
            <div className="audit-modal-field">
              <span>Reference ID</span>
              <strong>{event.referenceId}</strong>
            </div>
          )}
          {event.details && (
            <div className="audit-modal-field">
              <span>Details</span>
              <strong>{event.details}</strong>
            </div>
          )}
        </div>
        <div className="audit-modal-actions">
          <button className="secondary-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function ClearAuditModal({
  onConfirm,
  onClose,
}: {
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="audit-clear-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="delete-symbol">!</div>
        <h2>Clear audit trail?</h2>
        <p>
          This will permanently remove all recorded audit events. This action
          cannot be undone.
        </p>
        <div className="modal-actions">
          <button className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button className="danger-button" onClick={onConfirm}>
            Clear All Events
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [actorFilter, setActorFilter] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setEvents(getAuditEvents());
  }, [refreshKey]);

  const stats = useMemo(() => getAuditStats(), [refreshKey]);

  const filtered = useMemo(() => {
    let result = events;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.action.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.actor.toLowerCase().includes(q) ||
          (e.referenceId && e.referenceId.toLowerCase().includes(q))
      );
    }
    if (categoryFilter) {
      result = result.filter((e) => e.category === categoryFilter);
    }
    if (statusFilter) {
      result = result.filter((e) => e.status === statusFilter);
    }
    if (actorFilter) {
      result = result.filter((e) => e.actor === actorFilter);
    }
    return result;
  }, [events, search, categoryFilter, statusFilter, actorFilter]);

  const handleClear = () => {
    clearAuditEvents();
    setEvents([]);
    setClearModalOpen(false);
    setRefreshKey((k) => k + 1);
  };

  return (
    <AppShell>
      <div className="audit-page">
        <header className="audit-header">
          <div>
            <p className="eyebrow">
              TRANSPARENCY LAYER{" "}
              <span className="eyebrow-slash">/</span> AUDIT TRAIL
            </p>
            <h1>Audit Trail</h1>
            <p className="header-subtitle">
              Every action performed by the AI agent and commerce workflows is
              recorded here for transparency and accountability.
            </p>
          </div>
          <div className="audit-header-actions">
            <span className="draft-badge">
              {"\u25CF"} {stats.total} event{stats.total === 1 ? "" : "s"}{" "}
              recorded
            </span>
            {stats.total > 0 && (
              <button
                className="audit-clear-button"
                onClick={() => setClearModalOpen(true)}
              >
                Clear Audit Trail
              </button>
            )}
          </div>
        </header>

        <section className="audit-stats">
          <div className="audit-stat-card">
            <div className="audit-stat-top">
              <span className="audit-stat-label">Total Events</span>
              <span className="audit-stat-icon audit-stat-icon-total">
                {"\u2630"}
              </span>
            </div>
            <div className="audit-stat-value">{stats.total}</div>
          </div>
          <div className="audit-stat-card">
            <div className="audit-stat-top">
              <span className="audit-stat-label">Successful</span>
              <span className="audit-stat-icon audit-stat-icon-success">
                {"\u2713"}
              </span>
            </div>
            <div className="audit-stat-value">{stats.success}</div>
          </div>
          <div className="audit-stat-card">
            <div className="audit-stat-top">
              <span className="audit-stat-label">Failed</span>
              <span className="audit-stat-icon audit-stat-icon-failed">
                {"\u2717"}
              </span>
            </div>
            <div className="audit-stat-value">{stats.failed}</div>
          </div>
          <div className="audit-stat-card">
            <div className="audit-stat-top">
              <span className="audit-stat-label">Blocked</span>
              <span className="audit-stat-icon audit-stat-icon-blocked">
                {"\u26A0"}
              </span>
            </div>
            <div className="audit-stat-value">{stats.blocked}</div>
          </div>
        </section>

        <div className="audit-filters">
          <div className="audit-search">
            <span>{"\u2315"}</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search actions, descriptions, references..."
              aria-label="Search audit events"
            />
          </div>
          <select
            className="audit-filter-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            <option value="catalog">Catalog</option>
            <option value="growth">Growth</option>
            <option value="buyer">Buyer</option>
            <option value="checkout">Checkout</option>
            <option value="payment">Payment</option>
            <option value="system">System</option>
          </select>
          <select
            className="audit-filter-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
            <option value="blocked">Blocked</option>
          </select>
          <select
            className="audit-filter-select"
            value={actorFilter}
            onChange={(e) => setActorFilter(e.target.value)}
          >
            <option value="">All Actors</option>
            <option value="agent">Agent</option>
            <option value="buyer">Buyer</option>
            <option value="system">System</option>
          </select>
        </div>

        {filtered.length === 0 ? (
          <div className="audit-empty">
            <div className="audit-empty-icon">{"\u2630"}</div>
            <h3>
              {events.length === 0
                ? "No audit events recorded yet"
                : "No matching events"}
            </h3>
            <p>
              {events.length === 0
                ? "Actions across the app — catalog changes, growth analysis, buyer requests, checkout flows, and payments — will appear here as they happen."
                : "Try adjusting your search or filters to find the events you are looking for."}
            </p>
          </div>
        ) : (
          <div className="audit-table-wrapper">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Reference</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((event) => (
                  <tr
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                  >
                    <td className="audit-timestamp">
                      {new Intl.DateTimeFormat("en-IN", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      }).format(new Date(event.timestamp))}
                    </td>
                    <td>
                      <span
                        className={`audit-actor-badge audit-actor-${event.actor}`}
                      >
                        {event.actor}
                      </span>
                    </td>
                    <td>{event.action}</td>
                    <td style={{ textTransform: "capitalize" }}>
                      {event.category}
                    </td>
                    <td>
                      <span
                        className={`audit-status-badge audit-status-${event.status}`}
                      >
                        {event.status}
                      </span>
                    </td>
                    <td className="audit-amount">
                      {event.amount != null
                        ? event.currency === "INR"
                          ? money(event.amount)
                          : event.amount
                        : "\u2014"}
                    </td>
                    <td className="audit-ref-id" title={event.referenceId ?? ""}>
                      {event.referenceId ?? "\u2014"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {selectedEvent && (
          <EventDetailsModal
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
          />
        )}

        {clearModalOpen && (
          <ClearAuditModal
            onConfirm={handleClear}
            onClose={() => setClearModalOpen(false)}
          />
        )}
      </div>
    </AppShell>
  );
}
