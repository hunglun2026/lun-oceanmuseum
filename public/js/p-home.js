/* 首頁（歡迎頁）：引導入口（身分 → 程度 → 推薦）、三個展館入口、捲到才浮現、數字跳動、今天的海洋生物。
   引導入口與動畫沿用故宮探險家 p-home.js（不含捲動放大切換）。樣式在 css/style.css 的「首頁」段。 */
(function () {
  "use strict";
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- 引導入口：身分 → 程度 → 推薦。身分記在這台裝置，程度就是全站程度（Sea.setLevel） ----
  const GKEY = "sea-guide";
  const R = (href, ico, name, why) => ({ href, ico, name, why });
  const RECS = {
    student: {
      k: [R("/memory", "🃏", "翻牌配對", "兩張一樣的照片配一對，翻開會唸名字"), R("/guess", "🔍", "找找看", "聽名字，從照片裡找出牠"), R("/halls", "🏛️", "逛海生館", "看看三個展館住著誰")],
      e: [R("/animals", "📖", "海洋小百科", "有白話介紹，先挑一種最喜歡的"), R("/units#shark", "🦈", "特展教室：鯊魚", "鯊魚真的會吃人嗎？讀完答五題"), R("/habitat", "🗺️", "誰住哪片海", "幫海洋生物找到牠的家")],
      j: [R("/classify", "🧩", "分類闖關", "十類海洋生物，四選一還有 60 秒挑戰"), R("/units", "📗", "特展教室", "八個特展，可以展開讀原文"), R("/conserve", "🛡️", "保育小尖兵", "臺灣保育類和國際紅色名錄")],
      s: [R("/explore", "🔬", "海洋探究", "環境 DNA 測站地圖和擱淺紀錄"), R("/animals", "📖", "海洋小百科", "讀臺博館和維基原文，看學名科名"), R("/units", "📗", "特展教室", "直接讀海生館的特展原文")],
    },
    teacher: {
      k: [R("/memory", "🃏", "翻牌配對", "照片配照片，小朋友兩人一組玩"), R("/guess", "🔍", "找找看", "投影出來，全班一起指出照片"), R("/help", "📘", "使用說明", "幼兒園模式怎麼用、語音怎麼開")],
      e: [R("/teacher#guide", "📚", "課程包「海洋生物分類」", "40 分鐘流程，一鍵帶入學習單"), R("/guess", "🔍", "猜猜我是誰", "投影全班搶答，不用每人一台"), R("/help", "📘", "使用說明", "三分鐘看懂每個工具怎麼用")],
      j: [R("/teacher#guide", "📚", "課程包「棲地與海生館」", "40 分鐘流程，一鍵帶入學習單"), R("/units", "📗", "特展教室", "閱讀理解課，讀完答五題"), R("/conserve", "🛡️", "保育小尖兵", "海洋保育的討論素材")],
      s: [R("/explore", "🔬", "海洋探究", "用政府開放資料帶探究問題"), R("/teacher#guide", "📚", "課程包「海洋保育」", "40 分鐘流程，一鍵帶入學習單"), R("/units", "📗", "特展教室", "讀原文、做閱讀測驗")],
    },
  };
  const WHO = { student: "學生", teacher: "老師" };
  const guide = document.getElementById("start");
  const steps = guide ? [...guide.querySelectorAll(".g-step")] : [];
  let who = null;
  try { who = (JSON.parse(localStorage.getItem(GKEY) || "{}").who) || null; } catch (e) { /* 無痕模式 */ }
  if (!WHO[who]) who = null;

  const show = (name) => steps.forEach((s) => (s.hidden = s.dataset.step !== name));
  function done() {
    const lv = Sea.level();
    document.getElementById("g-who").textContent = WHO[who] + "・" + Sea.LEVELS[lv].name;
    document.getElementById("g-recs").innerHTML = RECS[who][lv].map((r) =>
      '<a class="tool" href="' + r.href + '"><div class="ico">' + r.ico + "</div><h3>" + Sea.esc(r.name) + '</h3><span class="why">' + Sea.esc(r.why) + "</span></a>").join("");
    show("done");
  }
  if (guide) {
    guide.querySelectorAll("[data-who]").forEach((b) => (b.onclick = () => {
      who = b.dataset.who;
      try { localStorage.setItem(GKEY, JSON.stringify({ who })); } catch (e) { /* 忽略 */ }
      document.getElementById("g-lvq").textContent = who === "teacher" ? "你教哪個程度？" : "你幾年級？";
      guide.querySelectorAll("[data-lv]").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.lv === Sea.level())));
      show("lv");
    }));
    guide.querySelectorAll("[data-lv]").forEach((b) => (b.onclick = () => {
      Sea.setLevel(b.dataset.lv);
      const sel = document.getElementById("lvl");
      if (sel) sel.value = b.dataset.lv; // 頁首的程度選單跟著換
      done();
    }));
    guide.querySelector("[data-back]").onclick = () => show("who");
    guide.querySelector("[data-reset]").onclick = () => {
      who = null;
      try { localStorage.removeItem(GKEY); } catch (e) { /* 忽略 */ }
      show("who");
    };
    document.addEventListener("sea-level", () => { if (who && !guide.querySelector('[data-step="done"]').hidden) done(); });
    if (who) done();
  }

  // ---- 捲到才浮現 ----
  function reveal() {
    const items = document.querySelectorAll(".w-reveal:not(.in-view)");
    if (reduce || !("IntersectionObserver" in window)) return items.forEach((el) => el.classList.add("in-view"));
    const io = new IntersectionObserver((entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("in-view"); io.unobserve(e.target); }
    }), { threshold: 0.15 });
    items.forEach((el) => io.observe(el));
  }
  reveal();

  // ---- 數字：等資料載入後換成真實數字，捲到時從 0 跳上去 ----
  function countUp(el, target) {
    if (reduce) { el.textContent = target.toLocaleString(); return; }
    const start = performance.now();
    const tick = (now) => {
      const t = clamp((now - start) / 1400, 0, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - t, 3))).toLocaleString();
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  Sea.boot(function (data) {
    const { esc, el, shuffle } = Sea;
    const m = data.meta;
    const stats = { species: m.species, photos: m.photos, units: m.units, edna: 103 };
    const nums = [...document.querySelectorAll("[data-w]")];
    nums.forEach((x) => (x.dataset.target = stats[x.dataset.w]));
    const box = document.querySelector(".w-stats");
    const run = () => nums.forEach((x) => countUp(x, +x.dataset.target));
    if (!box || reduce || !("IntersectionObserver" in window)) run();
    else {
      const io = new IntersectionObserver((entries) => { if (entries.some((e) => e.isIntersecting)) { run(); io.disconnect(); } }, { threshold: 0.4 });
      io.observe(box);
    }
    // 三個展館入口
    const ICON = { taiwan: "🏞️", coral: "🪸", world: "🌍" };
    document.getElementById("hallcards").innerHTML = data.halls.map((h, i) =>
      '<a class="hall w-reveal" style="--delay:' + i + ';text-decoration:none" href="/halls#' + h.id + '"><span class="hico" aria-hidden="true">' + ICON[h.id] + "</span><b>" + esc(h.name) +
      '</b><small class="nokid">' + esc(h.intro.slice(0, 50)) + '…</small><span class="hn">' + h.count + " 種生物 ➜</span></a>").join("");
    // 今天的海洋生物：每個類群各抽一種有照片的，最多 8 種
    const todayBox = document.getElementById("today");
    shuffle(Sea.GROUPS).map((g) => shuffle(data.species.filter((a) => a.g === g.id && a.realPhoto))[0]).filter(Boolean).slice(0, 8)
      .forEach((a) => {
        const c = el('<a class="acard" href="/animals#' + encodeURIComponent(a.id) + '"><div class="info"><b>' + esc(a.name) + "</b><small>" + a.groupInfo.emoji + " " + esc(a.groupInfo.name) + "</small></div></a>");
        c.prepend(Sea.photo(a));
        todayBox.appendChild(c);
      });
    reveal();
  });
})();
