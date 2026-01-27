// src/app/api/stripe/webhook/route.js
export const runtime = "nodejs";

import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

export async function POST(req) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature" }, { status: 400 });
  }

  let event;
  try {
    // ✅ MUST be raw bytes
    const rawBody = Buffer.from(await req.arrayBuffer());
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("WEBHOOK VERIFY ERROR:", err?.message || err);
    // Stripe will show this exact message (good for debugging)
    return NextResponse.json(
      { error: err?.message || "Signature verification failed" },
      { status: 400 }
    );
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const surveyId = session?.metadata?.survey_id;

      if (!surveyId) {
        return NextResponse.json({ error: "Missing survey_id in metadata" }, { status: 400 });
      }

      const { error } = await supabaseAdmin
        .from("surveys")
        .update({ is_paid: true, paid_at: new Date().toISOString() })
        .eq("id", surveyId);

      if (error) {
        console.error("SUPABASE UPDATE ERROR:", error);
        return NextResponse.json({ error: "DB update failed" }, { status: 500 });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("WEBHOOK HANDLER ERROR:", err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}