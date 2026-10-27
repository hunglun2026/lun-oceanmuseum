/* 頁首（導覽列＋難度切換）、頁尾（資料來源與授權）與頁面啟動器。每頁 <body data-page="..."> 決定導覽列亮哪一個。 */
(function () {
  "use strict";
  const APP_VERSION = Sea.APP_VERSION; // 版本號的單一寫入處在 icons.js
  // [頁面代號, 名稱, 網址, 幼兒園也顯示嗎]
  const NAV = [
    ["animals", "海洋小百科", "/animals", true],
    ["classify", "分類闖關", "/classify", false],
    ["habitat", "誰住哪片海", "/habitat", true],
    ["guess", "猜猜我是誰", "/guess", true],
    ["passport", "探險護照", "/passport", true],
    ["teacher", "教師專區", "/teacher", false],
  ];
  const page = document.body.dataset.page || "";
  const wrap = document.createElement("div");
  wrap.className = "wrap";
  const main = document.querySelector("main");
  main.before(wrap);
  main.id = "main";
  const skip = document.createElement("a");
  skip.className = "skip";
  skip.href = "#main";
  skip.textContent = "跳到主要內容";
  document.body.prepend(skip); // 鍵盤使用者按 Tab 第一下就能跳過導覽
  const lv = Sea.level();
  wrap.innerHTML =
    '<header class="top"><a class="logo" href="/"><img class="logo-mark" src="/favicon.svg" alt="" width="32" height="32">海洋探險家</a>' +
    '<a class="m-only m-teacher" href="/teacher" data-nokid>教師專區</a><button class="m-only m-more" type="button" data-sheet="menu" aria-haspopup="dialog">' + Sea.glyph("menu") + ' 選單</button>' +
    '<nav aria-label="主選單">' +
    NAV.map((n) => '<a href="' + n[2] + '"' + (n[0] === page ? ' aria-current="page"' : "") + (n[3] ? "" : ' data-nokid') + ">" + n[1] + "</a>").join("") +
    '</nav><label class="lvl">程度<select id="lvl" aria-label="學習程度">' +
    Object.entries(Sea.LEVELS).map(([k, v]) => '<option value="' + k + '"' + (k === lv ? " selected" : "") + ">" + v.name + "</option>").join("") +
    "</select></label></header>";
  wrap.appendChild(main);
  const applyLevel = (v) => {
    document.documentElement.dataset.level = v; // CSS 依程度切換（幼兒園字放大、藏掉文字多的連結）
    document.querySelectorAll(".say").forEach((b) => (b.hidden = v !== "k"));
  };
  applyLevel(lv);
  wrap.querySelector("#lvl").onchange = (e) => Sea.setLevel(e.target.value);
  document.addEventListener("sea-level", (e) => applyLevel(e.detail));

  // ---- 手機：底部固定 4 格＋點開的面板（桌機用上面的導覽列，這組用 CSS 藏起來）----
  // 頂部 12 項在手機上會排成 4 排，把內容推出第一屏；改成底部單手按得到的 4 格，其餘收進「選單」
  const GAMES = ["classify", "habitat", "guess"];
  const navLinks = (ids) => NAV.filter((n) => !ids || ids.includes(n[0])).map((n) =>
    '<a href="' + n[2] + '"' + (n[0] === page ? ' aria-current="page"' : "") + (n[3] ? "" : " data-nokid") + ">" + n[1] + "</a>").join("");
  const SHEETS = {
    games: ["玩遊戲", navLinks(GAMES)],
    menu: ["全部功能", '<a href="/">首頁</a>' + navLinks(NAV.map((n) => n[0]).filter((k) => !GAMES.includes(k)))  + navLinks(GAMES)],
  };
  const tabs = document.createElement("nav");
  tabs.className = "m-tabs";
  tabs.setAttribute("aria-label", "快速選單");
  const cur = (ok, v) => (ok ? ' aria-current="' + v + '"' : "");
  // 幼兒園（4 到 6 歲）看不懂「按下去還有一層選單」，底欄全部直達、不開面板
  function renderTabs() {
    tabs.innerHTML = Sea.level() === "k"
      ? '<a href="/animals"' + cur(page === "animals", "page") + '><span aria-hidden="true">' + Sea.ico("t-animals", 30) + '</span>百科</a>' +
        '<a href="/guess"' + cur(page === "guess", "page") + '><span aria-hidden="true">' + Sea.ico("t-guess", 30) + '</span>找找看</a>' +
        '<a href="/passport"' + cur(page === "passport", "page") + '><span aria-hidden="true">' + Sea.ico("t-passport", 30) + '</span>護照</a>'
      : '<a href="/animals"' + cur(page === "animals", "page") + '><span aria-hidden="true">' + Sea.ico("t-animals", 30) + '</span>百科</a>' +
        '<button type="button" data-sheet="games"' + cur(GAMES.includes(page), "true") + '><span aria-hidden="true">' + Sea.ico("t-games", 30) + '</span>遊戲</button>' +
        '<a href="/passport"' + cur(page === "passport", "page") + '><span aria-hidden="true">' + Sea.ico("t-passport", 30) + '</span>護照</a>';
  }
  renderTabs();
  document.addEventListener("sea-level", renderTabs);
  document.body.appendChild(tabs);
  let opener = null;
  // 面板接上瀏覽器歷史：Android 返回鍵／手勢先關面板，不會直接退出網站
  function closeSheet(fromPop) {
    const o = document.querySelector(".m-sheet");
    if (!o) return;
    o.remove();
    if (fromPop !== true && history.state && history.state.seaSheet) history.back();
    if (opener) opener.focus();
  }
  function openSheet(name, from) {
    closeSheet();
    opener = from;
    const [title, links] = SHEETS[name];
    const o = document.createElement("div");
    o.className = "m-sheet";
    o.innerHTML = '<div class="m-sheet-bg"></div><div class="m-sheet-body" role="dialog" aria-modal="true" aria-label="' + title + '"><h2>' + title + '</h2><div class="m-sheet-grid">' + links + '</div><button class="btn m-sheet-close" type="button">關閉</button></div>';
    o.querySelector(".m-sheet-bg").onclick = () => closeSheet();
    o.querySelector(".m-sheet-close").onclick = () => closeSheet();
    document.body.appendChild(o);
    history.pushState({ seaSheet: 1 }, "");
    o.querySelector(".m-sheet-close").focus();
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-sheet]");
    if (b) openSheet(b.dataset.sheet, b);
  });
  addEventListener("popstate", () => closeSheet(true));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeSheet(); });

  const foot = document.createElement("footer");
  foot.className = "foot";
  foot.innerHTML =
    "<div class=\"foot-brand\"><img src=\"/img/hunglun-logo.webp\" alt=\"鴻綸科技\" width=\"282\" height=\"56\"></div>" +
    "<p class=\"foot-copy\">本站資料主要為政府單位開放資料，資料版權屬原資料提供單位，由鴻綸科技整理製作。本站程式、介面設計與整理編排 © 2026 鴻綸科技股份有限公司 版權所有，未經書面同意，不得轉載、複製、改作或仿製。</p>" +
    '<p id="data-stamp" hidden></p>';
  wrap.appendChild(foot);

  // Sea.boot(fn)：載入資料後呼叫 fn(data)，處理載入中與失敗畫面
  window.Sea.boot = async function (fn) {
    main.insertAdjacentHTML("beforeend", '<div class="loading" id="boot">海洋生物正在游過來…</div>');
    try {
      const data = await Sea.load();
      document.getElementById("boot").remove();
      const m = data.meta;
      document.getElementById("data-stamp").textContent =
        "目前收錄 " + m.species + " 種海洋生物（" + m.photos + " 種有照片）、" + m.units + " 個特展單元。資料整理日期：" + m.version + "。";
      document.querySelectorAll("[data-count]").forEach((e) => (e.textContent = m.species));
      await fn(data);
      // 量「畫面可以操作」的時間用：測試腳本讀 <html data-ready>（毫秒）
      performance.mark("sea-ready");
      document.documentElement.dataset.ready = Math.round(performance.now());
    } catch (e) {
      console.error(e);
      const b = document.getElementById("boot");
      if (b) { b.className = "err"; b.innerHTML = '資料載入失敗了。請檢查網路後重新整理。<br><button class="btn" type="button" id="reload">重新整理</button>'; b.querySelector("#reload").onclick = () => location.reload(); }
    }
  };
})();
