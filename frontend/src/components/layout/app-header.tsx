
"use client";

import {
  Bell,
  CircleUserRound,
  Menu,
} from "lucide-react";

interface AppHeaderProps {
  onMenuClick: () => void;
}

export function AppHeader({
  onMenuClick,
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur-sm sm:px-6 lg:min-h-20 xl:px-8">
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

      <div className="flex shrink-0 items-center gap-2 sm:gap-4">
        <button
          type="button"
          disabled
          title="Notifications coming soon"
          aria-label="Notifications coming soon"
          className="rounded-lg p-2 text-slate-400"
        >
          <Bell className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 border-l border-slate-200 pl-3 sm:pl-4">
          <CircleUserRound className="h-8 w-8 text-slate-500" />

          <div className="hidden sm:block">
            <p className="text-sm font-medium text-slate-900">
              Demo Owner
            </p>
            <p className="text-xs text-slate-500">
              Local demo
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
