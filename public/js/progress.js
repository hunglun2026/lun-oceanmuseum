/* 探險護照的紀錄：看過哪些海洋生物、各遊戲最好幾顆星、徽章。只存在這台裝置的 localStorage，不上傳、不蒐集個資。
   Progress.seen(id)、Progress.stars(key, n)、Progress.badges(species, units)、Progress.get()、Progress.clear() */
window.Progress = (function () {
  "use strict";
  const KEY = "sea-progress-v1";
  function get() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || "null");
      if (s && s.seen) return s;
    } catch (e) { /* 無痕模式 */ }
    return { seen: {}, stars: {} };
  }
  function update(fn) {
    const s = get();
    fn(s);
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* 存不了就算了，不影響遊戲 */ }
  }
  const seen = (id) => update((s) => { s.seen[id] = s.seen[id] || Date.now(); });
  const stars = (key, n) => update((s) => { s.stars[key] = Math.max(s.stars[key] || 0, n); });
  const clear = () => { try { localStorage.removeItem(KEY); } catch (e) { /* 忽略 */ } };

  // 各遊戲在護照上顯示的名字（key 要跟各遊戲存星數用的一樣）；特展單元另外列（key＝unit-單元id）
  const GAMES = [
    ["classify-easy", "分類闖關・入門"], ["classify-hard", "分類闖關・挑戰"],
    ["classify-easy-timed", "分類闖關・60 秒（入門）"], ["classify-hard-timed", "分類闖關・60 秒（挑戰）"],
    ["habitat", "誰住哪片海"], ["habitat-timed", "誰住哪片海・60 秒"],
    ["guess", "猜猜我是誰"], ["guess-kid", "找找看（幼兒園）"],
  ];

  // 徽章：有沒有拿到全部從紀錄算出來，不另外存，規則改了舊紀錄也會跟著對
  function badges(species, units) {
    const s = get();
    const seenA = species.filter((a) => s.seen[a.id]);
    const st = (k) => s.stars[k] || 0;
    const unitsDone = (units || []).filter((u) => st("unit-" + u.id) >= 1).length;
    const hallOk = ["taiwan", "coral", "world"].every((h) => seenA.filter((a) => a.hall === h).length >= 5);
    const list = [
      ["b-first", "第一步", "在小百科看第 1 種海洋生物", seenA.length >= 1],
      ["t-animals", "海洋百科通", "在小百科看過 50 種", seenA.length >= 50],
      ["t-classify", "分類小達人", "鯊魚、魟、鰻、比目魚、鯨豚、海龜等 10 類都至少看過一種", Sea.CLASSIFY_GROUPS.every((g) => seenA.some((a) => a.g === g))],
      ["t-conserve", "保育小尖兵", "看過 10 種保育類或國際列為易危以上的生物", seenA.filter((a) => a.protInfo || (a.iucnInfo && a.iucnInfo.rank >= 4)).length >= 10],
      ["b-trophy", "闖關高手", "分類闖關挑戰拿到三顆星", st("classify-hard") >= 3],
      ["t-habitat", "棲地專家", "誰住哪片海拿到三顆星", st("habitat") >= 3],
      ["b-detective", "觀察小偵探", "猜猜我是誰（或找找看）拿到三顆星", st("guess") >= 3 || st("guess-kid") >= 3],
      ["b-bolt", "閃電快手", "任一個 60 秒挑戰拿到三顆星", ["classify-easy-timed", "classify-hard-timed", "habitat-timed"].some((k) => st(k) >= 3)],
    ];
    return list.map(([icon, name, how, got]) => ({ icon, name, how, got }));
  }
  return { get, seen, stars, clear, badges, GAMES };
})();
