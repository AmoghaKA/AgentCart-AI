import { NextResponse } from "next/server";
import { loadProducts } from "@/lib/catalogStorage";
import { toAgentCatalog } from "@/types/agentCatalog";

export const dynamic = "force-dynamic";

export function GET() {
  const products = loadProducts();
  return NextResponse.json(toAgentCatalog(products));
}