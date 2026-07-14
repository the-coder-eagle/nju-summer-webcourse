/* Favorite entity */

export type FavoriteType = "match" | "team";

export interface Favorite {
  id: number;
  userId: string;
  type: FavoriteType;
  targetId: number;
  createdAt: string;
}

export interface FavoriteRow {
  id: number;
  user_id: string;
  type: string;
  target_id: number;
  created_at: string;
}

export const CREATE_FAVORITES_TABLE = `
  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('match', 'team')),
    target_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, type, target_id)
  )
`;
