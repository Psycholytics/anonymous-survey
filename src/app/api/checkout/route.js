export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseServer } from "@/lib/supabaseServer";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

export async function POST(req) {
  try {
    const { surveyId, successUrl, cancelUrl } = await req.json();

    if (!surveyId) {
      return NextResponse.json({ error: "Missing surveyId" }, { status: 400 });
    }

    // ✅ Auth (server-side) using the ONE helper
    const supabase = await supabaseServer();
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    const user = userRes?.user || null;

    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: survey, error: sErr } = await supabase
      .from("surveys")
      .select("id, owner_id, is_paid")
      .eq("id", surveyId)
      .single();

    if (sErr || !survey) {
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
      success_url:
        successUrl ?? `${origin}/dashboard?surveyId=${surveyId}&unlocked=1`,
      cancel_url: cancelUrl ?? `${origin}/unlock/${surveyId}`,
      metadata: {
        survey_id: String(surveyId),
        user_id: String(user.id),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("CHECKOUT ERROR:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}