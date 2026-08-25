"use client";

import { AppShell } from "@/components/layout/AppShell";
import { CampaignWorkspace } from "@/components/campaigns/CampaignWorkspace";

export default function CampaignsPage() {
  return (
    <AppShell>
      <CampaignWorkspace />
    </AppShell>
  );
}
