import { AppShell } from "@/components/layout/AppShell";
import { CatalogWorkspace } from "@/components/catalog/CatalogWorkspace";
import { AgentCatalogAccess } from "@/components/catalog/AgentCatalogAccess";

export default function CatalogPage() {
  return <AppShell><AgentCatalogAccess /><CatalogWorkspace /></AppShell>;
}