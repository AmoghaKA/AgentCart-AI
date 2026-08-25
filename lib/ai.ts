import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { generateText, streamText } from "ai";
import type { Product } from "@/types/product";
import type { AgentReadableProduct } from "@/types/agentCatalog";

const GROQ_KEY = process.env.GROQ_API_KEY || "";
const GEMINI_KEY = process.env.NEXT_PUBLIC_GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";

function aiModel() {
  if (GROQ_KEY && GROQ_KEY !== "gsk_your_groq_key_here") {
    const groq = createGroq({ apiKey: GROQ_KEY });
    return groq("qwen/qwen3.6-27b");
  }
  const google = createGoogleGenerativeAI({ apiKey: GEMINI_KEY });
  return google("gemini-3.6-flash");
}

const HAS_AI = Boolean(GROQ_KEY && GROQ_KEY !== "gsk_your_groq_key_here") || Boolean(GEMINI_KEY);

function catalogContext(products: Product[] | AgentReadableProduct[]) {
  return products
    .map(
      (p) =>
        `- ${p.name} (${p.category}): ₹${p.price.toLocaleString("en-IN")} — ${p.description} [stock: ${"stock" in p ? p.stock : 0}]`
    )
    .join("\n");
}

export interface AIGrowthOpportunity {
  mainProduct: Product;
  recommendedProducts: Product[];
  recommendationType: "Cross-sell" | "Upsell";
  reason: string;
  confidence: "High" | "Medium" | "Low";
  additionalRevenue: number;
}

export async function analyzeGrowthOpportunities(
  products: Product[]
): Promise<AIGrowthOpportunity[]> {
  if (!HAS_AI) return fallbackGrowthAnalysis(products);

  try {
    const catalog = catalogContext(products);
    const { text } = await generateText({
      model: aiModel(),
      prompt: `You are a revenue growth analyst for an e-commerce merchant. Analyze the following product catalog and identify cross-sell and upsell opportunities.

CATALOG:
${catalog}

RULES:
1. For each main product, suggest 1-3 complementary products (cross-sell) or higher-tier alternatives (upsell).
2. Assign confidence: High (strong category relationship), Medium (related use case), Low (weak signal).
3. Calculate additional revenue for each opportunity.
4. Only suggest products that are in stock.
5. Return ONLY valid JSON, no markdown.

Return a JSON array of opportunities:
[
  {
    "mainProductId": "the main product id",
    "recommendedProductIds": ["id1", "id2"],
    "type": "Cross-sell" or "Upsell",
    "reason": "Explain why this recommendation makes sense",
    "confidence": "High" or "Medium" or "Low",
    "additionalRevenue": 0
  }
]

Return at most 8 opportunities. Return an empty array if no good opportunities exist.`,
    });

    const parsed = JSON.parse(text.replace(/```json\n?/g, "").replace(/```/g, "").trim());
    const productMap = new Map(products.map((p) => [p.id, p]));

    return parsed
      .filter((opp: any) => {
        const main = productMap.get(opp.mainProductId);
        const recs = (opp.recommendedProductIds || [])
          .map((id: string) => productMap.get(id))
          .filter(Boolean);
        return main && recs.length > 0;
      })
      .map((opp: any) => {
        const main = productMap.get(opp.mainProductId)!;
        const recs = (opp.recommendedProductIds || [])
          .map((id: string) => productMap.get(id)!)
          .filter(Boolean);
        return {
          mainProduct: main,
          recommendedProducts: recs,
          recommendationType: opp.type as "Cross-sell" | "Upsell",
          reason: opp.reason,
          confidence: opp.confidence as "High" | "Medium" | "Low",
          additionalRevenue:
            opp.additionalRevenue ||
            recs.reduce((sum: number, p: Product) => sum + p.price, 0),
        };
      });
  } catch (error) {
    console.error("AI growth analysis failed, falling back to rules:", error);
    return fallbackGrowthAnalysis(products);
  }
}

function fallbackGrowthAnalysis(products: Product[]): AIGrowthOpportunity[] {
  const relationships: Record<string, string[]> = {
    Laptops: ["Accessories"],
    Monitors: ["Accessories"],
  };
  return products.flatMap((main) => {
    if (main.stock <= 0) return [];
    const cats = relationships[main.category];
    if (!cats) return [];
    const recs = products
      .filter((p) => cats.includes(p.category) && p.stock > 0 && p.id !== main.id)
      .slice(0, 3);
    if (!recs.length) return [];
    return [
      {
        mainProduct: main,
        recommendedProducts: recs,
        recommendationType: "Cross-sell" as const,
        reason: `${main.name} buyers often need ${recs.map((r) => r.name).join(", ")}.`,
        confidence: "Medium" as const,
        additionalRevenue: recs.reduce((s, p) => s + p.price, 0),
      },
    ];
  });
}

