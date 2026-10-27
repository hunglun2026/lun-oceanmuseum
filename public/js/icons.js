/* 圖示：取代原本到處用的 emoji（各作業系統畫法不同，商用要一致）。
   兩種：
   1. 辨識用圖片 Sea.ico("g-shark")：public/img/ico/ 的 webp，由 Gemini 生成。g-類群、h-棲地、hall-展館、r-身分、lv-程度、t-功能頁、b-徽章。
      寫真風（g-、h-、hall-）與扁平圖案（其餘）是兩個風格家族，各用一個對話生成。
   2. 功能圖示 Sea.glyph("clock")：行內 SVG，顏色跟著文字（currentColor），不用額外下載。
   純文字的地方（下拉選單、選項按鈕、列印的學習單）放不了圖，只留文字，不要塞圖示代號進去。 */
(function () {
  "use strict";
  const APP_VERSION = "0.3.7"; // 由 scripts/sync-version.py 依 package.json 寫入，不要手改
  // 圖示檔網址帶版本號：換圖時升版本，使用者才拿得到新圖（靜態頁面的 <img> 也用同一個版本，同一張圖只下載一次）
  const src = (key) => "/img/ico/" + key + ".webp?v=" + APP_VERSION;

  // size：顯示寬高（px），不給就是 28（跟一行字差不多高）。大小一律由寬高屬性決定，CSS 不覆蓋
  function ico(key, size) {
    size = size || 28;
    return '<img class="icn" src="' + src(key) + '" alt="" decoding="async" width="' + size + '" height="' + size + '">';
  }

  const PATHS = {
    menu: "M4 6h16M4 12h16M4 18h16",
    speaker: "M11 5 6 9H3v6h3l5 4V5zM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13",
    mute: "M11 5 6 9H3v6h3l5 4V5zM16 9l5 6M21 9l-5 6",
    clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2",
    printer: "M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a1 1 0 0 1-1 1h-2M6 14h12v7H6z",
    arrow: "M5 12h14M13 6l6 6-6 6",
    close: "M6 6l12 12M18 6 6 18",
    plus: "M12 5v14M5 12h14",
    check: "M5 12.5l4.5 4.5L19 7",
    pin: "M12 21s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12zM12 6.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z",
    flame: "M12 3c.8 3 4 5 4 9a4 4 0 0 1-8 0c0-1.8.8-3 2-4 0 1.8.8 3 2 3 0-3-1.2-5 0-8z",
    skull: "M12 3a8 8 0 0 0-5 14v3h10v-3a8 8 0 0 0-5-14zM9.5 12h.01M14.5 12h.01M10 20v-2M14 20v-2",
    bubble: "M9 14a4 4 0 1 0 0 .01zM17 8a2.5 2.5 0 1 0 0 .01zM15 18a1.5 1.5 0 1 0 0 .01z",
  };
  // 實心星星另外畫（填色用 currentColor）
  const STAR = "M12 2.5l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 18l-6.2 3.5L7 14.7 2 9.8l6.9-1z";

  function glyph(name) {
    return '<svg class="gly" viewBox="0 0 24 24" width="1.1em" height="1.1em" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + PATHS[name] + '"/></svg>';
  }

  // n 顆星（共 total 顆）：有得到的是實心橘色，沒得到的是空心灰色；讀螢幕的人聽到「n 顆星」
  function stars(n, total) {
    total = total || 3;
    let h = '<span class="starrow" role="img" aria-label="' + n + " 顆星，共 " + total + ' 顆">';
    for (let i = 0; i < total; i++) {
      h += '<svg class="star' + (i < n ? " on" : "") + '" viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true" focusable="false"><path d="' + STAR + '"/></svg>';
    }
    return h + "</span>";
  }

  // 展館：台灣水域館、珊瑚王國館（用珊瑚礁棲地的照片）、世界水域館
  const HALL = { taiwan: "hall-taiwan", coral: "h-reef", world: "hall-world" };
  // 特展單元：能對到類群或棲地的直接借用，其餘四個有自己的圖
  const UNIT = { shark: "g-shark", bluewhale: "g-cetacean", kungfu: "u-kungfu", seaslug: "u-seaslug", deepsea: "h-deep", toxic: "g-puffer", seayou: "u-waste", xfile: "u-xfile" };
  const hallIco = (id, size) => ico(HALL[id], size);
  const unitIco = (id, size) => ico(UNIT[id], size);

  Object.assign(window.Sea, { APP_VERSION, ico, glyph, stars, hallIco, unitIco });
})();
