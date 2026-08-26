import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { event, campaignId, revenueAmount } = await request.json();

    if (!event || !campaignId) {
      return NextResponse.json({ error: "event and campaignId required" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    if (event === "impression") {
      const { data } = await supabase
        .from("campaigns")
        .select("impressions")
        .eq("id", campaignId)
        .single();
      if (data) {
        await supabase
          .from("campaigns")
          .update({ impressions: (data.impressions || 0) + 1, updated_at: new Date().toISOString() })
          .eq("id", campaignId);
      }
    } else if (event === "click") {
      const { data } = await supabase
        .from("campaigns")
        .select("clicks")
        .eq("id", campaignId)
        .single();
      if (data) {
        await supabase
          .from("campaigns")
          .update({ clicks: (data.clicks || 0) + 1, updated_at: new Date().toISOString() })
          .eq("id", campaignId);
      }
    } else if (event === "conversion") {
      const { data } = await supabase
        .from("campaigns")
        .select("conversions, revenue")
        .eq("id", campaignId)
        .single();
      if (data) {
        await supabase
          .from("campaigns")
          .update({
            conversions: (data.conversions || 0) + 1,
            revenue: (data.revenue || 0) + (revenueAmount || 0),
            updated_at: new Date().toISOString(),
          })
          .eq("id", campaignId);
      }
    } else {
      return NextResponse.json({ error: "Unknown event type" }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Campaign track error:", err);
    return NextResponse.json({ error: "Tracking failed" }, { status: 500 });
  }
}
