"""離線檢查 public/data 的資料完整性（npm test 會跑；GitHub Actions 部署前也跑）。有問題離場碼 1。"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUB = ROOT / "public"
GROUPS = {"shark", "ray", "eel", "reef", "puffer", "flat", "school", "bottom", "other", "cetacean", "turtle", "coral"}
HABS = {"estuary", "rocky", "sandy", "reef", "ocean", "deep", None}
HALLS = {"taiwan", "coral", "world", None}
errors = []


def err(msg):
    errors.append(msg)


d = json.loads((PUB / "data" / "sea.json").read_text("utf-8"))
meta = json.loads((PUB / "data" / "meta.json").read_text("utf-8"))
sp = d["species"]
ids = [a["id"] for a in sp]
if len(ids) != len(set(ids)):
    err("物種 id 重複")
if meta["species"] != len(sp):
    err(f"meta.species {meta['species']} ≠ 實際 {len(sp)}")
for a in sp:
    t = f"{a['id']} {a['name']}"
    if a["g"] not in GROUPS:
        err(f"{t}：類群 {a['g']}")
    if a["h"] not in HABS or a["hall"] not in HALLS:
        err(f"{t}：棲地／展館 {a['h']} {a['hall']}")
    if not a["k"] or not a["e"] or len(a["c"]) != 3:
        err(f"{t}：缺改寫或線索")
    if not a["src"]["url"]:
        err(f"{t}：缺文字來源網址")
    if a["photo"]:
        for w in (480, 800):
            if not (PUB / "img" / "sp" / f"{a['id']}-{w}.webp").exists():
                err(f"{t}：缺照片檔 {w}")
        if not a["photo"].get("ai") and not (a["photo"].get("lic") and a["photo"].get("page")):
            err(f"{t}：照片缺授權或出處")
for u in d["units"]:
    if len(u["quiz"]) != 5 or any(not 0 <= q["a"] < len(q["o"]) for q in u["quiz"]):
        err(f"單元 {u['id']}：題目格式")
    if not u.get("orig") or not u.get("url"):
        err(f"單元 {u['id']}：缺原文或來源")
ex = json.loads((PUB / "data" / "explore.json").read_text("utf-8"))
if len(ex["edna"]) < 50 or not ex["svg"]["path"]:
    err("explore.json 測站或地圖不完整")
known = set(ids)
for s in ex["edna"]:
    for i in s["ours"]:
        if i not in known:
            err(f"測站 {s['name']} 指到不存在的物種 {i}")
photos_on_disk = {f.stem.rsplit("-", 1)[0] for f in (PUB / "img" / "sp").glob("*.webp")}
if photos_on_disk - known:
    err(f"多出用不到的照片：{sorted(photos_on_disk - known)[:5]}")
print(f"資料檢查：{len(sp)} 種、{len(d['units'])} 單元、{len(ex['edna'])} 測站；問題 {len(errors)} 個")
for e in errors[:40]:
    print("  " + e)
sys.exit(1 if errors else 0)
