import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export interface AuthUser {
  id: string;
  email: string;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = getSupabaseBrowserClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) {
    console.error("getCurrentUser error:", error.message);
    return null;
  }
  if (!user) {
    console.warn("getCurrentUser: no user session found");
    return null;
  }
  return { id: user.id, email: user.email || "" };
}

export async function getMerchantIdForUser(): Promise<string | null> {
  const user = await getCurrentUser();
  if (!user) {
    console.warn("getMerchantIdForUser: no user, returning null");
    return null;
  }

  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (error) {
    console.error("getMerchantIdForUser query error:", JSON.stringify(error));
    return null;
  }
  if (!data) {
    console.warn("getMerchantIdForUser: no merchant found for user_id", user.id);
    return null;
  }
  return data.id;
}

export async function signUp(email: string, password: string, storeName: string): Promise<{ error?: string; needsEmailConfirmation?: boolean }> {
  const supabase = getSupabaseBrowserClient();

  const { data, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError) {
    return { error: signUpError.message };
  }

  // If email confirmation is required, the user object won't have a session yet
  if (data.user && !data.session) {
    // Email confirmation required — merchant will be created after confirmation
    // Store the store name in user metadata so we can use it after confirmation
    return { needsEmailConfirmation: true };
  }

  if (data.user) {
    // Create merchant for this user
    const { data: merchant, error: merchantError } = await supabase
      .from("merchants")
      .insert({
        user_id: data.user.id,
        name: storeName,
        description: "AI-ready merchant catalog for agentic commerce.",
        currency: "INR",
      })
      .select("id")
      .single();

    if (merchantError) {
      console.error("Failed to create merchant:", JSON.stringify(merchantError));
      return { error: merchantError.message || merchantError.hint || "Failed to create store. Please try again." };
    }

    if (merchant) {
      // Seed default products for the new merchant
      const now = new Date().toISOString();
      const defaultProducts = [
        { name: "CodePro Laptop", description: "High-performance laptop suitable for programming, development, and professional work.", category: "Laptops", price: 65000, stock: 10, image: "laptop" },
        { name: "Wireless Mouse", description: "Ergonomic wireless mouse designed for productivity and everyday work.", category: "Accessories", price: 1500, stock: 50, image: "mouse" },
        { name: "Laptop Backpack", description: "Protective backpack designed for laptops, accessories, and daily commuting.", category: "Accessories", price: 2500, stock: 30, image: "backpack" },
        { name: "Mechanical Keyboard", description: "Mechanical keyboard designed for programmers, professionals, and productivity.", category: "Accessories", price: 4000, stock: 20, image: "keyboard" },
        { name: "Monitor 24-inch", description: "Full HD 24-inch monitor suitable for coding, professional work, and multitasking.", category: "Monitors", price: 12000, stock: 15, image: "monitor" },
      ];

      const products = defaultProducts.map((p, i) => ({
        id: crypto.randomUUID(),
        merchant_id: merchant.id,
        ...p,
        created_at: now,
        updated_at: now,
      }));

      await supabase.from("products").insert(products);

      // Update merchant with settings
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
    }
  }

  return {};
}

export async function createMerchantForUser(): Promise<{ error?: string }> {
  const supabase = getSupabaseBrowserClient();
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated" };

  // Check if merchant already exists
  const { data: existing } = await supabase
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (existing) return {};

  // Create merchant
  const { data: merchant, error: merchantError } = await supabase
    .from("merchants")
    .insert({
      user_id: user.id,
      name: "My Store",
      description: "AI-ready merchant catalog for agentic commerce.",
      currency: "INR",
    })
    .select("id")
    .single();

  if (merchantError) {
    console.error("Failed to create merchant:", JSON.stringify(merchantError));
    return { error: merchantError.message || "Failed to create store." };
  }

  if (merchant) {
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
  }

  return {};
}

export async function signIn(email: string, password: string): Promise<{ error?: string }> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: error.message };
  }
  return {};
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  await supabase.auth.signOut();
}