export interface AIProductMatch {
  product: AgentReadableProduct;
  score: number;
  reason: string;
}

export async function aiSearchCatalog(
  products: AgentReadableProduct[],
  buyerRequest: string
): Promise<{ matches: AIProductMatch[]; response: string }> {
  if (!HAS_AI) return fallbackSearch(products, buyerRequest);

  try {
    const catalog = products
      .map(
        (p) =>
          `ID:${p.id} | ${p.name} | ${p.category} | ₹${p.price.toLocaleString("en-IN")} | stock:${p.stock} | ${p.description}`
      )
      .join("\n");

    const { text } = await generateText({
      model: aiModel(),
      prompt: `You are an AI shopping assistant helping a buyer find products from a merchant catalog.

CATALOG:
${catalog}

BUYER REQUEST: "${buyerRequest}"

TASK:
1. Parse the buyer's intent (category, use case, budget, preferences).
2. Find the best matching products from the catalog.
3. Score each match 0-100 based on relevance.
4. Write a brief, helpful response to the buyer.

Return ONLY valid JSON:
{
  "response": "A friendly message to the buyer about what you found",
  "matches": [
    {
      "productId": "the product id",
      "score": 85,
      "reason": "Why this product matches the buyer's request"
    }
  ]
}

Return at most 6 matches, sorted by score descending. Only include products with stock > 0.`,
    });

    const parsed = JSON.parse(text.replace(/```json\n?/g, "").replace(/```/g, "").trim());
    const productMap = new Map(products.map((p) => [p.id, p]));

    const matches = (parsed.matches || [])
      .map((m: any) => {
        const product = productMap.get(m.productId);
        if (!product) return null;
        return { product, score: m.score, reason: m.reason };
      })
      .filter(Boolean) as AIProductMatch[];

    return { matches, response: parsed.response || "Here are the best matches I found." };
  } catch (error) {
    console.error("AI catalog search failed, falling back to rules:", error);
    return fallbackSearch(products, buyerRequest);
  }
}

function fallbackSearch(
  products: AgentReadableProduct[],
  request: string
): { matches: AIProductMatch[]; response: string } {
  const normalized = request.toLowerCase();
  const budgetMatch = normalized.match(
    /(?:under|below|max|budget)\s*(?:₹|rs\.?|inr)?\s*([\d,]+)/
  );
  const maxPrice = budgetMatch
    ? Number(budgetMatch[1].replace(/,/g, ""))
    : undefined;

  const scored = products
    .filter((p) => p.available)
    .map((p) => {
      const text = `${p.name} ${p.description} ${p.category}`.toLowerCase();
      let score = 0;
      const words = normalized.split(/[^a-z0-9]+/).filter((w) => w.length > 2);
      score += words.filter((w) => text.includes(w)).length * 10;
      if (maxPrice && p.price <= maxPrice) score += 20;
      if (maxPrice && p.price > maxPrice) score -= 50;
      return { product: p, score: Math.max(0, score) };
    })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((m) => ({
      ...m,
      reason: `Matches your search for "${request}".`,
    }));

  return {
    matches: scored,
    response:
      scored.length > 0
        ? `I found ${scored.length} product${scored.length === 1 ? "" : "s"} matching your request.`
        : `I couldn't find products matching "${request}". Try different keywords.`,
  };
}

export async function generateCheckoutMessage(
  context: string,
  items: { name: string; quantity: number; price: number }[],
  total: number,
  phase: "greeting" | "review" | "safety" | "approval" | "order_created" | "payment" | "complete" | "upsell"
): Promise<string> {
  if (!HAS_AI) return fallbackCheckoutMessage(items, total, phase);

  try {
    const itemList = items
      .map((i) => `${i.quantity}x ${i.name} at ₹${i.price.toLocaleString("en-IN")}`)
      .join(", ");

    const { text } = await generateText({
      model: aiModel(),
      prompt: `You are AgentCart's commerce agent guiding a buyer through checkout.

CONTEXT: ${context}
ITEMS: ${itemList}
TOTAL: ₹${total.toLocaleString("en-IN")}
PHASE: ${phase}

Write a brief, professional message appropriate for this checkout phase.
- greeting: Welcome, summarize the cart
- review: Confirm items and total
- safety: Explain safety checks passed
- approval: Ask buyer to approve order creation
- order_created: Confirm Razorpay order created, explain next step
- payment: Explain payment is ready
- complete: Congratulate on successful payment
- upsell: Suggest a complementary product

Keep it under 2 sentences. Be professional and trustworthy. Do NOT use emojis.`,
    });

    return text.trim();
  } catch {
    return fallbackCheckoutMessage(items, total, phase);
  }
}

