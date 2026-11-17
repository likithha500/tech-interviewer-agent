
"use client";

import { useRouter } from "next/navigation";
import { User } from "lucide-react";
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
    <header className="flex items-center justify-between border-b border-surface bg-white p-4">
      <h1 className="text-xl font-semibold text-primary">
        Tech Interviewer Admin
      </h1>

      <div className="flex items-center gap-3">
        <User className="h-5 w-5" />
        <span>Admin</span>

        <button
          onClick={handleSignOut}
          className="text-sm text-primary underline"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
