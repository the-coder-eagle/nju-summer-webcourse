"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient, ApiRequestError, type Team, type League } from "@/lib/api";
import { TeamCard } from "@/components/team-card";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";

const LEAGUE_TABS: { label: string; value: League | undefined }[] = [
  { label: "全部", value: undefined },
  { label: "世界杯", value: "worldcup" },
  { label: "苏超", value: "spl" },
];

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [league, setLeague] = useState<League | undefined>(undefined);

  const fetchTeams = useCallback(
    async (selectedLeague: League | undefined) => {
      const res = await apiClient.listTeams(
        selectedLeague ? { league: selectedLeague } : undefined
      );
      return res.data;
    },
    []
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchTeams(league);
        if (!cancelled) setTeams(data);
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiRequestError) {
            setError(err.message);
          } else {
            setError("加载球队失败，请重试");
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [league, fetchTeams]);

  const handleRetry = useCallback(() => {
    setError(null);
    setLoading(true);
    fetchTeams(league)
      .then((data) => {
        setTeams(data);
        setLoading(false);
      })
      .catch((err) => {
        if (err instanceof ApiRequestError) {
          setError(err.message);
        } else {
          setError("加载球队失败，请重试");
        }
        setLoading(false);
      });
  }, [league, fetchTeams]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">球队</h1>
        <p className="mt-2 text-slate-500">浏览参赛球队信息</p>
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

      {!loading && !error && teams.length === 0 && (
        <EmptyState message="暂无球队" />
      )}

      {!loading && !error && teams.length > 0 && (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      )}
    </main>
  );
}
