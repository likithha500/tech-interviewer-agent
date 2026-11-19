
import { connection } from "next/server";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function AdminLayout({
    children,
}: {
    children: ReactNode;
}) {
    await connection();

    const supabase = await createClient();

    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error || !user || user.app_metadata?.role !== "admin") {
        redirect("/login");
    }

    return (
        <div className="flex min-h-screen w-full bg-slate-50/50 text-slate-800">
            <aside className="sticky top-0 h-screen shrink-0 z-40">
                <Sidebar />
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
                <Header />

                <main className="min-h-0 flex-1 overflow-auto p-6 md:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
}
