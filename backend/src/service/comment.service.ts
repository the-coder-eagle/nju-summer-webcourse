import { Inject, Provide } from "@midwayjs/core";
import { FootballDbService } from "./football-db.service";
import type { Comment, CommentRow } from "../entity/comment.entity";

function toISODate(val: string): string {
  const iso = val.includes("T") ? val : `${val.replace(" ", "T")}Z`;
  return new Date(iso).toISOString();
}

function mapComment(row: CommentRow): Comment {
  return {
    id: row.id,
    userId: row.user_id,
    matchId: row.match_id,
    content: row.content,
    deletedAt: row.deleted_at ? toISODate(row.deleted_at) : null,
    createdAt: toISODate(row.created_at),
  };
}

@Provide()
export class CommentService {
  @Inject()
  db: FootballDbService;

  create(userId: string, matchId: number, content: string) {
    /* Verify match exists */
    const match = this.db.getDb().prepare(
      "SELECT id FROM matches WHERE id = ?"
    ).get(matchId) as unknown as { id: number } | undefined;
    if (!match) return { error: "比赛不存在", status: 404 };

    this.db.getDb().prepare(
      "INSERT INTO comments (user_id, match_id, content) VALUES (?, ?, ?)"
    ).run(userId, matchId, content);

    /* Get the last inserted comment */
    const rows = this.db.getDb().prepare(
      "SELECT * FROM comments WHERE id = last_insert_rowid()"
    ).all() as unknown as CommentRow[];
    return { data: mapComment(rows[0]), status: 201 };
  }

  listByMatch(matchId: number, page: number, pageSize: number) {
    const offset = (page - 1) * pageSize;
    const rows = this.db.getDb().prepare(
      `SELECT * FROM comments
       WHERE match_id = ? AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`
    ).all(matchId, pageSize, offset) as unknown as CommentRow[];

    const total = (this.db.getDb().prepare(
      "SELECT COUNT(*) AS total FROM comments WHERE match_id = ? AND deleted_at IS NULL"
    ).get(matchId) as unknown as { total: number }).total;

    return {
      data: rows.map(mapComment),
      pagination: { page, pageSize, total },
    };
  }

  getById(commentId: number) {
    const row = this.db.getDb().prepare(
      "SELECT * FROM comments WHERE id = ? AND deleted_at IS NULL"
    ).get(commentId) as unknown as CommentRow | undefined;
    return row ? mapComment(row) : null;
  }

  softDelete(commentId: number) {
    const row = this.db.getDb().prepare(
      "SELECT * FROM comments WHERE id = ? AND deleted_at IS NULL"
    ).get(commentId) as unknown as CommentRow | undefined;

    if (!row) return { error: "评论不存在或已删除", status: 404 };

    this.db.getDb().prepare(
      "UPDATE comments SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).run(commentId);
    return { data: mapComment({ ...row, deleted_at: new Date().toISOString() }) };
  }
}
