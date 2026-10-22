/* 頁首（導覽列＋難度切換）、頁尾（資料來源與授權）與頁面啟動器。每頁 <body data-page="..."> 決定導覽列亮哪一個。 */
(function () {
  "use strict";
  // [頁面代號, 名稱, 網址, 幼兒園也顯示嗎]
  const NAV = [
    ["animals", "海洋小百科", "/animals", true],
    ["halls", "逛海生館", "/halls", true],
    ["units", "特展教室", "/units", false],
    ["classify", "分類闖關", "/classify", false],
    ["habitat", "誰住哪片海", "/habitat", true],
    ["guess", "猜猜我是誰", "/guess", true],
    ["memory", "翻牌配對", "/memory", true],
    ["conserve", "保育小尖兵", "/conserve", false],
    ["explore", "海洋探究", "/explore", false],
    ["passport", "探險護照", "/passport", true],
    ["teacher", "老師專區", "/teacher", false],
    ["help", "使用說明", "/help", true],
  ];
  const page = document.body.dataset.page || "";
  const wrap = document.createElement("div");
  wrap.className = "wrap";
  const main = document.querySelector("main");
  main.before(wrap);
  const lv = Sea.level();
  wrap.innerHTML =
    '<header class="top"><a class="logo" href="/">🐋 海洋探險家</a><nav aria-label="主選單">' +
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

  const foot = document.createElement("footer");
  foot.className = "foot";
  foot.innerHTML =
    "<p>本站以國立海洋生物博物館的展館與特展為主題，資料全部來自" +
    '<a href="https://data.gov.tw/" target="_blank" rel="noopener">政府資料開放平臺</a>（政府資料開放授權條款第1版）：' +
    '魚類介紹來自文化部典藏目錄（<a href="https://data.gov.tw/dataset/8716" target="_blank" rel="noopener">國立臺灣博物館魚類典藏</a>）、' +
    '保育類名錄與調查資料來自<a href="https://data.gov.tw/dataset/161739" target="_blank" rel="noopener">海洋委員會海洋保育署</a>、' +
    '展館與特展來自<a href="https://data.gov.tw/dataset/90320" target="_blank" rel="noopener">國立海洋生物博物館</a>。' +
    '學名對照：<a href="https://taicol.tw/" target="_blank" rel="noopener">臺灣物種名錄 TaiCOL</a>。' +
    "鯨豚與海龜介紹改寫自中文維基百科（CC BY-SA 4.0）。照片為維基共享資源的自由授權照片，作者與授權標在每種生物的介紹頁。</p>" +
    '<p id="data-stamp">資料載入中…</p>' +
    "<p>本站非國立海洋生物博物館製作。鴻綸科技 製作；本站不蒐集任何個人資料，學習進度只存在這台裝置的瀏覽器裡。</p>";
  wrap.appendChild(foot);

  // Sea.boot(fn)：載入資料後呼叫 fn(data)，處理載入中與失敗畫面
  window.Sea.boot = async function (fn) {
    main.insertAdjacentHTML("beforeend", '<div class="loading" id="boot">海洋生物正在游過來…🐠</div>');
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
      if (b) { b.className = "err"; b.innerHTML = '資料載入失敗了。請檢查網路後重新整理。<br><button class="btn" onclick="location.reload()">重新整理</button>'; }
    }
  };
})();
