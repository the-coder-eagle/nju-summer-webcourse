# Phase 2 Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build 7 football-platform pages with 4-state coverage (loading/success/empty/error), 8 shared components, API client, and navigation — all in Next.js App Router with TailwindCSS 4.

**Architecture:** API client (`lib/api.ts`) with types from OpenAPI schemas. Shared UI primitives (loading-skeleton, empty-state, error-state, status-badge) composed into feature components (match-card, team-card, prediction-form, comment-section). Pages are `"use client"` for data fetching via the API client. Navigation added to root layout. Existing course-dashboard and homepage preserved untouched.

**Tech Stack:** Next.js ^16.2.10, React ^19.2.7, TailwindCSS ^4.3.2, TypeScript ^5.9.3

## Global Constraints

- Keep existing `page.tsx` and `course-dashboard.tsx` unchanged
- Every data-fetching page must handle loading / success (data) / success (empty) / error states
- TailwindCSS 4 for all styling; no new UI libraries
- TypeScript strict mode; no hardcoded secrets
- User identity via `x-user-id` header (test user: userId=1)
- `npm run check` must pass (lint + test + build)
- API calls through `/api/*` same-origin proxy to backend (port 7001)
- Follow existing code patterns: `"use client"`, `useState`/`useEffect`, `fetch()`, `AbortController`

---

### Task 1: API Client + Types

**Files:**
- Create: `frontend/src/lib/api.ts`

**Interfaces:**
- Produces: `apiClient` object with methods for all 17 endpoints; all TypeScript types matching OpenAPI schemas; `DEFAULT_USER_ID` constant

**Deliverable:** Complete API layer that all pages and components import.

- [ ] Step 1: Write `frontend/src/lib/api.ts`

Define all types from OpenAPI schemas:
```typescript
// Enums
export type League = "worldcup" | "spl";
export type MatchStatus = "scheduled" | "live" | "finished" | "postponed" | "cancelled";
export type MatchStage = "group" | "round16" | "quarter" | "semi" | "final";
export type FavoriteType = "match" | "team";

// Common
export interface Pagination { page: number; pageSize: number; total: number; }
export interface ApiError { error: string; }

// Team
export interface TeamBrief { id: number; name: string; logoUrl: string; }
export interface Team { id: number; name: string; logoUrl: string; league: League; createdAt: string; }

// Match
export interface Match {
  id: number; homeTeamId: number; awayTeamId: number;
  kickoffTime: string; venue: string; league: League;
  status: MatchStatus; stage: MatchStage;
  createdAt: string; updatedAt: string;
}
export interface MatchSummary extends Match { homeTeam: TeamBrief; awayTeam: TeamBrief; }
export interface MatchDetail extends MatchSummary { commentCount: number; }

// Standing
export interface Standing {
  id: number; teamId: number; teamName: string; league: League;
  played: number; won: number; drawn: number; lost: number;
  goalsFor: number; goalsAgainst: number; goalDifference: number; points: number;
}

// Bracket
export interface BracketNode {
  id: number; league: League; stage: MatchStage;
  matchId: number | null; homeTeamId: number | null; awayTeamId: number | null;
  homeTeamName: string | null; awayTeamName: string | null;
  homeScore: number | null; awayScore: number | null;
  parentNodeId: number | null; position: "left" | "right";
}

// Prediction
export interface CreatePrediction { matchId: number; homeScore: number; awayScore: number; }
export interface Prediction {
  id: number; userId: string; matchId: number;
  homeScore: number; awayScore: number;
  createdAt: string; updatedAt: string;
}
export interface MatchBrief {
  id: number; homeTeamName: string; awayTeamName: string;
  kickoffTime: string; status: MatchStatus; league: League;
}
export interface PredictionWithMatch extends Prediction { match: MatchBrief; }

// Favorite
export interface CreateFavorite { type: FavoriteType; targetId: number; }
export interface Favorite { id: number; userId: string; type: FavoriteType; targetId: number; createdAt: string; }

// Comment
export interface CreateComment { content: string; }
export interface Comment { id: number; userId: string; matchId: number; content: string; deletedAt: string | null; createdAt: string; }

// Result
export interface EnterResult { homeScore: number; awayScore: number; }
export interface MatchResult { id: number; matchId: number; homeScore: number; awayScore: number; enteredBy: string; createdAt: string; }

// Paginated response
export interface PaginatedResponse<T> { data: T[]; pagination: Pagination; }
export interface DataResponse<T> { data: T; }
```

