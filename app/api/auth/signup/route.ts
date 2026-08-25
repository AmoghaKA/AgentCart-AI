/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const { email, password, storeName } = await request.json();

    if (!email || !password || !storeName) {
      return NextResponse.json(
        { error: "Email, password, and store name are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Use service role key to create user (bypasses email rate limits)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Create the user with service role (auto-confirm)
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (userError) {
      console.error("Failed to create user:", JSON.stringify(userError));
      return NextResponse.json({ error: userError.message }, { status: 400 });
    }

    if (!userData.user) {
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
    }

    // Create merchant for this user
    const { data: merchant, error: merchantError } = await supabase
      .from("merchants")
      .insert({
        user_id: userData.user.id,
        name: storeName,
        description: "AI-ready merchant catalog for agentic commerce.",
        currency: "INR",
      })
      .select("id")
      .single();

    if (merchantError) {
      console.error("Failed to create merchant:", JSON.stringify(merchantError));
      return NextResponse.json(
        { error: merchantError.message || "Failed to create store" },
        { status: 500 }
      );
    }

    // Seed default products
    const now = new Date().toISOString();
    const defaultProducts = [
      { name: "CodePro Laptop", description: "High-performance laptop suitable for programming, development, and professional work.", category: "Laptops", price: 65000, stock: 10, image: "laptop" },
      { name: "Wireless Mouse", description: "Ergonomic wireless mouse designed for productivity and everyday work.", category: "Accessories", price: 1500, stock: 50, image: "mouse" },
      { name: "Laptop Backpack", description: "Protective backpack designed for laptops, accessories, and daily commuting.", category: "Accessories", price: 2500, stock: 30, image: "backpack" },
      { name: "Mechanical Keyboard", description: "Mechanical keyboard designed for programmers, professionals, and productivity.", category: "Accessories", price: 4000, stock: 20, image: "keyboard" },
      { name: "Monitor 24-inch", description: "Full HD 24-inch monitor suitable for coding, professional work, and multitasking.", category: "Monitors", price: 12000, stock: 15, image: "monitor" },
    ];

    const products = defaultProducts.map((p, i) => ({
      id: `product-${Date.now()}-${i}`,
      merchant_id: merchant.id,
      ...p,
      created_at: now,
      updated_at: now,
    }));

    await supabase.from("products").insert(products);

    // Set merchant settings
    await supabase.from("merchants").update({
      store_description: "AI-ready merchant catalog for agentic commerce.",
      public_catalog: true,
      auto_respond: true,
      show_pricing: true,
      cross_sell: true,
      safety_checks: true,
      ai_analysis: true,
      auto_approve: false,
    }).eq("id", merchant.id);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("Signup error:", err?.message);
    return NextResponse.json(
      { error: err?.message || "Signup failed" },
      { status: 500 }
    );
  }
}
