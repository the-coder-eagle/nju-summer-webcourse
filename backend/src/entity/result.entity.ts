/* MatchResult entity */

export interface MatchResult {
  id: number;
  matchId: number;
  homeScore: number;
  awayScore: number;
  enteredBy: string;
  createdAt: string;
}

export interface MatchResultRow {
  id: number;
  match_id: number;
  home_score: number;
  away_score: number;
  entered_by: string;
  created_at: string;
}

export const CREATE_MATCH_RESULTS_TABLE = `
  CREATE TABLE IF NOT EXISTS match_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id INTEGER NOT NULL UNIQUE REFERENCES matches(id),
    home_score INTEGER NOT NULL,
    away_score INTEGER NOT NULL,
    entered_by TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`;
