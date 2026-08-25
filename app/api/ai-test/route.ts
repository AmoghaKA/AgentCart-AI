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

export async function GET() {
  const groqKey = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const provider = groqKey && groqKey !== "gsk_your_groq_key_here" ? "Groq (Llama 3.3 70B)" : geminiKey ? "Google Gemini" : "none";

  if (provider === "none") {
    return NextResponse.json({
      status: "error",
      message: "No AI API key configured. Set GROQ_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY in .env.local",
    });
  }

  try {
    const { text } = await generateText({
      model: getModel(),
      prompt: "Reply with exactly one word: WORKING",
    });
    return NextResponse.json({
      status: "ok",
      message: `${provider} is responding`,
      reply: text.trim(),
      provider,
    });
  } catch (error: any) {
    return NextResponse.json({
      status: "error",
      message: error?.message || "Unknown error",
      provider,
    });
  }
}
