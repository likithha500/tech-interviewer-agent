
"use client";

import { useEffect, useState } from "react";
import Table from "@/components/Table";
import { Question } from "@/types";
import { supabase } from "@/lib/supabase/client";

export default function QuestionsPage() {
    const [questions, setQuestions] = useState<Question[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function fetchQuestions() {
            const { data, error } = await supabase
                .from("questions")
                .select("id, category, topic, difficulty, marks")
                .eq("is_active", true)
                .order("created_at", { ascending: false });

            if (error) {
                console.error("Supabase error:", error);
                setError(error.message);
            } else {
                console.log("Questions fetched:", data?.length);
                console.log("Question records:", data);
                setQuestions(data ?? []);
            }

            setLoading(false);
        }

        fetchQuestions();
    }, []);

    const columns = [
        { header: "Category", accessor: "category" as keyof Question },
        { header: "Topic", accessor: "topic" as keyof Question },
        { header: "Difficulty", accessor: "difficulty" as keyof Question },
        { header: "Marks", accessor: "marks" as keyof Question },
    ];

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <h1 className="mb-4 text-2xl font-semibold text-primary">
                Question Bank
            </h1>

            {loading && <p>Loading questions...</p>}

            {error && (
                <p className="text-red-600">
                    Failed to load questions: {error}
                </p>
            )}

            {!loading && !error && (
                <>
                    <p className="mb-4 text-sm text-gray-600">
                        Total questions: {questions.length}
                    </p>

                    <Table columns={columns} data={questions} />

                    {questions.length === 0 && (
                        <p className="mt-4">No active questions found.</p>
                    )}
                </>
            )}
        </div>
    );
}
