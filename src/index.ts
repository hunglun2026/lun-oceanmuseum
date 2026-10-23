import type { Env } from "./env";
import { runCheck } from "./check";

const enc = new TextEncoder();
// 固定時間比對：用 === 比對字串，回應時間會隨「前幾個字對了幾個」而不同，被人拿來一個字一個字猜密鑰
// （長度不同直接擋掉，只會洩漏長度，密鑰本身是隨機長字串，可以接受）
function authed(req: Request, env: Env): boolean {
  if (!env.ADMIN_TOKEN) return false;
  const given = enc.encode(req.headers.get("authorization") ?? "");
  const want = enc.encode(`Bearer ${env.ADMIN_TOKEN}`);
  return given.byteLength === want.byteLength && crypto.subtle.timingSafeEqual(given, want);
}

// 安全標頭：全站都加。本站只載自己的檔案（腳本、字型、照片都在同一個網域），所以內容安全政策可以收得很緊。
// style-src 留 'unsafe-inline' 是因為頁面裡有 style="…" 屬性；腳本不允許內嵌，所以不能再寫 onclick="…" 或 <script>…</script>。
const SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy":
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "DENY",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Strict-Transport-Security": "max-age=31536000",
};
function secure(res: Response): Response {
  const h = new Headers(res.headers);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) h.set(k, v);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}
const SITE = "https://ocean.hunglun.com";
// 第一版網址 sea.hunglun.com（2026-10-22 上線半天，已送過 IndexNow、可能有人存了連結）：整站 301 轉到 ocean 的同一個路徑
const OLD_HOST = "sea.hunglun.com";

async function handle(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  if (url.hostname === OLD_HOST) return Response.redirect(SITE + url.pathname + url.search + url.hash, 301);
  if (url.pathname.startsWith("/admin/")) {
    // 管理端點一律要 Authorization: Bearer <ADMIN_TOKEN>
    const noStore = { "Cache-Control": "no-store" };
    if (!authed(req, env)) return new Response("unauthorized", { status: 401, headers: noStore });
    if (url.pathname === "/admin/check" && req.method === "POST") return Response.json(await runCheck(env, url.origin), { headers: noStore });
    return new Response("not found", { status: 404, headers: noStore });
  }
  return env.ASSETS.fetch(req);
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    return secure(await handle(req, env));
  },
  async scheduled(_e: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runCheck(env, SITE));
  },
};
