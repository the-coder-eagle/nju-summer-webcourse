/* Extract user identity from request headers */

import type { Context } from "@midwayjs/koa";

const USER_ID_HEADER = "x-user-id";
const USER_ROLE_HEADER = "x-user-role";

export interface UserContext {
  userId: string;
  isAdmin: boolean;
}

/**
 * Extract user identity from Koa context headers.
 * Returns null if no user ID header is present (unauthenticated).
 */
export function extractUser(ctx: Context): UserContext | null {
  const userId = ctx.get(USER_ID_HEADER)?.trim();
  if (!userId) {
    return null;
  }
  const role = ctx.get(USER_ROLE_HEADER)?.trim() || "user";
  return {
    userId,
    isAdmin: role === "admin",
  };
}

/**
 * Require authentication. Returns UserContext or throws 401.
 */
export function requireUser(ctx: Context): UserContext {
  const user = extractUser(ctx);
  if (!user) {
    const { httpError } = require("@midwayjs/core");
    throw new httpError.UnauthorizedError("请先登录");
  }
  return user;
}

/**
 * Require admin role. Returns UserContext or throws 403.
 */
export function requireAdmin(ctx: Context): UserContext {
  const user = requireUser(ctx);
  if (!user.isAdmin) {
    const { httpError } = require("@midwayjs/core");
    throw new httpError.ForbiddenError("需要管理员权限");
  }
  return user;
}
