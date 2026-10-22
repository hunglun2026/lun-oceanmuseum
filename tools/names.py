"""中文名 → 學名與棲水類型：查臺灣物種名錄 TaiCOL（api.taicol.tw/v2/taxon）。

依序用「說明裡的現行名」「臺博館藏品名稱」「原文寫的學名」查，取 accepted 的種，
並比對 TaiCOL 的科名跟臺博館說明的科名一致才算對上（臺博館說明偶有張冠李戴）。
結果寫 data/names.json；人工修正寫在 data/names_fix.json（{藏品名稱: 學名 或 null=剔除}），重跑不會被蓋掉。
用法：python tools/names.py
"""
import json
import re
import sys
import time
import urllib.parse

from common import ROOT, get, load_json, save_json

API = "https://api.taicol.tw/v2/taxon?"


def query(**kw) -> list:
    for _ in range(3):
        try:
            r = json.loads(get(API + urllib.parse.urlencode(kw), 30))
            return [d for d in r.get("data") or [] if d.get("taxon_status") == "accepted"]
        except Exception:  # noqa: BLE001
            time.sleep(3)
    return []


def family_of(d: dict) -> tuple:
    for h in d.get("higher_taxa") or []:
        if h.get("rank") == "Family":
            return h.get("simple_name", ""), h.get("common_name_c") or ""
    return "", ""


def slim(d: dict) -> dict:
    fam, fam_zh = family_of(d)
    return {
        "sci": d["simple_name"], "taicol": d["taxon_id"], "zh": d.get("common_name_c") or "",
        "alt": d.get("alternative_name_c") or "", "family": fam, "family_zh": fam_zh,
        "marine": bool(d.get("is_marine")), "brackish": bool(d.get("is_brackish")), "freshwater": bool(d.get("is_freshwater")),
        "endemic": bool(d.get("is_endemic")), "in_taiwan": bool(d.get("is_in_taiwan")),
        "iucn": d.get("iucn") or "", "redlist": d.get("redlist") or "", "protected": d.get("protected") or "",
    }


def lookup(c: dict) -> tuple:
    tries = []
    for n in dict.fromkeys([c["name"].rstrip("?？"), re.sub(r"\(.*?\)", "", c["title"])]):
        tries.append(("common_name", n))
    if c["sci_in_text"]:
        tries.append(("scientific_name", c["sci_in_text"]))
    for key, val in tries:
        for d in query(**{key: val}):
            if d.get("rank") not in ("Species", "Subspecies"):
                continue
            s = slim(d)
            ok = not c["family"] or c["family"][:5] == s["family"][:5]
            return s, f"{key}={val}", ok
    return None, "", False


def main():
    cands = load_json(ROOT / "data" / "candidates.json")
    fix = load_json(ROOT / "data" / "names_fix.json", {})
    out, miss, bad = {}, [], []
    for c in cands:
        t = c["title"]
        if t.startswith("_"):
            continue
        if t in fix:
            if fix[t]:
                hit = query(scientific_name=fix[t])
                out[t] = dict(slim(hit[0]), via="人工指定", family_match=True) if hit else None
                if not hit:
                    miss.append(f"{t}（人工指定 {fix[t]} 在 TaiCOL 查不到）")
            else:
                out[t] = None
            continue
        s, via, ok = lookup(c)
        if not s:
            miss.append(t)
        elif not ok:
            bad.append(f"{t}：臺博館 {c['family']}，TaiCOL {s['sci']}（{s['family']}）")
        out[t] = dict(s, via=via, family_match=ok) if s else None
        time.sleep(0.2)
    save_json(ROOT / "data" / "names.json", out)
    print(f"查到 {sum(1 for v in out.values() if v)} / {len(cands)}")
    print("查不到：", "、".join(miss))
    print("科名不一致：\n  " + "\n  ".join(bad))


if __name__ == "__main__":
    sys.exit(main())
