/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import type { NextRequest } from "next/server";
import {
  MAX_TRANSACTION_AMOUNT,
  validateAmountBoundary,
} from "@/lib/safety";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { DEMO_MERCHANT_ID } from "@/lib/config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay environment variables are not configured");
  }

  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

interface CreateOrderRequest {
  checkoutId: string;
  approvalAmount: number;
  actionType?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { checkoutId, approvalAmount, actionType } =
      body as CreateOrderRequest;

    if (!checkoutId || approvalAmount == null) {
      return NextResponse.json(
        { error: "Missing required fields: checkoutId and approvalAmount" },
        { status: 400 }
      );
    }

    if (actionType && actionType !== "CREATE_RAZORPAY_TEST_ORDER") {
      return NextResponse.json(
        { error: `Invalid action type: ${actionType}. Only CREATE_RAZORPAY_TEST_ORDER is allowed.` },
        { status: 400 }
      );
    }

    // Validate amount boundary
    const amountValidation = validateAmountBoundary(approvalAmount);
    if (!amountValidation.valid) {
      return NextResponse.json(
        { error: amountValidation.reason },
        { status: 400 }
      );
    }

    // ── SERVER-SIDE VALIDATION FROM SUPABASE ──
    const supabase = getSupabaseServerClient();

    // 1. Load the order from Supabase
    const { data: order, error: orderError } = await (supabase
      .from("orders" as any)
      .select("*")
      .eq("id", checkoutId)
      .eq("merchant_id", DEMO_MERCHANT_ID)
      .single() as any);

    if (orderError || !order) {
      return NextResponse.json(
        { error: "Order not found in database" },
        { status: 404 }
      );
    }

    // 2. Load order items from Supabase
    const { data: orderItems, error: itemsError } = await (supabase
      .from("order_items" as any)
      .select("*")
      .eq("order_id", checkoutId) as any);

    if (itemsError || !orderItems || orderItems.length === 0) {
      return NextResponse.json(
        { error: "Order has no items" },
        { status: 400 }
      );
    }

    // 3. Load current product prices from Supabase and recalculate
    const productIds = orderItems.map((item: any) => item.product_id);
    const { data: currentProducts } = await (supabase
      .from("products" as any)
      .select("id, price, stock, name")
      .in("id", productIds) as any);

    const productMap = new Map(
      (currentProducts || []).map((p: any) => [p.id, p])
    );

    // 4. Validate all products exist, have stock, and recalculate totals
    let serverTotal = 0;
    for (const item of orderItems) {
      const product: any = productMap.get(item.product_id);
      if (!product) {
        return NextResponse.json(
          { error: `Product ${item.product_name} is no longer in the catalog` },
          { status: 400 }
        );
      }
      if (product.stock < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${item.product_name}. Available: ${product.stock}, requested: ${item.quantity}` },
          { status: 400 }
        );
      }
      serverTotal += Number(product.price) * item.quantity;
    }

    // 5. Validate the server-calculated total matches the approval
    if (Math.abs(serverTotal - approvalAmount) > 0.01) {
      return NextResponse.json(
        { error: `Amount mismatch. Server calculated ₹${serverTotal.toLocaleString("en-IN")}, but approval was for ₹${approvalAmount.toLocaleString("en-IN")}. Checkout may have been modified.` },
        { status: 400 }
      );
    }

    // 6. Validate transaction limit
    if (serverTotal > MAX_TRANSACTION_AMOUNT) {
      return NextResponse.json(
        { error: `Amount exceeds maximum allowed transaction of ₹${MAX_TRANSACTION_AMOUNT.toLocaleString("en-IN")}` },
        { status: 400 }
      );
    }

    // 7. Check approval exists and is valid
    const { data: approval } = await (supabase
      .from("approvals" as any)
      .select("*")
      .eq("order_id", checkoutId)
      .eq("action", "CREATE_RAZORPAY_TEST_ORDER")
      .eq("status", "approved")
      .single() as any);

    if (!approval) {
      return NextResponse.json(
        { error: "No valid approval found for this order" },
        { status: 400 }
      );
    }

    // 8. Create Razorpay test-mode order (amount in paise)
    const razorpay = getRazorpayClient();
    const amount = Math.round(serverTotal * 100);

    const orderResult = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `ag-${checkoutId.slice(0, 8)}`,
    }) as any;

    // 9. Update Supabase order with Razorpay order ID
    await (supabase
      .from("orders" as any)
      .update({
        status: "razorpay_order_created",
        razorpay_order_id: orderResult.id,
        total: serverTotal,
        updated_at: new Date().toISOString(),
      })
      .eq("id", checkoutId) as any);

    // 10. Mark approval as consumed
    await (supabase
      .from("approvals" as any)
      .update({ status: "consumed" })
      .eq("id", approval.id) as any);

    return NextResponse.json({
      orderId: orderResult.id,
      amount: orderResult.amount,
      currency: orderResult.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
    });
  } catch (error: unknown) {
    console.error("Razorpay create-order error:", error);
    const err = error as Record<string, unknown>;
    const errObj = err?.error as Record<string, unknown> | undefined;

    if (errObj) {
      return NextResponse.json(
        { error: (errObj.description as string) || "Razorpay order creation failed" },
        { status: 400 }
      );
    }

    const errMsg = err?.message as string | undefined;
    if (errMsg?.includes("not configured")) {
      return NextResponse.json(
        { error: "Razorpay is not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create Razorpay order. Please try again." },
      { status: 500 }
    );
  }
}
