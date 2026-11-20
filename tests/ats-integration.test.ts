/**
 * tests/ats-integration.test.ts
 */

// Mock server-only before importing providers in test environment
import Module from "node:module";
const originalRequire = Module.prototype.require;
Module.prototype.require = function (id: string) {
  if (id === "server-only") return {};
  return originalRequire.apply(this, arguments as any);
};

import { GreenhouseProvider } from "../lib/ats/greenhouse";
import { LeverProvider } from "../lib/ats/lever";
import { ATSSyncPayload } from "../lib/ats/types";

// Mock fetch globally
const originalFetch = global.fetch;

function makeMockPayload(overrides?: Partial<ATSSyncPayload>): ATSSyncPayload {
  return {
    candidateId: "cand-uuid-1",
    candidateName: "John Doe",
    candidateEmail: "john.doe@example.com",
    interviewId: "int-uuid-1",
    overallScore: 85,
    skills: [
      { skill: "DSA", score: 9, maxScore: 10, feedback: "Excellent binary search" },
      { skill: "Core CS", score: 8, maxScore: 10, feedback: "Good OS fundamentals" },
      { skill: "Coding", score: 10, maxScore: 10, feedback: "All test cases passed" },
    ],
    strengths: ["DSA: 9/10", "Coding: 10/10"],
    weaknesses: [],
    aiRecommendation: "Hire",
    humanDecision: "Hire",
    interviewCompletedAt: "2026-11-20T00:00:00.000Z",
    externalCandidateId: "gh-cand-12345",
    externalApplicationId: "gh-app-67890",
    ...overrides,
  };
}

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runTest(name: string, fn: () => Promise<void>) {
  totalTests++;
  try {
    await fn();
    console.log(`✓ [PASS] ${name}`);
    passedTests++;
  } catch (err: any) {
    console.error(`✗ [FAIL] ${name}: ${err.message}`);
  }
}

