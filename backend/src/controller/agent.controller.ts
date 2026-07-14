import {
  Controller,
  Get,
  httpError,
  Inject,
  Query,
} from "@midwayjs/core";
import { MatchService } from "../service/match.service";
import { TeamService } from "../service/team.service";
import { StandingService } from "../service/standing.service";

/**
 * Agent / WorkBuddy integration endpoint.
 * Accepts natural-language questions and queries existing services.
 */
@Controller("/api")
export class AgentController {
  @Inject()
  matchService: MatchService;
  @Inject()
  teamService: TeamService;
  @Inject()
  standingService: StandingService;

  @Get("/agent/query")
  async query(@Query() query: Record<string, unknown>) {
    const q = typeof query.q === "string" ? query.q.trim() : "";
    if (!q) {
      throw new httpError.BadRequestError("缺少查询参数 q");
    }

    const answer = this.processQuery(q);
    return { data: { query: q, answer } };
  }

  private processQuery(q: string): string {
    const lower = q.toLowerCase();
    const hasWorldcup = lower.includes("世界杯") || lower.includes("worldcup");
    const hasSpl = lower.includes("苏超") || lower.includes("spl");

    // --- Matches ---
    if (lower.includes("比赛") || lower.includes("赛程") || lower.includes("match")) {
      const league = hasWorldcup ? "worldcup" : hasSpl ? "spl" : undefined;
      const result = this.matchService.list({ league, page: 1, pageSize: 20 });
      const matches = result.data;
      if (matches.length === 0) {
        const leagueLabel = league === "worldcup" ? "世界杯" : league === "spl" ? "苏超" : "";
        return leagueLabel ? `目前没有${leagueLabel}比赛。` : "目前没有比赛。";
      }
      const leagueLabel = league === "worldcup" ? "世界杯" : league === "spl" ? "苏超" : "";
      const header = leagueLabel ? `${leagueLabel}赛程` : "赛程";
      const lines = matches.map(
        (m) =>
          `${m.homeTeam.name} vs ${m.awayTeam.name} — ${new Date(m.kickoffTime).toLocaleString("zh-CN")} — ${m.venue}（${m.status === "scheduled" ? "未开始" : m.status}）`,
      );
      return `${header}（共${result.pagination.total}场）：\n${lines.join("\n")}`;
    }

    // --- Specific team queries (must come before general category checks) ---
    const allTeams = this.teamService.list().data;
    const matchedTeam = allTeams.find((t) => lower.includes(t.name.toLowerCase()));
    if (matchedTeam) {
      const standings = this.standingService.getStandings(matchedTeam.league);
      const teamStanding = standings.data.find((s) => s.teamId === matchedTeam.id);
      const parts: string[] = [`${matchedTeam.name}（${matchedTeam.league === "worldcup" ? "世界杯" : "苏超"}）`];
      if (teamStanding) {
        parts.push(
          `积分榜：赛${teamStanding.played}场 胜${teamStanding.won} 平${teamStanding.drawn} 负${teamStanding.lost}`,
          `进球${teamStanding.goalsFor} 失球${teamStanding.goalsAgainst} 积分${teamStanding.points}`,
        );
      }
      const matches = this.matchService.list({ league: matchedTeam.league, page: 1, pageSize: 20 });
      const teamMatches = matches.data.filter(
        (m) => m.homeTeamId === matchedTeam.id || m.awayTeamId === matchedTeam.id,
      );
      if (teamMatches.length > 0) {
        const matchLines = teamMatches.map(
          (m) =>
            `${m.homeTeam.name} vs ${m.awayTeam.name} — ${new Date(m.kickoffTime).toLocaleString("zh-CN")}（${m.status === "scheduled" ? "未开始" : m.status}）`,
        );
        parts.push(`相关比赛（${teamMatches.length}场）：\n${matchLines.join("\n")}`);
      }
      return parts.join("\n");
    }

    // --- Standings ---
    if (lower.includes("积分") || lower.includes("排名") || lower.includes("积分榜") || lower.includes("standing")) {
      const league = hasWorldcup ? "worldcup" : hasSpl ? "spl" : undefined;
      const result = this.standingService.getStandings(league);
      const standings = result.data;
      if (standings.length === 0) {
        return "暂无积分数据。";
      }
      const leagueLabel = league === "worldcup" ? "世界杯" : league === "spl" ? "苏超" : "";
      const header = leagueLabel ? `${leagueLabel}积分榜` : "积分榜";
      const lines = standings.map(
        (s, i) =>
          `${i + 1}. ${s.teamName || `队伍 ${s.teamId}`} — 赛${s.played} 胜${s.won} 平${s.drawn} 负${s.lost} 进${s.goalsFor}/失${s.goalsAgainst} 净胜${s.goalDifference} 积分${s.points}`,
      );
      return `${header}：\n${lines.join("\n")}`;
    }

    // --- Teams ---
    if (lower.includes("球队") || lower.includes("队伍") || lower.includes("team")) {
      const league = hasWorldcup ? "worldcup" : hasSpl ? "spl" : undefined;
      const result = this.teamService.list(league);
      const teams = result.data;
      if (teams.length === 0) {
        return "未找到球队。";
      }
      const leagueLabel = league === "worldcup" ? "世界杯" : league === "spl" ? "苏超" : "";
      const header = leagueLabel ? `${leagueLabel}球队` : "球队列表";
      const lines = teams.map((t) => `${t.name}（${t.league === "worldcup" ? "世界杯" : "苏超"}）`);
      return `${header}（共${teams.length}支）：\n${lines.join("\n")}`;
    }

    // --- Fallback ---
    return "抱歉，我还不能理解这个问题。你可以尝试询问：\n" +
      '• "世界杯有哪些比赛？"\n' +
      '• "查看世界杯积分榜"\n' +
      '• "巴西队积分多少？"\n' +
      '• "查看所有球队"';
  }
}
