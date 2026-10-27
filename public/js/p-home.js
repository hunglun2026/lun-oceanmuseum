/* 首頁（歡迎頁）：引導入口（身分 → 程度 → 推薦）、捲動放大切換的歡迎導覽、三個展館入口、捲到才浮現、數字跳動、今天的海洋生物。
   引導入口沿用故宮探險家、捲動放大切換照搬動物探險家。導覽面板由 scripts/make_welcome.py 產生；樣式在 css/style.css 的「首頁」與「歡迎導覽」段。 */
(function () {
  "use strict";
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- 引導入口：身分 → 程度 → 推薦。身分記在這台裝置，程度就是全站程度（Sea.setLevel） ----
  const GKEY = "sea-guide";
  const R = (href, ico, name, why) => ({ href, ico, name, why });
  const RECS = {
    student: {
      k: [R("/guess", "t-guess", "找找看", "聽名字，從照片裡找出牠"), R("/halls", "t-halls", "逛海生館", "看看三個展館住著誰")],
      e: [R("/animals", "t-animals", "海洋小百科", "有白話介紹，先挑一種最喜歡的"), R("/units#shark", "g-shark", "特展教室：鯊魚", "鯊魚真的會吃人嗎？讀完答五題"), R("/habitat", "t-habitat", "誰住哪片海", "幫海洋生物找到牠的家")],
      j: [R("/classify", "t-classify", "分類闖關", "十類海洋生物，四選一還有 60 秒挑戰"), R("/units", "t-units", "特展教室", "八個特展，可以展開讀原文"), R("/conserve", "t-conserve", "保育小尖兵", "臺灣保育類和國際紅色名錄")],
      s: [R("/explore", "t-explore", "海洋探究", "環境 DNA 測站地圖和擱淺紀錄"), R("/animals", "t-animals", "海洋小百科", "讀臺博館和維基原文，看學名科名"), R("/units", "t-units", "特展教室", "直接讀海生館的特展原文")],
    },
    parent: {
      k: [R("/guess", "t-guess", "找找看", "你唸名字，孩子從照片裡指出來"), R("/halls", "t-halls", "逛海生館", "去海生館以前，先看看會遇到誰")],
      e: [R("/animals", "t-animals", "海洋小百科", "一起挑一種孩子最喜歡的，讀白話介紹"), R("/habitat", "t-habitat", "誰住哪片海", "幫海洋生物找家，邊玩邊聊"), R("/halls", "t-halls", "逛海生館", "三個展館住著誰，出發前先認識")],
      j: [R("/classify", "t-classify", "分類闖關", "看照片分一分，還有 60 秒挑戰"), R("/units", "t-units", "特展教室", "一起讀一篇，答五題比比看"), R("/conserve", "t-conserve", "保育小尖兵", "聊聊海龜和鯨豚為什麼越來越少")],
      s: [R("/explore", "t-explore", "海洋探究", "用真實的調查資料一起找答案"), R("/units", "t-units", "特展教室", "讀海生館特展原文，答閱讀測驗"), R("/animals", "t-animals", "海洋小百科", "查學名和科名，一起讀原文")],
    },
    teacher: {
      k: [R("/guess", "t-guess", "找找看", "投影出來，全班一起指出照片"), R("/help", "t-help", "使用說明", "幼兒園模式怎麼用、語音怎麼開")],
      e: [R("/teacher#guide", "t-courses", "課程包「海洋生物分類」", "40 分鐘流程，一鍵帶入學習單"), R("/guess", "t-guess", "猜猜我是誰", "投影全班搶答，不用每人一台"), R("/help", "t-help", "使用說明", "三分鐘看懂每個工具怎麼用")],
      j: [R("/teacher#guide", "t-courses", "課程包「棲地與海生館」", "40 分鐘流程，一鍵帶入學習單"), R("/units", "t-units", "特展教室", "閱讀理解課，讀完答五題"), R("/conserve", "t-conserve", "保育小尖兵", "海洋保育的討論素材")],
      s: [R("/explore", "t-explore", "海洋探究", "用政府開放資料帶探究問題"), R("/teacher#guide", "t-courses", "課程包「海洋保育」", "40 分鐘流程，一鍵帶入學習單"), R("/units", "t-units", "特展教室", "讀原文、做閱讀測驗")],
    },
  };
  const WHO = { student: "學生", teacher: "老師", parent: "家長" };
  const guide = document.getElementById("start");
  const steps = guide ? [...guide.querySelectorAll(".g-step")] : [];
  let who = null;
  try { who = (JSON.parse(localStorage.getItem(GKEY) || "{}").who) || null; } catch (e) { /* 無痕模式 */ }
  if (!WHO[who]) who = null;

  const show = (name) => steps.forEach((s) => (s.hidden = s.dataset.step !== name));
  function done() {
    const lv = Sea.level();
    document.getElementById("g-who").textContent = WHO[who] + "・" + Sea.LEVELS[lv].name;
    const note = document.getElementById("g-note");
    if (note) note.hidden = who !== "parent"; // 家長最在意的是資料安不安全
    document.getElementById("g-recs").innerHTML = RECS[who][lv].map((r) =>
      '<a class="tool" href="' + r.href + '"><div class="ico">' + Sea.ico(r.ico, 56) + "</div><h3>" + Sea.esc(r.name) + '</h3><span class="why">' + Sea.esc(r.why) + "</span></a>").join("");
    show("done");
  }
  if (guide) {
    guide.querySelectorAll("[data-who]").forEach((b) => (b.onclick = () => {
      who = b.dataset.who;
      try { localStorage.setItem(GKEY, JSON.stringify({ who })); } catch (e) { /* 忽略 */ }
      document.getElementById("g-lvq").textContent = who === "teacher" ? "你教哪個程度？" : who === "parent" ? "孩子幾年級？" : "你幾年級？";
      // 沒真的選過就不要亮起來，不然共用平板上會以為已經選好了
      guide.querySelectorAll("[data-lv]").forEach((x) => x.setAttribute("aria-pressed", String(Sea.levelChosen() && x.dataset.lv === Sea.level())));
      show("lv");
    }));
    guide.querySelectorAll("[data-lv]").forEach((b) => (b.onclick = () => {
      Sea.setLevel(b.dataset.lv);
      const sel = document.getElementById("lvl");
      if (sel) sel.value = b.dataset.lv; // 頁首的程度選單跟著換
      done();
    }));
    guide.querySelector("[data-back]").onclick = () => show("who");
    // 換人：身分與程度都清掉（共用平板下一位同學用），護照紀錄不動
    guide.querySelector("[data-reset]").onclick = () => {
      who = null;
      try { localStorage.removeItem(GKEY); } catch (e) { /* 忽略 */ }
      Sea.clearLevel();
      const sel = document.getElementById("lvl");
      if (sel) sel.value = Sea.level();
      show("who");
    };
    document.addEventListener("sea-level", () => { if (who && !guide.querySelector('[data-step="done"]').hidden) done(); });
    if (who) done();
  }

  // ---- 歡迎導覽：捲動放大切換（照搬動物探險家 p-home.js）。區塊高度＝張數 × 85vh，畫面固定，捲動進度決定顯示哪一張 ----
  const tour = document.getElementById("tour");
  const panels = tour ? [...tour.querySelectorAll(".w-panel")] : [];
  const n = panels.length;
  const dotsBox = tour && tour.querySelector(".w-dots");
  const dots = panels.map((p, i) => {
    const b = document.createElement("button");
    b.setAttribute("aria-label", "跳到第 " + (i + 1) + " 張");
    b.tabIndex = -1; // 鍵盤使用者直接用每張的按鈕，不用跳過一排圓點
    b.onclick = () => {
      const top = tour.getBoundingClientRect().top + scrollY;
      scrollTo({ top: top + (tour.offsetHeight - innerHeight) * (i / Math.max(n - 1, 1)), behavior: reduce ? "auto" : "smooth" });
    };
    if (dotsBox) dotsBox.appendChild(b);
    return b;
  });
  if (dotsBox && matchMedia("(pointer: coarse)").matches) dotsBox.setAttribute("aria-hidden", "true"); // 觸控裝置上只是進度指示
  if (tour) tour.style.setProperty("--n", n);
  const parts = panels.map((el) => ({ txt: el.querySelector(".w-panel-text"), links: [...el.querySelectorAll("a")], img: el.querySelector("img") }));
  // 照片延後載入：8 張疊在同一個固定畫面，瀏覽器懶載入會以為都在畫面上而一次全抓；改成只載目前這張和前後幾張
  function loadImg(i) {
    const im = parts[i] && parts[i].img;
    if (!im || !im.dataset.src) return;
    if (im.dataset.srcset) im.srcset = im.dataset.srcset;
    im.src = im.dataset.src;
    delete im.dataset.src;
  }
  if (reduce) panels.forEach((_, i) => { parts[i].img.loading = "lazy"; loadImg(i); }); // 靜態排列時交給瀏覽器懶載入
  function drawTour() {
    if (!tour || reduce) return;
    const rect = tour.getBoundingClientRect();
    const progress = clamp(-rect.top / Math.max(rect.height - innerHeight, 1), 0, 1);
    const cur = progress * Math.max(n - 1, 1);
    const index = Math.min(n - 1, Math.round(cur));
    if (rect.top < innerHeight * 1.5) [index - 1, index, index + 1, index + 2].forEach(loadImg); // 快捲到時才開始抓
    panels.forEach((el, i) => {
      const off = i - cur; // 負的＝已經看過（放大淡出），正的＝還沒輪到
      const opacity = off < 0 ? clamp(1 + 1.3 * off, 0, 1) : clamp(2 * (1 - off), 0, 1);
      const scale = off < 0 ? 1 - 0.4 * off : 1 - 0.1 * Math.min(off, 1);
      el.style.opacity = opacity;
      el.style.transform = "scale(" + scale + ")";
      el.style.zIndex = off >= 0 ? 10 - Math.ceil(off) : 20;
      el.style.pointerEvents = opacity > 0.85 ? "auto" : "none";
      parts[i].links.forEach((a) => (a.tabIndex = opacity > 0.85 ? 0 : -1));
      parts[i].txt.style.transform = "translateY(" + 8 * off + "vh)";
      parts[i].txt.style.opacity = clamp(1 - 1.7 * Math.abs(off), 0, 1);
    });
    dots.forEach((d, i) => d.classList.toggle("active", i === index));
  }
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { ticking = false; drawTour(); });
  };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll);
  drawTour();

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
    document.getElementById("hallcards").innerHTML = data.halls.map((h, i) =>
      '<a class="hall w-reveal" style="--delay:' + i + ';text-decoration:none" href="/halls#' + h.id + '"><span class="hico" aria-hidden="true">' + Sea.hallIco(h.id, 64) + "</span><b>" + esc(h.name) +
      '</b><small class="nokid">' + esc(h.intro.slice(0, 50)) + '…</small><span class="hn">' + h.count + " 種生物 →</span></a>").join("");
    // 今天的海洋生物：每個類群各抽一種有照片的，最多 8 種
    const todayBox = document.getElementById("today");
    shuffle(Sea.GROUPS).map((g) => shuffle(data.species.filter((a) => a.g === g.id && a.realPhoto))[0]).filter(Boolean).slice(0, 8)
      .forEach((a) => {
        const c = el('<a class="acard" href="/animals#' + encodeURIComponent(a.id) + '"><div class="info"><b>' + esc(a.name) + "</b><small>" + Sea.ico(a.groupInfo.ico) + esc(a.groupInfo.name) + "</small></div></a>");
        c.prepend(Sea.photo(a));
        todayBox.appendChild(c);
      });
    reveal();
  });
})();
