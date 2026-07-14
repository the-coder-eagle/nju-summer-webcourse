"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient, ApiRequestError, type Standing, type League } from "@/lib/api";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";

const LEAGUE_TABS: { label: string; value: League }[] = [
  { label: "世界杯", value: "worldcup" },
  { label: "苏超", value: "spl" },
];

export default function StandingsPage() {
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [league, setLeague] = useState<League>("worldcup");

  const fetchStandings = useCallback(
    async (selectedLeague: League) => {
      const res = await apiClient.getStandings({ league: selectedLeague });
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
        const data = await fetchStandings(league);
        if (!cancelled) setStandings(data);
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiRequestError) {
            setError(err.message);
          } else {
            setError("加载积分榜失败，请重试");
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
  }, [league, fetchStandings]);

  const handleRetry = useCallback(() => {
    setError(null);
    setLoading(true);
    fetchStandings(league)
      .then((data) => {
        setStandings(data);
        setLoading(false);
      })
      .catch((err) => {
        if (err instanceof ApiRequestError) {
          setError(err.message);
        } else {
          setError("加载积分榜失败，请重试");
        }
        setLoading(false);
      });
  }, [league, fetchStandings]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">积分榜</h1>
        <p className="mt-2 text-slate-500">查看各联赛球队积分排名</p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {LEAGUE_TABS.map((tab) => (
          <button
            key={tab.value}
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

      {loading && <LoadingSkeleton variant="table" count={10} />}

      {!loading && error && (
        <ErrorState message={error} onRetry={handleRetry} />
      )}

      {!loading && !error && standings.length === 0 && (
        <EmptyState message="暂无积分榜数据" />
      )}

      {!loading && !error && standings.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">#</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">球队</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">场次</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">胜</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">平</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">负</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">进球</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">失球</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">净胜球</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">积分</th>
                </tr>
              </thead>
              <tbody>
                {standings.map((standing, index) => (
                  <tr
                    key={standing.teamId}
                    className="border-t border-slate-100 transition-colors hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 text-center text-slate-500">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {standing.teamName}
                    </td>
                    <td className="px-4 py-3 text-slate-700">{standing.played}</td>
                    <td className="px-4 py-3 text-slate-700">{standing.won}</td>
                    <td className="px-4 py-3 text-slate-700">{standing.drawn}</td>
                    <td className="px-4 py-3 text-slate-700">{standing.lost}</td>
                    <td className="px-4 py-3 text-slate-700">{standing.goalsFor}</td>
                    <td className="px-4 py-3 text-slate-700">{standing.goalsAgainst}</td>
                    <td className="px-4 py-3 text-slate-700">{standing.goalDifference}</td>
                    <td className="px-4 py-3 text-right font-bold text-blue-700">
                      {standing.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
