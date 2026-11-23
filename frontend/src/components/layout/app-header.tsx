
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";

import {
  Bell,
  ChevronDown,
  CircleUserRound,
  Loader2,
  LogOut,
  Menu,
  ShieldCheck,
} from "lucide-react";

import { useAuth } from "@/providers/auth-provider";

interface AppHeaderProps {
  onMenuClick: () => void;
}

export function AppHeader({
  onMenuClick,
}: AppHeaderProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { user, signOut } = useAuth();

  const [profileOpen, setProfileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");

  const profileRef = useRef<HTMLDivElement>(null);

  const email = user?.email ?? "Not available";

  const displayName =
    typeof user?.user_metadata?.full_name === "string" &&
    user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : email.split("@")[0] || "Business Owner";

  // Close dropdown when clicking outside or pressing Escape.
  useEffect(() => {
    if (!profileOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setProfileOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileOpen(false);
      }
    }

    document.addEventListener(
      "pointerdown",
      handlePointerDown
    );

    document.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown
      );

      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [profileOpen]);

  async function handleSignOut() {
    if (signingOut) return;

    setSigningOut(true);
    setLogoutError("");

    try {
      // Revoke the current Supabase Auth session.
      await signOut();

      // Remove cached customer and business data.
      queryClient.clear();

      setProfileOpen(false);

      // Redirect to the public login page.
      router.replace("/login");
      router.refresh();
    } catch {
      setLogoutError(
        "Unable to sign out. Please try again."
      );
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-sm sm:px-6 lg:min-h-20 xl:px-8">
      {/* Header Title */}
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open navigation"
          aria-controls="mobile-navigation"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-700 hover:bg-slate-100 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-slate-900 sm:text-lg">
            Business Overview
          </h2>

          <p className="hidden text-sm text-slate-500 sm:block">
            Monitor your business with GrowPilot AI
          </p>
        </div>
      </div>

      {/* Header Actions */}
      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        {/* Notifications - Coming Soon */}
        <button
          type="button"
          disabled
          title="Notifications coming soon"
          aria-label="Notifications coming soon"
          className="rounded-lg p-2 text-slate-400"
        >
          <Bell className="h-5 w-5" />
        </button>

        {/* Profile Dropdown */}
        <div
          ref={profileRef}
          className="relative border-l border-slate-200 pl-3 sm:pl-4"
        >
          <button
            type="button"
            onClick={() => {
              setProfileOpen((value) => !value);
              setLogoutError("");
            }}
            aria-label="Open account menu"
            aria-expanded={profileOpen}
            aria-haspopup="menu"
            className="flex min-h-11 items-center gap-2 rounded-xl px-1 py-1 text-left transition-colors hover:bg-slate-100 sm:gap-3 sm:px-2"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50">
              <CircleUserRound className="h-7 w-7 text-blue-600" />
            </div>

            <div className="hidden max-w-44 sm:block">
              <p className="truncate text-sm font-semibold text-slate-900">
                {displayName}
              </p>

              <p className="truncate text-xs text-slate-500">
                {email}
              </p>
            </div>

            <ChevronDown
              className={`h-4 w-4 text-slate-400 transition-transform ${
                profileOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Dropdown Menu */}
          {profileOpen && (
            <div
              role="menu"
              aria-label="Account menu"
              className="absolute right-0 top-full z-50 mt-2 w-[min(85vw,300px)] overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl"
            >
              {/* Account Information */}
              <div className="border-b border-slate-100 px-3 py-3">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {displayName}
                </p>

                <p className="mt-1 truncate text-xs text-slate-500">
                  {email}
                </p>

                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Signed In
                </div>
              </div>

              {/* Logout */}
              <button
                type="button"
                role="menuitem"
                onClick={() => void handleSignOut()}
                disabled={signingOut}
                className="mt-2 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {signingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}

                {signingOut
                  ? "Signing Out..."
                  : "Sign Out"}
              </button>

              {logoutError && (
                <p
                  role="alert"
                  className="px-3 py-2 text-xs leading-5 text-red-600"
                >
                  {logoutError}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
