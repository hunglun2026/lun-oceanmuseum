"""版本號單一來源：package.json 的 version。其他地方都由這支腳本寫入，不要手改。

寫入：wrangler.jsonc 的 APP_VERSION、public/js/icons.js 的 APP_VERSION（頁尾顯示 v x.y.z、圖示網址）、
public/*.html 裡 CSS／JS／圖示網址的 ?v=（快取參數跟著版本走，改版本就自動換新網址）。
用法：python scripts/sync-version.py          寫入
      python scripts/sync-version.py --check  只檢查有沒有不一致（npm run check 會跑）
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VER = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))["version"]
assert re.fullmatch(r"\d+\.\d+\.\d+", VER), f"package.json 的 version 不是 主.次.修：{VER}"

# (檔案, 正規式, 取代成)；每個檔案的換行格式保持原樣
RULES = [
    (ROOT / "wrangler.jsonc", r'("APP_VERSION":\s*")[^"]*(")', rf"\g<1>{VER}\g<2>"),
    (ROOT / "public/js/icons.js", r'(const APP_VERSION = ")[^"]*(")', rf"\g<1>{VER}\g<2>"),
]
for h in sorted((ROOT / "public").glob("*.html")):
    RULES.append((h, r'((?:css|js)/[A-Za-z0-9_.-]+\.(?:css|js)\?v=)[^"\']*', rf"\g<1>{VER}"))
    RULES.append((h, r'(img/ico/[A-Za-z0-9_.-]+\.webp\?v=)[^"\']*', rf"\g<1>{VER}"))


def main() -> int:
    check = "--check" in sys.argv
    bad = []
    for path, pat, rep in RULES:
        raw = path.read_bytes().decode("utf-8")
        new, n = re.subn(pat, rep, raw)
        if n == 0 and path.suffix != ".html":
            bad.append(f"{path.name}：找不到要寫版本號的位置")
        elif new != raw:
            if check:
                bad.append(f"{path.relative_to(ROOT)} 的版本號不是 {VER}")
            else:
                path.write_bytes(new.encode("utf-8"))
    for b in bad:
        print("[不一致]", b)
    print(f"版本 {VER}：" + ("有不一致" if bad else ("檢查通過" if check else "已寫入")))
    return 1 if bad else 0


sys.exit(main())
