import { supabase } from "@/lib/supabase";
import ProfileClient from "./ProfileClient";

export async function generateMetadata({ params }) {
  // Grab the handle from the URL
  const { handle } = params;
  const cleanHandle = String(handle || "").trim().toLowerCase();

  // Fetch the user's profile info for the preview card
  const { data: profile } = await supabase
    .from("profiles")
    .select("handle, avatar_url")
    .eq("handle", cleanHandle)
    .single();

  const displayHandle = profile?.handle ? `@${profile.handle}` : "User Profile";
  const description = `Check out my active surveys on Psychelytics! Tell me what you really think.`;
  const url = `https://psychelytics.com/u/${cleanHandle}`;
  const imageUrl = profile?.avatar_url || "https://psychelytics.com/default-share-image.jpg"; // Fallback image if they don't have an avatar

  return {
    title: `${displayHandle} | Psychelytics`,
    description: description,
    openGraph: {
      title: `${displayHandle} | Psychelytics`,
      description: description,
      url: url,
      siteName: "Psychelytics",
      images: [
        {
          url: imageUrl,
          width: 800,
          height: 800,
          alt: `${displayHandle} avatar`,
        },
      ],
      type: "profile",
    },
    twitter: {
      card: "summary", 
      title: `${displayHandle} | Psychelytics`,
      description: description,
      images: [imageUrl],
    },
  };
}

export default function Page() {
  // Renders your beautifully built profile page!
  return <ProfileClient />;
}