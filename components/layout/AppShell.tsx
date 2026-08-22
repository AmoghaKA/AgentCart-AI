import { Sidebar } from "@/components/layout/Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return <div className="app-shell"><Sidebar /><main className="main-shell">{children}</main></div>;
}