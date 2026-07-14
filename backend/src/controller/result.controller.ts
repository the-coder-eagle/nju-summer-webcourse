import {
  Body,
  Controller,
  httpError,
  Inject,
  Param,
  Post,
} from "@midwayjs/core";
import { ResultService } from "../service/result.service";
import { requireAdmin } from "../utils/user-context";
import { isRecord, validateScore } from "../utils/validation";

@Controller("/api")
export class ResultController {
  @Inject()
  resultService: ResultService;
  @Inject()
  ctx: any;

  @Post("/matches/:matchId/results")
  async enterResult(
    @Param("matchId") matchIdParam: string,
    @Body() body: unknown,
  ) {
    const admin = requireAdmin(this.ctx);

    if (!isRecord(body)) {
      throw new httpError.BadRequestError("请求体必须是 JSON 对象");
    }

    const homeScoreResult = validateScore(body.homeScore, "homeScore");
    if (!homeScoreResult.valid) {
      throw new httpError.BadRequestError(homeScoreResult.error);
    }

    const awayScoreResult = validateScore(body.awayScore, "awayScore");
    if (!awayScoreResult.valid) {
      throw new httpError.BadRequestError(awayScoreResult.error);
    }

    const matchId = parseInt(matchIdParam, 10);
    if (isNaN(matchId)) {
      throw new httpError.BadRequestError("matchId 必须是数字");
    }

    const result = this.resultService.enter(
      matchId,
      homeScoreResult.value,
      awayScoreResult.value,
      admin.userId,
    );

    if ("error" in result) {
      if (result.status === 404) throw new httpError.NotFoundError(result.error);
      if (result.status === 409) throw new httpError.ConflictError(result.error);
      throw new httpError.BadRequestError(result.error);
    }

    this.ctx.status = 201;
    return { data: result.data };
  }
}
