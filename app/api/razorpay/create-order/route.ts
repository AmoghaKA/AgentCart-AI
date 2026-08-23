import { NextResponse } from "next/server";
import Razorpay from "razorpay";
import type { NextRequest } from "next/server";
import {
  MAX_TRANSACTION_AMOUNT,
  validateAmountBoundary,
  validateApprovalIntegrity,
} from "@/lib/safety";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay environment variables are not configured");
  }

  const instance = new Razorpay({ key_id: keyId, key_secret: keySecret });
  return instance;
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
        {
          error:
            "Missing required fields: checkoutId and approvalAmount",
        },
        { status: 400 }
      );
    }

    // Validate action type
    if (actionType && actionType !== "CREATE_RAZORPAY_TEST_ORDER") {
      return NextResponse.json(
        {
          error: `Invalid action type: ${actionType}. Only CREATE_RAZORPAY_TEST_ORDER is allowed for order creation.`,
        },
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

    const razorpay = getRazorpayClient();

    // Create Razorpay test-mode order
    // Amount must be in the smallest currency unit (paise for INR)
    const amount = Math.round(approvalAmount * 100);

    // Enforce maximum amount boundary (server-side, defense in depth)
    if (amount > MAX_TRANSACTION_AMOUNT * 100) {
      return NextResponse.json(
        {
          error: `Amount exceeds maximum allowed transaction of ₹${MAX_TRANSACTION_AMOUNT.toLocaleString("en-IN")}`,
        },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: "Order amount must be greater than 0" },
        { status: 400 }
      );
    }

    const orderOptions = {
      amount: amount,
      currency: "INR",
      receipt: `agentcart-${checkoutId}`,
      payment_capture: 1, // Auto-capture for test mode
    };

    const order = await razorpay.orders.create(orderOptions);

    // Return only safe data to the frontend
    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
    });
  } catch (error: unknown) {
    console.error("Razorpay create-order error:", error);
    const err = error as Record<string, unknown>;
    const errObj = err?.error as
      | Record<string, unknown>
      | undefined;

    if (errObj) {
      return NextResponse.json(
        {
          error:
            (errObj.description as string) ||
            "Razorpay order creation failed",
        },
        { status: 400 }
      );
    }

    const errMsg = err?.message as string | undefined;
    if (errMsg?.includes("not configured")) {
      return NextResponse.json(
        {
          error:
            "Razorpay is not configured. Please add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error:
          "Failed to create Razorpay order. Please try again.",
      },
      { status: 500 }
    );
  }
}