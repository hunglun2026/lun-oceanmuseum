"""查核特展單元 data/units.json：數字要在特展原文找得到；禁用詞、破折號、簡體字；每題 3 個選項、答案索引正確。
用法：python tools/unit_check.py；有問題離場碼 1
"""
import re
import sys

from ai_check import BANNED, simplified
from common import RAW, ROOT, load_json


def clean(html: str) -> str:
    t = re.sub(r"<[^>]+>", "", html or "").replace("&nbsp;", " ").replace("&hellip;", "…")
    return re.sub(r"\s+", " ", t).strip()


def main():
    import json
    ex = json.loads((RAW / "exhibits.json").read_text("utf-8-sig"))
    units = load_json(ROOT / "data" / "units.json")["units"]
    bad = 0
    for u in units:
        src = next((x for x in ex if u["src"] in x["特展名稱"]), None)
        if not src:
            print(f"{u['id']}：找不到特展「{u['src']}」")
            bad += 1
            continue
        ref = clean(src["特展內容"]).translate(str.maketrans("０１２３４５６７８９ＤＸ", "0123456789DX"))
        texts = [u["title"], u["k"], u["e"]] + [q["q"] + "".join(q["o"]) + q["x"] for q in u["quiz"]]
        allt = "".join(texts).translate(str.maketrans("０１２３４５６７８９ＤＸ", "0123456789DX"))
        for num in set(re.findall(r"\d+", allt)):
            if num not in ref:
                print(f"{u['id']}：數字「{num}」原文沒有")
                bad += 1
        if BANNED.search(allt):
            print(f"{u['id']}：禁用詞或破折號 {BANNED.search(allt).group(0)}")
            bad += 1
        sz = simplified(allt)
        if sz:
            print(f"{u['id']}：簡體字 {''.join(sz)}")
            bad += 1
        for q in u["quiz"]:
            if len(q["o"]) < 3 or not 0 <= q["a"] < len(q["o"]):
                print(f"{u['id']}：題目格式不對 {q['q']}")
                bad += 1
        if len(u["quiz"]) != 5:
            print(f"{u['id']}：題數 {len(u['quiz'])}")
            bad += 1
    print(f"查核 {len(units)} 個單元，問題 {bad} 個")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
