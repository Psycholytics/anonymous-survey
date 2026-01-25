import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseServer } from "@/lib/supabaseServer";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

function canStillUnlock(survey) {
  if (!survey) return false;
  if (survey.is_paid) return false;

  const unlockDeadlineMs = survey.unlock_deadline
    ? new Date(survey.unlock_deadline).getTime()
    : survey.expires_at
    ? new Date(survey.expires_at).getTime() + 30 * 24 * 60 * 60 * 1000
    : null;

  if (!unlockDeadlineMs) return true;
  return Date.now() < unlockDeadlineMs;
}

export async function POST(req) {
  try {
    const { surveyId, successUrl, cancelUrl } = await req.json();

    if (!surveyId) {
      return NextResponse.json({ error: "Missing surveyId" }, { status: 400 });
    }

    // ✅ Auth (server-side)
    const supabase = supabaseServer();
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    const user = userRes?.user || null;

    if (userErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ Load survey (owner-only)
    const { data: survey, error: sErr } = await supabase
      .from("surveys")
      .select("id, owner_id, is_paid, expires_at, unlock_deadline, title")
      .eq("id", surveyId)
      .single();

    if (sErr || !survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 });
    }

    if (survey.owner_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (survey.is_paid) {
      return NextResponse.json({ error: "Survey already unlocked" }, { status: 400 });
    }

    if (!canStillUnlock(survey)) {
      return NextResponse.json({ error: "Unlock window ended" }, { status: 400 });
    }

    // ✅ Use caller-provided URLs if present (your unlock page sends them),
    // otherwise fallback to env-based URLs.
    const site = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL;
    const success =
      successUrl ||
      `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?surveyId=${surveyId}&unlocked=1`;
    const cancel =
      cancelUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/unlock/${surveyId}`;

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
      success_url: success,
      cancel_url: cancel,
      metadata: {
        survey_id: String(surveyId),
        owner_id: String(user.id),
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