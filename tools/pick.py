"""挑出本站收錄的物種 → data/species.json（之後的改寫、照片、出題都以它為準）。

魚：臺博館候選＋names.json，只留 TaiCOL 標「臺灣有紀錄」且海水或河口的。
保育類：海洋保育署名錄裡 TaiCOL 標臺灣有紀錄的哺乳類、爬蟲類、魚類、珊瑚（不收海鳥，GrillMe 第 1 題）。
保育類沒有介紹文字，抓中文維基百科開頭段落（臺灣正體）當事實來源，存 data/raw/wiki/。
用法：python tools/pick.py [--wiki]  （--wiki 才重抓維基）
"""
import csv
import io
import json
import sys
import time
import urllib.parse

from common import RAW, ROOT, get, load_json, save_json
from names import query, slim

# 名錄裡名字被截成「?」、學名對不上 TaiCOL 的，人工補學名
PROTECTED_FIX = {"雙吻前口蝠?": "Mobula birostris", "阿氏前口蝠?": "Mobula alfredi"}
# 維基條目名稱跟 TaiCOL 中文名不同的
WIKI_TITLE = {"Neophocaena asiaeorientalis": "窄脊江豚"}

def wiki_intro(title: str, full=False) -> dict:
    """開頭段落；開頭太短（不到 200 字）時改抓全文前 2000 字，不然改寫時只能自己補常識。"""
    q = {"action": "query", "prop": "extracts|info", "explaintext": 1, "redirects": 1,
         "titles": title, "variant": "zh-tw", "inprop": "url", "format": "json"}
    if not full:
        q["exintro"] = 1
    r = json.loads(get("https://zh.wikipedia.org/w/api.php?" + urllib.parse.urlencode(q), 30,
                       {"User-Agent": "lun-oceanmuseum/0.1 (education site; hunglun2026@gmail.com)"}))
    page = next(iter(r["query"]["pages"].values()))
    if "missing" in page:
        return {}
    text = page.get("extract", "").strip()
    if not full and len(text) < 200:
        return wiki_intro(title, full=True)
    return {"title": page["title"], "url": page.get("fullurl", ""), "text": text[:2000]}


def main():
    want_wiki = "--wiki" in sys.argv
    cands = {c["title"]: c for c in load_json(ROOT / "data" / "candidates.json")}
    names = load_json(ROOT / "data" / "names.json")
    out = []
    for t, n in names.items():
        # 有海水，或只在河口不進淡水（鯰魚、鬍鯰這種河口淡水都有的算淡水魚）
        if not n or not n["in_taiwan"] or not (n["marine"] or (n["brackish"] and not n["freshwater"])):
            continue
        c = cands[t]
        out.append({
            "src": "ntm", "title": t, "name": n["zh"] or c["name"], "alt": n["alt"], "sci": n["sci"],
            "family": n["family"], "family_zh": n["family_zh"], "class": c["class"] or ("軟骨魚綱" if "Chondrichthyes" in c["desc"] else "條鰭魚綱"),
            "kind": "fish", "marine": n["marine"], "brackish": n["brackish"], "freshwater": n["freshwater"],
            "endemic": n["endemic"], "iucn": n["iucn"], "redlist": n["redlist"], "protected": n["protected"],
            "text": c["desc"], "text_src": "ntm", "ntm_url": c["url"], "taicol": n["taicol"],
        })
    kinds = {"海洋哺乳類": "mammal", "海洋爬蟲類": "turtle", "海洋魚類": "fish", "其他種類之物種": "coral"}
    rows = list(csv.DictReader(io.StringIO((RAW / "protected.csv").read_text("utf-8-sig"))))
    wiki_dir = RAW / "wiki"
    for r in rows:
        kind = kinds.get(r["種類"])
        if not kind:
            continue
        sci = PROTECTED_FIX.get(r["Common Name(俗名)"], r["Scientific Name(學名)"].strip())
        h = query(scientific_name=sci)
        if not h:
            continue
        n = slim(h[0])
        if not n["in_taiwan"]:
            continue
        wf = wiki_dir / f"{n['sci'].replace(' ', '_')}.json"
        if want_wiki or not wf.exists():
            w = wiki_intro(WIKI_TITLE.get(n["sci"], n["zh"])) or wiki_intro(n["sci"])
            save_json(wf, w)
            time.sleep(0.5)
        w = load_json(wf, {})
        out.append({
            "src": "oca", "title": r["Common Name(俗名)"], "name": n["zh"], "alt": n["alt"], "sci": n["sci"],
            "family": n["family"], "family_zh": n["family_zh"], "class": "", "kind": kind,
            "marine": True, "brackish": n["brackish"], "freshwater": n["freshwater"], "endemic": n["endemic"],
            "iucn": n["iucn"], "redlist": n["redlist"], "protected": r["Category(保育等級)"].strip(),
            "text": w.get("text", ""), "text_src": "wiki" if w.get("text") else "", "wiki_url": w.get("url", ""),
            "taicol": n["taicol"],
        })
        time.sleep(0.15)
    # 同一學名只留一筆（名錄的蘇眉魚、隆頭鸚哥魚可能跟臺博館重複）
    seen, uniq = set(), []
    for s in out:
        if s["sci"] in seen:
            continue
        seen.add(s["sci"])
        uniq.append(s)
    # id 用 TaiCOL 物種編號：資料更新後順序變了，照片與改寫也不會對錯種
    for s in uniq:
        s["id"] = s["taicol"]
    save_json(ROOT / "data" / "species.json", uniq)
    print(f"收錄 {len(uniq)} 種：", {k: sum(s['kind'] == k for s in uniq) for k in ('fish', 'mammal', 'turtle', 'coral')},
          "；保育類沒抓到維基：", [s["name"] for s in uniq if s["src"] == "oca" and not s["text"]])


if __name__ == "__main__":
    sys.exit(main())
