"""tools/ 共用：資料夾位置、讀原始檔、下載。原始資料小（約 5 MB），放專案 data/raw/（不進公開 repo）。"""
import json
import os
import time
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
# 照片原圖約 40 MB，可重新下載，不放 ClaudeOnly（避免進 git 備份）；AI 插圖原檔也放這裡
CACHE = Path(os.environ.get("LUN_SEA_CACHE", r"D:\lun-oceanmuseum-cache"))
UA = {"User-Agent": "Mozilla/5.0 lun-oceanmuseum"}


def get(url: str, timeout=120, headers=None) -> bytes:
    # 中文路徑先編碼；網路錯誤重試三次，最後一次照樣丟出
    parts = urllib.parse.urlsplit(url)
    url = urllib.parse.urlunsplit(parts._replace(path=urllib.parse.quote(urllib.parse.unquote(parts.path))))
    if not url.startswith("https://"):  # urllib 也吃 file://，只允許 https
        raise ValueError(f"只允許 https 網址：{url}")
    err = None
    for wait in (0, 5, 20, 60):
        time.sleep(wait)
        try:
            # nosemgrep: python.lang.security.audit.dynamic-urllib-use-detected.dynamic-urllib-use-detected -- 上面已限制只能 https，網址只來自本機建置腳本
            with urllib.request.urlopen(urllib.request.Request(url, headers=headers or UA), timeout=timeout) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001
            err = e
    raise RuntimeError(f"下載失敗 {url}：{err}")


def load_list(path: Path) -> list:
    """JSON 有時是陣列、有時包一層物件，統一取出陣列。"""
    d = json.loads(path.read_text("utf-8-sig"))
    if isinstance(d, list):
        return d
    return next(v for v in d.values() if isinstance(v, list))


def load_json(path: Path, default=None):
    return json.loads(path.read_text("utf-8")) if path.exists() else default


def save_json(path: Path, obj, indent=1):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=indent), "utf-8")
