import {
  Body,
  Controller,
  Del,
  Get,
  httpError,
  Inject,
  Param,
  Post,
  Query,
} from "@midwayjs/core";
import { CommentService } from "../service/comment.service";
import { requireUser } from "../utils/user-context";
import {
  isRecord,
  parsePagination,
  validateCommentContent,
} from "../utils/validation";

@Controller("/api")
export class CommentController {
  @Inject()
  commentService: CommentService;
  @Inject()
  ctx: any;

  @Post("/matches/:matchId/comments")
  async createComment(
    @Param("matchId") matchIdParam: string,
    @Body() body: unknown,
  ) {
    const user = requireUser(this.ctx);

    const matchId = parseInt(matchIdParam, 10);
    if (isNaN(matchId)) {
      throw new httpError.BadRequestError("matchId 必须是数字");
    }

    if (!isRecord(body)) {
      throw new httpError.BadRequestError("请求体必须是 JSON 对象");
    }

    const contentResult = validateCommentContent(body.content);
    if (!contentResult.valid) {
      throw new httpError.BadRequestError(contentResult.error);
    }

    const result = this.commentService.create(
      user.userId,
      matchId,
      contentResult.value,
    );

    if ("error" in result) {
      if (result.status === 404) throw new httpError.NotFoundError(result.error);
      throw new httpError.BadRequestError(result.error);
    }

    this.ctx.status = 201;
    return { data: result.data };
  }

  @Get("/matches/:matchId/comments")
  async listComments(
    @Param("matchId") matchIdParam: string,
    @Query() query: Record<string, unknown>,
  ) {
    const matchId = parseInt(matchIdParam, 10);
    if (isNaN(matchId)) {
      throw new httpError.BadRequestError("matchId 必须是数字");
    }
    const { page, pageSize } = parsePagination(query);
    return this.commentService.listByMatch(matchId, page, pageSize);
  }

  @Del("/comments/:commentId")
  async deleteComment(
    @Param("commentId") commentIdParam: string,
  ) {
    const user = requireUser(this.ctx);

    const commentId = parseInt(commentIdParam, 10);
    if (isNaN(commentId)) {
      throw new httpError.BadRequestError("commentId 必须是数字");
    }

    const existing = this.commentService.getById(commentId);
    if (!existing) {
      throw new httpError.NotFoundError("评论不存在或已删除");
    }

    /* Author or admin can delete (BR-16, AC-26) */
    if (existing.userId !== user.userId && !user.isAdmin) {
      throw new httpError.ForbiddenError("只能删除自己的评论");
    }

    const result = this.commentService.softDelete(commentId);
    if ("error" in result) {
      throw new httpError.NotFoundError(result.error);
    }
    return { data: result.data };
  }
}
