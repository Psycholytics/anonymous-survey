import { supabase } from "@/lib/supabase";
import SurveyClient from "./SurveyClient";

export async function generateMetadata({ params }) {
  // Grab the survey ID from the URL
  const { id } = params;

  // Fetch just the title from Supabase so the bots can read it
  const { data: survey } = await supabase
    .from("surveys")
    .select("title")
    .eq("id", id)
    .single();

  const title = survey?.title || "Tell Me What You Really Think";
  const description = "Take my anonymous survey and tell me what you really think on Psychelytics!";
  const url = `https://psychelytics.com/survey/${id}`;

  return {
    title: title,
    description: description,
    openGraph: {
      title: title,
      description: description,
      url: url,
      siteName: "Psychelytics",
      type: "website",
    },
    twitter: {
      card: "summary", // This creates the standard preview card
      title: title,
      description: description,
    },
  };
}

export default function Page() {
  // Renders the exact UI you already built!
  return <SurveyClient />;
}