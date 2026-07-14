import {
  Controller,
  Get,
  httpError,
  Inject,
  Query,
} from "@midwayjs/core";
import { BracketService } from "../service/bracket.service";
import { validateLeague } from "../utils/validation";

@Controller("/api")
export class BracketController {
  @Inject()
  bracketService: BracketService;

  @Get("/bracket")
  async getBracket(@Query() query: Record<string, unknown>) {
    const league = query.league;
    if (league !== undefined) {
      const result = validateLeague(league);
      if (!result.valid) {
        throw new httpError.BadRequestError(result.error);
      }
    }
    return this.bracketService.getBracket(league as string | undefined);
  }
}
