
import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { addQuestion, toggleQuestionStatus } from "./actions";
import {
  BookOpen,
  PlusCircle,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Layers,
  Code2,
} from "lucide-react";

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
    <div className="space-y-8">
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Failed to load questions: {error.message}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Questions" value={questions.length} />
        <StatCard label="Active in Bank" value={activeCount} badge="Ready" />
        <StatCard label="Inactive" value={inactiveCount} />
        <StatCard label="Hard Challenge" value={difficultyCount.Hard} />
      </div>

      {/* Difficulty Breakdown Pill Row */}
      <div className="grid grid-cols-3 gap-3">
        <DifficultyCard label="Easy" value={difficultyCount.Easy} color="text-emerald-600 bg-emerald-50 border-emerald-100" />
        <DifficultyCard label="Medium" value={difficultyCount.Medium} color="text-amber-600 bg-amber-50 border-amber-100" />
        <DifficultyCard label="Hard" value={difficultyCount.Hard} color="text-rose-600 bg-rose-50 border-rose-100" />
      </div>

      {/* Add a Question Card */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <PlusCircle className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Create Question
            </h2>
            <p className="text-xs text-slate-400">
              Add technical problems to DSA, Core CS, or Coding rounds
            </p>
          </div>
        </div>

        <form action={addQuestion} className="mt-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Category" name="category" placeholder="e.g. DSA or Core CS" required />
            <FormField label="Topic" name="topic" placeholder="e.g. Arrays, OS, Networks" required />

            <div>
              <label htmlFor="difficulty" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
                Difficulty <span className="text-rose-500">*</span>
              </label>
              <select
                id="difficulty"
                name="difficulty"
                required
                defaultValue="Medium"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-600 focus:bg-white focus:ring-3 focus:ring-indigo-100"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="question" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
              Question Prompt <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="question"
              name="question"
              rows={3}
              required
              placeholder="Enter the full technical question prompt..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-600 focus:bg-white focus:ring-3 focus:ring-indigo-100"
            />
          </div>

          <div>
            <label htmlFor="expectedAnswer" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
              Expected Answer / Evaluation Criteria <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="expectedAnswer"
              name="expectedAnswer"
              rows={3}
              required
              placeholder="Describe the expected technical answer, key concepts, and nuances..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-600 focus:bg-white focus:ring-3 focus:ring-indigo-100"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              label="Time Complexity"
              name="timeComplexity"
              placeholder="e.g. O(n log n)"
            />
            <FormField
              label="Space Complexity"
              name="spaceComplexity"
              placeholder="e.g. O(1)"
            />
            <div>
              <label htmlFor="marks" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
                Marks / Weight <span className="text-rose-500">*</span>
              </label>
              <input
                id="marks"
                name="marks"
                type="number"
                min="1"
                max="100"
                defaultValue="10"
                required
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-600 focus:bg-white focus:ring-3 focus:ring-indigo-100"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-100 transition hover:bg-indigo-700 active:scale-98"
            >
              <PlusCircle className="h-4 w-4" />
              Add to Question Bank
            </button>
          </div>
        </form>
      </section>

      {/* Questions Table */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-bold text-slate-900">
            Available Assessment Questions
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Live technical questions currently configured in Supabase.
          </p>
        </div>

        {questions.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-400">
            No questions configured yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/75 text-xs font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-6 py-3.5">Question</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">Topic</th>
                  <th className="px-6 py-3.5">Difficulty</th>
                  <th className="px-6 py-3.5">Marks</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {questions.map((question) => (
                  <tr key={question.id} className="align-top transition-colors hover:bg-slate-50/70">
                    <td className="max-w-md px-6 py-4 font-medium text-slate-900">
                      <p className="line-clamp-2 leading-6">{question.question}</p>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-700">
                      <span className="rounded-md bg-slate-100 px-2 py-1">
                        {question.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 font-medium">
                      {question.topic}
                    </td>
                    <td className="px-6 py-4">
                      <DifficultyBadge difficulty={question.difficulty} />
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-800">
                      {question.marks} pts
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                          question.is_active
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-100 text-slate-600"
                        }`}
                      >
                        {question.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <form
                        action={toggleQuestionStatus.bind(
                          null,
                          question.id,
                          !question.is_active
                        )}
                      >
                        <button
                          type="submit"
                          className={`whitespace-nowrap rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                            question.is_active
                              ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                              : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
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
      <label htmlFor={name} className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-600">
        {label} {required && <span className="text-rose-500">*</span>}
      </label>
      <input
        id={name}
        name={name}
        required={required}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-600 focus:bg-white focus:ring-3 focus:ring-indigo-100"
      />
    </div>
  );
}

function StatCard({ label, value, badge }: { label: string; value: number; badge?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:shadow-md">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
        {badge && (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            {badge}
          </span>
        )}
      </div>
      <p className="mt-2 text-3xl font-extrabold text-slate-900">{value}</p>
    </div>
  );
}

function DifficultyCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`rounded-xl border p-4 text-center ${color}`}>
      <p className="text-xs font-bold uppercase tracking-wider">{label}</p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
    </div>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const styles: Record<string, string> = {
    Easy: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Medium: "bg-amber-50 text-amber-700 border-amber-200",
    Hard: "bg-rose-50 text-rose-700 border-rose-200",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
        styles[difficulty] ?? "bg-slate-100 text-slate-700 border-slate-200"
      }`}
    >
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
      <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-sm font-medium text-emerald-800 shadow-xs">
        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
        <span>Question added successfully to the repository.</span>
      </div>
    );
  }

  if (params.success === "updated") {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3.5 text-sm font-medium text-emerald-800 shadow-xs">
        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
        <span>Question status updated successfully.</span>
      </div>
    );
  }

  if (params.error) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 text-sm font-medium text-rose-800 shadow-xs">
        <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
        <span>{params.error}</span>
      </div>
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
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
            <BookOpen className="h-3 w-3" />
            Evaluation Criteria
          </span>
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Question Bank
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Configure DSA algorithms, Core CS systems concepts, and interactive coding prompts.
        </p>
      </div>

      <Suspense fallback={null}>
        <QuestionMessages searchParams={searchParams} />
      </Suspense>

      <Suspense
        fallback={
          <div className="py-12 text-center text-sm text-slate-400">
            Loading question bank...
          </div>
        }
      >
        <QuestionsList />
      </Suspense>
    </div>
  );
}
