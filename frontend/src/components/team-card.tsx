import Image from "next/image";
import type { Team } from "@/lib/api";

const leagueLabel: Record<string, string> = { worldcup: "世界杯", spl: "苏超" };

export function TeamCard({ team }: { team: Team }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-slate-100 shrink-0">
        {team.logoUrl ? (
          <Image src={team.logoUrl} alt={team.name} width={40} height={40} className="h-10 w-10 object-contain" />
        ) : (
          <span className="text-2xl">⚽</span>
        )}
      </div>
      <div className="min-w-0">
        <h3 className="font-bold text-slate-900 truncate">{team.name}</h3>
        <p className="text-xs text-slate-500">{leagueLabel[team.league] || team.league}</p>
      </div>
    </div>
  );
}
