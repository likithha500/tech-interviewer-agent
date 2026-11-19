
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Editor from "@monaco-editor/react";
import { submitCodingAnswer } from "./actions";

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
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h3 className="font-semibold text-gray-900">
                        Online Code Editor
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                        Write your solution in your preferred language.
                    </p>
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
                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500"
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
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    >
                        Reset code
                    </button>
                </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-gray-700">
                <Editor
                    height="480px"
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

            {error && (
                <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                    <p className="font-semibold">Submission failed</p>
                    <p className="mt-1 whitespace-pre-wrap">{error}</p>
                </div>
            )}

            {result && (
                <div className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <h4 className="font-semibold text-gray-900">
                                Execution Results
                            </h4>
                            <p className="mt-1 text-sm text-gray-600">
                                {result.passed} of {result.total} test cases passed
                            </p>
                        </div>

                        <span
                            className={`rounded-full px-3 py-1 text-sm font-semibold ${result.passed === result.total
                                ? "bg-green-100 text-green-700"
                                : "bg-amber-100 text-amber-700"
                                }`}
                        >
                            {result.passed === result.total
                                ? "All tests passed"
                                : "Some tests failed"}
                        </span>
                    </div>

                    <div className="mt-4 space-y-2">
                        {result.testResults.map((test, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                            >
                                <span className="text-sm text-gray-700">
                                    Test case {index + 1}
                                </span>

                                <span
                                    className={`text-sm font-semibold ${test.passed
                                        ? "text-green-700"
                                        : "text-red-700"
                                        }`}
                                >
                                    {test.passed ? "Passed" : "Failed"}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-gray-500">
                    Your selected language and source code will be submitted
                    and evaluated against hidden test cases.
                </p>

                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={isPending}
                    className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {isPending ? "Executing..." : "Run and Submit"}
                </button>
            </div>
        </section>
    );
}
