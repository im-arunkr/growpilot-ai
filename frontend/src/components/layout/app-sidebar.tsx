
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ChartNoAxesCombined,
  Users,
  Bot,
  ClipboardCheck,
  Lightbulb,
  History,
  Settings,
  Sprout,
  X,
} from "lucide-react";

interface AppSidebarProps {
  mobile?: boolean;
  onClose?: () => void;
}

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Analytics", href: "/analytics", icon: ChartNoAxesCombined },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "AI Agent", href: "/agent", icon: Bot },
  { name: "Approvals", href: "/approvals", icon: ClipboardCheck },
  { name: "AI Insights", href: "/insights", icon: Lightbulb },
  { name: "History", href: "/history", icon: History },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function AppSidebar({
  mobile = false,
  onClose,
}: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={
        mobile
          ? "flex h-full w-full flex-col bg-white"
          : "hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:sticky lg:top-0 lg:flex"
      }
    >
      <div className="flex h-20 shrink-0 items-center justify-between border-b border-slate-100 px-5">
        <Link
          href="/"
          onClick={onClose}
          className="flex items-center gap-3"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
            <Sprout className="h-6 w-6" />
          </div>

          <div>
            <h1 className="text-lg font-bold text-slate-900">
              GrowPilot AI
            </h1>
            <p className="text-xs text-slate-500">
              Business Growth Agent
            </p>
          </div>
        </Link>

        {mobile && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <nav
        aria-label="Main navigation"
        className="flex-1 space-y-1 overflow-y-auto px-3 py-5"
      >
        {navigation.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/" &&
              pathname.startsWith(item.href + "/"));

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 border-t border-slate-100 p-4">
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">
            AI Agent
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Local AI configured
          </p>
        </div>
      </div>
    </aside>
  );
}
