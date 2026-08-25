/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import { loadProductsServer } from "@/lib/catalogStorage";
import { toAgentCatalog } from "@/types/agentCatalog";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function toSchemaOrgJsonLd(products: any[], merchant: any) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: merchant.name,
    description: merchant.description,
    numberOfItems: products.length,
    itemListElement: products.map((product: any, index: number) => ({
      "@type": "ListItem",
      position: index + 1,
      item: {
        "@type": "Product",
        name: product.name,
        description: product.description,
        category: product.category,
        offers: {
          "@type": "Offer",
          price: product.price,
          priceCurrency: "INR",
          availability:
            product.stock > 0
              ? "https://schema.org/InStock"
              : "https://schema.org/OutOfStock",
          seller: {
            "@type": "Organization",
            name: merchant.name,
          },
        },
      },
    })),
  };
}

async function getMerchantProfile() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data } = await supabase
      .from("merchants")
      .select("name, store_description")
      .limit(1)
      .single();

    if (data) {
      return {
        name: data.name || "Merchant Store",
        description: data.store_description || "AI-ready merchant catalog for agentic commerce.",
        currency: "INR" as const,
      };
    }
  } catch {}
  return {
    name: "Merchant Store",
    description: "AI-ready merchant catalog for agentic commerce.",
    currency: "INR" as const,
  };
}

export async function GET(request: Request) {
  try {
    const [products, merchantProfile] = await Promise.all([
      loadProductsServer(),
      getMerchantProfile(),
    ]);
    const agentCatalog = toAgentCatalog(products, merchantProfile);
    const url = new URL(request.url);
    const format = url.searchParams.get("format");

    if (format === "json-ld") {
      const jsonLd = toSchemaOrgJsonLd(agentCatalog.products, agentCatalog.merchant);
      return NextResponse.json(jsonLd, {
        headers: {
          "Content-Type": "application/ld+json",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    if (format === "openapi") {
      return NextResponse.json({
        openapi: "3.0.0",
        info: {
          title: "AgentCart Merchant Catalog API",
          version: "1.0.0",
          description: "Agent-readable product catalog for agentic commerce",
        },
        servers: [{ url: url.origin }],
        paths: {
          "/api/catalog": {
            get: {
              summary: "Get merchant catalog",
              description: "Returns the full merchant product catalog in agent-readable JSON format",
              operationId: "getCatalog",
              responses: {
                "200": {
                  description: "Agent-readable catalog",
                  content: {
                    "application/json": {
                      schema: { $ref: "#/components/schemas/AgentCatalog" },
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            AgentCatalog: {
              type: "object",
              properties: {
                merchant: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    description: { type: "string" },
                    currency: { type: "string", enum: ["INR"] },
                  },
                },
                products: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Product" },
                },
              },
            },
            Product: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
                description: { type: "string" },
                category: { type: "string" },
                price: { type: "number" },
                currency: { type: "string", enum: ["INR"] },
                stock: { type: "integer" },
                available: { type: "boolean" },
              },
            },
          },
        },
      });
    }

    return NextResponse.json(agentCatalog, {
      headers: {
        "Cache-Control": "public, max-age=3600",
        "X-Catalog-Format": "agent-json",
      },
    });
  } catch (error) {
    console.error("Failed to load catalog:", error);
    return NextResponse.json(
      { error: "Failed to load merchant catalog" },
      { status: 500 }
    );
  }
}
