/**
 * Frontend smoke tests
 *
 * Verifies that the Next.js server serves all pages correctly.
 * Requires frontend running at http://localhost:3000
 *
 * Usage:
 *   node --test test/smoke.test.mjs
 */

import assert from "node:assert/strict";
import { test } from "node:test";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

let frontendAvailable = false;

try {
  const res = await fetch(FRONTEND_URL);
  if (res.ok) {
    console.log("  [pre-check] Frontend reachable at", FRONTEND_URL);
    frontendAvailable = true;
  }
} catch {
  console.warn("  [pre-check] Frontend NOT reachable at", FRONTEND_URL);
  console.warn("  Smoke tests will be SKIPPED. Start with: npm run dev");
}

const SKIP = !frontendAvailable;

async function getPage(path) {
  const res = await fetch(`${FRONTEND_URL}${path}`, {
    headers: { "Accept": "text/html" },
  });
  return {
    status: res.status,
    contentType: res.headers.get("content-type") || "",
    text: await res.text(),
  };
}

// ---- Core page tests ----

test("Home page → 200 with HTML", { skip: SKIP }, async () => {
const { status, contentType, text } = await getPage("/");
  assert.equal(status, 200);
  assert.ok(contentType.includes("text/html"), "should return HTML");
  assert.ok(text.includes("世界杯"), "should mention 世界杯");
  assert.ok(text.includes("苏超"), "should mention 苏超");
});

test("Matches page → 200 with HTML (SSR)", { skip: SKIP }, async () => {
const { status, contentType, text } = await getPage("/matches");
  assert.equal(status, 200);
  assert.ok(contentType.includes("text/html"), "should return HTML");
  assert.ok(text.includes("赛程"), "should mention 赛程");
});

test("Teams page → 200 with HTML", { skip: SKIP }, async () => {
const { status, contentType, text } = await getPage("/teams");
  assert.equal(status, 200);
  assert.ok(contentType.includes("text/html"));
  assert.ok(text.includes("球队"), "should mention 球队");
});

test("Standings page → 200 with HTML", { skip: SKIP }, async () => {
const { status, contentType, text } = await getPage("/standings");
  assert.equal(status, 200);
  assert.ok(contentType.includes("text/html"));
  assert.ok(text.includes("积分"), "should mention 积分");
});

test("Bracket page → 200 with HTML", { skip: SKIP }, async () => {
const { status, contentType, text } = await getPage("/bracket");
  assert.equal(status, 200);
  assert.ok(contentType.includes("text/html"));
  assert.ok(text.includes("淘汰赛"), "should mention 淘汰赛");
});

test("My Favorites page → 200 with HTML", { skip: SKIP }, async () => {
const { status, contentType, text } = await getPage("/my/favorites");
  assert.equal(status, 200);
  assert.ok(contentType.includes("text/html"));
  assert.ok(text.includes("收藏"), "should mention 收藏");
});

test("My Predictions page → 200 with HTML", { skip: SKIP }, async () => {
const { status, contentType, text } = await getPage("/my/predictions");
  assert.equal(status, 200);
  assert.ok(contentType.includes("text/html"));
  assert.ok(text.includes("预测"), "should mention 预测");
});

test("Match detail page → 200 with HTML", { skip: SKIP }, async () => {
const { status, contentType, text } = await getPage("/matches/1");
  assert.equal(status, 200);
  assert.ok(contentType.includes("text/html"));
  assert.ok(text.includes("比赛"), "should mention 比赛");
});

// ---- Health check ----

test("API proxy /api/health → 200", { skip: SKIP }, async () => {
const res = await fetch(`${FRONTEND_URL}/api/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, "ok");
});

// ---- 404 handling ----

test("Unknown route → 404 with HTML", { skip: SKIP }, async () => {
const { status } = await getPage("/nonexistent-page-12345");
  assert.equal(status, 404, "unknown route should return 404");
});
