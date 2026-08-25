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
    const { products, query } = await request.json();

    if (!products || !Array.isArray(products) || !query) {
      return NextResponse.json({ matches: [], response: "Please provide a search query." });
    }

    const hasAI = process.env.GOOGLE_GENERATIVE_AI_API_KEY || (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== "gsk_your_groq_key_here");
    if (!hasAI) {
      return NextResponse.json({ matches: [], response: "AI search is not configured.", fallback: true });
    }

    const catalog = products
      .map((p: any) => `ID:${p.id} | ${p.name} | ${p.category} | ₹${p.price.toLocaleString("en-IN")} | stock:${p.stock} | ${p.description}`)
      .join("\n");

    const { text } = await generateText({
      model: getModel(),
      prompt: `You are an AI shopping assistant helping a buyer find products from a merchant catalog.

CATALOG:
${catalog}

BUYER REQUEST: "${query}"

Return ONLY valid JSON:
{
  "response": "Friendly message to the buyer",
  "matches": [
    { "productId": "id", "score": 85, "reason": "Why this matches" }
  ]
}

Max 6 matches sorted by score descending. Only products with stock > 0.`,
    });

    const cleaned = text
      .replace(/^```(?:json)?\s*\n?/im, "")
      .replace(/\n?```\s*$/im, "")
      .trim();

    // Try direct parse
    try {
      const parsed = JSON.parse(cleaned);
      return NextResponse.json({ ...parsed, fallback: false });
    } catch {}

    // Try extracting the outermost { ... }
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        const parsed = JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
        return NextResponse.json({ ...parsed, fallback: false });
      } catch {}
    }

    return NextResponse.json({ matches: [], response: "AI response could not be parsed. Please try again.", fallback: true });
  } catch (error: any) {
    console.error("Search AI error:", error?.message);
    return NextResponse.json({ matches: [], response: "Search failed. Please try again.", fallback: true, error: error?.message });
  }
}
