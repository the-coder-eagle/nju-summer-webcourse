import {
  CommonJSFileDetector,
  Configuration,
  ILifeCycle,
  App,
} from "@midwayjs/core";
import * as koa from "@midwayjs/koa";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Derive a stable error code from HTTP status.
 */
function errorCodeFromStatus(status: number): string {
  const map: Record<number, string> = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    409: "CONFLICT",
    422: "VALIDATION_FAILED",
    429: "TOO_MANY_REQUESTS",
    500: "INTERNAL_ERROR",
  };
  return map[status] || "UNKNOWN_ERROR";
}

@Configuration({
  imports: [koa],
  importConfigs: [join(__dirname, "./config")],
  detector: new CommonJSFileDetector(),
})
export class MainConfiguration implements ILifeCycle {
  @App()
  app: koa.Application;

  async onReady(): Promise<void> {
    // ---- Request ID middleware ----
    this.app.use(async (ctx, next) => {
      const requestId =
        (ctx.get("x-request-id") as string)?.trim() ||
        (ctx.get("X-Request-Id") as string)?.trim() ||
        randomUUID();
      ctx.set("X-Request-Id", requestId);
      (ctx.state as Record<string, unknown>).requestId = requestId;
      await next();
      // Ensure response header is set even after downstream processing
      ctx.set("X-Request-Id", requestId);
    });

    // ---- Global error handler ----
    this.app.use(async (ctx, next) => {
      try {
        await next();
      } catch (err: any) {
        const status = err.status || err.statusCode || 500;
        const message = err.message || "服务器内部错误";
        const requestId =
          ((ctx.state as Record<string, unknown>).requestId as string) || "unknown";

        ctx.status = status;
        ctx.body = {
          error: {
            code: errorCodeFromStatus(status),
            message,
          },
          requestId,
        };
        ctx.type = "application/json";

        // Never expose stack traces
        if (process.env.NODE_ENV !== "production") {
          console.error(`[${requestId}] ${status} ${message}`);
        }
        return;
      }

      // ---- Post-process normal responses ----

      // 1) Unmatched routes → 404 JSON
      if (ctx.status === 404 && !ctx.body) {
        const requestId =
          ((ctx.state as Record<string, unknown>).requestId as string) || "unknown";
        ctx.body = {
          error: { code: "NOT_FOUND", message: "请求的资源不存在" },
          requestId,
        };
        ctx.type = "application/json";
        ctx.status = 404;
        return;
      }

      // 2) Strip stack traces from error objects, normalize format
      if (ctx.body && typeof ctx.body === "object" && !Array.isArray(ctx.body)) {
        const body = ctx.body as Record<string, unknown>;
        if ("stack" in body) delete body.stack;

        // Normalise legacy flat { error: string } to structured format
        if (
          typeof ctx.status === "number" &&
          ctx.status >= 400 &&
          typeof body.error === "string"
        ) {
          const requestId =
            ((ctx.state as Record<string, unknown>).requestId as string) || "unknown";
          body.error = {
            code: errorCodeFromStatus(ctx.status),
            message: body.error,
          };
          body.requestId = requestId;
        }
      }

      // 3) HTML/text error responses → JSON
      if (typeof ctx.body === "string" && ctx.status >= 400) {
        const requestId =
          ((ctx.state as Record<string, unknown>).requestId as string) || "unknown";
        ctx.body = {
          error: { code: errorCodeFromStatus(ctx.status), message: ctx.body as string },
          requestId,
        };
        ctx.type = "application/json";
      }
    });
  }
}
