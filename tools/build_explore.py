"""高中「海洋探究」頁的資料：public/data/explore.json
- 臺灣輪廓：Natural Earth 10m 國界（公有領域）取臺灣、澎湖、金門、馬祖，簡化後投影成 SVG path
- eDNA：103 個測站的位置、深度、偵測到的魚種數，以及本站有收錄的魚
- 擱淺：鯨豚、海龜依年份、縣市、物種、死活、原因彙整（只放統計，不放每筆座標）
Natural Earth 檔 13 MB 不放專案（會被備份進 git）：下載到系統暫存資料夾，沒有才重抓。
用法：python tools/build_explore.py
"""
import collections
import csv
import io
import json
import math
import os
import sys
from pathlib import Path

from shapely.geometry import shape, box
from shapely.ops import unary_union

from common import RAW, ROOT, get, load_json, save_json

NE_URL = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries_twn.geojson"
BBOX = (118.0, 21.7, 122.3, 26.5)  # 經度、緯度範圍（含金門、馬祖）
W = 600  # SVG 寬度（像素）
K = math.cos(math.radians(24))  # 等距圓柱投影在北緯 24 度修正經度比例


def proj(lon, lat):
    x0, y0, x1, y1 = BBOX
    sx = W / ((x1 - x0) * K)
    return round((lon - x0) * K * sx, 1), round((y1 - lat) * sx, 1)


def svg_size():
    return proj(BBOX[2], BBOX[1])


def taiwan_path():
    f = Path(os.environ.get("TEMP", ".")) / "ne_countries_twn.geojson"
    if not f.exists():
        f.write_bytes(get(NE_URL, 300))
    gj = json.loads(f.read_text("utf-8"))
    feat = next(x for x in gj["features"] if x["properties"].get("ADM0_A3") == "TWN")
    geom = shape(feat["geometry"]).intersection(box(*BBOX)).simplify(0.008, preserve_topology=True)
    polys = [geom] if geom.geom_type == "Polygon" else list(geom.geoms)
    parts = []
    for p in polys:
        if p.area < 0.00003:  # 太小的礁岩略過（澎湖、綠島、蘭嶼要留）
            continue
        pts = [proj(x, y) for x, y in p.exterior.coords]
        parts.append("M" + "L".join(f"{x},{y}" for x, y in pts) + "Z")
    return "".join(parts)


def edna(species):
    rows = load_json(RAW / "edna.json")
    if isinstance(rows, dict):
        rows = next(v for v in rows.values() if isinstance(v, list))
    by_sci = {a["sci"]: a["id"] for a in species}
    st = {}
    for r in rows:
        s = st.setdefault(r["站點名稱"], {"name": r["站點名稱"], "lat": float(r["緯度(北緯)"]), "lon": float(r["經度(東經)"]),
                                          "depth": r["深度(m)"], "date": r["採樣時間"], "sci": set()})
        s["sci"].add(r["學名(Science Name)"])
    out = []
    for s in st.values():
        x, y = proj(s["lon"], s["lat"])
        out.append({"name": s["name"], "x": x, "y": y, "lat": s["lat"], "lon": s["lon"], "depth": s["depth"], "date": s["date"],
                    "n": len(s["sci"]), "ours": sorted({by_sci[c] for c in s["sci"] if c in by_sci})})
    return sorted(out, key=lambda s: -s["n"])


def day(r):
    """「2020/1/10 下午 02:30:00」→「2020-01-10」（直接切前 10 字會切成「2020/1/1 下」）"""
    y, m, d = r["Event_Date"].split(" ")[0].split("/")
    return f"{y}-{int(m):02d}-{int(d):02d}"


def strand(name):
    rows = list(csv.DictReader(io.StringIO((RAW / f"{name}.csv").read_text("utf-8-sig"))))[1:]  # 第一列是中文欄名說明
    c = lambda key: collections.Counter(key(r) for r in rows).most_common()
    return {
        "total": len(rows),
        "year": sorted(c(lambda r: r["Event_Date"][:4])),
        "county": c(lambda r: r["County_Co"]),
        "species": c(lambda r: r["Name_Code"]),
        "status": c(lambda r: r["Status"]),
        "cause": c(lambda r: r.get("catch", "")) if "catch" in rows[0] else [],
        "span": [min(day(r) for r in rows), max(day(r) for r in rows)],
    }


def main():
    species = load_json(ROOT / "public" / "data" / "sea.json")["species"]
    w, h = svg_size()
    data = {"svg": {"w": w, "h": h, "path": taiwan_path()}, "edna": edna(species),
            "strand": {"cetacean": strand("strand_cetacean"), "turtle": strand("strand_turtle")}}
    save_json(ROOT / "public" / "data" / "explore.json", data, indent=None)
    size = (ROOT / "public" / "data" / "explore.json").stat().st_size
    print(f"explore.json {size / 1e3:.0f} KB：測站 {len(data['edna'])}、鯨豚擱淺 {data['strand']['cetacean']['total']}、海龜擱淺 {data['strand']['turtle']['total']}")


if __name__ == "__main__":
    sys.exit(main())
