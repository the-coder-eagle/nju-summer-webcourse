import Link from "next/link";
import type { MatchSummary } from "@/lib/api";
import { StatusBadge } from "./status-badge";

const leagueLabel: Record<string, string> = { worldcup: "世界杯", spl: "苏超" };

function formatKickoffTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

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
