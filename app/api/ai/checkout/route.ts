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
    const { items, total, phase } = await request.json();

    if (!items || total === undefined || !phase) {
      return NextResponse.json({ message: "How can I help with your checkout?" });
    }

    const hasAI = process.env.GOOGLE_GENERATIVE_AI_API_KEY || (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== "gsk_your_groq_key_here");
    if (!hasAI) {
      return NextResponse.json({ message: getDefaultMessage(items, total, phase), fallback: true });
    }

    const itemList = items.map((i: any) => `${i.quantity}x ${i.name} at ₹${i.price.toLocaleString("en-IN")}`).join(", ");

    const { text } = await generateText({
      model: getModel(),
      prompt: `You are AgentCart's commerce agent guiding a buyer through checkout.

ITEMS: ${itemList}
TOTAL: ₹${total.toLocaleString("en-IN")}
PHASE: ${phase}

Write a brief professional message for this phase:
- greeting: Welcome, summarize cart
- review: Confirm items and total
- safety: Safety checks passed
- approval: Ask buyer to approve order creation
- order_created: Razorpay order created, next step
- payment: Payment is ready
- complete: Congratulate on successful payment
- upsell: Suggest a complementary product

Keep under 2 sentences. No emojis.`,
    });

    const cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/<\/?think[^>]*>/gi, "").trim();
    return NextResponse.json({ message: cleaned, fallback: false });
  } catch (error: any) {
    console.error("Checkout AI error:", error?.message);
    const { items, total, phase } = await request.json().catch(() => ({ items: [], total: 0, phase: "greeting" }));
    return NextResponse.json({ message: getDefaultMessage(items || [], total || 0, phase || "greeting"), fallback: true });
  }
}

function getDefaultMessage(items: any[], total: number, phase: string): string {
  const count = items.reduce((s: number, i: any) => s + i.quantity, 0);
  switch (phase) {
    case "greeting": return `I've reviewed your purchase intent. You have ${count} item${count === 1 ? "" : "s"} totaling ₹${total.toLocaleString("en-IN")}.`;
    case "review": return `Your order total is ₹${total.toLocaleString("en-IN")}. I'll verify every item against the merchant catalog.`;
    case "safety": return `All safety checks passed — prices verified, stock confirmed, transaction limits respected.`;
    case "approval": return `Your order is ready. Please approve to create a Razorpay test-mode order for ₹${total.toLocaleString("en-IN")}.`;
    case "order_created": return `A Razorpay test order has been created. I can open the secure payment interface.`;
    case "payment": return `Payment interface is ready. Please review and complete the secure Razorpay test payment.`;
    case "complete": return `Payment verified successfully! Your transaction of ₹${total.toLocaleString("en-IN")} is complete.`;
    case "upsell": return `I found a complementary product that may improve your setup.`;
    default: return `How can I help with your checkout?`;
  }
}
