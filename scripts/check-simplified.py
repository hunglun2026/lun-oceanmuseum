"""掃簡體字：網站程式與頁面、本站寫的文字（改寫、線索、特展測驗）。有問題離場碼 1。
物種正式名稱照 TaiCOL 名錄（例如「鳚」）放行；臺博館、維基、海生館原文照錄，只列出來不算失敗。
判斷方式：用 zhconv 逐字轉成繁體，跟原字不同就是簡體字（不手寫字表，避免誤列兩岸共用字）。
「一簡對多繁」但繁體本來合法的字放白名單。需要：pip install zhconv"""
import sys
from pathlib import Path

from zhconv import convert

ROOT = Path(__file__).resolve().parent.parent
ALWAYS_OK = set("准划占栗虱郁台里后干范")  # 核准、划算、占用、苗栗、虱目魚、濃郁、台、里、后、干、范


def in_big5(ch: str) -> bool:
    try:
        ch.encode("cp950")
        return True
    except UnicodeEncodeError:
        return False


def bad_chars(text: str) -> dict:
    """zhconv 說不同、而且不在台灣用的 Big5 字集裡，才算簡體字。
    只靠 zhconv 會把岩、游、泄、祕、污、凶、苧…這些繁體本來就合法的一簡對多繁字誤報。"""
    out = {}
    for ch in set(text):
        if ord(ch) > 0x2E80 and ch not in ALWAYS_OK and convert(ch, "zh-tw") != ch and not in_big5(ch):
            out[ch] = convert(ch, "zh-tw")
    return out


def main() -> int:
    import json
    bad = 0
    for p in list((ROOT / "public").rglob("*")) + list((ROOT / "src").glob("*.ts")):
        if p.suffix in (".html", ".js", ".css", ".ts"):
            b = bad_chars(p.read_text(encoding="utf-8"))
            if b:
                bad += 1
                print(f"[簡體] {p.relative_to(ROOT)}: {b}")
    d = json.loads((ROOT / "public" / "data" / "sea.json").read_text(encoding="utf-8"))
    orig_hits = {}
    for a in d["species"]:
        ours = a["k"] + a["e"] + "".join(a["c"])
        b = {k: v for k, v in bad_chars(ours).items() if k not in a["name"]}
        if b:
            bad += 1
            print(f"[本站改寫含簡體] {a['name']}: {b}")
        for ch in bad_chars(a["orig"]):
            orig_hits.setdefault(ch, []).append(a["name"])
    for u in d["units"]:
        b = bad_chars(u["title"] + u["k"] + u["e"] + json.dumps(u["quiz"], ensure_ascii=False))
        if b:
            bad += 1
            print(f"[特展改寫含簡體] {u['id']}: {b}")
    for ch, names in orig_hits.items():
        print(f"（原文照錄，不算失敗）「{ch}」出現在 {len(names)} 種，例：{names[:3]}")
    print("沒有發現簡體字" if not bad else f"共 {bad} 處需要看")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
