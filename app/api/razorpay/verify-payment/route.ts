/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import crypto from "crypto";
import type { NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

interface VerifyPaymentRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  keySecret: string
): boolean {
  const sha = crypto.createHmac("sha256", keySecret);
  const generatedSignature = sha.update(`${orderId}|${paymentId}`).digest("hex");
  return generatedSignature === signature;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = body as VerifyPaymentRequest;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: "Missing required payment verification fields" },
        { status: 400 }
      );
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      return NextResponse.json(
        { error: "Razorpay secret is not configured" },
        { status: 500 }
      );
    }

    const isValid = verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      keySecret
    );

    if (!isValid) {
      return NextResponse.json(
        { error: "Payment signature verification failed" },
        { status: 400 }
      );
    }

    // Update Supabase order with payment verification
    try {
      const supabase = getSupabaseServerClient();
      const { data: order } = await (supabase
        .from("orders" as any)
        .select("id")
        .eq("razorpay_order_id", razorpay_order_id)
        .single() as any);

      if (order) {
        await (supabase
          .from("orders" as any)
          .update({
            status: "payment_verified",
            razorpay_payment_id: razorpay_payment_id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", order.id) as any);

        // Track campaign conversions for products in this order
        try {
          const { data: orderItems } = await supabase
            .from("order_items" as any)
            .select("product_id, line_total")
            .eq("order_id", order.id) as any;

          const { data: activeCampaigns } = await supabase
            .from("campaigns" as any)
            .select("id, target_products, discount_percent")
            .eq("status", "active")
            .gt("discount_percent", 0) as any;

          if (orderItems && activeCampaigns) {
            for (const item of orderItems) {
              for (const campaign of activeCampaigns) {
                if (campaign.target_products?.includes(item.product_id)) {
                  const revenuePortion = Number(item.line_total || 0);
                  if (revenuePortion > 0) {
                    const { data: cRow } = await supabase
                      .from("campaigns" as any)
                      .select("conversions, revenue")
                      .eq("id", campaign.id)
                      .single() as any;
                    if (cRow) {
                      await supabase
                        .from("campaigns" as any)
                        .update({
                          conversions: (cRow.conversions || 0) + 1,
                          revenue: (cRow.revenue || 0) + revenuePortion,
                          updated_at: new Date().toISOString(),
                        })
                        .eq("id", campaign.id);
                    }
                  }
                }
              }
            }
          }
        } catch (trackingErr) {
          console.error("Campaign conversion tracking failed:", trackingErr);
        }
      }
    } catch (dbError) {
      console.error("Failed to update order in Supabase:", dbError);
    }

    return NextResponse.json({
      verified: true,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
    });
  } catch {
    return NextResponse.json(
      { error: "Payment verification failed. Please try again." },
      { status: 500 }
    );
  }
}
