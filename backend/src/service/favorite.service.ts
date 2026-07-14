import { Inject, Provide } from "@midwayjs/core";
import { FootballDbService } from "./football-db.service";
import type { Favorite, FavoriteRow, FavoriteType } from "../entity/favorite.entity";

function toISODate(val: string): string {
  const iso = val.includes("T") ? val : `${val.replace(" ", "T")}Z`;
  return new Date(iso).toISOString();
}

function mapFavorite(row: FavoriteRow): Favorite {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type as FavoriteType,
    targetId: row.target_id,
    createdAt: toISODate(row.created_at),
  };
}

@Provide()
export class FavoriteService {
  @Inject()
  db: FootballDbService;

  add(userId: string, type: FavoriteType, targetId: number) {
    /* Atomic INSERT OR IGNORE avoids check-then-act race (BR-12 / AC-19) */
    const info = this.db.getDb().prepare(
      `INSERT INTO favorites (user_id, type, target_id)
       VALUES (?, ?, ?)
       ON CONFLICT(user_id, type, target_id) DO NOTHING`
    ).run(userId, type, targetId);

    if (info.changes === 0) {
      return { error: "已收藏该目标", status: 409 };
    }

    const row = this.db.getDb().prepare(
      "SELECT * FROM favorites WHERE user_id = ? AND type = ? AND target_id = ?"
    ).get(userId, type, targetId) as unknown as FavoriteRow;

    return { data: mapFavorite(row), status: 201 };
  }

  remove(favoriteId: number) {
    const existing = this.db.getDb().prepare(
      "SELECT * FROM favorites WHERE id = ?"
    ).get(favoriteId) as unknown as FavoriteRow | undefined;

    if (!existing) {
      return { error: "收藏不存在", status: 404 };
    }

    this.db.getDb().prepare("DELETE FROM favorites WHERE id = ?").run(favoriteId);
    return { data: mapFavorite(existing) };
  }

  getById(favoriteId: number) {
    const row = this.db.getDb().prepare(
      "SELECT * FROM favorites WHERE id = ?"
    ).get(favoriteId) as unknown as FavoriteRow | undefined;
    return row ? mapFavorite(row) : null;
  }

  listByUser(userId: string) {
    const rows = this.db.getDb().prepare(
      "SELECT * FROM favorites WHERE user_id = ? ORDER BY created_at DESC"
    ).all(userId) as unknown as FavoriteRow[];
    return { data: rows.map(mapFavorite) };
  }
}
