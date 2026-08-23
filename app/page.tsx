"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { GrowthOpportunity } from "@/components/dashboard/GrowthOpportunity";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { SafetyCard } from "@/components/dashboard/SafetyCard";
import { metrics } from "@/lib/mockData";
import { getAuditEvents } from "@/lib/auditLogger";
import type { AuditEvent } from "@/types/audit";

function money(value: number) {
  return `\u20B9${value.toLocaleString("en-IN")}`;
}

function RecentAuditEvents({ events }: { events: AuditEvent[] }) {
  if (events.length === 0) return null;
  return (
    <section className="activity-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">AUDIT TRAIL</p>
          <h2>Recent Payment Events</h2>
        </div>
        <Link href="/audit" className="text-button">
          View full trail <span>↗</span>
        </Link>
      </div>
      <div className="activity-list">
        {events.map((event) => (
          <div className="activity-item" key={event.id}>
            <div
              className={`activity-icon ${
                event.status === "success"
                  ? "status-success"
                  : event.status === "failed"
                    ? "status-safe"
                    : "status-ready"
              }`}
            >
              {event.status === "success"
                ? "\u2713"
                : event.status === "failed"
                  ? "\u2717"
                  : "\u26A0"}
            </div>
            <div className="activity-copy">
              <strong>{event.action}</strong>
              <p>{event.description}</p>
            </div>
            <span
              className={`activity-status ${
                event.status === "success"
                  ? "status-text-success"
                  : event.status === "failed"
                    ? "status-text-safe"
                    : "status-text-ready"
              }`}
            >
              {event.status === "success"
                ? "Success"
                : event.status === "failed"
                  ? "Failed"
                  : "Blocked"}
            </span>
            <time>
              {new Intl.DateTimeFormat("en-IN", {
                hour: "numeric",
                minute: "2-digit",
              }).format(new Date(event.timestamp))}
            </time>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const [recentEvents, setRecentEvents] = useState<AuditEvent[]>([]);

  useEffect(() => {
    const events = getAuditEvents()
      .filter((e) => e.category === "payment")
      .slice(0, 4);
    setRecentEvents(events);
  }, []);

  return (
    <AppShell>
      <div className="dashboard-page">
        <header className="page-header">
          <div>
            <p className="eyebrow">
              OVERVIEW <span className="eyebrow-slash">/</span> TODAY
            </p>
            <h1>Good morning, Merchant</h1>
            <p className="header-subtitle">
              Here&apos;s how your AI Growth Agent is helping identify new
              revenue opportunities.
            </p>
          </div>
          <div className="header-meta">
            <div className="date-chip">
              <span className="calendar-icon">□</span>
              <span>22 Aug 2026</span>
            </div>
            <div className="sync-state">
              <span className="status-dot" /> Agent is monitoring{" "}
              <span className="sync-separator">•</span> Just now
            </div>
          </div>
        </header>
        <section className="metrics-grid">
          {metrics.map((metric, index) => (
            <MetricCard metric={metric} index={index} key={metric.label} />
          ))}
        </section>
        <GrowthOpportunity />
        <div className="lower-grid">
          <RecentActivity />
          <SafetyCard />
        </div>
        {recentEvents.length > 0 && (
          <div style={{ marginTop: 22 }}>
            <RecentAuditEvents events={recentEvents} />
          </div>
        )}
      </div>
    </AppShell>
  );
}
