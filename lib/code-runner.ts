import "server-only";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import {
    mkdtemp,
    writeFile,
    rm,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

export type CodingLanguage =
    | "python"
    | "java"
    | "cpp"
    | "javascript";

export type TestCase = {
    input: unknown;
    expected_output: unknown;
};

export type TestResult = {
    passed: boolean;
    actualOutput: string;
    expectedOutput: string;
    error?: string;
};

export type ExecutionResult = {
    success: boolean;
    passed: number;
    total: number;
    results: TestResult[];
    error?: string;
};

const RUNTIMES: Record<
    CodingLanguage,
    { image: string; filename: string; command: string }
> = {
    python: {
        image: "python:3.12-slim",
        filename: "main.py",
        command: "python /input/main.py",
    },
    javascript: {
        image: "node:22-slim",
        filename: "main.js",
        command: "node /input/main.js",
    },
    cpp: {
        image: "gcc:14",
        filename: "main.cpp",
        command: "g++ -std=c++17 -O2 /input/main.cpp -o /tmp/main && /tmp/main",
    },
    java: {
        image: "eclipse-temurin:17-jdk",
        filename: "Main.java",
        command: "javac -d /tmp /input/Main.java && java -cp /tmp Main",
    },
};

const TIMEOUT_MS = 5000;
const MAX_OUTPUT_BYTES = 32 * 1024;
const MAX_TEST_CASES = 10;

function normalizeOutput(value: string): string {
    return value.replace(/\r\n/g, "\n").trim();
}

function toInputString(value: unknown): string {
    if (typeof value === "string") {
        return value;
    }

    return JSON.stringify(value ?? "");
}

function toExpectedString(value: unknown): string {
    if (typeof value === "string") {
        return value;
    }

    return JSON.stringify(value ?? "");
}

function runDocker(
    image: string,
    directory: string,
    command: string,
    input: string
): Promise<{ stdout: string; stderr: string; timedOut: boolean; exitCode: number | null }> {
    return new Promise((resolve, reject) => {
        const containerName = `interviewer-${randomUUID()}`;
        const args = [
            "run",
            "--rm",
            "--name",
            containerName,
            "--interactive",
            "--network",
            "none",
            "--memory",
            "128m",
            "--cpus",
            "0.5",
            "--pids-limit",
            "64",
            "--read-only",
            "--tmpfs",
            "/tmp:rw,exec,nosuid,size=64m",
            "--cap-drop",
            "ALL",
            "--security-opt",
            "no-new-privileges",
            "--mount",
            `type=bind,source=${directory},target=/input,readonly`,
            "--workdir",
            "/tmp",
            image,
            "sh",
            "-lc",
            command,
        ];

        const child = spawn("docker", args, {
            stdio: ["pipe", "pipe", "pipe"],
            windowsHide: true,
        });

        let stdout = "";
        let stderr = "";
        let outputBytes = 0;
        let timedOut = false;
        let settled = false;

        const timeout = setTimeout(() => {
            timedOut = true;
            child.kill();

            spawn("docker", ["rm", "-f", containerName], {
                stdio: "ignore",
                windowsHide: true,
            });
        }, TIMEOUT_MS);

        const finish = (result: {
            stdout: string;
            stderr: string;
            timedOut: boolean;
            exitCode: number | null;
        }) => {
            if (settled) return;
            settled = true;
            clearTimeout(timeout);
            resolve(result);
        };

        child.stdout.on("data", (chunk: Buffer) => {
            outputBytes += chunk.length;
            if (outputBytes <= MAX_OUTPUT_BYTES) {
                stdout += chunk.toString();
            } else {
                child.kill();

                spawn("docker", ["rm", "-f", containerName], {
                    stdio: "ignore",
                    windowsHide: true,
                });
            }
        });

        child.stderr.on("data", (chunk: Buffer) => {
            outputBytes += chunk.length;
            if (outputBytes <= MAX_OUTPUT_BYTES) {
                stderr += chunk.toString();
            } else {
                child.kill();
            }
        });

        child.on("error", (error) => {
            if (settled) return;
            settled = true;
            clearTimeout(timeout);
            reject(error);
        });

        child.on("close", (exitCode) => {
            finish({
                stdout,
                stderr,
                timedOut,
                exitCode,
            });
        });

        child.stdin.on("error", () => {
            // The process may close stdin before consuming all input.
        });

        child.stdin.end(input);
    });
}

export async function executeCode(
    language: CodingLanguage,
    sourceCode: string,
    testCases: TestCase[]
): Promise<ExecutionResult> {
    if (!Object.prototype.hasOwnProperty.call(RUNTIMES, language)) {
        return {
            success: false,
            passed: 0,
            total: 0,
            results: [],
            error: "Unsupported programming language.",
        };
    }

    if (!sourceCode.trim() || sourceCode.length > 18000) {
        return {
            success: false,
            passed: 0,
            total: 0,
            results: [],
            error: "Invalid or oversized source code.",
        };
    }

    if (
        !Array.isArray(testCases) ||
        testCases.length === 0 ||
        testCases.length > MAX_TEST_CASES
    ) {
        return {
            success: false,
            passed: 0,
            total: 0,
            results: [],
            error: "Invalid test cases.",
        };
    }

    const runtime = RUNTIMES[language];
    let directory: string | undefined;

    try {
        directory = await mkdtemp(
            path.join(tmpdir(), "interviewer-code-")
        );

        const sourcePath = path.join(directory, runtime.filename);

        await writeFile(sourcePath, sourceCode, {
            encoding: "utf8",
            mode: 0o600,
        });

        const results: TestResult[] = [];
        let passed = 0;

        for (const testCase of testCases) {
            const expectedOutput = toExpectedString(
                testCase.expected_output
            );

            try {
                const execution = await runDocker(
                    runtime.image,
                    directory,
                    runtime.command,
                    toInputString(testCase.input)
                );

                if (execution.timedOut) {
                    results.push({
                        passed: false,
                        actualOutput: "",
                        expectedOutput,
                        error: "Execution timed out.",
                    });
                    continue;
                }

                if (execution.exitCode !== 0) {
                    results.push({
                        passed: false,
                        actualOutput: normalizeOutput(execution.stdout),
                        expectedOutput,
                        error: execution.stderr.slice(0, 2000) ||
                            "Program exited with an error.",
                    });
                    continue;
                }

                const actualOutput = normalizeOutput(execution.stdout);
                const normalizedExpected = normalizeOutput(expectedOutput);
                const isPassed = actualOutput === normalizedExpected;

                if (isPassed) passed++;

                results.push({
                    passed: isPassed,
                    actualOutput,
                    expectedOutput,
                });
            } catch (error) {
                results.push({
                    passed: false,
                    actualOutput: "",
                    expectedOutput,
                    error: error instanceof Error
                        ? error.message
                        : "Execution failed.",
                });
            }
        }

        return {
            success: true,
            passed,
            total: testCases.length,
            results,
        };
    } catch (error) {
        console.error("Code execution setup failed:", error);

        return {
            success: false,
            passed: 0,
            total: testCases.length,
            results: [],
            error: "Unable to start the code execution environment.",
        };
    } finally {
        if (directory) {
            await rm(directory, {
                recursive: true,
                force: true,
            }).catch((error) => {
                console.error("Temporary directory cleanup failed:", error);
            });
        }
    }
}