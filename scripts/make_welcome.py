"""產生首頁歡迎導覽（捲動放大切換）的 8 個面板 HTML，寫進 public/index.html 的 <!-- TOUR:BEGIN -->～<!-- TOUR:END -->。
照片與作者授權來自 data/welcome.json（由選好的自由授權照片轉出，圖在 public/img/welcome/）。
用法：python scripts/make_welcome.py
"""
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
# (照片代號, 圖說, 標籤, 工具名, 介紹, 網址, 按鈕)
PANELS = [
    ("whaleshark", "鯨鯊", "自然科學", "海洋小百科", "臺灣海域將近兩百種海洋生物的照片和介紹，程度不同、說法不同，還能挑兩種比一比。", "/animals", "打開小百科"),
    ("napoleon", "曲紋唇魚（蘇眉魚）", "生物與環境", "逛海生館", "跟著海生館的台灣水域館、珊瑚王國館、世界水域館，看看每種水域住著誰。", "/halls", "走進展館"),
    ("humpback", "大翅鯨", "閱讀理解", "特展教室", "鯊魚、藍鯨、深海、有毒生物、海洋廢棄物，讀一篇海生館特展，答五題。", "/units", "讀一個特展"),
    ("manta", "阿氏前口蝠鱝（珊瑚礁鬼蝠魟）", "生物分類", "分類闖關", "鯊魚、魟、鰻、比目魚、鯨豚、海龜，看照片分一分，還有 60 秒挑戰。", "/classify", "開始闖關"),
    ("greenturtle", "綠蠵龜", "棲地", "誰住哪片海", "河口、岩礁、珊瑚礁、大洋、深海，幫海洋生物找到家，再找出牠在海生館哪一館。", "/habitat", "幫牠找家"),
    ("sweetlips", "斑胡椒鯛", "觀察與推理", "猜猜我是誰", "線索一個一個出現，越早猜中分數越高；幼兒園聽名字找照片。", "/guess", "來猜謎"),
    ("hawksbill", "玳瑁", "環境教育", "保育小尖兵", "海龜、鯨豚為什麼越來越少？認識保育等級，想想我們能做什麼。", "/conserve", "認識保育"),
    ("orca", "虎鯨", "國中・高中", "海洋探究", "用海洋保育署的環境 DNA 測站和擱淺紀錄，自己找答案。", "/explore", "開始探究"),
]


def main():
    credits = {c["name"]: c for c in json.loads((ROOT / "data" / "welcome.json").read_text("utf-8"))}
    n = len(PANELS)
    rows = []
    for i, (key, cap, tag, name, desc, href, btn) in enumerate(PANELS):
        c = credits[key]
        src = 'src="/img/welcome/%s.webp" srcset="/img/welcome/%s-480.webp 480w, /img/welcome/%s.webp 1200w"' % (key, key, key)
        if i:  # 第一張直接載，其他等捲到附近才載（p-home.js 的 loadImg）
            src = src.replace("src=", "data-src=").replace("srcset=", "data-srcset=")
        credit = '%s｜照片：<a href="%s" target="_blank" rel="noopener">%s</a>，%s' % (
            html.escape(cap), html.escape(c["page"]), html.escape(c["by"][:40]), html.escape(c["lic"]))
        rows.append(
            '      <div class="w-panel"><img %s sizes="(max-width: 760px) calc(100vw - 32px), 1100px" alt="%s" width="%d" height="%d">'
            '<span class="w-pcredit">%s</span><div class="w-panel-text"><span class="w-tag">%02d / %02d · %s</span><h2>%s</h2><p>%s</p>'
            '<a class="btn primary" href="%s">%s →</a></div></div>'
            % (src, html.escape(cap), c["w"], c["h"], credit, i + 1, n, tag, name, desc, href, btn))
    block = ('<!-- TOUR:BEGIN 由 scripts/make_welcome.py 產生，不要手改 -->\n'
             '  <section class="w-tour" id="tour" aria-label="學習工具介紹">\n    <div class="w-tour-sticky">\n' + "\n".join(rows) +
             '\n      <div class="w-dots" aria-hidden="true"></div>\n    </div>\n  </section>\n  <!-- TOUR:END -->')
    p = ROOT / "public" / "index.html"
    s = p.read_text("utf-8")
    a, b = s.index("<!-- TOUR:BEGIN"), s.index("<!-- TOUR:END -->") + len("<!-- TOUR:END -->")
    p.write_text(s[:a] + block + s[b:], "utf-8")
    print(f"寫入 {n} 個面板")


if __name__ == "__main__":
    main()
