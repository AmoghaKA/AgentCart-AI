/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { loadProductsServer } from "@/lib/catalogStorage";
import { toAgentCatalog } from "@/types/agentCatalog";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const products = await loadProductsServer();
    return NextResponse.json(toAgentCatalog(products));
  } catch (error) {
    console.error("Failed to load catalog:", error);
    return NextResponse.json(
      { error: "Failed to load merchant catalog" },
      { status: 500 }
    );
  }
}
