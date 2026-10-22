#!/usr/bin/env bash
# 每月檢查通知「資料有更新」時，在本機一鍵重跑整理流程。人工修正檔（names_fix、photos_fix、ai/batch_*、units）不會被蓋掉。
# 跑完看 ai_check 列出的「缺改寫」：新增的物種要由 Claude 補寫進 data/ai/batch_NN.json 再重跑一次。
# 用法：bash tools/update.sh
set -euo pipefail
cd "$(dirname "$0")/.."
py() { python -X utf8 "$@"; }
py tools/fetch_data.py
py tools/species.py
py tools/names.py
py tools/pick.py
py tools/ai_brief.py
py tools/ai_check.py --all || echo "!! 有缺改寫或查核問題，補完再重跑"
py tools/photos.py
py tools/build_images.py
py tools/build_data.py
py tools/build_explore.py
py tests/test_data.py
py scripts/build-font.py --check || echo "!! 字型要重切：python scripts/build-font.py，並全站升 ?v"
echo "完成。記得改 public/js/data.js 的 DATA_V，再 bash scripts/publish-public.sh"
