import {
  Body,
  Controller,
  Del,
  Get,
  httpError,
  Inject,
  Param,
  Post,
} from "@midwayjs/core";
import { FavoriteService } from "../service/favorite.service";
import { requireUser } from "../utils/user-context";
import { isRecord } from "../utils/validation";
import type { FavoriteType } from "../entity/favorite.entity";

@Controller("/api")
export class FavoriteController {
  @Inject()
  favoriteService: FavoriteService;
  @Inject()
  ctx: any;

  @Post("/favorites")
  async addFavorite(@Body() body: unknown) {
    const user = requireUser(this.ctx);

    if (!isRecord(body)) {
      throw new httpError.BadRequestError("请求体必须是 JSON 对象");
    }

    const type = body.type;
    if (type !== "match" && type !== "team") {
      throw new httpError.BadRequestError('type 必须是 "match" 或 "team"');
    }

    const targetId =
      typeof body.targetId === "number"
        ? body.targetId
        : parseInt(String(body.targetId), 10);
    if (isNaN(targetId)) {
      throw new httpError.BadRequestError("targetId 必须是数字");
    }

    const result = this.favoriteService.add(
      user.userId,
      type as FavoriteType,
      targetId,
    );

    if ("error" in result) {
      if (result.status === 409) throw new httpError.ConflictError(result.error);
      throw new httpError.BadRequestError(result.error);
    }

    this.ctx.status = 201;
    return { data: result.data };
  }

  @Del("/favorites/:favoriteId")
  async removeFavorite(
    @Param("favoriteId") favoriteIdParam: string,
  ) {
    const user = requireUser(this.ctx);

    const favoriteId = parseInt(favoriteIdParam, 10);
    if (isNaN(favoriteId)) {
      throw new httpError.BadRequestError("favoriteId 必须是数字");
    }

    /* Check ownership (BR-13) */
    const existing = this.favoriteService.getById(favoriteId);
    if (!existing) {
      throw new httpError.NotFoundError("收藏不存在");
    }
    if (existing.userId !== user.userId) {
      throw new httpError.ForbiddenError("只能操作自己的收藏");
    }

    this.favoriteService.remove(favoriteId);
    return { data: null };
  }

  @Get("/favorites")
  async listMyFavorites() {
    const user = requireUser(this.ctx);
    return this.favoriteService.listByUser(user.userId);
  }
}
