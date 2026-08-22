import { AppShell } from "@/components/layout/AppShell";

export function PlaceholderPage({ eyebrow, title, accent, description, part }: { eyebrow: string; title: string; accent: string; description: string; part: string }) {
  return <AppShell><div className="placeholder-page"><div className="placeholder-inner"><p className="eyebrow">{eyebrow}</p><h1>{title} <span>{accent}</span></h1><p className="placeholder-copy">{description}</p><span className="part-badge">{part}</span><div className="placeholder-line" /></div></div></AppShell>;
}