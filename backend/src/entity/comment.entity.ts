/* Comment entity */

export interface Comment {
  id: number;
  userId: string;
  matchId: number;
  content: string;
  deletedAt: string | null;
  createdAt: string;
}

export interface CommentRow {
  id: number;
  user_id: string;
  match_id: number;
  content: string;
  deleted_at: string | null;
  created_at: string;
}

export const CREATE_COMMENTS_TABLE = `
  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    match_id INTEGER NOT NULL REFERENCES matches(id),
    content TEXT NOT NULL,
    deleted_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`;
