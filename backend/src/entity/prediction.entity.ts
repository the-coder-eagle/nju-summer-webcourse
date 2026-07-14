/* Prediction entity */

export interface Prediction {
  id: number;
  userId: string;
  matchId: number;
  homeScore: number;
  awayScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface PredictionRow {
  id: number;
  user_id: string;
  match_id: number;
  home_score: number;
  away_score: number;
  created_at: string;
  updated_at: string;
}

export const CREATE_PREDICTIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    match_id INTEGER NOT NULL REFERENCES matches(id),
    home_score INTEGER NOT NULL,
    away_score INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, match_id)
  )
`;
