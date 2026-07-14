"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient, ApiRequestError, type MatchSummary, type League } from "@/lib/api";
import { MatchCard } from "@/components/match-card";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";

const LEAGUE_TABS: { label: string; value: League | undefined }[] = [
  { label: "全部", value: undefined },
  { label: "世界杯", value: "worldcup" },
  { label: "苏超", value: "spl" },
];

export default function MatchesPage() {
  const [matches, setMatches] = useState<MatchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [league, setLeague] = useState<League | undefined>(undefined);

  const fetchMatches = useCallback(
    async (selectedLeague: League | undefined) => {
      // note: we don't set loading here; callers manage it
      try {
        const res = await apiClient.listMatches(
          selectedLeague ? { league: selectedLeague } : undefined
        );
        return res.data;
      } catch (err) {
        throw err;
      }
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchMatches(league);
        if (!cancelled) {
          setMatches(data);
        }
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiRequestError) {
            setError(err.message);
          } else if (err instanceof Error && err.name !== "AbortError") {
            setError("加载赛程失败，请重试");
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [league, fetchMatches]);

  const handleRetry = useCallback(() => {
    setError(null);
    setLoading(true);
    fetchMatches(league)
      .then((data) => {
        setMatches(data);
        setLoading(false);
      })
      .catch((err) => {
        if (err instanceof ApiRequestError) {
          setError(err.message);
        } else {
          setError("加载赛程失败，请重试");
        }
        setLoading(false);
      });
  }, [league, fetchMatches]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">赛程</h1>
        <p className="mt-2 text-slate-500">浏览世界杯和苏超比赛安排</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {LEAGUE_TABS.map((tab) => (
          <button
            key={tab.label}
            onClick={() => setLeague(tab.value)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              league === tab.value
                ? "bg-blue-700 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && <LoadingSkeleton variant="card" />}

      {!loading && error && <ErrorState message={error} onRetry={handleRetry} />}

      {!loading && !error && matches.length === 0 && (
        <EmptyState message="暂无赛程" description="当前没有符合条件的比赛" />
      )}

      {!loading && !error && matches.length > 0 && (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {matches.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      )}
    </main>
  );
}
