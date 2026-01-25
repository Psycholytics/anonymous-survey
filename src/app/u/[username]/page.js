"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function extFromFile(file) {
  const t = String(file?.type || "").toLowerCase();
  if (t.includes("png")) return "png";
  if (t.includes("webp")) return "webp";
  return "jpg"; // default (jpeg)
}

export default function PublicProfilePage() {
  const router = useRouter();
  const params = useParams();
  const handle = params?.username;

  const avatarInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [viewer, setViewer] = useState(null); // auth user (if logged in)
  const [profile, setProfile] = useState(null); // profile being viewed

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const isOwner = useMemo(() => {
    return !!viewer?.id && !!profile?.user_id && viewer.id === profile.user_id;
  }, [viewer?.id, profile?.user_id]);

  useEffect(() => {
    let alive = true;

    async function boot() {
      setLoading(true);
      setNotFound(false);

      // viewer is optional — page is public
      const { data: authData } = await supabase.auth.getUser();
      const u = authData?.user || null;
      if (alive) setViewer(u);

      const cleanHandle = String(handle || "").trim().toLowerCase();
      if (!cleanHandle) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const { data: prof, error } = await supabase
        .from("profiles")
        .select("user_id, handle, avatar_url, banner_url")
        .eq("handle", cleanHandle)
        .maybeSingle();

      if (!alive) return;

      if (error) {
        console.error("PROFILE LOAD ERROR:", error);
        setNotFound(true);
        setLoading(false);
        return;
      }

      if (!prof) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setProfile(prof);
      setLoading(false);
    }

    boot();

    return () => {
      alive = false;
    };
  }, [handle]);

  async function uploadAndSave(kind, file) {
    if (!isOwner) return;
    if (!file) return;

    const ext = extFromFile(file);
    const path = `${viewer.id}/${kind}.${ext}`;

    try {
      if (kind === "avatar") setUploadingAvatar(true);
      if (kind === "banner") setUploadingBanner(true);

      // Upload to Storage
      const { error: upErr } = await supabase.storage
        .from("profile-media")
        .upload(path, file, {
          upsert: true,
          contentType: file.type || undefined,
        });

      if (upErr) {
        console.error("UPLOAD ERROR:", upErr);
        alert(upErr.message || "Upload failed.");
        return;
      }

      // Public URL
      const { data: pub } = supabase.storage.from("profile-media").getPublicUrl(path);
      const publicUrl = pub?.publicUrl;

      if (!publicUrl) {
        alert("Upload succeeded but public URL failed.");
        return;
      }

      // Cache-bust so the user instantly sees the new image
      const bustUrl = `${publicUrl}${publicUrl.includes("?") ? "&" : "?"}v=${Date.now()}`;

      // Save URL in profiles
      const patch =
        kind === "avatar" ? { avatar_url: bustUrl } : { banner_url: bustUrl };

      const { error: dbErr } = await supabase
        .from("profiles")
        .update(patch)
        .eq("user_id", viewer.id);

      if (dbErr) {
        console.error("PROFILE UPDATE ERROR:", dbErr);
        alert(dbErr.message || "Failed saving profile image.");
        return;
      }

      setProfile((p) => ({ ...p, ...patch }));
    } finally {
      if (kind === "avatar") setUploadingAvatar(false);
      if (kind === "banner") setUploadingBanner(false);
    }
  }

  function onPickAvatar(e) {
    const file = e.target.files?.[0] || null;
    if (!file) return;
    uploadAndSave("avatar", file);
    e.target.value = ""; // allow re-upload same file
  }

  function onPickBanner(e) {
    const file = e.target.files?.[0] || null;
    if (!file) return;
    uploadAndSave("banner", file);
    e.target.value = "";
  }

  return (
    <main className="min-h-screen bg-white text-gray-900">
      {/* background glow (keep site consistent) */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-[90px]" />
        <div className="absolute top-28 right-[-140px] h-[560px] w-[560px] rounded-full bg-purple-500/10 blur-[110px]" />
        <div className="absolute bottom-[-220px] left-[-160px] h-[620px] w-[620px] rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      {/* Hidden inputs for uploads */}
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={onPickAvatar}
      />
      <input
        ref={bannerInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={onPickBanner}
      />

      <section className="relative mx-auto max-w-6xl px-6 pb-16 pt-10">
        {loading ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
            <p className="text-sm text-gray-600">Loading…</p>
          </div>
        ) : notFound ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-extrabold tracking-tight">Profile not found</h1>
            <p className="mt-2 text-sm text-gray-600">
              This user may not exist, or the link is incorrect.
            </p>
            <button
              onClick={() => router.push("/")}
              className="mt-6 inline-flex rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm hover:bg-gray-50"
            >
              Go home
            </button>
          </div>
        ) : (
          <>
            {/* Banner */}
            <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
              <div
                className={cx(
                  "relative h-[200px] w-full",
                  !profile?.banner_url &&
                    "bg-gradient-to-r from-blue-500/15 to-purple-600/15"
                )}
              >
                {profile?.banner_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.banner_url}
                    alt="Banner"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0" />
                )}

                {/* Owner edit banner */}
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => bannerInputRef.current?.click()}
                    className={cx(
                      "absolute right-4 top-4 rounded-2xl border bg-white/90 px-3 py-2 text-xs font-semibold text-gray-900 shadow-sm backdrop-blur hover:bg-white",
                      uploadingBanner && "cursor-not-allowed opacity-70"
                    )}
                    disabled={uploadingBanner}
                    title="Upload banner"
                  >
                    {uploadingBanner ? "Uploading…" : "Edit banner"}
                  </button>
                )}
              </div>

              {/* Avatar row (overlaps) */}
              <div className="relative px-6 pb-6">
                <div className="absolute -top-10 left-6">
                  <button
                    type="button"
                    onClick={() => (isOwner ? avatarInputRef.current?.click() : null)}
                    className={cx(
                      "group relative h-20 w-20 overflow-hidden rounded-full border-4 border-white bg-gray-100 shadow-sm",
                      isOwner && "cursor-pointer"
                    )}
                    title={isOwner ? "Upload avatar" : undefined}
                    disabled={!isOwner || uploadingAvatar}
                  >
                    {profile?.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={profile.avatar_url}
                        alt="Avatar"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500/20 to-purple-600/25 text-lg font-extrabold text-gray-700">
                        {String(profile?.handle || "?").slice(0, 1).toUpperCase()}
                      </div>
                    )}

                    {isOwner && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/0 text-[11px] font-semibold text-white opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100">
                        {uploadingAvatar ? "Uploading…" : "Edit"}
                      </div>
                    )}
                  </button>
                </div>

                <div className="pt-12">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Public profile
                      </p>
                      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900">
                        @{profile.handle}
                      </h1>
                      <p className="mt-2 text-sm text-gray-600">
                        Share your surveys. Responses stay anonymous. 🔒
                      </p>
                    </div>

                    {/* Optional owner hint */}
                    {isOwner && (
                      <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-xs font-semibold text-gray-700 shadow-sm">
                        Tip: Add a banner + avatar to feel more “real”.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* --- BELOW HERE: your existing public profile content (surveys list, etc.) --- */}
            <div className="mt-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm text-gray-600">
                (Next) We’ll plug your public surveys/content back in here.
              </p>
            </div>
          </>
        )}
      </section>
    </main>
  );
}