Then implement the `apiClient` with fetch wrapper:
```typescript
const BASE_URL = "/api";
const DEFAULT_USER_ID = "1";

type FetchOptions = Omit<RequestInit, "body"> & { body?: unknown; params?: Record<string, string | number | undefined> };

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { body, params, ...rest } = options;
  let url = `${BASE_URL}${path}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined) searchParams.set(k, String(v)); });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }
  const headers: Record<string, string> = { "Content-Type": "application/json", "x-user-id": DEFAULT_USER_ID, ...((rest.headers as Record<string, string>) || {}) };
  const res = await fetch(url, { ...rest, headers, body: body ? JSON.stringify(body) : undefined });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new ApiRequestError(res.status, (err as ApiError).error || `HTTP ${res.status}`, err);
  }
  return res.json() as Promise<T>;
}

export class ApiRequestError extends Error {
  status: number; body: unknown;
  constructor(status: number, message: string, body: unknown) { super(message); this.status = status; this.body = body; }
}
```

Export all 17 endpoint methods:
```typescript
export const apiClient = {
  // Matches
  listMatches: (params?: { league?: League; status?: MatchStatus; page?: number; pageSize?: number }) =>
    apiFetch<PaginatedResponse<MatchSummary>>("/matches", { params }),
  getMatch: (matchId: number) =>
    apiFetch<DataResponse<MatchDetail>>(`/matches/${matchId}`),
  updateMatchStatus: (matchId: number, status: MatchStatus) =>
    apiFetch<DataResponse<MatchDetail>>(`/matches/${matchId}`, { method: "PATCH", body: { status } }),
  // Teams
  listTeams: (params?: { league?: League }) =>
    apiFetch<DataResponse<Team[]>>("/teams", { params }),
  getTeam: (teamId: number) =>
    apiFetch<DataResponse<Team>>(`/teams/${teamId}`),
  // Standings
  getStandings: (params?: { league?: League }) =>
    apiFetch<DataResponse<Standing[]>>("/standings", { params }),
  // Bracket
  getBracket: (params?: { league?: League }) =>
    apiFetch<DataResponse<BracketNode[]>>("/bracket", { params }),
  // Predictions
  createPrediction: (data: CreatePrediction) =>
    apiFetch<DataResponse<Prediction>>("/predictions", { method: "POST", body: data }),
  updatePrediction: (predictionId: number, data: { homeScore: number; awayScore: number }) =>
    apiFetch<DataResponse<Prediction>>(`/predictions/${predictionId}`, { method: "PUT", body: data }),
  listMyPredictions: () =>
    apiFetch<DataResponse<PredictionWithMatch[]>>("/predictions"),
  // Results
  enterResult: (matchId: number, data: EnterResult) =>
    apiFetch<DataResponse<MatchResult>>(`/matches/${matchId}/results`, { method: "POST", body: data }),
  // Favorites
  addFavorite: (data: CreateFavorite) =>
    apiFetch<DataResponse<Favorite>>("/favorites", { method: "POST", body: data }),
  removeFavorite: (favoriteId: number) =>
    apiFetch<{ data: null }>(`/favorites/${favoriteId}`, { method: "DELETE" }),
  listMyFavorites: () =>
    apiFetch<DataResponse<Favorite[]>>("/favorites"),
  // Comments
  createComment: (matchId: number, data: CreateComment) =>
    apiFetch<DataResponse<Comment>>(`/matches/${matchId}/comments`, { method: "POST", body: data }),
  listComments: (matchId: number, params?: { page?: number; pageSize?: number }) =>
    apiFetch<PaginatedResponse<Comment>>(`/matches/${matchId}/comments`, { params }),
  deleteComment: (commentId: number) =>
    apiFetch<DataResponse<Comment>>(`/comments/${commentId}`, { method: "DELETE" }),
};
```

---

### Task 2: Base UI Components (loading-skeleton, empty-state, error-state, status-badge)

**Files:**
- Create: `frontend/src/components/loading-skeleton.tsx`
- Create: `frontend/src/components/empty-state.tsx`
- Create: `frontend/src/components/error-state.tsx`
- Create: `frontend/src/components/status-badge.tsx`

**Interfaces:**
- Produces: `<LoadingSkeleton />` (variant: "card" | "list" | "detail" | "table"), `<EmptyState message="暂无赛程" />`, `<ErrorState message="加载失败" onRetry={() => refetch()} />`, `<StatusBadge status={MatchStatus} />`

**Deliverable:** Four reusable UI primitives for 4-state coverage.

- [ ] Step 1: Write `loading-skeleton.tsx`
```tsx
type SkeletonVariant = "card" | "list" | "detail" | "table";

