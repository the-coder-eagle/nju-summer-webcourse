import {
  Body,
  Controller,
  Get,
  httpError,
  Inject,
  Param,
  Post,
  Put,
} from "@midwayjs/core";
import { PredictionService } from "../service/prediction.service";
import { requireUser } from "../utils/user-context";
import { isRecord, validateScore } from "../utils/validation";

@Controller("/api")
export class PredictionController {
  @Inject()
  predictionService: PredictionService;
  @Inject()
  ctx: any;

  @Post("/predictions")
  async createPrediction(@Body() body: unknown) {
    const user = requireUser(this.ctx);

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

    const matchId =
      typeof body.matchId === "number" ? body.matchId : parseInt(String(body.matchId), 10);
    if (isNaN(matchId)) {
      throw new httpError.BadRequestError("matchId 必须是数字");
    }

    const result = this.predictionService.upsert(
      user.userId,
      matchId,
      homeScoreResult.value,
      awayScoreResult.value,
    );

    if ("error" in result) {
      if (result.status === 404) throw new httpError.NotFoundError(result.error);
      throw new httpError.BadRequestError(result.error);
    }

    this.ctx.status = result.created ? 201 : 200;
    return { data: result.data };
  }

  @Put("/predictions/:predictionId")
  async updatePrediction(
    @Param("predictionId") predictionIdParam: string,
    @Body() body: unknown,
  ) {
    const user = requireUser(this.ctx);

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

    const predictionId = parseInt(predictionIdParam, 10);
    if (isNaN(predictionId)) {
      throw new httpError.BadRequestError("predictionId 必须是数字");
    }

    const existing = this.predictionService.getById(predictionId);
    if (!existing) {
      throw new httpError.NotFoundError("预测不存在");
    }
    if (existing.userId !== user.userId) {
      throw new httpError.ForbiddenError("只能修改自己的预测");
    }

    /* Re-use upsert with the same user+match */
    const result = this.predictionService.upsert(
      user.userId,
      existing.matchId,
      homeScoreResult.value,
      awayScoreResult.value,
    );

    if ("error" in result) {
      throw new httpError.BadRequestError(result.error);
    }

    return { data: result.data };
  }

  @Get("/predictions")
  async listMyPredictions() {
    const user = requireUser(this.ctx);
    return this.predictionService.listByUser(user.userId);
  }
}
