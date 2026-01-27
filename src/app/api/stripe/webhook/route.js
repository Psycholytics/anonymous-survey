// src/app/api/stripe/webhook/route.js

export const config = {
    api: {
        bodyParser: false,
    },
};

import Stripe from "stripe";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs"; // IMPORTANT (Stripe needs raw body)

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(req) {
  try {
    const sig = req.headers.get("stripe-signature"); // ✅ use req.headers (NOT next/headers)
    if (!sig) {
      return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
    }

    const body = Buffer.from(await req.arrayBuffer()); // ✅ raw body
    const event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    // Idempotency / dedupe guard (ignore repeated Stripe events)
    const { error: seenErr } = await supabaseAdmin
      .from("stripe_webhook_events")
      .insert({ event_id: event.id });

    if (seenErr) {
      // Postgres unique violation = already processed
      if (seenErr.code === "23505") {
        return NextResponse.json({ received: true, duplicate: true });
      }

      console.error("IDEMPOTENCY INSERT ERROR:", seenErr);
      return NextResponse.json({ error: "Failed idempotency check" }, { status: 500 });
    }

    // ✅ When checkout succeeds, mark survey as paid
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      const surveyId = session?.metadata?.survey_id;
      if (!surveyId) {
        return NextResponse.json({ error: "Missing survey_id in metadata" }, { status: 400 });
      }

      const { error } = await supabaseAdmin
        .from("surveys")
        .update({
          is_paid: true,
          paid_at: new Date().toISOString(),
        })
        .eq("id", surveyId)
        .eq("is_paid", false);

      if (error) {
        console.error("SUPABASE UPDATE ERROR:", error);
        return NextResponse.json({ error: "DB update failed" }, { status: 500 });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("WEBHOOK ERROR:", err);
    return NextResponse.json({ error: err.message || "Webhook error" }, { status: 500 });
  }
}