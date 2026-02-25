"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

/** Header menu (top-right ☰) */
function HeaderMenu({ open, onToggle, onClose, onDashboard, onProfile, onAccount, onLogout }) {
  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={onToggle}
        className={cx(
          "inline-flex h-11 w-11 items-center justify-center rounded-2xl border bg-white shadow-sm",
          "border-gray-200 text-gray-900 hover:bg-gray-50"
        )}
        aria-haspopup="menu"
        aria-expanded={open ? "true" : "false"}
        title="Menu"
      >
        <span className="text-xl leading-none">☰</span>
      </button>

      {open && (
        <div
          className="absolute right-0 top-12 z-50 w-60 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg"
          role="menu"
        >
          <button
            type="button"
            onClick={() => {
              onClose?.();
              onDashboard?.();
            }}
            className="w-full px-4 py-3 text-left text-sm font-semibold text-gray-900 hover:bg-gray-50 border-b border-gray-50"
            role="menuitem"
          >
            Dashboard
            <div className="mt-0.5 text-[11px] font-medium text-gray-500">
              back to my surveys
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose?.();
              onAccount?.();
            }}
            className="w-full px-4 py-3 text-left text-sm font-semibold text-gray-900 hover:bg-gray-50"
            role="menuitem"
          >
            Account settings
            <div className="mt-0.5 text-[11px] font-medium text-gray-500">
              username, email, password
            </div>
          </button>

          <div className="h-px bg-gray-200" />

          <button
            type="button"
            onClick={() => {
              onClose?.();
              onLogout?.();
            }}
            className="w-full px-4 py-3 text-left text-sm font-semibold text-red-600 hover:bg-red-50 focus:bg-red-50"
            role="menuitem"
          >
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

export default function ProfileTopBar({ profileUserId }) {
  const router = useRouter();
  const [viewer, setViewer] = useState(null);
  const [openHeaderMenu, setOpenHeaderMenu] = useState(false);

  useEffect(() => {
    async function check() {
      const { data } = await supabase.auth.getUser();
      setViewer(data?.user || null);
    }
    check();

    const closeMenu = () => setOpenHeaderMenu(false);
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, []);

  // If the person viewing isn't logged in, don't show the menu
  if (!viewer) return null;

  return (
    <div className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        {/* Logo/Emblem to match other pages */}
        <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-sm" />

        <HeaderMenu
          open={openHeaderMenu}
          onToggle={(e) => {
            e.stopPropagation();
            setOpenHeaderMenu(!openHeaderMenu);
          }}
          onClose={() => setOpenHeaderMenu(false)}
          onDashboard={() => router.push("/dashboard")}
          onAccount={() => router.push("/account")}
          onLogout={async () => {
            await supabase.auth.signOut();
            router.push("/");
          }}
        />
      </div>
    </div>
  );
}