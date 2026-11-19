"use client";

import { useRouter } from "next/navigation";
import { LogOut, Shield, Bell } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

export default function Header() {
  const router = useRouter();

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert("Sign out failed. Please try again.");
      return;
    }

    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200/80 bg-white/95 px-6 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50/70 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
          <Shield className="h-3 w-3 text-indigo-600" />
          Admin Portal
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 border-r border-slate-200 pr-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700 border border-slate-200">
            AD
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-bold text-slate-800 leading-none">Interviewer Admin</p>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">superadmin</p>
          </div>
        </div>

        <button
          onClick={handleSignOut}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-xs transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
        >
          <LogOut className="h-3.5 w-3.5 text-slate-400" />
          <span>Sign out</span>
        </button>
      </div>
    </header>
  );
}