async function runTestSuite() {
  console.log("=== Starting ATS Integration Test Suite ===");

  // 1. Successful Greenhouse API request
  await runTest("1. Successful Greenhouse API request", async () => {
    process.env.GREENHOUSE_API_KEY = "test_gh_key";
    process.env.GREENHOUSE_ON_BEHALF_OF_USER_ID = "999";
    process.env.GREENHOUSE_API_URL = "https://harvest.greenhouse.io/v1";

    global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      assert(String(input).includes("/candidates/gh-cand-12345/activity_feed/notes"), "Must call correct note path");
      assert(init?.method === "POST", "Must use POST method");
      assert((init?.headers as any)?.["On-Behalf-Of"] === "999", "Must include On-Behalf-Of header");
      const body = JSON.parse(init?.body as string);
      assert(body.body.includes("AI Advisory Recommendation: Hire"), "Must include AI recommendation label");
      assert(body.body.includes("Final Human Decision: Hire"), "Must include Final Human decision");

      return new Response(JSON.stringify({ id: 888123 }), { status: 201 });
    };

    const provider = new GreenhouseProvider();
    const result = await provider.pushScorecard(makeMockPayload());
    assert(result.success === true, "Sync must succeed");
    assert(result.externalRecordReference === "note_888123", "Record reference should match note ID");
  });

  // 2. Successful Lever API request
  await runTest("2. Successful Lever API request", async () => {
    process.env.LEVER_API_KEY = "test_lever_key";
    process.env.LEVER_API_URL = "https://api.lever.co/v1";

    global.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      assert(String(input).includes("/opportunities/lever-opp-555/notes"), "Must call opportunity notes endpoint");
      assert(init?.method === "POST", "Must use POST method");
      const body = JSON.parse(init?.body as string);
      assert(body.text.includes("Final Human Decision: Hire"), "Must format human decision into text note");

      return new Response(JSON.stringify({ data: { id: "lever-note-999" } }), { status: 200 });
    };

    const provider = new LeverProvider();
    const result = await provider.pushScorecard(
      makeMockPayload({ externalCandidateId: "lever-contact-1", externalApplicationId: "lever-opp-555" })
    );
    assert(result.success === true, "Lever push must succeed");
    assert(result.externalRecordReference === "lever_note_lever-note-999", "Must record lever note reference");
  });

  // 3. Invalid credentials (401)
  await runTest("3. Invalid credentials handling (401)", async () => {
    process.env.GREENHOUSE_API_KEY = "invalid_key";
    process.env.GREENHOUSE_ON_BEHALF_OF_USER_ID = "999";

    global.fetch = async () => new Response("Unauthorized", { status: 401 });

    const provider = new GreenhouseProvider();
    const result = await provider.pushScorecard(makeMockPayload());
    assert(result.success === false, "Must fail on 401");
    assert(result.httpStatus === 401, "Must return status 401");
    assert(result.errorMessage?.includes("authentication") === true, "Must have auth error message");
  });

  // 4. Missing provider configuration
  await runTest("4. Missing provider configuration", async () => {
    delete process.env.GREENHOUSE_API_KEY;
    delete process.env.GREENHOUSE_ON_BEHALF_OF_USER_ID;

    const provider = new GreenhouseProvider();
    const config = provider.isConfigured();
    assert(config.configured === false, "Must detect unconfigured state");
    const result = await provider.pushScorecard(makeMockPayload());
    assert(result.success === false, "Must reject sync when not configured");
  });

  // 5. Missing external candidate/application mapping
  await runTest("5. Missing external candidate/application mapping", async () => {
    process.env.GREENHOUSE_API_KEY = "test_key";
    process.env.GREENHOUSE_ON_BEHALF_OF_USER_ID = "999";

    const provider = new GreenhouseProvider();
    const result = await provider.pushScorecard(makeMockPayload({ externalCandidateId: "" }));
    assert(result.success === false, "Must fail if externalCandidateId is missing");
  });

  // 6. Insufficient provider permissions (403)
  await runTest("6. Insufficient provider permissions (403)", async () => {
    process.env.LEVER_API_KEY = "test_lever_key";
    global.fetch = async () => new Response("Forbidden - Missing scope", { status: 403 });

    const provider = new LeverProvider();
    const result = await provider.pushScorecard(makeMockPayload({ externalCandidateId: "opp-1" }));
    assert(result.success === false, "Must fail on 403");
    assert(result.httpStatus === 403, "Must capture 403");
  });

  // 7. API rate limits (429 & Retry-After)
  await runTest("7. API rate limits (429 & Retry-After)", async () => {
    process.env.GREENHOUSE_API_KEY = "test_key";
    process.env.GREENHOUSE_ON_BEHALF_OF_USER_ID = "999";

    global.fetch = async () =>
      new Response("Too Many Requests", {
        status: 429,
        headers: { "Retry-After": "45" },
      });

    const provider = new GreenhouseProvider();
    const result = await provider.pushScorecard(makeMockPayload());
    assert(result.success === false, "Must fail on 429");
    assert(result.rateLimited === true, "Must flag rateLimited");
    assert(result.retryAfterSeconds === 45, "Must extract Retry-After duration");
  });

  // 8. Network timeouts
  await runTest("8. Network timeouts abort handling", async () => {
    process.env.LEVER_API_KEY = "test_key";
    global.fetch = async () => {
      const err = new Error("The operation was aborted");
      err.name = "AbortError";
      throw err;
    };

    const provider = new LeverProvider();
    const result = await provider.pushScorecard(makeMockPayload({ externalCandidateId: "opp-1" }));
    assert(result.success === false, "Must handle timeout gracefully");
    assert(result.errorMessage?.includes("timed out") === true, "Must note timeout in error message");
  });

  // 9. Correct payload distinction: AI recommendation vs Human decision
  await runTest("9. Correct handling of AI recommendation versus human decision", async () => {
    process.env.GREENHOUSE_API_KEY = "test_key";
    process.env.GREENHOUSE_ON_BEHALF_OF_USER_ID = "999";

    let capturedBody = "";
    global.fetch = async (_url, init) => {
      capturedBody = JSON.parse(init?.body as string).body;
      return new Response(JSON.stringify({ id: 101 }), { status: 201 });
    };

    const provider = new GreenhouseProvider();
    await provider.pushScorecard(
      makeMockPayload({
        aiRecommendation: "Hold",
        humanDecision: "Hire",
      })
    );

    assert(capturedBody.includes("AI Advisory Recommendation: Hold"), "Must show AI Hold");
    assert(capturedBody.includes("Final Human Decision: Hire"), "Must preserve Human Hire");
  });

  // 10. Search query formatting for Greenhouse & Lever
  await runTest("10. Search query execution for candidates", async () => {
    process.env.LEVER_API_KEY = "test_key";
    global.fetch = async (url) => {
      assert(String(url).includes("email=candidate%40example.com"), "Must URL encode email search");
      return new Response(
        JSON.stringify({
          data: [
            {
              id: "opp-123",
              name: "Jane Smith",
              emails: ["candidate@example.com"],
              headline: "Senior Frontend Engineer",
            },
          ],
        }),
        { status: 200 }
      );
    };

    const provider = new LeverProvider();
    const results = await provider.searchCandidates("candidate@example.com");
    assert(results.length === 1, "Must return 1 match");
    assert(results[0].name === "Jane Smith", "Name must match");
    assert(results[0].externalApplicationId === "opp-123", "Opp ID must match");
  });

  console.log(`\nTest results: ${passedTests} / ${totalTests} passed.`);

  // Restore fetch
  global.fetch = originalFetch;

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runTestSuite();
