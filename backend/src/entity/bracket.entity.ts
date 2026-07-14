/* Bracket entity */

import type { League } from "./team.entity";
import type { MatchStage } from "./match.entity";

export interface Bracket {
  id: number;
  league: League;
  stage: MatchStage;
  matchId: number | null;
  homeTeamId: number | null;
  awayTeamId: number | null;
  homeScore: number | null;
  awayScore: number | null;
  parentNodeId: number | null;
  position: "left" | "right";
}

export interface BracketRow {
  id: number;
  league: string;
  stage: string;
  match_id: number | null;
  home_team_id: number | null;
  away_team_id: number | null;
  home_score: number | null;
  away_score: number | null;
  parent_node_id: number | null;
  position: string;
}

export const CREATE_BRACKETS_TABLE = `
  CREATE TABLE IF NOT EXISTS brackets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    league TEXT NOT NULL CHECK(league IN ('worldcup', 'spl')),
    stage TEXT NOT NULL CHECK(stage IN ('round16', 'quarter', 'semi', 'final')),
    match_id INTEGER REFERENCES matches(id),
    home_team_id INTEGER REFERENCES teams(id),
    away_team_id INTEGER REFERENCES teams(id),
    home_score INTEGER,
    away_score INTEGER,
    parent_node_id INTEGER REFERENCES brackets(id),
    position TEXT NOT NULL DEFAULT 'left' CHECK(position IN ('left', 'right'))
  )
`;
