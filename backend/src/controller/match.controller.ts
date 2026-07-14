import {
  Body,
  Controller,
  Get,
  httpError,
  Inject,
  Param,
  Patch,
  Query,
} from "@midwayjs/core";
import { MatchService } from "../service/match.service";
import { requireAdmin } from "../utils/user-context";
import { isRecord, parsePagination, validateLeague } from "../utils/validation";
import type { MatchStatus } from "../entity/match.entity";
import { VALID_STATUS_TRANSITIONS } from "../entity/match.entity";

@Controller("/api")
export class MatchController {
  @Inject()
  matchService: MatchService;
  @Inject()
  ctx: any;

  @Get("/matches")
  async listMatches(@Query() query: Record<string, unknown>) {
    const league = query.league;
    if (league !== undefined) {
      const result = validateLeague(league);
      if (!result.valid) {
        throw new httpError.BadRequestError(result.error);
      }
    }
    const { page, pageSize } = parsePagination(query);
    return this.matchService.list({
      league: league as string | undefined,
      status: query.status as string | undefined,
      page,
      pageSize,
    });
  }

  @Get("/matches/:matchId")
  async getMatch(@Param("matchId") matchIdParam: string) {
    const matchId = parseInt(matchIdParam, 10);
    if (isNaN(matchId)) {
      throw new httpError.BadRequestError("matchId 必须是数字");
    }
    const match = this.matchService.getById(matchId);
    if (!match) {
      throw new httpError.NotFoundError("比赛不存在");
    }
    return { data: match };
  }

  @Patch("/matches/:matchId")
  async updateMatchStatus(
    @Param("matchId") matchIdParam: string,
    @Body() body: unknown,
  ) {
    requireAdmin(this.ctx);
    const matchId = parseInt(matchIdParam, 10);
    if (isNaN(matchId)) {
      throw new httpError.BadRequestError("matchId 必须是数字");
    }
    if (!isRecord(body) || typeof body.status !== "string") {
      throw new httpError.BadRequestError("请求体必须包含 status 字段");
    }
    const validStatuses = Object.keys(VALID_STATUS_TRANSITIONS);
    if (!validStatuses.includes(body.status)) {
      throw new httpError.BadRequestError(
        `status 必须是以下值之一: ${validStatuses.join(", ")}`,
      );
    }
    const result = this.matchService.updateStatus(
      matchId,
      body.status as MatchStatus,
    );
    if ("error" in result) {
      if (result.status === 404) throw new httpError.NotFoundError(result.error);
      throw new httpError.BadRequestError(result.error);
    }
    return result;
  }
}
