import { NextResponse } from "next/server";
import { loadProductsServer } from "@/lib/catalogStorage";
import { toAgentCatalog } from "@/types/agentCatalog";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Messages required" }, { status: 400 });
    }

    const products = await loadProductsServer();
    const catalog = toAgentCatalog(products);

    const { streamBuyerChat } = await import("@/lib/ai");
    const stream = await streamBuyerChat(messages, catalog.products);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat stream error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
