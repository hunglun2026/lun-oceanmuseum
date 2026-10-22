"""臺博館魚類標本 → 一種一筆的候選清單 data/candidates.json。

同一個藏品名稱有很多件標本，取說明最長的那件；從說明抽出：
- 現行中文名：「○○分類上屬…」的○○（臺博館藏品名稱常是舊名）
- 綱、科拉丁名：「…綱(Actinopterygii)…科(Serranidae)」
- 原文裡的學名（少數有寫）
海水／河口／淡水的判斷不在這裡做，人工標在 data/tags.json。
用法：python tools/species.py
"""
import re
import sys

from common import RAW, ROOT, load_list, save_json

CLASS = {"Actinopterygii": "條鰭魚綱", "Chondrichthyes": "軟骨魚綱", "Myxini": "盲鰻綱"}


def clean(s: str) -> str:
    s = (s or "").replace("\r", "").replace("　", " ")
    return re.sub(r"[ \t]+", " ", s).strip()


def parse(title: str, desc: str) -> dict:
    t = clean(desc)
    body = re.split(r"註釋或參考文獻[:：]?", t)[0].strip()
    m = re.match(r"^(?:NTMP[\d-]+\s*)?([^\s，。,(（]{2,12}?)\s*分類上(?:屬)?", body)
    fams = re.findall(r"([一-鿿]{1,6}科)\s*[(（]\s*([A-Z][a-z]+(?:idae|inae)?)\s*[)）]", body)
    cls = next((v for k, v in CLASS.items() if k in body), "")
    sci = re.search(r"\b([A-Z][a-z]+ [a-z]{3,})\b", body)
    return {
        "title": title,
        "name": m.group(1) if m else title,
        "family_zh": fams[-1][0] if fams else "",
        "family": fams[-1][1] if fams else "",
        "class": cls,
        "sci_in_text": sci.group(1) if sci else "",
        "desc": body,
    }


def main():
    rows = load_list(RAW / "fish.json")
    best = {}
    for r in rows:
        d = (r.get("Description") or "").strip()
        if not d:
            continue
        k = r["MainTitle"].strip()
        if k not in best or len(d) > len(best[k]["Description"]):
            best[k] = r
    out = []
    for k, r in best.items():
        p = parse(k, r["Description"])
        p["ids"] = sorted(x["Identifier"] for x in rows if x["MainTitle"].strip() == k)
        p["url"] = r["OriginalUrl"]
        out.append(p)
    save_json(ROOT / "data" / "candidates.json", out)
    print(f"候選 {len(out)} 種；抽到現行名 {sum(p['name'] != p['title'] for p in out)}、科名 {sum(bool(p['family']) for p in out)}")


if __name__ == "__main__":
    sys.exit(main())
