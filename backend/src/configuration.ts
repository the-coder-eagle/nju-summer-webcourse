import {
  CommonJSFileDetector,
  Configuration,
  ILifeCycle,
  App,
} from "@midwayjs/core";
import * as koa from "@midwayjs/koa";
import { join } from "node:path";

@Configuration({
  imports: [koa],
  importConfigs: [join(__dirname, "./config")],
  detector: new CommonJSFileDetector(),
})
export class MainConfiguration implements ILifeCycle {
  @App()
  app: koa.Application;

  async onReady(): Promise<void> {
    // AC-20: global 404 + error handler — return JSON, never expose stack traces
    this.app.use(async (ctx, next) => {
      try {
        await next();
      } catch (err: any) {
        // Controller-level errors (NotFoundError, UnauthorizedError, etc.)
        // propagate here — format them as JSON without stack traces.
        ctx.status = err.status || err.statusCode || 500;
        ctx.body = { error: err.message || "服务器内部错误" };
        ctx.type = "application/json";
        return;
      }

      // Non-exception cases: post-process the response

      // 1) Unmatched routes: Koa default 404 with no body → JSON
      if (ctx.status === 404 && !ctx.body) {
        ctx.body = { error: "请求的资源不存在" };
        ctx.type = "application/json";
        ctx.status = 404;
        return;
      }

      // 2) Error responses from Midway: strip stack traces, normalise format
      if (ctx.body && typeof ctx.body === "object" && !Array.isArray(ctx.body)) {
        const body = ctx.body as Record<string, unknown>;
        if ("stack" in body) delete body.stack;
        if (
          typeof ctx.status === "number" &&
          ctx.status >= 400 &&
          body.message &&
          !body.error
        ) {
          body.error = body.message;
          delete body.message;
        }
      }

      // 3) HTML/text error responses → JSON
      if (typeof ctx.body === "string" && ctx.status >= 400) {
        ctx.body = { error: ctx.body };
        ctx.type = "application/json";
      }
    });
  }
}
