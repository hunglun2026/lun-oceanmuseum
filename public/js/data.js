/* 海洋探險家：共用資料層。所有頁面先載入這支，再各自畫畫面。
   負責：載入 /data/sea.json（約 200 種，一次載完）、類群／棲地／食性／保育對照表、四級難度、照片、線索遮名、語音、小工具與自製對話框。 */
(function () {
  "use strict";
  // 資料版本：tools/build_data.py 重產 sea.json 後要改這裡（scripts/bump-version.py 會一起改），學生瀏覽器才會抓新資料
  const DATA_V = "2026-10-22b";

  // ---- 類群（分類闖關）：鍵要跟 tools/ai_check.py 的 GROUPS 一致 ----
  const GROUPS = [
    { id: "shark", name: "鯊魚", ico: "g-shark", color: "#4a6fa5", hint: "軟骨魚，身體像紡錘，背上有三角形的背鰭" },
    { id: "ray", name: "魟與鰩", ico: "g-ray", color: "#7a6aa8", hint: "身體扁扁的像一個大盤子，在海底或水中滑行" },
    { id: "eel", name: "鰻與鯙", ico: "g-eel", color: "#8a7a3a", hint: "身體又長又細，像一條蛇" },
    { id: "reef", name: "珊瑚礁魚", ico: "g-reef", color: "#e0743a", hint: "住在珊瑚礁，顏色常常很鮮豔" },
    { id: "puffer", name: "河魨與箱魨", ico: "g-puffer", color: "#c9a227", hint: "有的會脹大，有的全身包著硬殼，很多身體有毒" },
    { id: "flat", name: "比目魚", ico: "g-flat", color: "#9a7b5c", hint: "身體扁平，兩隻眼睛長在同一邊" },
    { id: "school", name: "成群洄游的魚", ico: "g-school", color: "#3a8fb5", hint: "常常一大群一起游，游得又快又遠" },
    { id: "bottom", name: "海底偽裝高手", ico: "g-bottom", color: "#7d6b5d", hint: "趴在海底，顏色跟沙子石頭很像，等獵物經過" },
    { id: "other", name: "其他魚", ico: "g-other", color: "#5a8a9a", hint: "其他各式各樣的魚" },
    { id: "cetacean", name: "鯨豚與儒艮", ico: "g-cetacean", color: "#2b5d8a", hint: "用肺呼吸、喝媽媽的奶長大的海洋哺乳動物" },
    { id: "turtle", name: "海龜", ico: "g-turtle", color: "#4f8a4b", hint: "有殼、用肺呼吸，要回到沙灘產卵" },
    { id: "coral", name: "珊瑚", ico: "g-coral", color: "#d1607a", hint: "看起來像石頭或植物，其實是動物" },
  ];
  const GROUP = Object.fromEntries(GROUPS.map((g) => [g.id, g]));
  // 分類闖關不考「其他魚」（沒有共同特徵）和只有一兩種的類群
  const CLASSIFY_GROUPS = ["shark", "ray", "eel", "reef", "puffer", "flat", "school", "bottom", "cetacean", "turtle"];

  // ---- 棲地（誰住哪片海）：鍵要跟 ai_check.py 的 HABS 一致；hall＝對到海生館哪個展館 ----
  const HABS = [
    { id: "estuary", name: "河口紅樹林", ico: "h-estuary", hall: "taiwan", hint: "河流流進海的地方，海水和淡水混在一起" },
    { id: "rocky", name: "沿岸岩礁", ico: "h-rocky", hall: "taiwan", hint: "海邊的礁石、潮池和石頭縫" },
    { id: "sandy", name: "沙泥海底", ico: "h-sandy", hall: "taiwan", hint: "海底是沙子或泥巴的地方" },
    { id: "reef", name: "珊瑚礁", ico: "h-reef", hall: "coral", hint: "溫暖清澈的淺海，珊瑚長成一大片" },
    { id: "ocean", name: "大洋", ico: "h-ocean", hall: "world", hint: "離岸很遠、又寬又深的藍色大海" },
    { id: "deep", name: "深海", ico: "h-deep", hall: "world", hint: "陽光照不到的深處，又黑又冷" },
  ];
  const HAB = Object.fromEntries(HABS.map((h) => [h.id, h]));
  const DIETS = {
    meat: { name: "吃魚蝦蟹等動物", short: "吃肉" },
    plant: { name: "吃海藻海草", short: "吃海藻" },
    omni: { name: "什麼都吃", short: "都吃" },
    plankton: { name: "吃浮游生物", short: "吃浮游生物" },
  };
  // 保育：臺灣《野生動物保育法》海洋保育類等級（海洋保育署名錄）＋國際 IUCN 紅色名錄
  const PROT = {
    I: { name: "一級保育類", long: "瀕臨絕種", color: "#c8341f", rank: 3 },
    II: { name: "二級保育類", long: "珍貴稀有", color: "#e0742a", rank: 2 },
    III: { name: "三級保育類", long: "其他應予保育", color: "#d9a520", rank: 1 },
  };
  const IUCN = {
    CR: { name: "極危", color: "#c8341f", rank: 6 }, EN: { name: "瀕危", color: "#e0742a", rank: 5 },
    VU: { name: "易危", color: "#d9a520", rank: 4 }, NT: { name: "近危", color: "#8aa83a", rank: 3 },
    LC: { name: "暫無危機", color: "#3f9c5a", rank: 2 }, DD: { name: "資料不足", color: "#8a8f98", rank: 1 },
  };

  // ---- 四級難度（GrillMe 第 2 題）。存在 localStorage，頁首可切換；幼兒園只開看圖的遊戲 ----
  const LEVELS = {
    k: { name: "幼兒園", choices: 3, kid: true },
    e: { name: "國小", choices: 3 },
    j: { name: "國中", choices: 4 },
    s: { name: "高中", choices: 4 },
  };
  const LKEY = "sea-level";
  function level() {
    try { const v = localStorage.getItem(LKEY); if (LEVELS[v]) return v; } catch (e) { /* 無痕模式 */ }
    return "e";
  }
  // 有沒有「真的選過」程度：沒選過時 level() 預設國小，但畫面不能把國小顯示成已選（共用平板上會誤導）
  function levelChosen() {
    try { return !!LEVELS[localStorage.getItem(LKEY)]; } catch (e) { return false; }
  }
  // 換人：清掉程度選擇，回到沒選過的狀態（護照紀錄不動，要清另外到護照頁）
  function clearLevel() {
    try { localStorage.removeItem(LKEY); } catch (e) { /* 忽略 */ }
    document.dispatchEvent(new CustomEvent("sea-level", { detail: level() }));
  }
  function setLevel(v) {
    try { localStorage.setItem(LKEY, v); } catch (e) { /* 忽略 */ }
    document.dispatchEvent(new CustomEvent("sea-level", { detail: v }));
  }
  // 依難度給介紹文字：幼兒園一句、國小白話段、國中白話段＋原文、高中原文
  function intro(a, lv) {
    lv = lv || level();
    if (lv === "k") return a.k;
    if (lv === "e" || lv === "j") return a.e;
    return a.orig || a.e;
  }

  // ---- 載入：sea.json 帶資料版本號，瀏覽器快取一天，換版自動抓新的 ----
  let cache = null;
  async function load() {
    if (cache) return cache;
    const r = await fetch("/data/sea.json?v=" + DATA_V);
    if (!r.ok) throw new Error("sea.json HTTP " + r.status);
    const d = await r.json();
    d.species.forEach(enrich);
    cache = d;
    return d;
  }
  function enrich(a) {
    a.groupInfo = GROUP[a.g] || GROUP.other;
    a.habInfo = a.h ? HAB[a.h] : null;
    a.dietInfo = a.d ? DIETS[a.d] : null;
    a.protInfo = PROT[a.prot] || null;
    a.iucnInfo = IUCN[a.iucn] || null;
    a.hasPhoto = !!a.photo;
    a.realPhoto = !!(a.photo && !a.photo.ai);
    return a;
  }

  // ---- 照片：本站 webp（480 卡片、800 詳情）；沒有照片或載入失敗就畫類群圖示 ----
  function placeholder(a, cls) {
    const d = document.createElement("div");
    d.className = "ph " + (cls || "");
    d.style.background = a.groupInfo.color + "22";
    d.innerHTML = Sea.ico(a.groupInfo.ico, 72);
    d.setAttribute("role", "img");
    d.setAttribute("aria-label", a.name);
    return d;
  }
  function photo(a, big, cls) {
    if (!a.photo) return placeholder(a, cls);
    const img = new Image();
    img.className = "photo " + (cls || "");
    img.loading = big ? "eager" : "lazy"; // 詳情對話框裡的大圖懶載入會一直不載
    img.decoding = "async";
    img.alt = a.name + (a.photo.ai ? "（示意圖）" : "");
    img.src = "/img/sp/" + a.id + "-" + (big ? 800 : 480) + ".webp?v=" + DATA_V;
    img.onerror = () => img.replaceWith(placeholder(a, cls));
    return img;
  }
  // 詳情頁的照片出處（自由授權要標作者與授權）
  function creditLine(a) {
    if (!a.photo) return "這種生物目前沒有找到可以自由使用的照片。";
    if (a.photo.ai) return "這張是示意圖（依文字資料的外形描述生成，不是實際拍攝），細節可能和真實生物不同。";
    return '照片：<a href="' + esc(a.photo.page) + '" target="_blank" rel="noopener">' + esc(a.photo.by || "維基共享資源") +
      "</a>，" + esc(a.photo.lic) + "，經維基共享資源取得。";
  }
  function sourceLine(a) {
    return a.src.type === "wiki"
      ? '介紹改寫自<a href="' + esc(a.src.url) + '" target="_blank" rel="noopener">中文維基百科</a>（CC BY-SA 4.0）。'
      : '介紹改寫自<a href="' + esc(a.src.url) + '" target="_blank" rel="noopener">國立臺灣博物館典藏</a>（文化部典藏目錄，政府資料開放授權）。';
  }

  // 線索常含自己的名字，遮起來：正式名稱、名稱後三字（例：玳瑁石斑魚 → 石斑魚）
  function mask(a, text) {
    const names = new Set([a.name]);
    if (a.name.length >= 4) names.add(a.name.slice(-3));
    let t = text;
    [...names].sort((x, y) => y.length - x.length).forEach((n) => { t = t.split(n).join("○○"); });
    return t;
  }

  // ---- 語音：幼兒園按一下唸出來（瀏覽器內建，沒有中文語音的裝置就安靜，不影響遊戲）----
  function say(text) {
    try {
      if (!window.speechSynthesis) return false;
      speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(String(text).replace(/[○]+/g, "什麼"));
      u.lang = "zh-TW";
      u.rate = 0.9;
      const v = speechSynthesis.getVoices().find((x) => /zh[-_]TW/i.test(x.lang));
      if (v) u.voice = v;
      speechSynthesis.speak(u);
      return true;
    } catch (e) { return false; }
  }
  // 喇叭按鈕：幼兒園才顯示
  function sayBtn(text, label) {
    const b = document.createElement("button");
    b.className = "say";
    b.type = "button";
    b.innerHTML = Sea.glyph("speaker");
    b.setAttribute("aria-label", label || "唸給我聽");
    b.onclick = (ev) => { ev.stopPropagation(); say(text); };
    b.hidden = level() !== "k";
    return b;
  }

  // ---- 色塊上的字：自動挑看得清楚的顏色（WCAG 文字對比 4.5） ----
  // 保育等級、IUCN 的代表色有些很亮（黃、橙），白字放上去對比不到 4.5。深字夠就用深字，不夠就把底色加深到白字夠清楚
  function paint(hex) {
    const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const lum = (c) => { const a = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; };
    const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    const INK = "#1d2f38";
    let c = rgb(hex);
    if (ratio(lum(c), lum(rgb(INK))) >= 4.5) return "background:" + hex + ";color:" + INK;
    for (let i = 0; i < 30 && ratio(lum(c), 1) < 4.5; i++) c = c.map((v) => Math.round(v * 0.94));
    return "background:rgb(" + c.join(",") + ");color:#fff";
  }

  // ---- 小工具 ----
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  const pick = (arr, n) => shuffle(arr).slice(0, n);
  // el(html)：HTML 字串轉成「單一」元素。多個頂層元素要自己包一層 <div>
  const el = (html) => {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    if (t.content.children.length > 1) console.warn("Sea.el：HTML 有多個頂層元素，只會用第一個", html.slice(0, 60));
    return t.content.firstElementChild;
  };

  // 自製確認對話框（不用瀏覽器內建的 alert／confirm）
  function dialog(message, buttons) {
    return new Promise((resolve) => {
      const d = document.createElement("dialog");
      d.className = "zdlg";
      d.innerHTML = "<p>" + esc(message) + '</p><div class="row"></div>';
      (buttons || [{ label: "好", value: true, primary: true }]).forEach((b) => {
        const btn = document.createElement("button");
        btn.className = "btn" + (b.primary ? " primary" : "") + (b.danger ? " danger" : "");
        btn.textContent = b.label;
        btn.onclick = () => { d.close(); d.remove(); resolve(b.value); };
        d.lastChild.appendChild(btn);
      });
      document.body.appendChild(d);
      d.showModal();
    });
  }

  window.Sea = {
    DATA_V, GROUPS, GROUP, CLASSIFY_GROUPS, HABS, HAB, DIETS, PROT, IUCN, LEVELS, level, levelChosen, clearLevel, setLevel, paint, intro,
    load, photo, placeholder, creditLine, sourceLine, mask, say, sayBtn, esc, shuffle, pick, el, dialog,
  };
})();
