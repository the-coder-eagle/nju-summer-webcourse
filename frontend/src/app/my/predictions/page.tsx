"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { apiClient, ApiRequestError, type PredictionWithMatch } from "@/lib/api";
import { StatusBadge } from "@/components/status-badge";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
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

export default function MyPredictionsPage() {
  const [predictions, setPredictions] = useState<PredictionWithMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ============================================================
  // Data fetching
  // ============================================================
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadPredictions() {
      setLoading(true);
      setError(null);

      try {
        const res = await apiClient.listMyPredictions();
        if (!cancelled) setPredictions(res.data);
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiRequestError) {
            setError(err.message);
          } else {
            setError("加载预测记录失败，请重试");
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadPredictions();
    return () => { cancelled = true; };
  }, [retryCount]);

  const fetchPredictions = useCallback(() => {
    setRetryCount((c) => c + 1);
  }, []);

  // ============================================================
  // Render: Loading
  // ============================================================
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-4xl px-6 py-10">
          <LoadingSkeleton variant="list" />
        </div>
      </div>
    );
  }

  // ============================================================
  // Render: Error
  // ============================================================
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-4xl px-6 py-10">
          <ErrorState message={error} onRetry={fetchPredictions} />
        </div>
      </div>
    );
  }

  // ============================================================
  // Render: Empty
  // ============================================================
  if (predictions.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-4xl px-6 py-10">
          <nav className="mb-6">
            <Link
              href="/matches"
              className="text-sm text-blue-600 hover:text-blue-800 transition"
            >
              &larr; 返回赛程列表
            </Link>
          </nav>
          <EmptyState
            message="暂无预测"
            description="你还没有提交任何比分预测"
          />
        </div>
      </div>
    );
  }

  // ============================================================
  // Render: Success
  // ============================================================
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-4xl px-6 py-10">
        {/* ---- Page Header ---- */}
        <nav className="mb-6">
          <Link
            href="/matches"
            className="text-sm text-blue-600 hover:text-blue-800 transition"
          >
            &larr; 返回赛程列表
          </Link>
        </nav>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">我的预测</h1>
          <p className="mt-2 text-slate-500">
            共 {predictions.length} 条预测记录
          </p>
        </div>

        {/* ---- Prediction Cards ---- */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {predictions.map((item) => (
            <Link
              key={item.id}
              href={`/matches/${item.matchId}`}
              className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              {/* Top row: League + Status */}
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-full bg-blue-100 px-3 py-1 font-mono text-xs font-semibold text-blue-700">
                  {leagueLabel[item.match.league] || item.match.league}
                </span>
                <StatusBadge status={item.match.status} />
              </div>

              {/* Middle: Teams */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 text-right">
                  <p className="font-bold text-slate-900">
                    {item.match.homeTeamName}
                  </p>
                </div>
                <span className="text-sm font-semibold text-slate-400">VS</span>
                <div className="flex-1 text-left">
                  <p className="font-bold text-slate-900">
                    {item.match.awayTeamName}
                  </p>
                </div>
              </div>

              {/* Bottom: Prediction + Kickoff */}
              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-lg font-bold text-blue-700">
                  你的预测: {item.homeScore} : {item.awayScore}
                </span>
                <span className="text-xs text-slate-400">
                  {formatDateTime(item.match.kickoffTime)}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
