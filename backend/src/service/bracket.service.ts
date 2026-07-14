import { Inject, Provide } from "@midwayjs/core";
import { FootballDbService } from "./football-db.service";
import type { Bracket, BracketRow } from "../entity/bracket.entity";
import type { League } from "../entity/team.entity";
import type { MatchStage } from "../entity/match.entity";

function mapBracket(row: BracketRow & { home_team_name: string | null; away_team_name: string | null }): any {
  return {
    id: row.id,
    league: row.league as League,
    stage: row.stage as MatchStage,
    matchId: row.match_id,
    homeTeamId: row.home_team_id,
    awayTeamId: row.away_team_id,
    homeScore: row.home_score,
    awayScore: row.away_score,
    parentNodeId: row.parent_node_id,
    position: row.position,
    homeTeamName: row.home_team_name,
    awayTeamName: row.away_team_name,
  };
}

@Provide()
export class BracketService {
  @Inject()
  db: FootballDbService;

  getBracket(league?: string) {
    const values: (string | number)[] = [];
    let where = "";
    if (league) {
      where = "WHERE b.league = ?";
      values.push(league);
    }
    const rows = this.db.getDb().prepare(
      `SELECT b.*, ht.name AS home_team_name, at.name AS away_team_name
       FROM brackets b
       LEFT JOIN teams ht ON b.home_team_id = ht.id
       LEFT JOIN teams at ON b.away_team_id = at.id
       ${where}
       ORDER BY b.stage, b.id`
    ).all(...values) as unknown as (BracketRow & { home_team_name: string | null; away_team_name: string | null })[];
    return { data: rows.map(mapBracket) };
  }
}
