"""把 Gemini 生成的圖示原圖（1024px）處理成網站用的小圖 public/img/ico/<名稱>.webp。

原圖放在 D:\\steve0904\\logo專區\\<日期>\\lun-oceanmuseum-icons\\photo（寫真風）與 flat（扁平插圖）。
處理：裁掉右下角（Gemini 浮水印與去浮水印的修補痕跡都在那裡）→ 縮成 160x160 → 存 webp。
主體生成時就要求四周留白 15% 以上，所以偏左上裁切不會切到主體。

用法：python scripts/build_icons.py <原圖資料夾，內含 photo 與 flat 兩個子資料夾>
"""
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "img" / "ico"
SIZE = 160
# 以原圖寬高的比例裁：左上各留 4%，右下留到 88%（浮水印在 88% 之外）
BOX = (0.04, 0.04, 0.88, 0.88)


def build(src: Path) -> bool:
    im = Image.open(src).convert("RGB")
    w, h = im.size
    box = (round(w * BOX[0]), round(h * BOX[1]), round(w * BOX[2]), round(h * BOX[3]))
    side = min(box[2] - box[0], box[3] - box[1])
    # 取正方形：以裁切區中心為準
    cx, cy = (box[0] + box[2]) // 2, (box[1] + box[3]) // 2
    sq = im.crop((cx - side // 2, cy - side // 2, cx + side // 2, cy + side // 2)).resize((SIZE, SIZE), Image.LANCZOS)
    sq.save(OUT / (src.stem + ".webp"), "WEBP", quality=82, method=6)
    return True


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    OUT.mkdir(parents=True, exist_ok=True)
    n = 0
    for sub in ("photo", "flat"):
        for p in sorted((Path(sys.argv[1]) / sub).glob("*.png")):
            build(p)
            n += 1
    print(f"已處理 {n} 張，輸出到 {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
