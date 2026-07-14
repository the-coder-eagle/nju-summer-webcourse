import { Inject, Provide } from "@midwayjs/core";
import { FootballDbService } from "./football-db.service";
import type { Team, TeamRow, League } from "../entity/team.entity";

function toISODate(val: string): string {
  const iso = val.includes("T") ? val : `${val.replace(" ", "T")}Z`;
  return new Date(iso).toISOString();
}

function mapTeam(row: TeamRow): Team {
  return {
    id: row.id,
    name: row.name,
    logoUrl: row.logo_url,
    league: row.league as League,
    createdAt: toISODate(row.created_at),
  };
}

@Provide()
export class TeamService {
  @Inject()
  db: FootballDbService;

  list(league?: string) {
    const values: (string | number)[] = [];
    let where = "";
    if (league) {
      where = "WHERE league = ?";
      values.push(league);
    }
    const rows = this.db
      .getDb()
      .prepare(`SELECT * FROM teams ${where} ORDER BY name ASC`)
      .all(...values) as unknown as TeamRow[];
    return { data: rows.map(mapTeam) };
  }

  getById(teamId: number) {
    const row = this.db
      .getDb()
      .prepare("SELECT * FROM teams WHERE id = ?")
      .get(teamId) as unknown as TeamRow | undefined;
    return row ? mapTeam(row) : null;
  }
}
