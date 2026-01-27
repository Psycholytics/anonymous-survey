export const runtime = "nodejs";

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

export async function POST(req) {
  try {
    const body = await req.json();
    const { surveyId, successUrl, cancelUrl } = body;

    if (!surveyId) {
      return NextResponse.json({ error: "Missing surveyId" }, { status: 400 });
    }

    // ✅ SUPABASE — CORRECT PLACE
    const supabase = createRouteHandlerClient({ cookies });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: survey, error } = await supabase
      .from("surveys")
      .select("id, owner_id, is_paid")
      .eq("id", surveyId)
      .single();

    if (error || !survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    if (survey.owner_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (survey.is_paid) {
      return NextResponse.json({ error: "Already unlocked" }, { status: 400 });
    }

    const site =
      process.env.NEXT_PUBLIC_SITE_URL || new URL(req.url).origin;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "Unlock survey responses" },
            unit_amount: 199,
          },
          quantity: 1,
        },
      ],
      success_url:
        successUrl || `${site}/dashboard?surveyId=${surveyId}&unlocked=1`,
      cancel_url:
        cancelUrl || `${site}/unlock/${surveyId}`,
      metadata: {
        survey_id: surveyId,
        owner_id: user.id,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("CHECKOUT ERROR:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}