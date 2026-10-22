import type { Env } from "./env";
import { runCheck } from "./check";

const authed = (req: Request, env: Env) => !!env.ADMIN_TOKEN && req.headers.get("authorization") === `Bearer ${env.ADMIN_TOKEN}`;
const SITE = "https://sea.hunglun.com";

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/admin/")) {
      // 管理端點一律要 Authorization: Bearer <ADMIN_TOKEN>
      if (!authed(req, env)) return new Response("unauthorized", { status: 401 });
      if (url.pathname === "/admin/check" && req.method === "POST") return Response.json(await runCheck(env, url.origin));
      return new Response("not found", { status: 404 });
    }
    return env.ASSETS.fetch(req);
  },
  async scheduled(_e: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runCheck(env, SITE));
  },
};
