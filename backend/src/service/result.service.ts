import { Inject, Provide } from "@midwayjs/core";
import { FootballDbService } from "./football-db.service";
import type { MatchResult, MatchResultRow } from "../entity/result.entity";
import { isValidStatusTransition } from "../entity/match.entity";

function toISODate(val: string): string {
  const iso = val.includes("T") ? val : `${val.replace(" ", "T")}Z`;
  return new Date(iso).toISOString();
}

function mapResult(row: MatchResultRow): MatchResult {
  return {
    id: row.id,
    matchId: row.match_id,
    homeScore: row.home_score,
    awayScore: row.away_score,
    enteredBy: row.entered_by,
    createdAt: toISODate(row.created_at),
  };
}

@Provide()
export class ResultService {
  @Inject()
  db: FootballDbService;

  enter(matchId: number, homeScore: number, awayScore: number, enteredBy: string) {
    /* Verify match exists */
    const match = this.db.getDb().prepare(
      "SELECT id, status FROM matches WHERE id = ?"
    ).get(matchId) as unknown as { id: number; status: string } | undefined;

    if (!match) return { error: "比赛不存在", status: 404 };

    /* Check if result already entered (BR-11: one-time only) */
    const existing = this.db.getDb().prepare(
      "SELECT id FROM match_results WHERE match_id = ?"
    ).get(matchId) as unknown as { id: number } | undefined;

    if (existing) return { error: "比赛结果已录入，不可覆盖", status: 409 };

    /* BR-18: validate status transition before setting finished */
    if (!isValidStatusTransition(match.status as any, "finished")) {
      return {
        error: `当前状态 "${match.status}" 不允许录入结果`,
        status: 400,
      };
    }

    /* Insert result */
    this.db.getDb().prepare(
      "INSERT INTO match_results (match_id, home_score, away_score, entered_by) VALUES (?, ?, ?, ?)"
    ).run(matchId, homeScore, awayScore, enteredBy);

    /* Update match status to finished (BR-10) */
    this.db.getDb().prepare(
      "UPDATE matches SET status = 'finished', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(matchId);

    const row = this.db.getDb().prepare(
      "SELECT * FROM match_results WHERE match_id = ?"
    ).get(matchId) as unknown as MatchResultRow;

    return { data: mapResult(row), status: 201 };
  }
}
