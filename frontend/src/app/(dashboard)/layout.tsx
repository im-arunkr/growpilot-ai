
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { useAuth } from "@/providers/auth-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  const pathname = usePathname();
  const router = useRouter();

  const { user, loading } = useAuth();

  // Redirect unauthenticated users to Login.
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  // Close mobile navigation on route changes.
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Manage mobile menu keyboard and body scroll.
  useEffect(() => {
    if (!mobileMenuOpen || loading || !user) {
      return;
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;

      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [mobileMenuOpen, loading, user]);

  // Close mobile menu when switching to desktop.
  useEffect(() => {
    function closeOnDesktop() {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    }

    window.addEventListener("resize", closeOnDesktop);

    return () => {
      window.removeEventListener(
        "resize",
        closeOnDesktop
      );
    };
  }, []);

  // Wait until Supabase restores the session.
  if (loading) {
    return (
      <div
        role="status"
        className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-slate-50"
      >
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />

        <p className="text-sm font-medium text-slate-600">
          Verifying your session...
        </p>
      </div>
    );
  }

  // Prevent protected UI from rendering before redirect.
  if (!user) {
    return (
      <div
        role="status"
        className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-slate-50"
      >
        <ShieldCheck className="h-8 w-8 text-blue-600" />

        <p className="text-sm font-medium text-slate-600">
          Redirecting to sign in...
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh bg-slate-50">
      {/* Desktop Sidebar */}
      <AppSidebar />

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          id="mobile-navigation"
          role="dialog"
          aria-modal="true"
          aria-label="Mobile navigation"
        >
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileMenuOpen(false)}
            className="absolute inset-0 bg-slate-950/50"
          />

          <div className="absolute inset-y-0 left-0 w-[min(85vw,288px)] shadow-xl">
            <AppSidebar
              mobile
              onClose={() => setMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex min-h-dvh min-w-0 flex-1 flex-col">
        <AppHeader
          onMenuClick={() => setMobileMenuOpen(true)}
        />

        <main
          id="main-content"
          className="flex-1 p-4 sm:p-6 lg:p-8"
        >
          <div className="mx-auto w-full max-w-[1600px] min-w-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
