"""找照片：學名 → Wikidata 代表圖（P18）→ 沒有就搜維基共享資源 → 只收自由授權 → 下載原圖到 data/photos/raw/。

結果寫 data/photos.json（每種：檔名、作者、授權、原始網址、來源方式）。人工判斷寫 data/photos_fix.json：
{id: "File:xxx.jpg"（指定別張）| null（不用照片）| {"exclude": [不要的檔名]}（找下一張）}，重跑會照它。
用法：python tools/photos.py [--refresh]
"""
import html
import json
import re
import sys
import time
import urllib.parse

from common import ROOT, get, load_json, save_json

UA = {"User-Agent": "lun-seamuseum/0.1 (education site; hunglun2026@gmail.com)"}
OK_LICENSE = re.compile(r"^(cc0|public domain|pd|cc by(-sa)? [1-4]\.0)", re.I)
RAWDIR = ROOT / "data" / "photos" / "raw"
# 檔名看得出不是生物照片的（分布圖、論文附圖、骨骼、X 光、鱗片顯微）直接跳過
NOT_PHOTO = re.compile(r"distmap|range|map|figure|fig\.|denticle|skull|skeleton|x-?ray|radiograph|otolith|\.svg", re.I)


def api(base: str, **q) -> dict:
    q.setdefault("format", "json")
    return json.loads(get(base + "?" + urllib.parse.urlencode(q), 40, UA))


def wikidata_p18(sci: str) -> str:
    # haswbstatement:P225=學名 找物種條目
    r = api("https://www.wikidata.org/w/api.php", action="query", list="search", srsearch=f'haswbstatement:"P225={sci}"', srlimit=3)
    for hit in r["query"]["search"]:
        e = api("https://www.wikidata.org/w/api.php", action="wbgetclaims", entity=hit["title"], property="P18")
        cl = e.get("claims", {}).get("P18")
        if cl:
            return "File:" + cl[0]["mainsnak"]["datavalue"]["value"]
    return ""


def commons_search(sci: str) -> list:
    r = api("https://commons.wikimedia.org/w/api.php", action="query", list="search", srnamespace=6,
            srsearch=f'"{sci}" filetype:bitmap', srlimit=10)
    return [h["title"] for h in r["query"]["search"]]


def info(title: str) -> dict:
    r = api("https://commons.wikimedia.org/w/api.php", action="query", titles=title, prop="imageinfo",
            iiprop="url|extmetadata|size|mime", iiurlwidth=1200)
    page = next(iter(r["query"]["pages"].values()))
    if "imageinfo" not in page:
        return {}
    ii = page["imageinfo"][0]
    md = ii.get("extmetadata", {})
    val = lambda k: re.sub(r"<[^>]+>", "", html.unescape(md.get(k, {}).get("value", ""))).strip()
    return {
        "file": title, "url": ii.get("thumburl") or ii["url"], "page": ii.get("descriptionurl", ""),
        "w": ii.get("width"), "h": ii.get("height"), "mime": ii.get("mime"),
        "license": val("LicenseShortName"), "artist": val("Artist")[:120], "credit": val("Credit")[:160],
        "desc": val("ImageDescription")[:200],
    }


def usable(i: dict) -> bool:
    return bool(i) and i.get("mime") in ("image/jpeg", "image/png", "image/webp") and bool(OK_LICENSE.match(i["license"] or "")) \
        and (i.get("w") or 0) >= 480


def main():
    refresh = "--refresh" in sys.argv
    sp = load_json(ROOT / "data" / "species.json")
    fix = load_json(ROOT / "data" / "photos_fix.json", {})
    out = {} if refresh else load_json(ROOT / "data" / "photos.json", {})
    RAWDIR.mkdir(parents=True, exist_ok=True)
    for s in sp:
        sid = s["id"]
        f = fix.get(sid, "")
        if f is None:
            out[sid] = None
            continue
        if isinstance(f, str) and f:
            tries = [(f, "人工指定")]
        elif sid in out and out[sid] is not None and (not isinstance(f, dict) or out[sid]["file"] not in f["exclude"]):
            continue
        else:
            tries = []
            p = wikidata_p18(s["sci"])
            if p:
                tries.append((p, "wikidata"))
            tries += [(t, "commons") for t in commons_search(s["sci"]) if not NOT_PHOTO.search(t)]
            if isinstance(f, dict):
                tries = [t for t in tries if t[0] not in f["exclude"]]
        pick = None
        for t, via in tries:
            i = info(t)
            if usable(i):
                pick = dict(i, via=via)
                break
            time.sleep(0.2)
        if pick:
            ext = ".png" if pick["mime"] == "image/png" else ".jpg"
            f = RAWDIR / f"{sid}{ext}"
            f.write_bytes(get(pick["url"], 120, UA))
            pick["local"] = f.name
        out[sid] = pick
        print(sid, s["name"], "→", pick and f'{pick["via"]} {pick["license"]} {pick["file"][:60]}')
        save_json(ROOT / "data" / "photos.json", out)
        time.sleep(0.3)
    n = sum(1 for v in out.values() if v)
    print(f"有照片 {n} / {len(sp)}；沒有：", [s["name"] for s in sp if not out.get(s["id"])])


if __name__ == "__main__":
    sys.exit(main())
