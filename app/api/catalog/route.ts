import { NextResponse } from "next/server";
import { demoProducts } from "@/lib/catalogStorage";
import { toAgentCatalog } from "@/types/agentCatalog";

export function GET() {
  return NextResponse.json(toAgentCatalog(demoProducts));
}