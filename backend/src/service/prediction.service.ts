import { Inject, Provide } from "@midwayjs/core";
import { FootballDbService } from "./football-db.service";
import type { Prediction, PredictionRow } from "../entity/prediction.entity";
import { toISODate } from "../utils/date";

function mapPrediction(row: PredictionRow): Prediction {
  return {
    id: row.id,
    userId: row.user_id,
    matchId: row.match_id,
    homeScore: row.home_score,
    awayScore: row.away_score,
    createdAt: toISODate(row.created_at),
    updatedAt: toISODate(row.updated_at),
  };
}

@Provide()
export class PredictionService {
  @Inject()
  db: FootballDbService;

  /** Create or upsert a prediction. Returns the created/updated record or an error. */
  upsert(userId: string, matchId: number, homeScore: number, awayScore: number) {
    /* Check match status first */
    const match = this.db.getDb().prepare(
      "SELECT status FROM matches WHERE id = ?"
    ).get(matchId) as unknown as { status: string } | undefined;

    if (!match) return { error: "比赛不存在", status: 404 };
    if (match.status !== "scheduled") {
      return { error: "比赛已开始或已结束，无法提交预测", status: 400 };
    }

    /* UPSERT: single atomic statement avoids check-then-act race (BR-07) */
    const info = this.db.getDb().prepare(
      `INSERT INTO predictions (user_id, match_id, home_score, away_score)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(user_id, match_id) DO UPDATE SET
         home_score = excluded.home_score,
         away_score = excluded.away_score,
         updated_at = CURRENT_TIMESTAMP`
    ).run(userId, matchId, homeScore, awayScore);

    return { data: this.getByUserAndMatch(userId, matchId), created: info.changes > 0 };
  }

  getByUserAndMatch(userId: string, matchId: number) {
    const row = this.db.getDb().prepare(
      "SELECT * FROM predictions WHERE user_id = ? AND match_id = ?"
    ).get(userId, matchId) as unknown as PredictionRow | undefined;
    return row ? mapPrediction(row) : null;
  }

  getById(id: number) {
    const row = this.db.getDb().prepare(
      "SELECT * FROM predictions WHERE id = ?"
    ).get(id) as unknown as PredictionRow | undefined;
    return row ? mapPrediction(row) : null;
  }

  listByUser(userId: string) {
    const rows = this.db.getDb().prepare(
      `SELECT p.*, m.kickoff_time, m.status AS match_status, m.league,
              ht.name AS home_team_name, at.name AS away_team_name
       FROM predictions p
       JOIN matches m ON p.match_id = m.id
       JOIN teams ht ON m.home_team_id = ht.id
       JOIN teams at ON m.away_team_id = at.id
       WHERE p.user_id = ?
       ORDER BY p.created_at DESC`
    ).all(userId) as unknown as (PredictionRow & { kickoff_time: string; match_status: string; league: string; home_team_name: string; away_team_name: string })[];

    return {
      data: rows.map((r) => ({
        ...mapPrediction(r),
        match: {
          id: r.match_id,
          homeTeamName: r.home_team_name,
          awayTeamName: r.away_team_name,
          kickoffTime: new Date(`${r.kickoff_time.replace(" ", "T")}Z`).toISOString(),
          status: r.match_status,
          league: r.league,
        },
      })),
    };
  }
}
