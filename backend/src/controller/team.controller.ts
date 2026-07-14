import {
  Controller,
  Get,
  httpError,
  Inject,
  Param,
  Query,
} from "@midwayjs/core";
import { TeamService } from "../service/team.service";
import { validateLeague } from "../utils/validation";

@Controller("/api")
export class TeamController {
  @Inject()
  teamService: TeamService;

  @Get("/teams")
  async listTeams(@Query() query: Record<string, unknown>) {
    const league = query.league;
    if (league !== undefined) {
      const result = validateLeague(league);
      if (!result.valid) {
        throw new httpError.BadRequestError(result.error);
      }
    }
    return this.teamService.list(league as string | undefined);
  }

  @Get("/teams/:teamId")
  async getTeam(@Param("teamId") teamIdParam: string) {
    const teamId = parseInt(teamIdParam, 10);
    if (isNaN(teamId)) {
      throw new httpError.BadRequestError("teamId 必须是数字");
    }
    const team = this.teamService.getById(teamId);
    if (!team) {
      throw new httpError.NotFoundError("球队不存在");
    }
    return { data: team };
  }
}
