"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { apiClient, ApiRequestError, type MatchDetail, type Prediction, type Favorite, type MatchStatus } from "@/lib/api";
import { StatusBadge } from "@/components/status-badge";
import { PredictionForm } from "@/components/prediction-form";
import { CommentSection } from "@/components/comment-section";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { ErrorState } from "@/components/error-state";

// ---- Helpers ----

const leagueLabel: Record<string, string> = { worldcup: "世界杯", spl: "苏超" };

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Ordered statuses that represent a valid linear progression for admin controls. */
const STATUS_OPTIONS: { value: MatchStatus; label: string }[] = [
  { value: "scheduled", label: "未开始" },
  { value: "live", label: "进行中" },
  { value: "finished", label: "已结束" },
  { value: "postponed", label: "延期" },
  { value: "cancelled", label: "取消" },
];

/** Lightweight result shape if the API includes scores on the match object. */
interface MatchScores {
  homeScore: number | null;
  awayScore: number | null;
}

export default function MatchDetailPage() {
  const params = useParams();
  const matchId = Number(params.id);

  // ---- Core data states ----
  const [match, setMatch] = useState<MatchDetail | null>(null);
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [favorite, setFavorite] = useState<Favorite | null>(null);
  const [scores, setScores] = useState<MatchScores | null>(null);

  // ---- UI states ----
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [is404, setIs404] = useState(false);

  // ---- Admin control states ----
  const [adminStatus, setAdminStatus] = useState<MatchStatus | null>(null);
  const [adminHomeScore, setAdminHomeScore] = useState("");
  const [adminAwayScore, setAdminAwayScore] = useState("");
  const [adminSubmitting, setAdminSubmitting] = useState(false);
  const [adminMessage, setAdminMessage] = useState<string | null>(null);

  // ---- Favorite toggle states ----
  const [favoriteLoading, setFavoriteLoading] = useState(false);

  // ============================================================
  // Data fetching
  // ============================================================
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      if (Number.isNaN(matchId)) {
        setLoading(false);
        setIs404(true);
        setError("无效的比赛 ID");
        return;
      }

      setLoading(true);
      setError(null);
      setIs404(false);

      try {
        const [matchRes, predictionsRes, favoritesRes] = await Promise.all([
          apiClient.getMatch(matchId),
          apiClient.listMyPredictions(),
          apiClient.listMyFavorites(),
        ]);

        if (cancelled) return;

        const matchData = matchRes.data;
        setMatch(matchData);
        setAdminStatus(matchData.status);

        // Try to pick up scores from the match object (api may include them)
        const raw = matchData as MatchDetail & { homeScore?: number | null; awayScore?: number | null };
        if (raw.homeScore !== undefined || raw.awayScore !== undefined) {
          setScores({ homeScore: raw.homeScore ?? null, awayScore: raw.awayScore ?? null });
        }

        // Find user's prediction for this match
        const userPrediction = predictionsRes.data.find((p) => p.matchId === matchId) ?? null;
        setPrediction(userPrediction);

        // Find if this match is favorited
        const fav =
          favoritesRes.data.find(
            (f) => f.type === "match" && f.targetId === matchId,
          ) ?? null;
        setFavorite(fav);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiRequestError) {
          if (err.status === 404) {
            setIs404(true);
            setError("比赛不存在");
          } else {
            setError(err.message);
          }
        } else {
          setError("加载比赛详情失败，请重试");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadData();
    return () => { cancelled = true; };
  }, [matchId, retryCount]);

  const fetchData = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  // ============================================================
  // Prediction callback
  // ============================================================
  const handlePredictionSuccess = useCallback(
    (newPrediction: Prediction) => {
      setPrediction(newPrediction);
    },
    [],
  );

  // ============================================================
  // Favorite toggle
  // ============================================================
  const handleToggleFavorite = useCallback(async () => {
    setFavoriteLoading(true);
    try {
      if (favorite) {
        await apiClient.removeFavorite(favorite.id);
        setFavorite(null);
      } else {
        const res = await apiClient.addFavorite({ type: "match", targetId: matchId });
        setFavorite(res.data);
      }
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : "操作失败，请重试";
      // Keep adminMessage generic enough for inline feedback
      setAdminMessage(msg);
    } finally {
      setFavoriteLoading(false);
    }
  }, [favorite, matchId]);

  // ============================================================
  // Admin: update match status
  // ============================================================
  const handleStatusUpdate = useCallback(
    async (newStatus: MatchStatus) => {
      setAdminSubmitting(true);
      setAdminMessage(null);
      try {
        const res = await apiClient.updateMatchStatus(matchId, newStatus);
        setMatch(res.data);
        setAdminStatus(res.data.status);
        setAdminMessage("状态更新成功");
      } catch (err) {
        const msg = err instanceof ApiRequestError ? err.message : "状态更新失败";
        setAdminMessage(msg);
      } finally {
        setAdminSubmitting(false);
      }
    },
    [matchId],
  );

  // ============================================================
  // Admin: enter match result
  // ============================================================
  const handleEnterResult = useCallback(async () => {
    const home = Number(adminHomeScore);
    const away = Number(adminAwayScore);
    if (Number.isNaN(home) || Number.isNaN(away)) {
      setAdminMessage("请输入有效的比分");
      return;
    }

    setAdminSubmitting(true);
    setAdminMessage(null);
    try {
      const res = await apiClient.enterResult(matchId, { homeScore: home, awayScore: away });
      setScores({ homeScore: res.data.homeScore, awayScore: res.data.awayScore });
      setAdminHomeScore("");
      setAdminAwayScore("");
      setAdminMessage("比分录入成功");
    } catch (err) {
      const msg = err instanceof ApiRequestError ? err.message : "比分录入失败";
      setAdminMessage(msg);
    } finally {
      setAdminSubmitting(false);
    }
  }, [matchId, adminHomeScore, adminAwayScore]);

  // ============================================================
  // Render: Loading
  // ============================================================
  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <LoadingSkeleton variant="detail" />
      </div>
    );
  }

  // ============================================================
  // Render: Error (non-404)
  // ============================================================
  if (error && !is404) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <ErrorState message={error} onRetry={fetchData} />
      </div>
    );
  }

  // ============================================================
  // Render: 404 / Empty
  // ============================================================
  if (is404 || !match) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-10">
        <nav className="mb-8">
          <Link
            href="/matches"
            className="text-sm text-blue-600 hover:text-blue-800 transition"
          >
            &larr; 返回赛程列表
          </Link>
        </nav>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-20 text-center">
          <span className="text-5xl">🏟</span>
          <h2 className="mt-4 text-xl font-semibold text-slate-700">比赛不存在</h2>
          <p className="mt-2 text-sm text-slate-500">
            {error || "找不到该比赛，可能已被删除或 ID 不正确"}
          </p>
          <Link
            href="/matches"
            className="mt-6 rounded-full bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 transition"
          >
            返回赛程列表
          </Link>
        </div>
      </div>
    );
  }

  // ============================================================
  // Render: Success
  // ============================================================
  const showResult =
    match.status === "finished" && scores && scores.homeScore !== null && scores.awayScore !== null;

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      {/* ---- Breadcrumb ---- */}
      <nav className="mb-6">
        <Link
          href="/matches"
          className="text-sm text-blue-600 hover:text-blue-800 transition"
        >
          &larr; 返回赛程列表
        </Link>
      </nav>

      {/* ============================================ */}
      {/* Section 1 – Match Header                      */}
      {/* ============================================ */}
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center gap-4">
          {/* League + Status */}
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-blue-100 px-3 py-1 font-mono text-xs font-semibold text-blue-700">
              {leagueLabel[match.league] || match.league}
            </span>
            <StatusBadge status={match.status} />
          </div>

          {/* Team Names + VS */}
          <div className="flex w-full items-center justify-center gap-6 sm:gap-10">
            <div className="flex-1 text-right">
              <p className="text-2xl font-bold text-slate-900">
                {match.homeTeam.name}
              </p>
            </div>

            <div className="flex flex-col items-center gap-1">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-500">
                VS
              </div>
              {showResult && (
                <span className="text-2xl font-bold text-blue-700">
                  {scores!.homeScore} : {scores!.awayScore}
                </span>
              )}
            </div>

            <div className="flex-1 text-left">
              <p className="text-2xl font-bold text-slate-900">
                {match.awayTeam.name}
              </p>
            </div>
          </div>

          {/* Meta info */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-slate-500">
            <span>{formatDateTime(match.kickoffTime)}</span>
            <span className="text-slate-300">|</span>
            <span>{match.venue}</span>
            {match.stage && (
              <>
                <span className="text-slate-300">|</span>
                <span>{match.stage}</span>
              </>
            )}
          </div>

          {/* ---- Favorite Button ---- */}
          <button
            onClick={handleToggleFavorite}
            disabled={favoriteLoading}
            className={`mt-2 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
              favorite
                ? "border-rose-300 bg-rose-50 text-rose-600 hover:bg-rose-100"
                : "border-blue-300 bg-blue-50 text-blue-600 hover:bg-blue-100"
            }`}
          >
            <span>{favorite ? "♥" : "♡"}</span>
            <span>{favorite ? "已收藏" : "收藏"}</span>
          </button>
        </div>
      </div>

      {/* ============================================ */}
      {/* Section 2 – Prediction                        */}
      {/* ============================================ */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">比分预测</h2>
        <PredictionForm
          matchId={matchId}
          matchStatus={match.status}
          existingPrediction={prediction}
          onSuccess={handlePredictionSuccess}
        />
      </div>

      {/* ============================================ */}
      {/* Section 3 – Comments                          */}
      {/* ============================================ */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">评论</h2>
        <CommentSection matchId={matchId} />
      </div>

      {/* ============================================ */}
      {/* Section 4 – Admin Controls                    */}
      {/* ============================================ */}
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">管理员操作</h2>

        {adminMessage && (
          <div
            className={`mb-4 rounded-lg px-4 py-3 text-sm font-medium ${
              adminMessage.includes("成功")
                ? "bg-emerald-50 text-emerald-700"
                : "bg-rose-50 text-rose-700"
            }`}
          >
            {adminMessage}
          </div>
        )}

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Status update */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              修改比赛状态
            </label>
            <div className="flex gap-2">
              <select
                value={adminStatus ?? match.status}
                onChange={(e) => setAdminStatus(e.target.value as MatchStatus)}
                className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  if (adminStatus) handleStatusUpdate(adminStatus);
                }}
                disabled={
                  adminSubmitting || adminStatus === match.status
                }
                className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                更新
              </button>
            </div>
          </div>

          {/* Result entry */}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              {scores && scores.homeScore !== null
                ? `当前比分: ${scores.homeScore} : ${scores.awayScore}`
                : "录入比赛结果"}
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="主队"
                value={adminHomeScore}
                onChange={(e) => setAdminHomeScore(e.target.value)}
                className="w-20 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-sm font-semibold text-slate-400">:</span>
              <input
                type="number"
                placeholder="客队"
                value={adminAwayScore}
                onChange={(e) => setAdminAwayScore(e.target.value)}
                className="w-20 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                onClick={handleEnterResult}
                disabled={adminSubmitting}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                提交
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
