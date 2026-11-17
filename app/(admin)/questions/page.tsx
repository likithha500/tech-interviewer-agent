
"use client";

import { useEffect, useMemo, useState } from "react";
import { Question } from "@/types";
import { supabase } from "@/lib/supabase/client";

interface QuestionDetails extends Question {
  question: string;
  expected_answer: string | null;
}

export default function QuestionsPage() {
  const [questions, setQuestions] = useState<QuestionDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [difficulty, setDifficulty] = useState("All");
  const [selectedQuestion, setSelectedQuestion] =
    useState<string | null>(null);

  useEffect(() => {
    async function fetchQuestions() {
      const { data, error } = await supabase
        .from("questions")
        .select(
          "id, category, topic, difficulty, marks, question, expected_answer"
        )
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) {
        setError(error.message);
      } else {
        setQuestions((data ?? []) as QuestionDetails[]);
      }

      setLoading(false);
    }

    fetchQuestions();
  }, []);

  const categories = useMemo(
    () => ["All", ...new Set(questions.map((q) => q.category))],
    [questions]
  );

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      const matchesCategory =
        category === "All" || q.category === category;

      const matchesDifficulty =
        difficulty === "All" || q.difficulty === difficulty;

      const searchText = search.toLowerCase();

      const matchesSearch =
        q.topic.toLowerCase().includes(searchText) ||
        q.question.toLowerCase().includes(searchText) ||
        q.category.toLowerCase().includes(searchText);

      return matchesCategory && matchesDifficulty && matchesSearch;
    });
  }, [questions, category, difficulty, search]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="mb-2 text-2xl font-semibold text-primary">
        Question Bank
      </h1>

      <p className="mb-6 text-sm text-gray-600">
        Manage and explore your interview questions.
      </p>

      {loading && <p>Loading questions...</p>}

      {error && (
        <p className="text-red-600">
          Failed to load questions: {error}
        </p>
      )}

      {!loading && !error && (
        <>
          <div className="mb-5 grid grid-cols-1 gap-4 rounded-lg border bg-white p-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">
                Search questions
              </label>
              <input
                type="text"
                placeholder="Search by topic or question..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-md border bg-white px-3 py-2 text-sm"
              >
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                Difficulty
              </label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full rounded-md border bg-white px-3 py-2 text-sm"
              >
                {["All", "Easy", "Medium", "Hard"].map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Showing <strong>{filteredQuestions.length}</strong> of{" "}
              <strong>{questions.length}</strong> questions
            </p>

            <button
              onClick={() => {
                setSearch("");
                setCategory("All");
                setDifficulty("All");
                setSelectedQuestion(null);
              }}
              className="text-sm font-medium text-blue-700 hover:underline"
            >
              Clear filters
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-surface">
                <tr>
                  {["Category", "Topic", "Difficulty", "Marks", "Details"].map(
                    (heading) => (
                      <th
                        key={heading}
                        className="px-4 py-3 text-left text-sm font-medium text-gray-700"
                      >
                        {heading}
                      </th>
                    )
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {filteredQuestions.map((q) => (
                  <tr key={q.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{q.category}</td>
                    <td className="px-4 py-3 text-sm">{q.topic}</td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${q.difficulty === "Easy"
                            ? "bg-green-100 text-green-700"
                            : q.difficulty === "Medium"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}
                      >
                        {q.difficulty}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{q.marks}</td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() =>
                          setSelectedQuestion(
                            selectedQuestion === q.id ? null : q.id
                          )
                        }
                        className="font-medium text-blue-700 hover:underline"
                      >
                        {selectedQuestion === q.id ? "Close" : "View"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredQuestions.length === 0 && (
              <p className="p-6 text-center text-sm text-gray-500">
                No questions match your filters.
              </p>
            )}
          </div>

          {selectedQuestion && (
            <div className="mt-5 rounded-lg border bg-white p-5">
              {(() => {
                const q = questions.find(
                  (item) => item.id === selectedQuestion
                );

                if (!q) return null;

                return (
                  <>
                    <div className="mb-3 flex items-center justify-between">
                      <h2 className="text-lg font-semibold">
                        {q.topic} — {q.difficulty}
                      </h2>
                      <button
                        onClick={() => setSelectedQuestion(null)}
                        className="text-sm text-gray-500 hover:text-black"
                      >
                        Close
                      </button>
                    </div>

                    <p className="mb-2 text-sm font-medium">
                      Interview Question
                    </p>
                    <p className="mb-5 whitespace-pre-wrap text-sm text-gray-700">
                      {q.question}
                    </p>

                    <p className="mb-2 text-sm font-medium">
                      Expected Answer
                    </p>
                    <p className="whitespace-pre-wrap text-sm text-gray-700">
                      {q.expected_answer || "No expected answer provided."}
                    </p>
                  </>
                );
              })()}
            </div>
          )}
        </>
      )}
    </div>
  );
}

