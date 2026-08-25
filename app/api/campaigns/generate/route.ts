import { NextResponse } from "next/server";
import { generateText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";

export const dynamic = "force-dynamic";

function getModel() {
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey && groqKey !== "gsk_your_groq_key_here") {
    return createGroq({ apiKey: groqKey })("openai/gpt-oss-120b");
  }
  return createGoogleGenerativeAI({ apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY })("gemini-2.0-flash");
}

export async function POST(request: Request) {
  try {
    const { products } = await request.json();

    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: "Products required" }, { status: 400 });
    }

    const hasAI = process.env.GOOGLE_GENERATIVE_AI_API_KEY || (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== "gsk_your_groq_key_here");
    if (!hasAI) {
      console.warn("GOOGLE_GENERATIVE_AI_API_KEY not set, returning empty campaigns");
      return NextResponse.json({ campaigns: [], fallback: true });
    }

    const catalog = products
      .map((p: any) => `- ${p.name} (${p.category}): ₹${p.price.toLocaleString("en-IN")}, stock: ${p.stock}`)
      .join("\n");

    let text: string;
    try {
      const result = await generateText({
        model: getModel(),
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
    "message": "Marketing message for the campaign"
  }
]

Rules:
- Only target products that are in stock
- Discount campaigns should have 5-20% discount
- Bundle campaigns should pair complementary products
- Messages should be professional and compelling
- Do NOT use emojis`,
      });
      text = result.text;
    } catch (aiError: any) {
      console.error("Gemini AI call failed:", aiError?.message || aiError);
      // Return fallback campaigns instead of failing
      return NextResponse.json({
        campaigns: generateFallback(products),
        fallback: true,
        aiError: aiError?.message || "AI call failed",
      });
    }

    const cleaned = text
      .replace(/^```(?:json)?\s*\n?/im, "")
      .replace(/\n?```\s*$/im, "")
      .trim();

    // Try direct parse
    try {
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) {
        return NextResponse.json({ campaigns: parsed, fallback: false });
      }
    } catch {}

    // Try extracting the outermost [ ... ]
    const firstBracket = cleaned.indexOf("[");
    const lastBracket = cleaned.lastIndexOf("]");
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      try {
        const parsed = JSON.parse(cleaned.substring(firstBracket, lastBracket + 1));
        if (Array.isArray(parsed)) {
          return NextResponse.json({ campaigns: parsed, fallback: false });
        }
      } catch {}
    }

    return NextResponse.json({ campaigns: generateFallback(products), fallback: true });
  } catch (error: any) {
    console.error("AI campaign generation error:", error?.message || error);
    // Return fallback instead of 500
    return NextResponse.json({
      campaigns: generateFallback([]),
      fallback: true,
      error: error?.message || "Unknown error",
    });
  }
}

function generateFallback(products: any[]) {
  const inStock = products.filter((p: any) => p.stock > 0);
  if (inStock.length < 2) {
    return [
      {
        name: "Welcome Campaign",
        type: "upsell",
        target_products: [],
        discount_percent: 10,
        message: "Welcome to our store! Enjoy 10% off your first purchase.",
      },
    ];
  }

  const campaigns = [];
  const lowStock = inStock.filter((p: any) => p.stock < 10);
  if (lowStock.length > 0) {
    campaigns.push({
      name: "Limited Stock Alert",
      type: "discount",
      target_products: lowStock.slice(0, 2).map((p: any) => p.id),
      discount_percent: 15,
      message: `Hurry! Only a few left in stock. Get 15% off on ${lowStock[0].name}.`,
    });
  }

  const expensive = [...inStock].sort((a: any, b: any) => b.price - a.price);
  campaigns.push({
    name: "Premium Upsell",
    type: "upsell",
    target_products: expensive.slice(0, 2).map((p: any) => p.id),
    discount_percent: 0,
    message: `Discover our premium ${expensive[0]?.name} — invest in quality that lasts.`,
  });

  if (inStock.length >= 3) {
    const catA = inStock[0];
    const catB = inStock.find((p: any) => p.category !== catA.category) || inStock[1];
    campaigns.push({
      name: "Bundle Deal",
      type: "bundle",
      target_products: [catA.id, catB.id],
      discount_percent: 10,
      message: `Get ${catA.name} + ${catB.name} together and save 10%!`,
    });
  }

  return campaigns;
}
