async function trackEvent(event: string, campaignId: string, revenueAmount?: number): Promise<void> {
  if (!campaignId) return;
  try {
    await fetch("/api/campaigns/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, campaignId, revenueAmount }),
    });
  } catch (err) {
    console.error(`trackEvent(${event}) failed:`, err);
  }
}

export async function trackImpression(campaignId: string): Promise<void> {
  return trackEvent("impression", campaignId);
}

export async function trackClick(campaignId: string): Promise<void> {
  return trackEvent("click", campaignId);
}

export async function trackConversion(campaignId: string, revenueAmount: number): Promise<void> {
  return trackEvent("conversion", campaignId, revenueAmount);
}
