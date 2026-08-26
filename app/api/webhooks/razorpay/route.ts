import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    const crypto = await import("crypto");
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest("hex");

    if (expectedSignature !== signature) {
      console.error("Razorpay webhook signature mismatch");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = JSON.parse(body);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    switch (event.event) {
      case "payment.captured": {
        const payment = event.payload.payment.entity;
        const orderId = payment.order_id;
        const paymentId = payment.id;

        await supabase
          .from("orders")
          .update({
            status: "paid",
            razorpay_payment_id: paymentId,
            updated_at: new Date().toISOString(),
          })
          .eq("razorpay_order_id", orderId);

        await supabase.from("audit_events").insert({
          actor: "system",
          action: "Payment captured via webhook",
          category: "payment",
          status: "success",
          description: `Razorpay payment captured — order: ${orderId}, payment: ${paymentId}, amount: ₹${(payment.amount / 100).toLocaleString("en-IN")}`,
          amount: payment.amount / 100,
          currency: "INR",
          reference_id: paymentId,
        });
        break;
      }
      case "payment.failed": {
        const payment = event.payload.payment.entity;
        await supabase.from("audit_events").insert({
          actor: "system",
          action: "Payment failed via webhook",
          category: "payment",
          status: "failed",
          description: `Razorpay payment failed — order: ${payment.order_id}, payment: ${payment.id}, error: ${payment.error_description || "Unknown"}`,
          amount: payment.amount / 100,
          currency: "INR",
          reference_id: payment.id,
        });
        break;
      }
      case "order.paid": {
        const order = event.payload.order.entity;
        await supabase
          .from("orders")
          .update({ status: "paid", updated_at: new Date().toISOString() })
          .eq("razorpay_order_id", order.id);
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
