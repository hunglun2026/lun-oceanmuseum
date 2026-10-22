"""合成網站資料：public/data/sea.json（物種、特展單元、展館）與 public/data/meta.json（筆數、資料集更新日期）。

物種＝species.json 減去改寫標 skip 的；照片來自 photos.json（自由授權）或 CACHE/photos/ai/（AI 插圖）。
eDNA、擱淺彙整另外寫 edna.json、strand.json（高中探究頁才載）。
用法：python tools/build_data.py
"""
import csv
import datetime
import io
import json
import re
import sys

from ai_brief import teachable
from common import CACHE, RAW, ROOT, load_json, save_json

PUB = ROOT / "public" / "data"
# 展館：海生館 9693 的三個常設館；棲地 → 展館
HALL_OF = {"estuary": "taiwan", "rocky": "taiwan", "sandy": "taiwan", "reef": "coral", "ocean": "world", "deep": "world"}
HALL_NAME = {"taiwan": "台灣水域館", "coral": "珊瑚王國館", "world": "世界水域館"}
TOXIC = re.compile(r"毒腺|河豚毒素|有毒魚類|卵巢有毒")  # 「模仿有毒海蛞蝓」「海綿有毒性」不算本身有毒


def ai_texts() -> dict:
    out = {}
    for f in sorted((ROOT / "data" / "ai").glob("batch_*.json")):
        out.update(json.loads(f.read_text("utf-8")))
    return out


def photo_of(sid, photos) -> dict | None:
    if (ROOT / "public" / "img" / "sp" / f"{sid}-480.webp").exists():
        p = photos.get(sid)
        if p:
            return {"by": p["artist"] or p["credit"], "lic": p["license"], "page": p["page"]}
        if (CACHE / "photos" / "ai" / f"{sid}.png").exists():
            return {"ai": True}
    return None


def main():
    sp = load_json(ROOT / "data" / "species.json")
    ai = ai_texts()
    photos = load_json(ROOT / "data" / "photos.json", {})
    species = []
    for s in sp:
        a = ai.get(s["id"])
        if not a or "skip" in a:
            continue
        orig = teachable(s["text"])
        species.append({
            "id": s["id"], "name": s["name"], "sci": s["sci"], "fam": s["family_zh"] if s["family_zh"] not in ("", "科") else "", "famSci": s["family"],
            "kind": s["kind"], "g": a["g"], "h": a["h"], "d": a["d"], "hall": HALL_OF.get(a["h"]),
            "k": a["k"], "e": a["e"], "c": a["c"], "orig": orig[:900] + ("…" if len(orig) > 900 else ""),
            "prot": s["protected"], "iucn": s["iucn"], "endemic": s["endemic"],
            "toxic": bool(TOXIC.search(s["text"])),
            "src": {"type": s["text_src"], "url": s.get("ntm_url") or s.get("wiki_url", "")},
            "photo": photo_of(s["id"], photos),
        })
    halls_csv = list(csv.DictReader(io.StringIO((RAW / "halls.csv").read_text("utf-8-sig"))))
    halls = []
    for hid, name in HALL_NAME.items():
        row = next((r for r in halls_csv if r["展館名稱"] == name), {})
        halls.append({"id": hid, "name": name, "intro": row.get("展內介紹", ""), "url": row.get("展館網址", ""),
                      "count": sum(1 for x in species if x["hall"] == hid)})
    units = load_json(ROOT / "data" / "units.json")["units"]
    ex = json.loads((RAW / "exhibits.json").read_text("utf-8-sig"))
    for u in units:
        src = next(x for x in ex if u["src"] in x["特展名稱"])
        u["orig"] = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", src["特展內容"]).replace("&nbsp;", " ").replace("&hellip;", "…")).strip()
        u["origTitle"] = src["特展名稱"].strip()
        u["url"] = src["Source"]
    raw_meta = load_json(RAW / "meta.json", {})
    meta = {
        "version": datetime.date.today().isoformat(),
        "species": len(species), "photos": sum(1 for x in species if x["photo"] and not x["photo"].get("ai")),
        "aiPhotos": sum(1 for x in species if x["photo"] and x["photo"].get("ai")),
        "fish": sum(1 for x in species if x["kind"] == "fish"), "units": len(units),
        "sources": {k: {"title": v["title"], "modified": v["modified"]} for k, v in raw_meta.items()},
    }
    save_json(PUB / "sea.json", {"meta": meta, "species": species, "halls": halls, "units": units}, indent=None)
    save_json(PUB / "meta.json", meta)
    # 照片資料夾只留收錄的種（排除 skip 的，避免發布用不到的圖）
    keep = {x["id"] for x in species}
    removed = 0
    for f in (ROOT / "public" / "img" / "sp").glob("*.webp"):
        if f.stem.rsplit("-", 1)[0] not in keep:
            f.unlink()
            removed += 1
    size = (PUB / "sea.json").stat().st_size
    print(f"sea.json {size / 1e3:.0f} KB：{meta['species']} 種（照片 {meta['photos']}、AI 圖 {meta['aiPhotos']}）、{len(units)} 單元；刪掉用不到的圖 {removed} 張")


if __name__ == "__main__":
    sys.exit(main())
