/* Match entity */

import type { League } from "./team.entity";

export type MatchStatus =
  | "scheduled"
  | "live"
  | "finished"
  | "postponed"
  | "cancelled";

export type MatchStage = "group" | "round16" | "quarter" | "semi" | "final";

export interface Match {
  id: number;
  homeTeamId: number;
  awayTeamId: number;
  kickoffTime: string;
  venue: string;
  league: League;
  status: MatchStatus;
  stage: MatchStage;
  createdAt: string;
  updatedAt: string;
}

export interface MatchRow {
  id: number;
  home_team_id: number;
  away_team_id: number;
  kickoff_time: string;
  venue: string;
  league: string;
  status: string;
  stage: string;
  created_at: string;
  updated_at: string;
}

export const CREATE_MATCHES_TABLE = `
  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    home_team_id INTEGER NOT NULL REFERENCES teams(id),
    away_team_id INTEGER NOT NULL REFERENCES teams(id),
    kickoff_time TEXT NOT NULL,
    venue TEXT NOT NULL,
    league TEXT NOT NULL CHECK(league IN ('worldcup', 'spl')),
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'live', 'finished', 'postponed', 'cancelled')),
    stage TEXT NOT NULL DEFAULT 'group' CHECK(stage IN ('group', 'round16', 'quarter', 'semi', 'final')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`;

/* BR-18 state machine: valid transitions */
export const VALID_STATUS_TRANSITIONS: Record<MatchStatus, MatchStatus[]> = {
  scheduled: ["live", "postponed", "cancelled"],
  live: ["finished", "postponed", "cancelled"],
  finished: [],
  postponed: [],
  cancelled: [],
};

export function isValidStatusTransition(
  from: MatchStatus,
  to: MatchStatus,
): boolean {
  const allowed = VALID_STATUS_TRANSITIONS[from];
  return allowed !== undefined && allowed.includes(to);
}
