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

function extractJSON(text: string): any[] | null {
  // Step 1: Strip markdown code fences (```json ... ``` or ``` ... ```)
  let cleaned = text
    .replace(/^```(?:json)?\s*\n?/im, "")
    .replace(/\n?```\s*$/im, "")
    .trim();

  // Step 2: Try parsing the entire cleaned text directly
  // Handles pretty-printed JSON like "[\n  {\n ...\n}\n]"
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) {
      console.log("extractJSON: SUCCESS (direct) -", parsed.length, "items");
      return parsed;
    }
  } catch {
    // continue to next strategy
  }

  // Step 3: Find the outermost JSON array using bracket matching
  const firstBracket = cleaned.indexOf("[");
  const lastBracket = cleaned.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    const substring = cleaned.substring(firstBracket, lastBracket + 1);
    try {
      const parsed = JSON.parse(substring);
      if (Array.isArray(parsed)) {
        console.log("extractJSON: SUCCESS (substring) -", parsed.length, "items");
        return parsed;
      }
    } catch {
      // continue to next strategy
    }

    // Step 4: Fix common LLM JSON issues then retry
    const fixed = substring
      .replace(/,\s*([\]}])/g, "$1")            // trailing commas
      .replace(/[\u201C\u201D]/g, '"')           // curly double quotes
      .replace(/[\u2018\u2019]/g, "'");          // curly single quotes
    try {
      const parsed = JSON.parse(fixed);
      if (Array.isArray(parsed)) {
        console.log("extractJSON: SUCCESS (fixed) -", parsed.length, "items");
        return parsed;
      }
    } catch {
      // all strategies exhausted
    }
  }

  console.error("extractJSON: ALL strategies failed. Text preview:", text.substring(0, 500));
  return null;
}

export async function POST(request: Request) {
  try {
    const { products } = await request.json();

    if (!products || !Array.isArray(products) || products.length < 2) {
      return NextResponse.json({ opportunities: [] });
    }

    const hasAI = process.env.GOOGLE_GENERATIVE_AI_API_KEY || (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== "gsk_your_groq_key_here");
    if (!hasAI) {
      console.warn("Growth AI: no AI key configured");
      return NextResponse.json({ opportunities: [], fallback: true });
    }

    const inStock = products.filter((p: any) => p.stock > 0);
    if (inStock.length < 2) {
      return NextResponse.json({ opportunities: [] });
    }

    const catalog = inStock
      .map((p: any) => `[ID:${p.id}] ${p.name} — Category: ${p.category} | Price: ₹${p.price.toLocaleString("en-IN")} | Stock: ${p.stock} | ${p.description || "No description"}`)
      .join("\n");

    const categories = [...new Set(inStock.map((p: any) => p.category))];

    console.log("Growth AI: sending", inStock.length, "products to AI. Categories:", categories.join(", "));

    const { text } = await generateText({
      model: getModel(),
      system: `You are an expert e-commerce merchandising advisor. Your job is to find REALISTIC product pairings that customers would actually buy together. You understand product compatibility, use cases, and customer buying patterns.

IMPORTANT: Return ONLY a valid JSON array. No thinking, no explanation, no markdown.`,
      prompt: `Here is the merchant's product catalog:

${catalog}

Product categories available: ${categories.join(", ")}

Create 2-4 product bundle suggestions. Each suggestion pairs ONE main product with 1-2 complementary products that a real customer would buy together.

Think about real shopping scenarios:
- A laptop needs a mouse, keyboard, or laptop bag
- A monitor pairs with a monitor stand, webcam, or HDMI cable  
- Gaming peripherals go together (mouse + keyboard + mousepad)
- Audio equipment pairs (headphones + microphone)
- Clothing pairs with accessories or complementary items
- Storage products complement any computer purchase

Return ONLY this JSON array (no text before or after):

[
  {
    "mainProductId": "exact-id-from-above",
    "mainProductName": "exact-name-from-above",
    "recommendedProductIds": ["id1", "id2"],
    "recommendedProductNames": ["name1", "name2"],
    "type": "bundle",
    "reason": "2-3 sentence explanation of why these products work well together. Explain the practical use case, how they complement each other, and why a customer would want both.",
    "confidence": "High"
  }
]

RULES:
- Use the EXACT [ID:xxx] values shown above for each product
- Include both IDs AND names so matching is reliable
- Only pair products that are genuinely complementary (not random)
- The "reason" field MUST be 2-3 sentences explaining:
  1. What problem this bundle solves for the customer
  2. How the recommended products enhance or complete the main product
  3. Why buying them together makes sense (convenience, compatibility, savings)
- Max 4 suggestions
- Each suggestion should target a different main product
- All recommended products must be in stock`,
    });

    console.log("Growth AI: raw response length:", text.length);

    const opportunities = extractJSON(text);

    if (!opportunities || opportunities.length === 0) {
      console.error("Growth AI: FAILED to extract JSON from response, will use fallback");
      return NextResponse.json({ opportunities: [], fallback: true });
    }

    console.log("Growth AI: SUCCESS - extracted", opportunities.length, "opportunities from AI");
    return NextResponse.json({ opportunities, fallback: false });
  } catch (error: any) {
    console.error("Growth AI error:", error?.message);
    return NextResponse.json({ opportunities: [], fallback: true, error: error?.message });
  }
}
