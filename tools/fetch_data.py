"""下載本站用到的 data.gov.tw 資料集到 data/raw/。

下載網址每次向 data.gov.tw 查（來源改網址也不會壞），同時寫 raw/meta.json 記每個資料集的 modifiedDate，
build_data.py 把它帶進 public/data/meta.json，Worker 每月拿來比對有沒有更新。
用法：python tools/fetch_data.py [--force]
"""
import argparse
import json
import sys

from common import RAW, get, load_json, save_json

# (資料集 id, 存檔名, 格式)：格式指定要哪一種下載檔
DATASETS = [
    ("8716", "fish", "JSON"),        # 文化部典藏目錄-魚類（國立臺灣博物館）
    ("161739", "protected", "CSV"),  # 海洋保育署 海洋保育類野生動物名錄
    ("90320", "exhibits", "JSON"),   # 海生館 特展介紹
    ("9693", "halls", "CSV"),        # 海生館 展館資訊
    ("172487", "edna", "JSON"),      # 海洋保育署 魚類 eDNA 調查
    ("157624", "strand_cetacean", "CSV"),  # MARN 鯨豚擱淺
    ("157957", "strand_turtle", "CSV"),    # MARN 海龜擱淺
]


def meta(ds_id: str) -> dict:
    r = json.loads(get(f"https://data.gov.tw/api/v2/rest/dataset/{ds_id}", 60))
    return r.get("result", r)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="日期沒變也重抓")
    a = ap.parse_args()
    mpath = RAW / "meta.json"
    old = load_json(mpath, {})
    new = dict(old)
    for ds_id, name, fmt in DATASETS:
        m = meta(ds_id)
        mod = m.get("modifiedDate", "")
        out = RAW / f"{name}.{fmt.lower()}"
        if out.exists() and not a.force and old.get(ds_id, {}).get("modified") == mod:
            print(f"[略過] {name}（{mod} 沒變）")
            continue
        dist = [d for d in m["distribution"] if d.get("resourceFormat", "").upper() == fmt] or m["distribution"]
        data = get(dist[0]["resourceDownloadUrl"])
        if len(data) < 500 or data.lstrip()[:1] == b"<":
            raise RuntimeError(f"{name} 下載內容異常（{len(data)} bytes），已停止，舊檔保留")
        out.write_bytes(data)
        new[ds_id] = {"name": name, "modified": mod, "title": m.get("title", ""), "publisher": m.get("publisher", "")}
        print(f"[完成] {name} {len(data) / 1e3:.0f} KB（{mod}）")
    save_json(mpath, new)


if __name__ == "__main__":
    sys.exit(main())