function fallbackCheckoutMessage(
  items: { name: string; quantity: number; price: number }[],
  total: number,
  phase: string
): string {
  const count = items.reduce((s, i) => s + i.quantity, 0);
  switch (phase) {
    case "greeting":
      return `I've reviewed your purchase intent. You have ${count} item${count === 1 ? "" : "s"} totaling ₹${total.toLocaleString("en-IN")}.`;
    case "review":
      return `Your order total is ₹${total.toLocaleString("en-IN")}. I'll verify every item against the merchant catalog.`;
    case "safety":
      return `All safety checks passed — prices verified, stock confirmed, transaction limits respected.`;
    case "approval":
      return `Your order is ready. Please approve to create a Razorpay test-mode order for ₹${total.toLocaleString("en-IN")}. No payment will be made automatically.`;
    case "order_created":
      return `A Razorpay test order has been created. I can open the secure payment interface, but I will not do so automatically.`;
    case "payment":
      return `Payment interface is ready. Please review and complete the secure Razorpay test payment.`;
    case "complete":
      return `Payment verified successfully! Your transaction of ₹${total.toLocaleString("en-IN")} is complete.`;
    case "upsell":
      return `I found a complementary product that may improve your setup.`;
    default:
      return `How can I help with your checkout?`;
  }
}

export async function streamBuyerChat(
  messages: { role: "user" | "assistant"; content: string }[],
  catalog: AgentReadableProduct[]
): Promise<ReadableStream> {
  const catalogText = catalog
    .map(
      (p) =>
        `${p.name} (${p.category}) — ₹${p.price.toLocaleString("en-IN")} [${p.stock > 0 ? "in stock" : "out of stock"}]: ${p.description}`
    )
    .join("\n");

  const systemPrompt = `You are an AI buyer agent for AgentCart — an agentic commerce platform. You help buyers discover and purchase products from merchant catalogs.

MERCHANDISE CATALOG:
${catalogText}

YOUR CAPABILITIES:
1. Search and recommend products from the catalog
2. Parse buyer intent (budget, category, use case, preferences)
3. Compare products and explain differences
4. Help buyers build a purchase intent (list of products to buy)
5. Guide buyers through the checkout process

RULES:
- Only recommend products that are in stock (stock > 0)
- Always mention prices in INR (₹)
- Be concise and helpful (2-3 sentences per response)
- If no products match, suggest alternatives or ask clarifying questions
- When the buyer wants to buy, confirm the product list and direct them to proceed
- Never make up products that aren't in the catalog
- Do NOT use emojis

When the buyer wants to purchase, respond with a JSON action:
{"action": "add_to_cart", "products": [{"id": "...", "name": "...", "quantity": 1}]}

Otherwise respond normally with text.`;

  if (!HAS_AI) {
    const last = messages[messages.length - 1];
    const userMsg = last?.content?.toLowerCase() || "";
    let reply = "I can help you find products. What are you looking for?";

    if (userMsg.includes("buy") || userMsg.includes("cart") || userMsg.includes("purchase")) {
      const inStock = catalog.filter((p) => p.stock > 0).slice(0, 3);
      if (inStock.length > 0) {
        const list = inStock.map((p) => `${p.name} (₹${p.price.toLocaleString("en-IN")})`).join(", ");
        reply = `I recommend these products: ${list}. Would you like to add any to your cart?`;
      }
    } else if (userMsg.includes("laptop") || userMsg.includes("computer")) {
      const laptops = catalog.filter((p) => p.category === "Laptops" && p.stock > 0);
      if (laptops.length > 0) {
        reply = `We have ${laptops.length} laptop${laptops.length === 1 ? "" : "s"} available: ${laptops.map((p) => `${p.name} (₹${p.price.toLocaleString("en-IN")})`).join(", ")}.`;
      }
    } else {
      const inStock = catalog.filter((p) => p.stock > 0);
      if (inStock.length > 0) {
        reply = `We have ${inStock.length} products available. Tell me what you need — budget, category, or use case — and I'll find the best matches.`;
      } else {
        reply = "The catalog is currently empty. Please check back later.";
      }
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(reply));
        controller.close();
      },
    });
    return stream;
  }

  const aiResult = streamText({
    model: aiModel(),
    system: systemPrompt,
    messages,
  });

  return aiResult.toTextStreamResponse().body!;
}
