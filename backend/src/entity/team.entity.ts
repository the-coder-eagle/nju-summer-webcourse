/* Team entity */

export type League = "worldcup" | "spl";

export interface Team {
  id: number;
  name: string;
  logoUrl: string;
  league: League;
  createdAt: string;
}

export interface TeamRow {
  id: number;
  name: string;
  logo_url: string;
  league: string;
  created_at: string;
}

export const CREATE_TEAMS_TABLE = `
  CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    logo_url TEXT NOT NULL DEFAULT '',
    league TEXT NOT NULL CHECK(league IN ('worldcup', 'spl')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`;
