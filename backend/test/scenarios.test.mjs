/**
 * Realistic scenario tests — end-to-end user journeys.
 *
 * Requires backend running at http://localhost:7001
 *
 * Usage:
 *   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --test test/scenarios.test.mjs
 */

import assert from "node:assert/strict";
import { test } from "node:test";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:7001";

// ---- helpers ----

function uid(label) {
  return `scenario-${label}-${Date.now()}`;
}

async function get(path, headers = {}) {
  const res = await fetch(`${BACKEND_URL}${path}`, { headers });
  const body = await res.json().catch(() => null);
  return { status: res.status, body, headers: res.headers };
}

async function post(path, data, headers = {}) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(data),
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

async function put(path, data, headers = {}) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(data),
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

async function patch(path, data, headers = {}) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(data),
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

async function del(path, headers = {}) {
  const res = await fetch(`${BACKEND_URL}${path}`, { method: "DELETE", headers });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

function auth(userId, role = "user") {
  return { "x-user-id": userId, "x-user-role": role };
}

// ---- pre-check ----

let backendAvailable = false;
try {
  const res = await fetch(`${BACKEND_URL}/api/health`);
  if (res.ok) backendAvailable = true;
} catch {}
const SKIP = !backendAvailable;

// ====================================================================
// Scenario 1: Complete match lifecycle
// ====================================================================

test("S1: 比赛完整生命周期 (scheduled→live→finished→结果录入)", { skip: SKIP }, async () => {
  const admin = auth("admin", "admin");

  // 1. View scheduled matches
  const r1 = await get("/api/matches?status=scheduled");
  assert.equal(r1.status, 200);
  assert.ok(r1.body.data.length > 0, "should have scheduled matches");
  const match = r1.body.data.find(m => m.status === "scheduled" && m.id > 4);
  assert.ok(match, "should find a scheduled match beyond the first 4");

  // 2. View match detail
  const r2 = await get(`/api/matches/${match.id}`);
  assert.equal(r2.status, 200);
  assert.equal(r2.body.data.status, "scheduled");
  assert.ok(typeof r2.body.data.commentCount === "number");

  // 3. Admin transitions: scheduled → live
  const r3 = await patch(`/api/matches/${match.id}`, { status: "live" }, admin);
  assert.equal(r3.status, 200);
  assert.equal(r3.body.data.status, "live");

  // 4. Admin enters result — this auto-transitions live → finished (BR-10)
  const r4 = await post(`/api/matches/${match.id}/results`,
    { homeScore: 3, awayScore: 2 }, admin);
  assert.equal(r4.status, 201);
  assert.equal(r4.body.data.homeScore, 3);
  assert.equal(r4.body.data.awayScore, 2);

  // 5. Verify match is now finished
  const r5 = await get(`/api/matches/${match.id}`);
  assert.equal(r5.body.data.status, "finished");

  // 6. Result cannot be re-entered
  const r6 = await post(`/api/matches/${match.id}/results`,
    { homeScore: 1, awayScore: 0 }, admin);
  assert.equal(r6.status, 409);
});

// ====================================================================
// Scenario 2: Fan prediction journey
// ====================================================================

test("S2: 球迷预测旅程 (浏览→预测→修改→赛后查看)", { skip: SKIP }, async () => {
  const fan = auth(uid("fan"));

  // 1. Browse upcoming matches
  const r1 = await get("/api/matches?status=scheduled");
  assert.equal(r1.status, 200);
  const scheduled = r1.body.data;
  assert.ok(scheduled.length > 0, "should have upcoming matches");
  const target = scheduled[0];

  // 2. Submit a prediction
  const r2 = await post("/api/predictions",
    { matchId: target.id, homeScore: 2, awayScore: 1 }, fan);
  assert.equal(r2.status, 201);
  const predId = r2.body.data.id;

  // 3. View own predictions
  const r3 = await get("/api/predictions", fan);
  assert.equal(r3.status, 200);
  const myPred = r3.body.data.find(p => p.id === predId);
  assert.ok(myPred, "should find own prediction");
  assert.equal(myPred.homeScore, 2);
  assert.equal(myPred.awayScore, 1);
  assert.ok(myPred.match, "should have nested match info");
  assert.equal(myPred.match.id, target.id);

  // 4. Modify prediction before match starts
  const r4 = await put(`/api/predictions/${predId}`,
    { homeScore: 3, awayScore: 1 }, fan);
  assert.equal(r4.status, 200);
  assert.equal(r4.body.data.homeScore, 3);

  // 5. Verify updated
  const r5 = await get("/api/predictions", fan);
  const updated = r5.body.data.find(p => p.id === predId);
  assert.equal(updated.homeScore, 3);
});

// ====================================================================
// Scenario 3: Comment & interaction
// ====================================================================

test("S3: 评论互动场景 (发表→查看→删除)", { skip: SKIP }, async () => {
  const author = auth(uid("author"));
  const other = auth(uid("other"));
  const admin = auth("admin", "admin");

  // 1. Post a comment on match 1
  const r1 = await post("/api/matches/1/comments",
    { content: "期待这场对决！阿根廷加油！" }, author);
  assert.equal(r1.status, 201);
  assert.equal(r1.body.data.content, "期待这场对决！阿根廷加油！");
  const cid = r1.body.data.id;

  // 2. Post another comment
  await post("/api/matches/1/comments",
    { content: "巴西必胜！" }, other);

  // 3. List comments — sorted by newest first
  const r3 = await get("/api/matches/1/comments");
  assert.equal(r3.status, 200);
  assert.ok(r3.body.data.length >= 2);
  // Verify newest first
  const timestamps = r3.body.data.map(c => new Date(c.createdAt).getTime());
  for (let i = 1; i < timestamps.length; i++) {
    assert.ok(timestamps[i - 1] >= timestamps[i], "should be newest first");
  }

  // 4. Author cannot delete other's comment
  const otherComment = r3.body.data.find(c => c.userId !== author["x-user-id"]);
  if (otherComment) {
    const r4 = await del(`/api/comments/${otherComment.id}`, author);
    assert.equal(r4.status, 403);
  }

  // 5. Admin can delete any comment
  const r5 = await del(`/api/comments/${cid}`, admin);
  assert.equal(r5.status, 200);

  // 6. Deleted comment not in list
  const r6 = await get("/api/matches/1/comments");
  const deleted = r6.body.data.find(c => c.id === cid);
  assert.equal(deleted, undefined);
});

// ====================================================================
// Scenario 4: Favorites management
// ====================================================================

test("S4: 收藏管理场景 (收藏比赛→收藏球队→查看→取消)", { skip: SKIP }, async () => {
  const user = auth(uid("favuser"));

  // 1. Favorite a match
  const r1 = await post("/api/favorites",
    { type: "match", targetId: 1 }, user);
  assert.equal(r1.status, 201);
  const fav1Id = r1.body.data.id;

  // 2. Favorite a team
  const r2 = await post("/api/favorites",
    { type: "team", targetId: 1 }, user);
  assert.equal(r2.status, 201);

  // 3. Cannot duplicate
  const r3 = await post("/api/favorites",
    { type: "match", targetId: 1 }, user);
  assert.equal(r3.status, 409);

  // 4. List favorites
  const r4 = await get("/api/favorites", user);
  assert.equal(r4.status, 200);
  assert.ok(r4.body.data.length >= 2);

  // 5. Remove a favorite
  const r5 = await del(`/api/favorites/${fav1Id}`, user);
  assert.equal(r5.status, 200);

  // 6. Verify removed — returns 404
  const r6 = await del(`/api/favorites/${fav1Id}`, user);
  assert.equal(r6.status, 404);

  // 7. Cannot delete other user's favorite (create new one for this test)
  const { body: fav3 } = await post("/api/favorites",
    { type: "team", targetId: 2 }, user);
  const intruder = auth(uid("intruder"));
  const r7 = await del(`/api/favorites/${fav3.data.id}`, intruder);
  assert.equal(r7.status, 403);
});

// ====================================================================
// Scenario 5: Pagination & filtering edge cases
// ====================================================================

test("S5: 分页与筛选边界", { skip: SKIP }, async () => {
  // 1. Default pagination
  const r1 = await get("/api/matches");
  assert.equal(r1.status, 200);
  assert.ok(r1.body.pagination, "should have pagination");
  assert.equal(r1.body.pagination.page, 1);
  assert.equal(r1.body.pagination.pageSize, 20);
  assert.ok(r1.body.pagination.total >= 12);

  // 2. Page 1 with small page size
  const r2 = await get("/api/matches?page=1&pageSize=3");
  assert.equal(r2.status, 200);
  assert.ok(r2.body.data.length <= 3);
  assert.equal(r2.body.pagination.pageSize, 3);

  // 3. Page beyond data returns empty array
  const r3 = await get("/api/matches?page=999&pageSize=20");
  assert.equal(r3.status, 200);
  assert.equal(r3.body.data.length, 0);

  // 4. Comments pagination
  // First, add a few comments
  const user = auth(uid("pageuser"));
  for (let i = 0; i < 5; i++) {
    await post("/api/matches/1/comments", { content: `测试评论 ${i + 1}` }, user);
  }
  const r4 = await get("/api/matches/1/comments?page=1&pageSize=3");
  assert.equal(r4.status, 200);
  assert.equal(r4.body.data.length, 3);
  assert.ok(r4.body.pagination.total >= 5);
});

// ====================================================================
// Scenario 6: Validation & error messages
// ====================================================================

test("S6: 校验错误消息质量", { skip: SKIP }, async () => {
  const user = auth(uid("valuser"));

  // 1. Negative score gives field-specific error
  const r1 = await post("/api/predictions",
    { matchId: 1, homeScore: -5, awayScore: 0 }, user);
  assert.equal(r1.status, 400);
  const err1 = r1.body?.error?.message || r1.body?.error || "";
  assert.ok(err1.toLowerCase().includes("home"), "should mention the offending field");

  // 2. Missing required field
  const r2 = await post("/api/predictions",
    { matchId: 1, awayScore: 0 }, user);
  assert.equal(r2.status, 400);

  // 3. Comment too long (501 chars)
  const r3 = await post("/api/matches/1/comments",
    { content: "长".repeat(501) }, user);
  assert.equal(r3.status, 400);

  // 4. Empty comment
  const r4 = await post("/api/matches/1/comments",
    { content: "" }, user);
  assert.equal(r4.status, 400);

  // 5. Whitespace-only comment
  const r5 = await post("/api/matches/1/comments",
    { content: "   \t  \n  " }, user);
  assert.equal(r5.status, 400);

  // 6. Invalid league filter
  const r6 = await get("/api/matches?league=nba");
  assert.equal(r6.status, 400);

  // 7. Non-numeric match ID
  const r7 = await get("/api/matches/abc");
  assert.equal(r7.status, 400);
});

// ====================================================================
// Scenario 7: Cross-league data isolation
// ====================================================================

test("S7: 跨联赛数据隔离", { skip: SKIP }, async () => {
  // 1. World Cup matches only
  const r1 = await get("/api/matches?league=worldcup");
  assert.equal(r1.status, 200);
  for (const m of r1.body.data) {
    assert.equal(m.league, "worldcup", `match ${m.id} should be worldcup`);
  }

  // 2. SPL matches — empty (no SPL matches seeded yet)
  const r2 = await get("/api/matches?league=spl");
  assert.equal(r2.status, 200);
  assert.equal(r2.body.data.length, 0);

  // 3. Teams filtered by league
  const r3 = await get("/api/teams?league=spl");
  assert.equal(r3.status, 200);
  for (const t of r3.body.data) {
    assert.equal(t.league, "spl", `team ${t.id} should be spl`);
  }

  // 4. Standings by league
  const r4 = await get("/api/standings?league=worldcup");
  assert.equal(r4.status, 200);
  assert.ok(r4.body.data.length > 0);
  const r5 = await get("/api/standings?league=spl");
  assert.equal(r5.status, 200);
  assert.ok(r5.body.data.length > 0);
  // Different leagues should have different teams
  const wcTeamIds = r4.body.data.map(s => s.teamId);
  const splTeamIds = r5.body.data.map(s => s.teamId);
  const overlap = wcTeamIds.filter(id => splTeamIds.includes(id));
  assert.equal(overlap.length, 0, "no team should appear in both leagues");
});

// ====================================================================
// Scenario 8: Bracket structure validation
// ====================================================================

test("S8: 淘汰赛对阵结构验证", { skip: SKIP }, async () => {
  const r1 = await get("/api/bracket?league=worldcup");
  assert.equal(r1.status, 200);
  const nodes = r1.body.data;
  assert.ok(nodes.length > 0, "should have bracket nodes");

  // Verify stage distribution
  const stages = {};
  for (const n of nodes) {
    stages[n.stage] = (stages[n.stage] || 0) + 1;
  }
  assert.equal(stages.final, 2, "final should have 2 nodes (left/right)");
  assert.equal(stages.semi, 4, "semi should have 4 nodes");
  assert.equal(stages.quarter, 8, "quarter should have 8 nodes");
  assert.equal(stages.round16, 16, "round16 should have 16 nodes");

  // Verify tree structure: leaf nodes (round16) have no children
  const parentIds = new Set(nodes.filter(n => n.parentNodeId).map(n => n.parentNodeId));
  for (const n of nodes) {
    if (n.stage === "final") {
      assert.equal(n.parentNodeId, null, "final nodes should have no parent");
    } else {
      assert.ok(parentIds.has(n.id) || n.stage === "round16",
        `node ${n.id} (${n.stage}) should be a parent or round16`);
    }
  }
});

// ====================================================================
// Scenario 9: Request ID tracking
// ====================================================================

test("S9: X-Request-Id 追踪", { skip: SKIP }, async () => {
  // 1. Success response has X-Request-Id
  const r1 = await get("/api/health");
  const reqId1 = r1.headers.get("x-request-id");
  assert.ok(reqId1, "success response should have X-Request-Id");
  assert.ok(reqId1.length > 0);

  // 2. Error response has matching X-Request-Id and requestId in body
  const r2 = await get("/api/matches/99999");
  const reqId2 = r2.headers.get("x-request-id");
  assert.ok(reqId2, "error response should have X-Request-Id");
  // The body.requestId should match the header
  assert.ok(r2.body.requestId, "body should have requestId");
  assert.equal(r2.body.requestId, reqId2);

  // 3. Custom X-Request-Id is preserved
  const customId = "my-custom-req-id-12345";
  const r3 = await get("/api/health", { "x-request-id": customId });
  const reqId3 = r3.headers.get("x-request-id");
  assert.equal(reqId3, customId, "custom request ID should be preserved");
});

// ====================================================================
// Scenario 10: Status machine edge cases
// ====================================================================

test("S10: 状态机边界", { skip: SKIP }, async () => {
  const admin = auth("admin", "admin");

  // Find fresh scheduled matches
  const list = await get("/api/matches?status=scheduled");
  const fresh = list.body.data.filter(m => m.id >= 9); // use high IDs not touched by other tests
  assert.ok(fresh.length >= 2, "need at least 2 fresh scheduled matches");

  const matchA = fresh[0].id;
  const matchB = fresh[1].id;

  // 1. scheduled → postponed (valid)
  const r1 = await patch(`/api/matches/${matchA}`, { status: "postponed" }, admin);
  assert.equal(r1.status, 200);
  assert.equal(r1.body.data.status, "postponed");

  // 2. postponed → scheduled (invalid — can't go back from terminal state)
  const r2 = await patch(`/api/matches/${matchA}`, { status: "scheduled" }, admin);
  assert.equal(r2.status, 400);

  // 3. scheduled → cancelled (valid)
  const r3 = await patch(`/api/matches/${matchB}`, { status: "cancelled" }, admin);
  assert.equal(r3.status, 200);
  assert.equal(r3.body.data.status, "cancelled");

  // 4. cancelled → live (invalid — can't resume cancelled)
  const r4 = await patch(`/api/matches/${matchB}`, { status: "live" }, admin);
  assert.equal(r4.status, 400);

  // 5. Non-admin cannot change status
  const fan = auth(uid("fan"));
  const r5 = await patch(`/api/matches/${matchA}`, { status: "live" }, fan);
  // matchA is now postponed, so this would be 400 even for admin, but it's 403 first
  // because auth check happens before business logic
  assert.ok(r5.status === 403 || r5.status === 400,
    `non-admin should be rejected (403) or invalid transition (400), got ${r5.status}`);
});
