"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Editor from "@monaco-editor/react";
import { submitCodingAnswer } from "./actions";
import { Play, RotateCcw, CheckCircle2, XCircle, Code2, Terminal, AlertTriangle, Layers } from "lucide-react";

const LANGUAGES = [
    { label: "Python 3", value: "python" },
    { label: "Java 17", value: "java" },
    { label: "C++17", value: "cpp" },
    { label: "JavaScript (Node.js)", value: "javascript" },
] as const;

type Language = (typeof LANGUAGES)[number]["value"];

type SubmissionResult = {
    passed: number;
    total: number;
    testResults: { passed: boolean }[];
};

const STARTER_CODE: Record<Language, string> = {
    python: `def solution():
    # Write your solution here
    pass

if __name__ == "__main__":
    solution()
`,
    java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        // Write your solution here
    }
}
`,
    cpp: `#include <bits/stdc++.h>
using namespace std;

int main() {
    // Write your solution here
    return 0;
}
`,
    javascript: `function solution() {
    // Write your solution here
}

solution();
`,
};

export default function CodeEditor({
    token,
    questionId,
}: {
    token: string;
    questionId: string;
}) {
    const router = useRouter();

    const [language, setLanguage] = useState<Language>("python");
    const [codeByLanguage, setCodeByLanguage] =
        useState<Record<Language, string>>(STARTER_CODE);

    const [error, setError] = useState("");
    const [result, setResult] = useState<SubmissionResult | null>(null);
    const [isPending, startTransition] = useTransition();

    const currentCode = codeByLanguage[language];

    function handleLanguageChange(value: Language) {
        setLanguage(value);
        setError("");
        setResult(null);
    }

    function handleCodeChange(value: string | undefined) {
        setCodeByLanguage((previous) => ({
            ...previous,
            [language]: value ?? "",
        }));
    }

    function resetCode() {
        if (window.confirm("Reset the current editor to its starter code?")) {
            setCodeByLanguage((previous) => ({
                ...previous,
                [language]: STARTER_CODE[language],
            }));

            setError("");
            setResult(null);
        }
    }

    function handleSubmit() {
        setError("");
        setResult(null);

        if (!currentCode.trim()) {
            setError("Please write your solution before submitting.");
            return;
        }

        startTransition(async () => {
            try {
                const response = await submitCodingAnswer(
                    token,
                    questionId,
                    language,
                    currentCode
                );

                if (!response.success) {
                    setError(
                        "error" in response
                            ? response.error ?? "Unable to submit your code."
                            : "Unable to submit your code."
                    );
                    return;
                }

                const executionResult = response as {
                    passed?: number;
                    total?: number;
                    testResults?: { passed: boolean }[];
                };

                if (
                    typeof executionResult.passed === "number" &&
                    typeof executionResult.total === "number" &&
                    Array.isArray(executionResult.testResults)
                ) {
                    setResult({
                        passed: executionResult.passed,
                        total: executionResult.total,
                        testResults: executionResult.testResults,
                    });
                }

                router.refresh();
            } catch {
                setError(
                    "Something went wrong while submitting your code. Please try again."
                );
            }
        });
    }

    return (
        <section className="space-y-4">
            {/* Editor Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-indigo-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Sandboxed Code Runner
                    </span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <select
                        value={language}
                        onChange={(event) =>
                            handleLanguageChange(
                                event.target.value as Language
                            )
                        }
                        disabled={isPending}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
                        aria-label="Programming language"
                    >
                        {LANGUAGES.map((item) => (
                            <option key={item.value} value={item.value}>
                                {item.label}
                            </option>
                        ))}
                    </select>

                    <button
                        type="button"
                        onClick={resetCode}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50"
                    >
                        <RotateCcw className="h-3 w-3 text-slate-400" />
                        Reset
                    </button>
                </div>
            </div>

            {/* Monaco Editor Frame */}
            <div className="overflow-hidden rounded-2xl border border-slate-800 shadow-md">
                <div className="flex items-center justify-between bg-slate-900 px-4 py-2 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-500/80"></span>
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-500/80"></span>
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80"></span>
                        <span className="ml-2 text-xs font-mono text-slate-400">solution.{language === "python" ? "py" : language === "java" ? "java" : language === "cpp" ? "cpp" : "js"}</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">Isolated Linux Container</span>
                </div>

                <Editor
                    height="460px"
                    language={language}
                    value={currentCode}
                    onChange={handleCodeChange}
                    theme="vs-dark"
                    options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: "on",
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        tabSize: 4,
                        wordWrap: "on",
                        padding: { top: 16 },
                    }}
                />
            </div>

            {/* Error Banner */}
            {error && (
                <div
                    role="alert"
                    className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50/90 p-4 text-xs text-rose-800 shadow-xs"
                >
                    <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                        <p className="font-bold">Execution Error</p>
                        <p className="mt-0.5 whitespace-pre-wrap">{error}</p>
                    </div>
                </div>
            )}

            {/* Execution Result Box */}
            {result && (
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div>
                            <h4 className="text-sm font-bold text-slate-900">
                                Docker Test Execution
                            </h4>
                            <p className="text-xs text-slate-500">
                                {result.passed} of {result.total} test cases passed
                            </p>
                        </div>

                        <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${
                                result.passed === result.total
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                    : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                        >
                            {result.passed === result.total ? (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : (
                                <AlertTriangle className="h-3.5 w-3.5" />
                            )}
                            {result.passed === result.total
                                ? "All Tests Passed"
                                : "Partial Success"}
                        </span>
                    </div>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {result.testResults.map((test, index) => (
                            <div
                                key={index}
                                className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs font-semibold ${
                                    test.passed
                                        ? "border-emerald-100 bg-emerald-50/50 text-emerald-800"
                                        : "border-rose-100 bg-rose-50/50 text-rose-800"
                                }`}
                            >
                                <span className="font-mono">Test Case {index + 1}</span>

                                <span className="flex items-center gap-1">
                                    {test.passed ? (
                                        <>
                                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                            <span>Passed</span>
                                        </>
                                    ) : (
                                        <>
                                            <XCircle className="h-3.5 w-3.5 text-rose-600" />
                                            <span>Failed</span>
                                        </>
                                    )}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Bottom Actions */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <p className="text-xs text-slate-400">
                    Source code executes automatically against hidden unit tests inside a secure Docker container.
                </p>

                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isPending}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-indigo-100 transition hover:bg-indigo-700 active:scale-98 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    <Play className="h-4 w-4 fill-current" />
                    {isPending ? "Executing in Docker..." : "Run and Submit Solution"}
                </button>
            </div>
        </section>
    );
}
