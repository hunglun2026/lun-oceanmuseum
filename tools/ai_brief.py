"""把 species.json 的原文整理成改寫用的閱讀稿 data/ai/brief_NN.txt（每批 25 種）。

拿掉不能教的制式內容：分類階層句、標本紀錄（採集日期、標本全長、浸液）、參考文獻註記。
改寫結果由 Claude 寫成 data/ai/batch_NN.json，再跑 ai_check.py 查核。
用法：python tools/ai_brief.py
"""
import re
import sys

from common import ROOT, load_json

BATCH = 25
DROP = [
    r"[^。]*分類上(?:屬)?[^。]*。",
    r"[^。]*(?:本件標本|NTMP\d|清查(?:登錄|入帳)|酒精浸液|採集者|吻肛長)[^。]*。",
    r"(?:選擇性內容|必要性內容)",
    r"\[\d+\]",
    r"\(參考[^)]*\)|（參考[^）]*）",
    r"(?:資料來源|引用資料|註釋或參考文獻|參考資料|本館館藏頁面)[:：]?.*$",
    r"https?://\S+",
]


def teachable(text: str) -> str:
    t = text.replace("\n", " ")
    for p in DROP:
        t = re.sub(p, "", t)
    t = re.sub(r"\s+", " ", t).strip()
    # 生態、分布段落排前面（形態描述很長，會把它們擠出字數上限）
    parts = re.split(r"(?=(?:生態|分布|形態|利用|漁業利用)\s*[:：])", t)
    order = lambda x: 0 if x.startswith(("生態", "分布")) else 1
    return " ".join(sorted(parts, key=order)).strip()


def main():
    sp = load_json(ROOT / "data" / "species.json")
    d = ROOT / "data" / "ai"
    d.mkdir(parents=True, exist_ok=True)
    for b in range(0, len(sp), BATCH):
        lines = []
        for s in sp[b:b + BATCH]:
            src = teachable(s["text"])[:700]
            lines.append(f"## {s['id']} {s['name']}（{s['sci']}，{s['family_zh']}；別名：{s['alt'] or '無'}；"
                         f"{'海' if s['marine'] else ''}{'河口' if s['brackish'] else ''}{'淡' if s['freshwater'] else ''}；"
                         f"來源 {s['text_src'] or '無'}）\n{src or '（沒有介紹文字）'}\n")
        (d / f"brief_{b // BATCH + 1:02d}.txt").write_text("\n".join(lines), "utf-8")
    print(f"{(len(sp) + BATCH - 1) // BATCH} 批，寫在 {d}")


if __name__ == "__main__":
    sys.exit(main())
