
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function LoginPage() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleLogin(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
            return;
        }

        const { data: userData, error: userError } =
            await supabase.auth.getUser();

        if (userError || userData.user?.app_metadata?.role !== "admin") {
            await supabase.auth.signOut();
            setError("Access denied. Admin account required.");
            setLoading(false);
            return;
        }

        router.replace("/");
        router.refresh();
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
            <form
                onSubmit={handleLogin}
                className="w-full max-w-md space-y-5 rounded-xl border bg-white p-8 shadow-sm"
            >
                <div>
                    <h1 className="text-2xl font-bold text-primary">
                        Tech Interviewer
                    </h1>
                    <p className="mt-2 text-sm text-gray-500">
                        Admin Portal — Sign in to continue
                    </p>
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium">Email</label>
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full rounded-md border p-3"
                        placeholder="Admin email"
                    />
                </div>

                <div>
                    <label className="mb-1 block text-sm font-medium">Password</label>
                    <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-md border p-3"
                        placeholder="Password"
                    />
                </div>

                {error && (
                    <p className="text-sm text-red-600">{error}</p>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-md bg-primary p-3 font-medium text-white disabled:opacity-50"
                >
                    {loading ? "Signing in..." : "Sign in"}
                </button>
            </form>
        </main>
    );
}
