"""查核 Claude 寫的改寫（data/ai/batch_NN.json），抓可能編造或不合規的地方。

每種一筆：g 類群、h 棲地、d 食性、k 幼兒園一句、e 國小一段、c 猜謎線索 3 條；或 {"skip": 原因} 表示不收。
規則：
- g／h／d 要在允許清單裡（h、d 可以是 null＝原文沒寫，不出那類題）
- 字數：k ≤ 20、e 50～110、c 每條 8～40
- 數字（阿拉伯數字與「中文數字＋單位」）要在原文或名稱裡找得到
- 不能有破折號、簡體字、禁用詞；線索不能出現自己的正式名稱、藏品名、跟正式名稱重疊的俗名
- 全部收錄物種都要有一筆（--all 才查這項）
用法：python tools/ai_check.py [--all] [批號…]；有問題離場碼 1
"""
import json
import re
import sys

from common import ROOT, load_json

GROUPS = {"shark", "ray", "eel", "reef", "puffer", "flat", "school", "bottom", "other", "cetacean", "turtle", "coral"}
HABS = {"estuary", "rocky", "sandy", "reef", "ocean", "deep", None}
DIETS = {"meat", "plant", "omni", "plankton", None}
BANNED = re.compile(r"——|—|賦能|優化|抓手|顆粒度|閉環|落地|對齊|痛點|視頻|信息|質量|用戶|渲染|調性|骨架|語意")
CN = "一二兩三四五六七八九十百千萬"
UNIT = "公條個隻種片枚根道層對顆年天倍次組隻歲"


def simplified(text):
    try:
        from zhconv import convert
    except ImportError:
        return ["（沒裝 zhconv，無法查簡體字）"]
    # 逐字轉換會把「游」「岩」這類繁體本來就合法的字也轉掉（一簡對多繁），
    # 所以轉換後不同、而且不在 Big5（cp950）字集裡的才算簡體字
    out = []
    for ch in set(text):
        if ord(ch) > 0x2E80 and convert(ch, "zh-tw") != ch:
            try:
                ch.encode("cp950")
            except UnicodeEncodeError:
                out.append(ch)
    return out


def cn_variants(m):
    d = {"一": 1, "二": 2, "兩": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9}
    out = {m, m.replace("兩", "二"), m.replace("二", "兩")}
    if re.fullmatch(f"[{''.join(d)}]", m):
        out.add(str(d[m]))
    elif re.fullmatch(f"[{''.join(d)}]?十[{''.join(d)}]?", m):
        a, _, b = m.partition("十")
        out.add(str((d.get(a, 1) if a else 1) * 10 + d.get(b, 0)))
    return out


def names_of(s):
    """線索不能出現的字串：正式名稱、藏品名、名稱後三字（例：玳瑁石斑魚→石斑魚），
    以及跟正式名稱重疊的俗名（「石斑」會洩漏玳瑁石斑魚）。其他俗名可以當線索（選項是正式名稱，不會洩題）。"""
    name = s["name"]
    ns = {name, re.sub(r"\(.*?\)|（.*?）", "", s["title"])}
    if len(name) >= 4:
        ns.add(name[-3:])
    for x in re.split(r"[,，、]", s["alt"] or ""):
        x = x.strip()
        if len(x) >= 2 and (x in name or name in x):
            ns.add(x)
    return {n for n in ns if len(n) >= 2}


def check_one(s, a):
    if "skip" in a:
        return [] if a["skip"] else ["skip 要寫原因"]
    p = []
    if a.get("g") not in GROUPS:
        p.append(f"類群 {a.get('g')} 不在清單")
    if a.get("h") not in HABS:
        p.append(f"棲地 {a.get('h')} 不在清單")
    if a.get("d") not in DIETS:
        p.append(f"食性 {a.get('d')} 不在清單")
    k, e, c = a.get("k", ""), a.get("e", ""), a.get("c", [])
    if not 4 <= len(k) <= 20:
        p.append(f"幼兒園句 {len(k)} 字")
    if not 50 <= len(e) <= 110:
        p.append(f"國小段 {len(e)} 字")
    if len(c) != 3:
        p.append(f"線索要 3 條，現在 {len(c)}")
    for x in c:
        if not 8 <= len(x) <= 40:
            p.append(f"線索 {len(x)} 字：{x}")
        for n in names_of(s):
            if n in x:
                p.append(f"線索含名字「{n}」：{x}")
    ref = s["name"] + s["title"] + (s["alt"] or "") + s["text"]
    allt = k + e + "".join(c)
    for num in re.findall(r"\d+(?:\.\d+)?", allt):
        if num not in ref:
            p.append(f"數字「{num}」原文沒有")
    for m in re.findall(f"[{CN}]+(?=[{UNIT}])", allt):
        if m in ("一",):
            continue
        if not any(v in ref for v in cn_variants(m)):
            p.append(f"數量「{m}」原文沒有")
    if BANNED.search(allt):
        p.append("禁用詞或破折號：" + BANNED.search(allt).group(0))
    # 物種名稱是 TaiCOL 正式名（專有名詞，例如「鳚」），名稱裡的字不算簡體字
    sz = [ch for ch in simplified(allt) if ch not in s["name"]]
    if sz:
        p.append("簡體字：" + "".join(sz))
    return p


def main():
    args = [x for x in sys.argv[1:] if not x.startswith("--")]
    sp = {s["id"]: s for s in load_json(ROOT / "data" / "species.json")}
    files = sorted((ROOT / "data" / "ai").glob("batch_*.json"))
    if args:
        files = [f for f in files if f.stem.split("_")[1] in args]
    seen, bad = set(), 0
    for f in files:
        for sid, a in json.loads(f.read_text("utf-8")).items():
            if sid not in sp:
                print(f"{f.name} {sid}：不在 species.json")
                bad += 1
                continue
            seen.add(sid)
            for x in check_one(sp[sid], a):
                print(f"{f.name} {sid} {sp[sid]['name']}：{x}")
                bad += 1
    if "--all" in sys.argv:
        for sid, s in sp.items():
            if sid not in seen:
                print(f"缺改寫：{sid} {s['name']}")
                bad += 1
    print(f"查核 {len(seen)} 種，問題 {bad} 個")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
