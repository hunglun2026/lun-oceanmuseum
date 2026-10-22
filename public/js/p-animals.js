/* 海洋小百科：搜尋、篩選、詳細介紹對話框（網址 #物種id 可直接開啟）、比一比。
   介紹文字依程度（Sea.level）切換；打開詳細介紹＝在探險護照蓋章（progress.js）。 */
Sea.boot(function (data) {
  const { esc, el, photo } = Sea;
  const all = data.species;
  const state = { q: "", g: "", h: "", hall: "", d: "", prot: "" };
  const grid = document.getElementById("grid");
  const dlg = document.getElementById("dlg");
  const body = document.getElementById("dlg-body");
  const hallName = Object.fromEntries(data.halls.map((h) => [h.id, h.name]));

  // ---- 篩選按鈕（幼兒園只留類群，其他用 CSS 藏起來）----
  const defs = [
    ["g", "類群", Sea.GROUPS.filter((g) => all.some((a) => a.g === g.id)).map((g) => [g.id, g.emoji + " " + g.name]), true],
    ["hall", "海生館展館", data.halls.map((h) => [h.id, h.name]), false],
    ["h", "住在哪裡", Sea.HABS.map((h) => [h.id, h.emoji + " " + h.name]), false],
    ["d", "吃什麼", Object.entries(Sea.DIETS).map(([k, v]) => [k, v.emoji + " " + v.short]), false],
    ["prot", "特別標記", [["prot", "🛡️ 保育類"], ["toxic", "☠️ 有毒"], ["endemic", "🇹🇼 臺灣特有"]], false],
  ];
  const filters = document.getElementById("filters");
  defs.forEach(([key, label, opts, kid]) => {
    const row = el('<div class="chips' + (kid ? "" : " nokid") + '"><span class="lab">' + label + "</span></div>");
    opts.forEach(([val, text]) => {
      const b = el('<button class="chip" aria-pressed="false">' + esc(text) + "</button>");
      b.onclick = () => {
        state[key] = state[key] === val ? "" : val;
        row.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", "false"));
        if (state[key]) b.setAttribute("aria-pressed", "true");
        render();
      };
      row.appendChild(b);
    });
    filters.appendChild(row);
  });
  document.getElementById("q").addEventListener("input", (e) => { state.q = e.target.value.trim().toLowerCase(); render(); });
  // 從展館頁點進來：/animals?hall=coral
  const qs = new URLSearchParams(location.search);
  ["hall", "g", "h"].forEach((k) => {
    const v = qs.get(k);
    if (!v) return;
    state[k] = v;
    const row = defs.findIndex((d) => d[0] === k);
    const btn = filters.children[row] && [...filters.children[row].querySelectorAll(".chip")][defs[row][2].findIndex((o) => o[0] === v)];
    if (btn) btn.setAttribute("aria-pressed", "true");
  });

  function match(a) {
    if (state.g && a.g !== state.g) return false;
    if (state.h && a.h !== state.h) return false;
    if (state.hall && a.hall !== state.hall) return false;
    if (state.d && a.d !== state.d) return false;
    if (state.prot === "prot" && !a.protInfo) return false;
    if (state.prot === "toxic" && !a.toxic) return false;
    if (state.prot === "endemic" && !a.endemic) return false;
    if (state.q && !(a.name + a.sci + a.fam).toLowerCase().includes(state.q)) return false;
    return true;
  }

  function render() {
    // 幼兒園只看有圖的，不然一格格圖示學不到東西
    const list = all.filter((a) => match(a) && (Sea.level() !== "k" || a.hasPhoto));
    document.getElementById("count").textContent = list.length ? "找到 " + list.length + " 種海洋生物" : "找不到，換個條件試試看。";
    grid.replaceChildren(...list.map(card));
  }
  document.addEventListener("sea-level", render);
  function card(a) {
    const c = el('<button class="acard"><div class="info"><b>' + esc(a.name) + "</b><small>" + a.groupInfo.emoji + " " + esc(a.groupInfo.name) +
      (a.protInfo ? " 🛡️" : "") + (a.toxic ? " ☠️" : "") + (a.photo && a.photo.ai ? " · AI 圖" : "") + "</small></div></button>");
    c.prepend(photo(a));
    c.onclick = () => open(a);
    return c;
  }

  // ---- 詳細介紹 ----
  const fact = (title, html) => (html ? '<div class="fact"><h4>' + title + "</h4><p>" + html + "</p></div>" : "");
  function badges(a) {
    return (a.protInfo ? '<span class="badge" style="background:' + a.protInfo.color + '">臺灣' + esc(a.protInfo.name) + "</span> " : "") +
      (a.iucnInfo ? '<span class="badge" style="background:' + a.iucnInfo.color + '">國際：' + esc(a.iucnInfo.name) + "</span> " : "") +
      (a.toxic ? '<span class="badge" style="background:#6b2d5c">☠️ 有毒，不要摸</span> ' : "") +
      (a.endemic ? '<span class="badge" style="background:#2b7a5c">臺灣特有種</span>' : "");
  }
  function open(a) {
    history.replaceState(null, "", location.pathname + location.search + "#" + a.id);
    Progress.seen(a.id);
    const lv = Sea.level();
    const kid = lv === "k";
    body.innerHTML =
      '<div class="dlg-bar">' + (kid ? "" : '<button class="btn" id="add">' + (cmp.includes(a) ? "✔ 已加入比一比" : "➕ 加入比一比") + "</button>") +
      '<button class="btn" id="x">關閉 ✕</button></div>' +
      "<h2 style='margin-top:0'>" + esc(a.name) + ' <span id="say1"></span></h2>' +
      (kid ? "" : "<p>" + badges(a) + (lv === "s" || lv === "j" ? " <i>" + esc(a.sci) + "</i>，" + esc(a.fam) : "") + "</p>") +
      '<div class="gallery big" id="gal"></div>' +
      '<div class="fact intro"><h4>' + (kid ? "認識我" : "認識牠") + '</h4><p id="introtext"></p></div>' +
      (kid ? "" : '<div class="facts">' +
        fact("類群", a.groupInfo.emoji + " " + esc(a.groupInfo.name)) +
        fact("住在哪裡", a.habInfo ? a.habInfo.emoji + " " + esc(a.habInfo.name) + "<br><small>" + esc(a.habInfo.hint) + "</small>" : "（資料沒有寫）") +
        fact("吃什麼", a.dietInfo ? a.dietInfo.emoji + " " + esc(a.dietInfo.name) : "（資料沒有寫）") +
        fact("在海生館哪一區", a.hall ? '<a href="/halls#' + a.hall + '">' + esc(hallName[a.hall]) + "</a>" : "") + "</div>") +
      (lv === "j" ? '<details class="orig"><summary>看原始資料（臺博館／維基原文）</summary><p>' + esc(a.orig) + "</p></details>" : "") +
      '<p class="credit">' + Sea.creditLine(a) + (kid ? "" : " " + Sea.sourceLine(a)) + "</p>";
    body.querySelector("#introtext").textContent = Sea.intro(a, lv);
    body.querySelector("#say1").appendChild(Sea.sayBtn(a.name + "。" + a.k, "唸出" + a.name));
    body.querySelector("#gal").appendChild(photo(a, true, "xl"));
    body.querySelector("#x").onclick = () => dlg.close();
    const add = body.querySelector("#add");
    if (add) add.onclick = (e) => { addCmp(a); e.target.textContent = "✔ 已加入比一比"; };
    if (!dlg.open) dlg.showModal();
    body.parentElement.scrollTop = 0;
    if (kid) Sea.say(a.name);
  }
  dlg.addEventListener("close", () => history.replaceState(null, "", location.pathname + location.search));
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });

  // ---- 比一比：選兩種並排比較，對應自然課「比較異同」 ----
  const cmp = [];
  const bar = document.getElementById("cmpbar");
  const cmpBox = document.getElementById("cmp");
  function addCmp(a) {
    if (cmp.includes(a)) return;
    if (cmp.length >= 2) cmp.shift(); // 只比兩種，加第三種就換掉最早的
    cmp.push(a);
    drawBar();
  }
  function drawBar() {
    bar.hidden = !cmp.length;
    document.body.classList.toggle("has-cmpbar", cmp.length > 0);
    bar.replaceChildren(el("<div><b>比一比：</b>" + cmp.map((a, i) => '<button class="chip" data-i="' + i + '" aria-label="移除 ' + esc(a.name) + '">' + esc(a.name) + " ✕</button>").join(" ") +
      (cmp.length < 2 ? " <small>再選一種生物</small>" : ' <button class="btn primary" id="go-cmp">開始比較 ➜</button>') + "</div>"));
    bar.querySelectorAll("[data-i]").forEach((b) => (b.onclick = () => { cmp.splice(+b.dataset.i, 1); drawBar(); }));
    const go = bar.querySelector("#go-cmp");
    if (go) go.onclick = () => { dlg.close(); compare(cmp[0], cmp[1]); };
  }
  const NONE = "（資料沒有寫）";
  const ROWS = [
    ["類群", (a) => a.groupInfo.emoji + " " + a.groupInfo.name],
    ["住在哪裡", (a) => (a.habInfo ? a.habInfo.emoji + " " + a.habInfo.name : NONE)],
    ["吃什麼", (a) => (a.dietInfo ? a.dietInfo.emoji + " " + a.dietInfo.name : NONE)],
    ["海生館展館", (a) => (a.hall ? hallName[a.hall] : NONE)],
    ["臺灣保育等級", (a) => (a.protInfo ? a.protInfo.name : "不是保育類")],
    ["有沒有毒", (a) => (a.toxic ? "有毒" : "資料沒有說有毒")],
    ["一句話介紹", (a) => a.k],
  ];
  function compare(a, b) {
    cmpBox.hidden = false;
    cmpBox.replaceChildren(el(
      '<div class="sheet"><h2>🔍 比一比：' + esc(a.name) + " 和 " + esc(b.name) + "</h2>" +
      '<div class="tablewrap"><table class="cmp"><thead><tr><th></th><th scope="col">' + esc(a.name) + '</th><th scope="col">' + esc(b.name) + "</th></tr></thead><tbody>" +
      '<tr><th scope="row">照片</th><td class="p0"></td><td class="p1"></td></tr>' +
      ROWS.map(([label, f]) => {
        const x = f(a), y = f(b);
        return '<tr><th scope="row">' + label + (x === y && x !== NONE ? ' <span class="same">一樣</span>' : "") + "</th><td>" + esc(x) + "</td><td>" + esc(y) + "</td></tr>";
      }).join("") + "</tbody></table></div>" +
      "<p><b>想一想：</b>牠們還有哪裡一樣？哪裡不一樣？</p><p class=\"lines\"></p>" +
      '<p class="noprint"><button class="btn primary" id="cmp-print">列印</button> <button class="btn" id="cmp-close">關閉比較</button></p></div>'
    ));
    cmpBox.querySelector(".p0").appendChild(photo(a));
    cmpBox.querySelector(".p1").appendChild(photo(b));
    cmpBox.querySelector("#cmp-close").onclick = () => { cmpBox.hidden = true; };
    cmpBox.querySelector("#cmp-print").onclick = () => { document.body.classList.add("pcmp"); window.print(); };
    cmpBox.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  addEventListener("afterprint", () => document.body.classList.remove("pcmp"));

  render();
  const want = decodeURIComponent(location.hash.slice(1));
  const hit = want && all.find((a) => a.id === want);
  if (hit) open(hit);
});