export function LoadingSkeleton({ variant = "card", count = 6 }: { variant?: SkeletonVariant; count?: number }) {
  if (variant === "card") {
    return (
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="h-44 animate-pulse rounded-2xl bg-slate-200" />
        ))}
      </div>
    );
  }
  if (variant === "list") {
    return (
      <div className="space-y-3">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-200" />
        ))}
      </div>
    );
  }
  if (variant === "detail") {
    return (
      <div className="space-y-4">
        <div className="h-10 w-2/3 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-6 w-1/3 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-32 animate-pulse rounded-xl bg-slate-200" />
      </div>
    );
  }
  // table
  return (
    <div className="space-y-2">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-lg bg-slate-200" />
      ))}
    </div>
  );
}
```

- [ ] Step 2: Write `empty-state.tsx`
```tsx
export function EmptyState({ message, description }: { message: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
      <div className="mb-4 text-5xl text-slate-300">⚽</div>
      <h3 className="text-lg font-semibold text-slate-700">{message}</h3>
      {description && <p className="mt-2 text-sm text-slate-500">{description}</p>}
    </div>
  );
}
```

- [ ] Step 3: Write `error-state.tsx`
```tsx
"use client";

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-6 py-16 text-center">
      <div className="mb-4 text-5xl">⚠</div>
      <h3 className="text-lg font-semibold text-rose-800">{message || "加载失败"}</h3>
      <p className="mt-2 text-sm text-rose-600">请检查网络连接后重试</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 rounded-full bg-rose-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-rose-800"
        >
          重新加载
        </button>
      )}
    </div>
  );
}
```

- [ ] Step 4: Write `status-badge.tsx`
```tsx
import type { MatchStatus } from "@/lib/api";

const statusConfig: Record<MatchStatus, { label: string; className: string }> = {
  scheduled: { label: "未开始", className: "bg-blue-100 text-blue-800" },
  live: { label: "进行中", className: "bg-green-100 text-green-800" },
  finished: { label: "已结束", className: "bg-slate-100 text-slate-600" },
  postponed: { label: "延期", className: "bg-amber-100 text-amber-800" },
  cancelled: { label: "取消", className: "bg-rose-100 text-rose-800" },
};

