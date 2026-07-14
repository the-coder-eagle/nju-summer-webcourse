import { Inject, Provide } from "@midwayjs/core";
import { FootballDbService } from "./football-db.service";
import type { Match, MatchRow, MatchStatus } from "../entity/match.entity";
import type { League } from "../entity/team.entity";
import { isValidStatusTransition } from "../entity/match.entity";

function toISODate(val: string): string {
  // SQLite may store dates as "YYYY-MM-DD HH:MM:SS" or ISO 8601 "YYYY-MM-DDTHH:MM:SSZ"
  const iso = val.includes("T") ? val : `${val.replace(" ", "T")}Z`;
  return new Date(iso).toISOString();
}

function mapMatch(row: MatchRow): Match {
  return {
    id: row.id,
    homeTeamId: row.home_team_id,
    awayTeamId: row.away_team_id,
    kickoffTime: toISODate(row.kickoff_time),
    venue: row.venue,
    league: row.league as League,
    status: row.status as MatchStatus,
    stage: row.stage as Match["stage"],
    createdAt: toISODate(row.created_at),
    updatedAt: toISODate(row.updated_at),
  };
}

type MatchJoinRow = MatchRow & {
  home_team_name: string;
  home_team_logo: string;
  away_team_name: string;
  away_team_logo: string;
};

@Provide()
export class MatchService {
  @Inject()
  db: FootballDbService;

  list(params: {
    league?: string;
    status?: string;
    page: number;
    pageSize: number;
  }) {
    const conditions: string[] = [];
    const values: (string | number)[] = [];

    if (params.league) {
      conditions.push("m.league = ?");
      values.push(params.league);
    }
    if (params.status) {
      conditions.push("m.status = ?");
      values.push(params.status);
    }

    const where =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const offset = (params.page - 1) * params.pageSize;

    const rows = this.db
      .getDb()
      .prepare(
        `SELECT m.*, ht.name AS home_team_name, ht.logo_url AS home_team_logo,
                at.name AS away_team_name, at.logo_url AS away_team_logo
         FROM matches m
         JOIN teams ht ON m.home_team_id = ht.id
         JOIN teams at ON m.away_team_id = at.id
         ${where}
         ORDER BY m.kickoff_time ASC
         LIMIT ? OFFSET ?`,
      )
      .all(...values, params.pageSize, offset) as unknown as MatchJoinRow[];

    const total = (
      this.db
        .getDb()
        .prepare(
          `SELECT COUNT(*) AS total FROM matches m ${where}`,
        )
        .get(...values) as unknown as { total: number }
    ).total;

    return {
      data: rows.map((r) => ({
        ...mapMatch(r),
        homeTeam: {
          id: r.home_team_id,
          name: r.home_team_name,
          logoUrl: r.home_team_logo,
        },
        awayTeam: {
          id: r.away_team_id,
          name: r.away_team_name,
          logoUrl: r.away_team_logo,
        },
      })),
      pagination: { page: params.page, pageSize: params.pageSize, total },
    };
  }

  getById(matchId: number) {
    const row = this.db
      .getDb()
      .prepare(
        `SELECT m.*, ht.name AS home_team_name, ht.logo_url AS home_team_logo,
                at.name AS away_team_name, at.logo_url AS away_team_logo
         FROM matches m
         JOIN teams ht ON m.home_team_id = ht.id
         JOIN teams at ON m.away_team_id = at.id
         WHERE m.id = ?`,
      )
      .get(matchId) as unknown as MatchJoinRow | undefined;

    if (!row) return null;

    const commentCount = (
      this.db
        .getDb()
        .prepare(
          "SELECT COUNT(*) AS total FROM comments WHERE match_id = ? AND deleted_at IS NULL",
        )
        .get(matchId) as unknown as { total: number }
    ).total;

    return {
      ...mapMatch(row),
      homeTeam: {
        id: row.home_team_id,
        name: row.home_team_name,
        logoUrl: row.home_team_logo,
      },
      awayTeam: {
        id: row.away_team_id,
        name: row.away_team_name,
        logoUrl: row.away_team_logo,
      },
      commentCount,
    };
  }

  updateStatus(
    matchId: number,
    status: MatchStatus,
  ): { data: Record<string, unknown> } | { error: string; status: number } {
    const match = this.getById(matchId);
    if (!match) return { error: "比赛不存在", status: 404 };

    if (!isValidStatusTransition(match.status, status)) {
      return {
        error: `不能从 ${match.status} 转换到 ${status}`,
        status: 400,
      };
    }

    this.db
      .getDb()
      .prepare(
        "UPDATE matches SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      )
      .run(status, matchId);
    return { data: this.getById(matchId)! };
  }
}
