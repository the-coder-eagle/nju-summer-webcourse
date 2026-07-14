"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient, ApiRequestError, type BracketNode, type League } from "@/lib/api";
import { LoadingSkeleton } from "@/components/loading-skeleton";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";

const LEAGUE_TABS: { label: string; value: League }[] = [
  { label: "世界杯", value: "worldcup" },
  { label: "苏超", value: "spl" },
];

const STAGE_ORDER = ["round16", "quarter", "semi", "final"] as const;

const STAGE_LABELS: Record<string, string> = {
  round16: "16强",
  quarter: "1/4决赛",
  semi: "半决赛",
  final: "决赛",
};

function groupByStage(nodes: BracketNode[]): Map<string, BracketNode[]> {
  const map = new Map<string, BracketNode[]>();
  for (const node of nodes) {
    const list = map.get(node.stage) || [];
    list.push(node);
    map.set(node.stage, list);
  }
  return map;
}

export default function BracketPage() {
  const [nodes, setNodes] = useState<BracketNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [league, setLeague] = useState<League>("worldcup");

  const fetchBracket = useCallback(
    async (selectedLeague: League) => {
      const res = await apiClient.getBracket({ league: selectedLeague });
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
        const data = await fetchBracket(league);
        if (!cancelled) setNodes(data);
      } catch (err) {
        if (!cancelled) {
          if (err instanceof ApiRequestError) {
            setError(err.message);
          } else {
            setError("加载淘汰赛数据失败，请重试");
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
  }, [league, fetchBracket]);

  const handleRetry = useCallback(() => {
    setError(null);
    setLoading(true);
    fetchBracket(league)
      .then((data) => {
        setNodes(data);
        setLoading(false);
      })
      .catch((err) => {
        if (err instanceof ApiRequestError) {
          setError(err.message);
        } else {
          setError("加载淘汰赛数据失败，请重试");
        }
        setLoading(false);
      });
  }, [league, fetchBracket]);

  const stageMap = groupByStage(nodes);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">淘汰赛</h1>
        <p className="mt-2 text-slate-500">查看淘汰赛对阵和晋级情况</p>
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

      {loading && <LoadingSkeleton variant="detail" />}

      {!loading && error && (
        <ErrorState message={error} onRetry={handleRetry} />
      )}

      {!loading && !error && nodes.length === 0 && (
        <EmptyState message="暂无淘汰赛数据" description="淘汰赛对阵尚未生成" />
      )}

      {!loading && !error && nodes.length > 0 && (
        <div className="space-y-8">
          {STAGE_ORDER.map((stage) => {
            const stageNodes = stageMap.get(stage);
            if (!stageNodes || stageNodes.length === 0) return null;

            return (
              <div key={stage}>
                <div className="mb-4">
                  <h2 className="inline-block rounded-full bg-blue-700 px-4 py-1 text-sm font-semibold text-white">
                    {STAGE_LABELS[stage] ?? stage}
                  </h2>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {stageNodes.map((node) => (
                    <div
                      key={node.id}
                      className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex flex-1 flex-col items-center text-center">
                          <span className="text-sm font-medium text-slate-900">
                            {node.homeTeamName ?? "待定"}
                          </span>
                          {node.homeScore !== null && node.homeScore !== undefined && (
                            <span className="mt-1 text-2xl font-bold text-slate-800">
                              {node.homeScore}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-col items-center">
                          {node.homeScore !== null &&
                          node.homeScore !== undefined &&
                          node.awayScore !== null &&
                          node.awayScore !== undefined ? (
                            <span className="text-sm text-slate-400">:</span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                              VS
                            </span>
                          )}
                        </div>

                        <div className="flex flex-1 flex-col items-center text-center">
                          <span className="text-sm font-medium text-slate-900">
                            {node.awayTeamName ?? "待定"}
                          </span>
                          {node.awayScore !== null && node.awayScore !== undefined && (
                            <span className="mt-1 text-2xl font-bold text-slate-800">
                              {node.awayScore}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
