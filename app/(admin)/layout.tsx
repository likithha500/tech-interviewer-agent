
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
        <div className="flex min-h-screen w-full bg-gray-50 text-gray-800">
            <aside className="w-64 shrink-0">
                <Sidebar />
            </aside>

            <div className="flex min-w-0 flex-1 flex-col">
                <Header />

                <main className="min-h-0 flex-1 overflow-auto p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
