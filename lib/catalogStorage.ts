/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Product } from "@/types/product";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { DEMO_MERCHANT_ID } from "@/lib/config";

interface ProductRow {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  image: string | null;
  created_at: string;
  updated_at: string;
}

function rowToProduct(row: ProductRow): Product {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    price: Number(row.price),
    stock: row.stock,
    image: row.image || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function q(): any {
  return getSupabaseBrowserClient();
}

export async function loadProducts(): Promise<Product[]> {
  try {
    const { data, error } = await q().from("products").select("*").eq("merchant_id", DEMO_MERCHANT_ID).order("created_at", { ascending: true });
    if (error) {
      console.error("Failed to load products from Supabase:", error.message);
      return [];
    }
    return (data || []).map(rowToProduct);
  } catch (err) {
    console.error("Supabase connection error:", err);
    return [];
  }
}

export async function addProduct(product: Product): Promise<Product | null> {
  try {
    const { data, error } = await q().from("products").insert({
      id: product.id,
      merchant_id: DEMO_MERCHANT_ID,
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price,
      stock: product.stock,
      image: product.image,
      created_at: product.createdAt,
      updated_at: product.updatedAt,
    }).select().single();
    if (error) {
      console.error("Failed to add product to Supabase:", error.message);
      return null;
    }
    return data ? rowToProduct(data) : null;
  } catch (err) {
    console.error("Supabase connection error:", err);
    return null;
  }
}

export async function updateProduct(product: Product): Promise<Product | null> {
  try {
    const { data, error } = await q().from("products").update({
      name: product.name,
      description: product.description,
      category: product.category,
      price: product.price,
      stock: product.stock,
      image: product.image,
      updated_at: product.updatedAt,
    }).eq("id", product.id).select().single();
    if (error) {
      console.error("Failed to update product in Supabase:", error.message);
      return null;
    }
    return data ? rowToProduct(data) : null;
  } catch (err) {
    console.error("Supabase connection error:", err);
    return null;
  }
}

export async function deleteProduct(id: string): Promise<boolean> {
  try {
    const { error } = await q().from("products").delete().eq("id", id);
    if (error) {
      console.error("Failed to delete product from Supabase:", error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error("Supabase connection error:", err);
    return false;
  }
}

export async function getProductById(id: string): Promise<Product | null> {
  try {
    const { data, error } = await q().from("products").select("*").eq("id", id).single();
    if (error || !data) return null;
    return rowToProduct(data);
  } catch {
    return null;
  }
}

export async function loadProductsServer(): Promise<Product[]> {
  const { getSupabaseServerClient } = await import("@/lib/supabase/server");
  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase.from("products").select("*").eq("merchant_id", DEMO_MERCHANT_ID).order("created_at", { ascending: true }) as any;
  if (error) {
    console.error("Failed to load products (server):", error.message);
    return [];
  }
  return (data || []).map(rowToProduct);
}
/* eslint-enable @typescript-eslint/no-explicit-any */