export function StatusBadge({ status }: { status: MatchStatus }) {
  const config = statusConfig[status] || statusConfig.scheduled;
  return (
    <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${config.className}`}>
      {config.label}
    </span>
  );
}
```

---

### Task 3: Match Card

**Files:**
- Create: `frontend/src/components/match-card.tsx`

**Interfaces:**
- Consumes: `MatchSummary` from `@/lib/api`, `StatusBadge` from `./status-badge`
- Produces: `<MatchCard match={MatchSummary} />` — Clickable card showing home vs away, time, status, venue, league

- [ ] Step 1: Write `match-card.tsx`
```tsx
import Link from "next/link";
import type { MatchSummary } from "@/lib/api";
import { StatusBadge } from "./status-badge";

function formatKickoffTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

const leagueLabel: Record<string, string> = { worldcup: "世界杯", spl: "苏超" };

export function MatchCard({ match }: { match: MatchSummary }) {
  return (
    <Link
      href={`/matches/${match.id}`}
      className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-xs font-semibold text-blue-700">
          {leagueLabel[match.league] || match.league}
        </span>
        <StatusBadge status={match.status} />
      </div>
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 text-right">
          <p className="font-bold text-slate-900 text-lg">{match.homeTeam.name}</p>
        </div>
        <span className="text-sm font-semibold text-slate-400">VS</span>
        <div className="flex-1 text-left">
          <p className="font-bold text-slate-900 text-lg">{match.awayTeam.name}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
        <span>{formatKickoffTime(match.kickoffTime)}</span>
        <span>·</span>
        <span>{match.venue}</span>
      </div>
    </Link>
  );
}
```

---

### Task 4: Team Card

**Files:**
- Create: `frontend/src/components/team-card.tsx`

**Interfaces:**
- Consumes: `Team` from `@/lib/api`
- Produces: `<TeamCard team={Team} />` — Card showing logo, name, league

- [ ] Step 1: Write `team-card.tsx`
```tsx
import type { Team } from "@/lib/api";

const leagueLabel: Record<string, string> = { worldcup: "世界杯", spl: "苏超" };

export function TeamCard({ team }: { team: Team }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-slate-100">
        {team.logoUrl ? (
          <img src={team.logoUrl} alt={team.name} className="h-10 w-10 object-contain" />
        ) : (
          <span className="text-2xl">⚽</span>
        )}
      </div>
      <div>
        <h3 className="font-bold text-slate-900">{team.name}</h3>
        <p className="text-xs text-slate-500">{leagueLabel[team.league] || team.league}</p>
      </div>
    </div>
  );
}
```

---

### Task 5: Prediction Form

**Files:**
- Create: `frontend/src/components/prediction-form.tsx`

**Interfaces:**
- Consumes: `CreatePrediction`, `Prediction`, `apiClient`, `ApiRequestError` from `@/lib/api`
- Produces: `<PredictionForm matchId={number} matchStatus={MatchStatus} existingPrediction={Prediction | null} onSuccess={(p: Prediction) => void} />`

- [ ] Step 1: Write `prediction-form.tsx`
```tsx
"use client";

import { useState, type FormEvent } from "react";
import { apiClient, ApiRequestError, type CreatePrediction, type MatchStatus, type Prediction } from "@/lib/api";

interface Props {
  matchId: number;
  matchStatus: MatchStatus;
  existingPrediction: Prediction | null;
  onSuccess: (prediction: Prediction) => void;
}

export function PredictionForm({ matchId, matchStatus, existingPrediction, onSuccess }: Props) {
  const [homeScore, setHomeScore] = useState(existingPrediction?.homeScore?.toString() ?? "");
  const [awayScore, setAwayScore] = useState(existingPrediction?.awayScore?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (matchStatus !== "scheduled") {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
        <p className="text-sm text-slate-500">
          {matchStatus === "live" ? "比赛进行中，不可预测" :
           matchStatus === "finished" ? "比赛已结束" :
           matchStatus === "postponed" ? "比赛已延期" : "比赛已取消"}
        </p>
      </div>
    );
  }

  const isUpdate = existingPrediction !== null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const hs = parseInt(homeScore, 10);
    const as = parseInt(awayScore, 10);

    if (isNaN(hs) || isNaN(as) || hs < 0 || as < 0 || !Number.isInteger(hs) || !Number.isInteger(as)) {
      setError("请输入非负整数比分");
      return;
    }

    setSubmitting(true);
    try {
      const data: CreatePrediction = { matchId, homeScore: hs, awayScore: as };
      const res = isUpdate
        ? await apiClient.updatePrediction(existingPrediction!.id, { homeScore: hs, awayScore: as })
        : await apiClient.createPrediction(data);
      onSuccess(res.data);
      setError(null);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setError(err.message);
      } else {
        setError("提交失败，请重试");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-6">
      <h3 className="mb-4 font-semibold text-slate-900">{isUpdate ? "修改预测" : "提交比分预测"}</h3>
      <div className="flex items-end gap-3 mb-4">
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-600 mb-1">主队进球</label>
          <input
            type="number"
            min="0"
            step="1"
            value={homeScore}
            onChange={(e) => setHomeScore(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="0"
            required
          />
        </div>
        <span className="pb-2 text-lg font-bold text-slate-400">:</span>
        <div className="flex-1">
          <label className="block text-xs font-medium text-slate-600 mb-1">客队进球</label>
          <input
            type="number"
            min="0"
            step="1"
            value={awayScore}
            onChange={(e) => setAwayScore(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="0"
            required
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-blue-700 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
        >
          {submitting ? "提交中…" : isUpdate ? "更新" : "提交"}
        </button>
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      {isUpdate && <p className="text-xs text-slate-400">你已提交预测，可修改（开赛前有效）</p>}
    </form>
  );
}
```

---

### Task 6: Comment Section

**Files:**
- Create: `frontend/src/components/comment-section.tsx`

**Interfaces:**
- Consumes: `Comment`, `apiClient`, `ApiRequestError` from `@/lib/api`
- Produces: `<CommentSection matchId={number} />` — Paginated comment list with create/delete

- [ ] Step 1: Write `comment-section.tsx`
```tsx
"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import { apiClient, ApiRequestError, type Comment, type Pagination } from "@/lib/api";
import { ErrorState } from "./error-state";
import { EmptyState } from "./empty-state";

const PAGE_SIZE = 20;

export function CommentSection({ matchId }: { matchId: number }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchComments = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.listComments(matchId, { page, pageSize: PAGE_SIZE });
      if (page === 1) {
        setComments(res.data);
      } else {
        setComments((prev) => [...prev, ...res.data]);
      }
      setPagination(res.pagination);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : "加载评论失败");
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || trimmed.length > 500) {
      setSubmitError("评论内容 1-500 字符");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await apiClient.createComment(matchId, { content: trimmed });
      setComments((prev) => [res.data, ...prev]);
      setContent("");
    } catch (err) {
      setSubmitError(err instanceof ApiRequestError ? err.message : "发表失败");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(commentId: number) {
    setDeletingId(commentId);
    try {
      await apiClient.deleteComment(commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (err) {
      alert(err instanceof ApiRequestError ? err.message : "删除失败");
    } finally {
      setDeletingId(null);
    }
  }

  if (error) return <ErrorState message={error} onRetry={() => fetchComments()} />;

  return (
    <div>
      <h3 className="mb-4 font-semibold text-slate-900">评论区</h3>
      <form onSubmit={handleSubmit} className="mb-6">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          rows={3}
          placeholder="发表你的看法…"
          maxLength={500}
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-xs text-slate-400">{content.length}/500</span>
          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:opacity-50"
          >
            {submitting ? "发表中…" : "发表评论"}
          </button>
        </div>
        {submitError && <p className="mt-1 text-sm text-rose-600">{submitError}</p>}
      </form>

      {loading && comments.length === 0 ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-200" />
          ))}
        </div>
      ) : comments.length === 0 ? (
        <EmptyState message="暂无评论" description="来发表第一条评论吧" />
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500">用户 {comment.userId}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">
                    {new Date(comment.createdAt).toLocaleString("zh-CN")}
                  </span>
                  {/* Allow delete for current user (userId=1) or admin */}
                  <button
                    onClick={() => handleDelete(comment.id)}
                    disabled={deletingId === comment.id}
                    className="text-xs text-rose-500 hover:text-rose-700 disabled:opacity-50"
                  >
                    {deletingId === comment.id ? "删除中…" : "删除"}
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-700">{comment.content}</p>
            </div>
          ))}
          {pagination && pagination.page * pagination.pageSize < pagination.total && (
            <button
              onClick={() => fetchComments(pagination.page + 1)}
              className="w-full rounded-lg bg-slate-100 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200"
            >
              加载更多
            </button>
          )}
        </div>
      )}
    </div>
  );
}
```

---

### Task 7: Matches Page `/matches`

**Files:**
- Create: `frontend/src/app/matches/page.tsx`

**Interfaces:**
- Consumes: `MatchSummary`, `League`, `apiClient`, `ApiRequestError` from `@/lib/api`; `MatchCard` from `@/components/match-card`; `LoadingSkeleton`, `EmptyState`, `ErrorState` from `@/components/*`
- Produces: Full page with league filter, 4-state coverage

- [ ] Step 1: Write `matches/page.tsx`

"use client" page with league state (all / worldcup / spl), use league filter as query param. Fetch on mount + league change. Four states: loading skeleton, card grid, empty state ("暂无赛程"), error with retry.

<Actual full implementation provided below — too long for plan>

---

### Task 8: Match Detail Page `/matches/[id]`

**Files:**
- Create: `frontend/src/app/matches/[id]/page.tsx`

This is the most complex page: match detail + prediction form + comment section + favorite button + admin controls (enter result, change status).

---

### Task 9: Teams Page `/teams`

**Files:**
- Create: `frontend/src/app/teams/page.tsx`

---

### Task 10: Standings Page `/standings`

**Files:**
- Create: `frontend/src/app/standings/page.tsx`

---

### Task 11: Bracket Page `/bracket`

**Files:**
- Create: `frontend/src/app/bracket/page.tsx`

---

### Task 12: My Predictions Page `/my/predictions`

**Files:**
- Create: `frontend/src/app/my/predictions/page.tsx`

---

### Task 13: My Favorites Page `/my/favorites`

**Files:**
- Create: `frontend/src/app/my/favorites/page.tsx`

---

### Task 14: Update Layout with Navigation

**Files:**
- Modify: `frontend/src/app/layout.tsx`

Add top navigation bar linking to all pages while keeping existing metadata and structure.

---

## Execution

All tasks can be executed in parallel since they are independent files. The dependency chain is:
- Task 1 (api.ts) must be first
- Tasks 2-6 (components) can run after Task 1
- Tasks 7-13 (pages) can run after Tasks 1-6
- Task 14 (layout) can run after Task 7
