import {
  Controller,
  Get,
  httpError,
  Inject,
  Query,
} from "@midwayjs/core";
import { StandingService } from "../service/standing.service";
import { validateLeague } from "../utils/validation";

@Controller("/api")
export class StandingController {
  @Inject()
  standingService: StandingService;

  @Get("/standings")
  async getStandings(@Query() query: Record<string, unknown>) {
    const league = query.league;
    if (league !== undefined) {
      const result = validateLeague(league);
      if (!result.valid) {
        throw new httpError.BadRequestError(result.error);
      }
    }
    return this.standingService.getStandings(league as string | undefined);
  }
}
