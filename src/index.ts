import type { Env } from "./env";
import { runCheck } from "./check";

const authed = (req: Request, env: Env) => !!env.ADMIN_TOKEN && req.headers.get("authorization") === `Bearer ${env.ADMIN_TOKEN}`;
const SITE = "https://ocean.hunglun.com";
// 第一版網址 sea.hunglun.com（2026-10-22 上線半天，已送過 IndexNow、可能有人存了連結）：整站 301 轉到 ocean 的同一個路徑
const OLD_HOST = "sea.hunglun.com";

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (url.hostname === OLD_HOST) return Response.redirect(SITE + url.pathname + url.search + url.hash, 301);
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
