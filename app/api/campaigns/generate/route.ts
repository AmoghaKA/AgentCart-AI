import { NextResponse } from "next/server";
import { generateText } from "ai";
import { google } from "@ai-sdk/google";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { products } = await request.json();

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: "Products required" }, { status: 400 });
    }

    if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      return NextResponse.json({ campaigns: [] });
    }

    const catalog = products
      .map((p: any) => `- ${p.name} (${p.category}): ₹${p.price.toLocaleString("en-IN")}, stock: ${p.stock}`)
      .join("\n");

    const { text } = await generateText({
      model: google("gemini-2.0-flash"),
      prompt: `You are a marketing campaign strategist for an e-commerce merchant. Generate targeted campaigns based on the product catalog.

CATALOG:
${catalog}

Generate 2-4 campaigns. Each campaign should target specific products and include a compelling message.

Return ONLY valid JSON:
[
  {
    "name": "Campaign name",
    "type": "upsell" or "cross_sell" or "discount" or "bundle",
    "target_products": ["product-id-1", "product-id-2"],
    "discount_percent": 0,
    "message": "Marketing message for the campaign",
    "reason": "Why this campaign makes business sense"
  }
]

Rules:
- Only target products that are in stock
- Discount campaigns should have 5-20% discount
- Bundle campaigns should pair complementary products
- Messages should be professional and compelling
- Do NOT use emojis`,
    });

    const parsed = JSON.parse(text.replace(/```json\n?/g, "").replace(/```/g, "").trim());
    return NextResponse.json({ campaigns: parsed });
  } catch (error) {
    console.error("AI campaign generation error:", error);
    return NextResponse.json({ error: "AI generation failed" }, { status: 500 });
  }
}
