// ---- Enums ----

export type League = "worldcup" | "spl";
export type MatchStatus = "scheduled" | "live" | "finished" | "postponed" | "cancelled";
export type MatchStage = "group" | "round16" | "quarter" | "semi" | "final";
export type FavoriteType = "match" | "team";

// ---- Common ----

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
}

export interface ApiError {
  error: string;
}

// ---- Team ----

export interface TeamBrief {
  id: number;
  name: string;
  logoUrl: string;
}

export interface Team {
  id: number;
  name: string;
  logoUrl: string;
  league: League;
  createdAt: string;
}

// ---- Match ----

export interface Match {
  id: number;
  homeTeamId: number;
  awayTeamId: number;
  kickoffTime: string;
  venue: string;
  league: League;
  status: MatchStatus;
  stage: MatchStage;
  createdAt: string;
  updatedAt: string;
}

export interface MatchSummary extends Match {
  homeTeam: TeamBrief;
  awayTeam: TeamBrief;
}

export interface MatchDetail extends MatchSummary {
  commentCount: number;
}

// ---- Standing ----

export interface Standing {
  id: number;
  teamId: number;
  teamName: string;
  league: League;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

// ---- Bracket ----

export interface BracketNode {
  id: number;
  league: League;
  stage: MatchStage;
  matchId: number | null;
  homeTeamId: number | null;
  awayTeamId: number | null;
  homeTeamName: string | null;
  awayTeamName: string | null;
  homeScore: number | null;
  awayScore: number | null;
  parentNodeId: number | null;
  position: "left" | "right";
}

// ---- Prediction ----

export interface CreatePrediction {
  matchId: number;
  homeScore: number;
  awayScore: number;
}

export interface Prediction {
  id: number;
  userId: string;
  matchId: number;
  homeScore: number;
  awayScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface MatchBrief {
  id: number;
  homeTeamName: string;
  awayTeamName: string;
  kickoffTime: string;
  status: MatchStatus;
  league: League;
}

export interface PredictionWithMatch extends Prediction {
  match: MatchBrief;
}

// ---- Favorite ----

export interface CreateFavorite {
  type: FavoriteType;
  targetId: number;
}

export interface Favorite {
  id: number;
  userId: string;
  type: FavoriteType;
  targetId: number;
  createdAt: string;
}

// ---- Comment ----

export interface CreateComment {
  content: string;
}

export interface Comment {
  id: number;
  userId: string;
  matchId: number;
  content: string;
  deletedAt: string | null;
  createdAt: string;
}

// ---- Result ----

export interface EnterResult {
  homeScore: number;
  awayScore: number;
}

export interface MatchResult {
  id: number;
  matchId: number;
  homeScore: number;
  awayScore: number;
  enteredBy: string;
  createdAt: string;
}

// ---- Generic Wrappers ----

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface DataResponse<T> {
  data: T;
}

// ---- Fetch Client ----

const BASE_URL = "/api";
const DEFAULT_USER_ID = "1";

type FetchOptions = Omit<RequestInit, "body"> & {
  body?: unknown;
  params?: Record<string, string | number | undefined>;
};

export class ApiRequestError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.body = body;
  }
}

async function apiFetch<T>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { body, params, headers: extraHeaders, ...rest } = options;

  let url = `${BASE_URL}${path}`;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        searchParams.set(key, String(value));
      }
    }
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-user-id": DEFAULT_USER_ID,
    ...((extraHeaders as Record<string, string>) || {}),
  };

  const res = await fetch(url, {
    ...rest,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let errBody: unknown;
    try {
      errBody = await res.json();
    } catch {
      errBody = { error: `HTTP ${res.status}` };
    }
    const message =
      (errBody as ApiError)?.error || `HTTP ${res.status}`;
    throw new ApiRequestError(res.status, message, errBody);
  }

  // Handle 204 or empty responses
  const text = await res.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

// ---- API Client ----

export const apiClient = {
  // Matches
  listMatches(params?: {
    league?: League;
    status?: MatchStatus;
    page?: number;
    pageSize?: number;
  }) {
    return apiFetch<PaginatedResponse<MatchSummary>>("/matches", { params });
  },

  getMatch(matchId: number) {
    return apiFetch<DataResponse<MatchDetail>>(`/matches/${matchId}`);
  },

  updateMatchStatus(matchId: number, status: MatchStatus) {
    return apiFetch<DataResponse<MatchDetail>>(`/matches/${matchId}`, {
      method: "PATCH",
      body: { status },
    });
  },

  // Teams
  listTeams(params?: { league?: League }) {
    return apiFetch<DataResponse<Team[]>>("/teams", { params });
  },

  getTeam(teamId: number) {
    return apiFetch<DataResponse<Team>>(`/teams/${teamId}`);
  },

  // Standings
  getStandings(params?: { league?: League }) {
    return apiFetch<DataResponse<Standing[]>>("/standings", { params });
  },

  // Bracket
  getBracket(params?: { league?: League }) {
    return apiFetch<DataResponse<BracketNode[]>>("/bracket", { params });
  },

  // Predictions
  createPrediction(data: CreatePrediction) {
    return apiFetch<DataResponse<Prediction>>("/predictions", {
      method: "POST",
      body: data,
    });
  },

  updatePrediction(
    predictionId: number,
    data: { homeScore: number; awayScore: number }
  ) {
    return apiFetch<DataResponse<Prediction>>(
      `/predictions/${predictionId}`,
      {
        method: "PUT",
        body: data,
      }
    );
  },

  listMyPredictions() {
    return apiFetch<DataResponse<PredictionWithMatch[]>>("/predictions");
  },

  // Results
  enterResult(matchId: number, data: EnterResult) {
    return apiFetch<DataResponse<MatchResult>>(
      `/matches/${matchId}/results`,
      {
        method: "POST",
        body: data,
      }
    );
  },

  // Favorites
  addFavorite(data: CreateFavorite) {
    return apiFetch<DataResponse<Favorite>>("/favorites", {
      method: "POST",
      body: data,
    });
  },

  removeFavorite(favoriteId: number) {
    return apiFetch<{ data: null }>(`/favorites/${favoriteId}`, {
      method: "DELETE",
    });
  },

  listMyFavorites() {
    return apiFetch<DataResponse<Favorite[]>>("/favorites");
  },

  // Comments
  createComment(matchId: number, data: CreateComment) {
    return apiFetch<DataResponse<Comment>>(
      `/matches/${matchId}/comments`,
      {
        method: "POST",
        body: data,
      }
    );
  },

  listComments(
    matchId: number,
    params?: { page?: number; pageSize?: number }
  ) {
    return apiFetch<PaginatedResponse<Comment>>(
      `/matches/${matchId}/comments`,
      { params }
    );
  },

  deleteComment(commentId: number) {
    return apiFetch<DataResponse<Comment>>(`/comments/${commentId}`, {
      method: "DELETE",
    });
  },
};
