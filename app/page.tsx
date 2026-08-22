import { AppShell } from "@/components/layout/AppShell";
import { GrowthOpportunity } from "@/components/dashboard/GrowthOpportunity";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { SafetyCard } from "@/components/dashboard/SafetyCard";
import { metrics } from "@/lib/mockData";

export default function Home() {
  return (
    <AppShell><div className="dashboard-page"><header className="page-header"><div><p className="eyebrow">OVERVIEW <span className="eyebrow-slash">/</span> TODAY</p><h1>Good morning, Merchant</h1><p className="header-subtitle">Here&apos;s how your AI Growth Agent is helping identify new revenue opportunities.</p></div><div className="header-meta"><div className="date-chip"><span className="calendar-icon">□</span><span>22 Aug 2026</span></div><div className="sync-state"><span className="status-dot" /> Agent is monitoring <span className="sync-separator">•</span> Just now</div></div></header><section className="metrics-grid">{metrics.map((metric, index) => <MetricCard metric={metric} index={index} key={metric.label} />)}</section><GrowthOpportunity /><div className="lower-grid"><RecentActivity /><SafetyCard /></div></div></AppShell>
  );
}
