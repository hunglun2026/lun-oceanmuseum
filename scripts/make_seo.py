"""產生 robots.txt、sitemap.xml，並把 canonical／分享預覽（Open Graph）標籤寫進各頁 <head>。

可以重複跑：標籤放在 <!-- SEO:BEGIN --> 到 <!-- SEO:END --> 之間，每次整段換掉。
標題與說明直接讀每頁自己的 <title> 與 <meta name="description">，不另外維護一份。
用法：python scripts/make_seo.py
"""
import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUB = ROOT / "public"
SITE = "https://ocean.hunglun.com"
OG_IMAGE = SITE + "/img/welcome/whaleshark.webp"  # 1200x800，作者與授權標在首頁照片下方
NOINDEX = {"passport"}  # 個人紀錄頁，沒有給搜尋引擎看的內容
SKIP = {"404"}  # 404 頁自己有 noindex

BEGIN, END = "<!-- SEO:BEGIN -->", "<!-- SEO:END -->"


def tags(name: str, title: str, desc: str) -> str:
    url = SITE + ("/" if name == "index" else f"/{name}")
    t, d = html.escape(title, quote=True), html.escape(desc, quote=True)
    lines = [
        "<!-- nosemgrep: html.security.audit.missing-integrity.missing-integrity -- canonical 不是要載入的資源，不需要 integrity -->",
        f'<link rel="canonical" href="{url}">',
        '<meta name="theme-color" content="#1f7a9e">',
        '<meta property="og:type" content="website">',
        '<meta property="og:site_name" content="海洋探險家">',
        '<meta property="og:locale" content="zh_TW">',
        f'<meta property="og:title" content="{t}">',
        f'<meta property="og:description" content="{d}">',
        f'<meta property="og:url" content="{url}">',
        f'<meta property="og:image" content="{OG_IMAGE}">',
        '<meta name="twitter:card" content="summary_large_image">',
    ]
    if name in NOINDEX:
        lines.append('<meta name="robots" content="noindex">')
    return "\n".join(lines)


def main() -> None:
    urls = []
    for f in sorted(PUB.glob("*.html")):
        name = f.stem
        if name in SKIP:
            continue
        raw = f.read_bytes().decode("utf-8")
        eol = "\r\n" if "\r\n" in raw else "\n"
        s = raw.replace("\r\n", "\n")
        title = re.search(r"<title>(.*?)</title>", s, re.DOTALL).group(1).strip()
        desc = re.search(r'<meta name="description" content="(.*?)">', s, re.DOTALL).group(1)
        desc = html.unescape(desc)
        block = f"{BEGIN}\n{tags(name, html.unescape(title), desc)}\n{END}"
        if BEGIN in s:
            s = re.sub(re.escape(BEGIN) + r".*?" + re.escape(END), lambda _m, b=block: b, s, flags=re.DOTALL)
        else:
            s = s.replace('<link rel="icon"', block + '\n<link rel="icon"', 1)
        f.write_bytes(s.replace("\n", eol).encode("utf-8"))
        if name not in NOINDEX:
            urls.append(SITE + ("/" if name == "index" else f"/{name}"))
    (PUB / "robots.txt").write_text(f"User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: {SITE}/sitemap.xml\n", encoding="utf-8")
    body = "".join(f"  <url><loc>{u}</loc></url>\n" for u in urls)
    (PUB / "sitemap.xml").write_text(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{body}</urlset>\n', encoding="utf-8")
    print(f"已更新 {len(urls)} 頁的標籤、robots.txt、sitemap.xml")


if __name__ == "__main__":
    main()
