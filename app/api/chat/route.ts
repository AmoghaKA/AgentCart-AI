import { streamBuyerChat } from "@/lib/ai";
import { loadProductsServer } from "@/lib/catalogStorage";
import { toAgentCatalog } from "@/types/agentCatalog";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: "Messages are required" }, { status: 400 });
    }

    const products = await loadProductsServer();
    const catalog = toAgentCatalog(products);

    const stream = await streamBuyerChat(messages, catalog.products);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return Response.json({ error: "Chat request failed" }, { status: 500 });
  }
}
