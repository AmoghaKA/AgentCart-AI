import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServerClientWithSession } from "@/lib/supabase/server-session";

export async function GET() {
  try {
    const supabase = await getSupabaseServerClientWithSession();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({
        store_name: "", store_description: "", currency: "INR",
        public_catalog: true, auto_respond: true, show_pricing: true,
        cross_sell: true, safety_checks: true, ai_analysis: true, auto_approve: false,
      });
    }

    const { data } = await supabase
      .from("merchants")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (!data) {
      return NextResponse.json({
        store_name: "", store_description: "", currency: "INR",
        public_catalog: true, auto_respond: true, show_pricing: true,
        cross_sell: true, safety_checks: true, ai_analysis: true, auto_approve: false,
      });
    }

    return NextResponse.json({
      store_name: data.name ?? "",
      store_description: data.store_description ?? data.description ?? "",
      currency: data.currency ?? "INR",
      public_catalog: data.public_catalog ?? true,
      auto_respond: data.auto_respond ?? true,
      show_pricing: data.show_pricing ?? true,
      cross_sell: data.cross_sell ?? true,
      safety_checks: data.safety_checks ?? true,
      ai_analysis: data.ai_analysis ?? true,
      auto_approve: data.auto_approve ?? false,
    });
  } catch (err: any) {
    console.error("[merchant-settings] GET exception:", err?.message);
    return NextResponse.json({
      store_name: "", store_description: "", currency: "INR",
      public_catalog: true, auto_respond: true, show_pricing: true,
      cross_sell: true, safety_checks: true, ai_analysis: true, auto_approve: false,
    });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = await getSupabaseServerClientWithSession();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the merchant for this user
    const { data: merchant } = await supabase
      .from("merchants")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("merchants")
      .update({
        name: body.store_name ?? "",
        description: body.store_description ?? "",
        store_description: body.store_description ?? "",
        currency: body.currency ?? "INR",
        public_catalog: body.public_catalog ?? true,
        auto_respond: body.auto_respond ?? true,
        show_pricing: body.show_pricing ?? true,
        cross_sell: body.cross_sell ?? true,
        safety_checks: body.safety_checks ?? true,
        ai_analysis: body.ai_analysis ?? true,
        auto_approve: body.auto_approve ?? false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", merchant.id);

    if (error) {
      console.error("[merchant-settings] PUT error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[merchant-settings] PUT exception:", err?.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
