import { Inject, Provide } from "@midwayjs/core";
import { FootballDbService } from "./football-db.service";
import type { Standing, StandingRow } from "../entity/standing.entity";
import type { League } from "../entity/team.entity";

function mapStanding(row: StandingRow & { team_name?: string }): Standing & { teamName?: string } {
  return {
    id: row.id,
    teamId: row.team_id,
    league: row.league as League,
    played: row.played,
    won: row.won,
    drawn: row.drawn,
    lost: row.lost,
    goalsFor: row.goals_for,
    goalsAgainst: row.goals_against,
    goalDifference: row.goal_difference,
    points: row.points,
    teamName: row.team_name,
  };
}

@Provide()
export class StandingService {
  @Inject()
  db: FootballDbService;

  getStandings(league?: string) {
    const values: (string | number)[] = [];
    let where = "";
    if (league) {
      where = "WHERE s.league = ?";
      values.push(league);
    }
    const rows = this.db.getDb().prepare(
      `SELECT s.*, t.name AS team_name
       FROM standings s
       JOIN teams t ON s.team_id = t.id
       ${where}
       ORDER BY s.points DESC, s.goal_difference DESC, s.goals_for DESC`
    ).all(...values) as unknown as (StandingRow & { team_name: string })[];
    return { data: rows.map(mapStanding) };
  }
}
