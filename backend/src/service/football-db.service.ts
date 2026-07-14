/* Shared database connection for football-related tables */

import { Config, Destroy, Init, Provide } from "@midwayjs/core";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { CREATE_TEAMS_TABLE } from "../entity/team.entity";
import { CREATE_MATCHES_TABLE } from "../entity/match.entity";
import { CREATE_STANDINGS_TABLE } from "../entity/standing.entity";
import { CREATE_BRACKETS_TABLE } from "../entity/bracket.entity";
import { CREATE_PREDICTIONS_TABLE } from "../entity/prediction.entity";
import { CREATE_FAVORITES_TABLE } from "../entity/favorite.entity";
import { CREATE_COMMENTS_TABLE } from "../entity/comment.entity";
import { CREATE_MATCH_RESULTS_TABLE } from "../entity/result.entity";

@Provide()
export class FootballDbService {
  @Config("footballDatabase.path")
  databasePath: string;

  private database: DatabaseSync;

  @Init()
  async initialize() {
    const absolutePath = resolve(process.cwd(), this.databasePath);
    mkdirSync(dirname(absolutePath), { recursive: true });
    this.database = new DatabaseSync(absolutePath);

    /* Enable WAL mode for better read/write concurrency (BR-17) */
    this.database.exec("PRAGMA journal_mode=WAL");
    /* Reduce busy timeout to avoid long-lived locks */
    this.database.exec("PRAGMA busy_timeout=5000");

    /* Create all tables */
    this.database.exec(CREATE_TEAMS_TABLE);
    this.database.exec(CREATE_MATCHES_TABLE);
    this.database.exec(CREATE_STANDINGS_TABLE);
    this.database.exec(CREATE_BRACKETS_TABLE);
    this.database.exec(CREATE_PREDICTIONS_TABLE);
    this.database.exec(CREATE_FAVORITES_TABLE);
    this.database.exec(CREATE_COMMENTS_TABLE);
    this.database.exec(CREATE_MATCH_RESULTS_TABLE);

    /* Seed data if tables are empty */
    this.seedIfEmpty();
  }

  getDb(): DatabaseSync {
    return this.database;
  }

  @Destroy()
  async close() {
    this.database?.close();
  }

  /* --- seed data --- */

  private seedIfEmpty(): void {
    const teamCount = this.database
      .prepare("SELECT COUNT(*) AS total FROM teams")
      .get() as { total: number };

    if (teamCount.total > 0) return;

    this.seedTeams();
    this.seedMatches();
    this.seedStandings();
  }

  private seedTeams(): void {
    const insert = this.database.prepare(
      "INSERT INTO teams (name, logo_url, league) VALUES (?, ?, ?)",
    );
    const teams: [string, string, string][] = [
      ["阿根廷", "https://flagcdn.com/w320/ar.png", "worldcup"],
      ["巴西", "https://flagcdn.com/w320/br.png", "worldcup"],
      ["英格兰", "https://flagcdn.com/w320/gb-eng.png", "worldcup"],
      ["法国", "https://flagcdn.com/w320/fr.png", "worldcup"],
      ["德国", "https://flagcdn.com/w320/de.png", "worldcup"],
      ["日本", "https://flagcdn.com/w320/jp.png", "worldcup"],
      ["摩洛哥", "https://flagcdn.com/w320/ma.png", "worldcup"],
      ["西班牙", "https://flagcdn.com/w320/es.png", "worldcup"],
    ];
    for (const t of teams) {
      insert.run(...t);
    }
  }

  private seedMatches(): void {
    /* Group A: Argentina(1), Brazil(2), England(3), France(4) */
    const insert = this.database.prepare(
      `INSERT INTO matches (home_team_id, away_team_id, kickoff_time, venue, league, status, stage)
       VALUES (?, ?, ?, ?, 'worldcup', 'scheduled', 'group')`,
    );
    const matches: [number, number, string, string][] = [
      [1, 2, "2026-07-20T18:00:00Z", "卢赛尔体育场"],
      [3, 4, "2026-07-20T22:00:00Z", "海湾体育场"],
      [1, 3, "2026-07-24T18:00:00Z", "卢赛尔体育场"],
      [2, 4, "2026-07-24T22:00:00Z", "海湾体育场"],
      [2, 3, "2026-07-28T18:00:00Z", "卢赛尔体育场"],
      [1, 4, "2026-07-28T22:00:00Z", "海湾体育场"],
      /* Group B: Germany(5), Japan(6), Morocco(7), Spain(8) */
      [5, 6, "2026-07-21T18:00:00Z", "教育城体育场"],
      [7, 8, "2026-07-21T22:00:00Z", "974 体育场"],
      [5, 7, "2026-07-25T18:00:00Z", "教育城体育场"],
      [6, 8, "2026-07-25T22:00:00Z", "974 体育场"],
      [6, 7, "2026-07-29T18:00:00Z", "教育城体育场"],
      [5, 8, "2026-07-29T22:00:00Z", "974 体育场"],
    ];
    for (const m of matches) {
      insert.run(...m);
    }
  }

  private seedStandings(): void {
    const insert = this.database.prepare(
      `INSERT INTO standings (team_id, league, played, won, drawn, lost, goals_for, goals_against, goal_difference, points)
       VALUES (?, 'worldcup', 0, 0, 0, 0, 0, 0, 0, 0)`,
    );
    for (let teamId = 1; teamId <= 8; teamId++) {
      insert.run(teamId);
    }
  }
}
