"use client";

import { useEffect, useState } from "react";
import { getAuditEvents } from "@/lib/auditLogger";
import type { AuditEvent } from "@/types/audit";

function formatTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  return `${Math.floor(seconds / 86400)} days ago`;
}

export function RecentActivity() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const allEvents = await getAuditEvents();
      if (mounted) {
        setEvents(allEvents.slice(0, 4));
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const statusIcon = (status: string) => {
    if (status === "success") return "\u2713";
    if (status === "failed") return "\u2717";
    return "\u26A0";
  };

  const statusClass = (status: string) => {
    if (status === "success") return "status-success";
    if (status === "failed") return "status-safe";
    return "status-ready";
  };

  return (
    <section className="activity-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">LIVE FEED</p>
          <h2>Recent Agent Activity</h2>
        </div>
      </div>
      <div className="activity-list">
        {loading ? (
          <div className="activity-item">
            <div className="activity-icon status-ready">···</div>
            <div className="activity-copy">
              <strong>Loading activity...</strong>
              <p>Fetching latest events from Supabase</p>
            </div>
          </div>
        ) : events.length === 0 ? (
          <div className="activity-item">
            <div className="activity-icon status-ready">◇</div>
            <div className="activity-copy">
              <strong>No activity yet</strong>
              <p>Events will appear here as the AI agent performs actions</p>
            </div>
          </div>
        ) : (
          events.map((event) => (
            <div className="activity-item" key={event.id}>
              <div className={`activity-icon ${statusClass(event.status)}`}>
                {statusIcon(event.status)}
              </div>
              <div className="activity-copy">
                <strong>{event.action}</strong>
                <p>{event.description}</p>
              </div>
              <span className={`activity-status status-text-${statusClass(event.status).replace("status-", "")}`}>
                {event.status === "success" ? "Success" : event.status === "failed" ? "Failed" : "Blocked"}
              </span>
              <time>{formatTimeAgo(event.timestamp)}</time>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
