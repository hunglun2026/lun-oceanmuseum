"""CACHE/photos/raw/ 原圖 → public/img/sp/<id>-800.webp、<id>-480.webp（只轉收錄的種，已轉過且原圖沒變就跳過）。
AI 插圖放 CACHE/photos/ai/<id>.png（去浮水印後），一樣轉。
用法：python tools/build_images.py
"""
import sys

from PIL import Image

from common import CACHE, ROOT, load_json

OUT = ROOT / "public" / "img" / "sp"


def convert(src, sid):
    im = Image.open(src).convert("RGB")
    for w in (800, 480):
        dst = OUT / f"{sid}-{w}.webp"
        if dst.exists() and dst.stat().st_mtime > src.stat().st_mtime:
            continue
        x = im.copy()
        x.thumbnail((w, w * 3 // 4 if x.width >= x.height else w))
        x.save(dst, "WEBP", quality=78, method=6)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    photos = load_json(ROOT / "data" / "photos.json", {})
    n = 0
    for sid, p in photos.items():
        if p:
            convert(CACHE / "photos" / "raw" / p["local"], sid)
            n += 1
    for f in (CACHE / "photos" / "ai").glob("*.png"):
        convert(f, f.stem)
        n += 1
    size = sum(f.stat().st_size for f in OUT.glob("*.webp"))
    print(f"轉 {n} 種，public/img/sp 共 {size / 1e6:.1f} MB")


if __name__ == "__main__":
    sys.exit(main())
