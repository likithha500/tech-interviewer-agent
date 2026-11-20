"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  BookOpen,
  BarChart3,
  Bot,
  Layers,
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();

  const menu = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/candidates", label: "Candidates", icon: Users },
    { href: "/interviews", label: "Interviews", icon: Briefcase },
    { href: "/questions", label: "Question Bank", icon: BookOpen },
    { href: "/reports", label: "Reports & Review", icon: BarChart3 },
    { href: "/demo-ats", label: "Demo ATS", icon: Layers },
  ];

  return (
    <aside className="flex h-screen w-64 flex-col border-r border-slate-200/80 bg-white shadow-xs">
      {/* Brand Header */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-100">
          <Bot className="h-5 w-5" />
        </div>
        <div>
          <span className="block text-base font-bold tracking-tight text-slate-900">
            AutoRecruit AI
          </span>
          <span className="block text-xs font-medium text-slate-400">
            Technical Assessment
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1.5 p-4">
        <p className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Main Menu
        </p>
        <ul className="space-y-1">
          {menu.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname?.startsWith(item.href);

            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  prefetch={false}
                  className={`group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-indigo-50/80 text-indigo-700 shadow-xs"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <Icon
                    className={`h-4.5 w-4.5 transition-colors ${
                      isActive
                        ? "text-indigo-600"
                        : "text-slate-400 group-hover:text-slate-600"
                    }`}
                  />
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-600" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer / System Status */}
      <div className="border-t border-slate-100 p-4">
        <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold text-slate-700">
              Agent System Active
            </span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Groq AI & Docker Code Sandbox
          </p>
        </div>
      </div>
    </aside>
  );
}
