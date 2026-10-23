/* 海洋探究（高中，國中也可用）：用政府開放資料做探究。
   1. eDNA 地圖：海洋保育署 103 個測站（資料集 172487），點測站看偵測到幾種魚、本站有收錄哪些
   2. 擱淺紀錄：鯨豚（157624）、海龜（157957）依年份、縣市、物種、原因的長條圖與探究問題
   資料由 tools/build_explore.py 彙整成 /data/explore.json，地圖輪廓為 Natural Earth（公有領域）。 */
Sea.boot(async function (data) {
  const { esc, el } = Sea;
  const ex = await fetch("/data/explore.json?v=" + Sea.DATA_V).then((r) => r.json());
  const byId = Object.fromEntries(data.species.map((a) => [a.id, a]));

  // ---- 1. eDNA 地圖 ----
  const { w, h, path } = ex.svg;
  const maxN = Math.max(...ex.edna.map((s) => s.n));
  const r = (n) => 3 + Math.sqrt(n / maxN) * 9; // 圓的面積跟魚種數成比例
  const map = document.getElementById("map");
  map.innerHTML = '<svg viewBox="0 0 ' + w + " " + h + '" role="img" aria-label="臺灣周邊海域 eDNA 測站地圖，圓越大偵測到的魚種越多">' +
    '<rect width="' + w + '" height="' + h + '" class="sea-bg"/><path d="' + path + '" class="land"/>' +
    ex.edna.slice().reverse().map((s, i) => '<circle class="st" tabindex="0" data-i="' + (ex.edna.length - 1 - i) + '" cx="' + s.x + '" cy="' + s.y + '" r="' + r(s.n).toFixed(1) + '">' +
      "<title>" + esc(s.name) + "：" + s.n + " 種魚</title></circle>").join("") + "</svg>";
  const info = document.getElementById("stinfo");
  function showStation(s) {
    map.querySelectorAll(".st").forEach((c) => c.classList.toggle("on", ex.edna[c.dataset.i] === s));
    info.replaceChildren(el('<div><h3 style="margin-top:0">' + Sea.glyph("pin") + ' ' + esc(s.name) + "</h3><p>北緯 " + s.lat.toFixed(2) + "、東經 " + s.lon.toFixed(2) +
      "，採樣深度 " + esc(s.depth) + " 公尺，" + esc(s.date) + " 採樣。</p><p><b>偵測到 " + s.n + " 種魚</b>，其中本站有收錄 " + s.ours.length + " 種：</p>" +
      '<div class="chips">' + (s.ours.map((id) => byId[id]).filter(Boolean).map((a) => '<a class="chip" style="text-decoration:none;color:inherit" href="/animals#' +
        a.id + '">' + esc(a.name) + "</a>").join("") || "<small>（沒有）</small>") + "</div></div>"));
  }
  map.querySelectorAll(".st").forEach((c) => {
    const go = () => showStation(ex.edna[c.dataset.i]);
    c.addEventListener("click", go);
    c.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
  });
  showStation(ex.edna[0]);
  // 東西比較：以東經 121 度為界（大致是中央山脈以東）
  const avg = (l) => (l.reduce((t, s) => t + s.n, 0) / l.length).toFixed(0);
  const east = ex.edna.filter((s) => s.lon >= 121), west = ex.edna.filter((s) => s.lon < 121);
  document.getElementById("ew").textContent = "東經 121 度以東 " + east.length + " 個測站，平均每站偵測到 " + avg(east) +
    " 種魚；以西 " + west.length + " 個測站，平均 " + avg(west) + " 種。";

  // ---- 2. 擱淺：單一數列橫條圖（數值寫在條旁，滑過看完整數字，附表格）----
  function bars(title, rows, unit, max) {
    const top = rows.slice(0, max || rows.length);
    const m = Math.max(...top.map((x) => x[1]));
    return '<figure class="bars"><figcaption>' + esc(title) + "</figcaption>" + top.map(([k, v]) =>
      '<div class="brow" title="' + esc(k) + "：" + v + unit + '"><span class="bk">' + esc(k || "（未填）") + '</span><span class="bt"><i style="width:' +
      Math.max(1, (v / m) * 100) + '%"></i></span><span class="bv">' + v + "</span></div>").join("") +
      '<details><summary>看表格</summary><table class="gtable"><tbody>' + top.map(([k, v]) => "<tr><th scope=\"row\">" + esc(k || "（未填）") + "</th><td>" + v + unit + "</td></tr>").join("") +
      "</tbody></table></details></figure>";
  }
  const S = ex.strand;
  const block = (key, name, icon) => {
    const d = S[key];
    return '<section class="panel"><h3 style="margin-top:0">' + Sea.ico(icon, 32) + " " + name + "擱淺：共 " + d.total.toLocaleString() + " 筆（" + esc(d.span[0]) + "～" + esc(d.span[1]) + "）</h3>" +
      '<div class="chartgrid">' + bars("每年幾筆", d.year, " 筆") + bars("哪個縣市最多（前 8 名）", d.county, " 筆", 8) +
      bars("哪些物種（前 8 名）", d.species, " 筆", 8) + bars("發現時是活的還是死的", d.status, " 筆") +
      (d.cause.length ? bars("擱淺原因（前 8 名）", d.cause, " 筆", 8) : "") + "</div></section>";
  };
  document.getElementById("strand").innerHTML = block("cetacean", "鯨豚", "g-cetacean") + block("turtle", "海龜", "g-turtle");
});
