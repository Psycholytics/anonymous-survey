export const runtime = "nodejs";

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createSupabaseServerClient } from "@/lib/supabase-server";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

export async function POST(req) {
  try {
    const { surveyId, successUrl, cancelUrl } = await req.json();

    if (!surveyId) {
      return NextResponse.json({ error: "Missing surveyId" }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
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

    const origin = new URL(req.url).origin;

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
      success_url: successUrl ?? `${origin}/dashboard?surveyId=${surveyId}&unlocked=1`,
      cancel_url: cancelUrl ?? `${origin}/unlock/${surveyId}`,
      metadata: {
        survey_id: surveyId,
        user_id: user.id,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("CHECKOUT ERROR:", err);
    return NextResponse.json(
      { error: err.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}