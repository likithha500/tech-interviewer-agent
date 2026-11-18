
import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { addQuestion, toggleQuestionStatus } from "./actions";

interface Question {
  id: string;
  category: string;
  topic: string;
  difficulty: "Easy" | "Medium" | "Hard";
  question: string;
  marks: number;
  is_active: boolean;
}

async function QuestionsList() {
  await connection();

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("questions")
    .select("id, category, topic, difficulty, question, marks, is_active")
    .order("created_at", { ascending: false });

  const questions = (data ?? []) as Question[];

  const activeCount = questions.filter((q) => q.is_active).length;
  const inactiveCount = questions.length - activeCount;

  const difficultyCount = {
    Easy: questions.filter((q) => q.difficulty === "Easy").length,
    Medium: questions.filter((q) => q.difficulty === "Medium").length,
    Hard: questions.filter((q) => q.difficulty === "Hard").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Question Bank
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage technical questions used in candidate interviews.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          Failed to load questions: {error.message}
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Questions" value={questions.length} />
        <StatCard label="Active Questions" value={activeCount} />
        <StatCard label="Inactive Questions" value={inactiveCount} />
        <StatCard label="Hard Questions" value={difficultyCount.Hard} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <DifficultyCard label="Easy" value={difficultyCount.Easy} />
        <DifficultyCard label="Medium" value={difficultyCount.Medium} />
        <DifficultyCard label="Hard" value={difficultyCount.Hard} />
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">
          Add a Question
        </h2>

        <form action={addQuestion} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Category" name="category" placeholder="e.g. DSA" required />
            <FormField label="Topic" name="topic" placeholder="e.g. Arrays" required />

            <div>
              <label htmlFor="difficulty" className="mb-2 block text-sm font-medium text-gray-700">
                Difficulty
              </label>
              <select
                id="difficulty"
                name="difficulty"
                required
                defaultValue="Medium"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="question" className="mb-2 block text-sm font-medium text-gray-700">
              Question
            </label>
            <textarea
              id="question"
              name="question"
              rows={3}
              required
              placeholder="Enter the interview question..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="expectedAnswer" className="mb-2 block text-sm font-medium text-gray-700">
              Expected Answer / Evaluation Reference
            </label>
            <textarea
              id="expectedAnswer"
              name="expectedAnswer"
              rows={3}
              required
              placeholder="Describe the expected answer..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              label="Time Complexity"
              name="timeComplexity"
              placeholder="e.g. O(n)"
            />
            <FormField
              label="Space Complexity"
              name="spaceComplexity"
              placeholder="e.g. O(1)"
            />
            <div>
              <label htmlFor="marks" className="mb-2 block text-sm font-medium text-gray-700">
                Marks
              </label>
              <input
                id="marks"
                name="marks"
                type="number"
                min="1"
                max="100"
                defaultValue="10"
                required
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            Add Question
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            All Questions
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            Questions retrieved directly from Supabase.
          </p>
        </div>

        {questions.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-500">
            No questions found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-6 py-3 font-medium">Question</th>
                  <th className="px-6 py-3 font-medium">Category</th>
                  <th className="px-6 py-3 font-medium">Topic</th>
                  <th className="px-6 py-3 font-medium">Difficulty</th>
                  <th className="px-6 py-3 font-medium">Marks</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {questions.map((question) => (
                  <tr key={question.id} className="align-top hover:bg-gray-50">
                    <td className="max-w-md px-6 py-4 font-medium text-gray-900">
                      <p className="line-clamp-3">{question.question}</p>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{question.category}</td>
                    <td className="px-6 py-4 text-gray-600">{question.topic}</td>
                    <td className="px-6 py-4">
                      <DifficultyBadge difficulty={question.difficulty} />
                    </td>
                    <td className="px-6 py-4 text-gray-600">{question.marks}</td>
                    <td className="px-6 py-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${question.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-600"
                        }`}>
                        {question.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <form action={toggleQuestionStatus.bind(
                        null,
                        question.id,
                        !question.is_active
                      )}>
                        <button
                          type="submit"
                          className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-medium ${question.is_active
                              ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              : "bg-green-600 text-white hover:bg-green-700"
                            }`}
                        >
                          {question.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function FormField({
  label,
  name,
  placeholder,
  required = false,
}: {
  label: string;
  name: string;
  placeholder: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-2 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={name}
        name={name}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500"
      />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function DifficultyCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const styles: Record<string, string> = {
    Easy: "bg-green-100 text-green-700",
    Medium: "bg-amber-100 text-amber-700",
    Hard: "bg-red-100 text-red-700",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${styles[difficulty] ?? "bg-gray-100 text-gray-700"
      }`}>
      {difficulty}
    </span>
  );
}

async function QuestionMessages({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const params = await searchParams;

  if (params.success === "added") {
    return (
      <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
        Question added successfully.
      </p>
    );
  }

  if (params.success === "updated") {
    return (
      <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
        Question status updated successfully.
      </p>
    );
  }

  if (params.error) {
    return (
      <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
        {params.error}
      </p>
    );
  }

  return null;
}

export default function QuestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  return (
    <div className="space-y-4">
      <Suspense fallback={<p className="text-sm text-gray-500">Loading messages...</p>}>
        <QuestionMessages searchParams={searchParams} />
      </Suspense>

      <Suspense fallback={<p className="text-sm text-gray-500">Loading question bank...</p>}>
        <QuestionsList />
      </Suspense>
    </div>
  );
}
