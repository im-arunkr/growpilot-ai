
"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  const pathname = usePathname();

  useEffect(() => {
    if (!mobileMenuOpen) return;

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
  }, [mobileMenuOpen]);

  useEffect(() => {
    const closeOnDesktop = () => {
      if (window.innerWidth >= 1024) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", closeOnDesktop);

    return () => {
      window.removeEventListener(
        "resize",
        closeOnDesktop
      );
    };
  }, []);

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
          key={pathname}
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
