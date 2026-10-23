/* 分類闖關：看照片，選出牠屬於哪一類。入門 4 類（國小）、挑戰 10 類（國中以上，每題隨機 4 個選項）、60 秒挑戰。
   「其他魚」沒有共同特徵，不考。 */
Sea.boot(function (data) {
  const { esc, el, shuffle } = Sea;
  const root = document.getElementById("root");
  const pool = data.species.filter((a) => a.hasPhoto && Sea.CLASSIFY_GROUPS.includes(a.g));
  const MODES = {
    easy: { name: "入門（4 類）", groups: ["shark", "ray", "cetacean", "turtle"] },
    hard: { name: "挑戰（10 類）", groups: Sea.CLASSIFY_GROUPS.filter((g) => pool.filter((a) => a.g === g).length >= 3) },
  };

  function menu() {
    const lv = Sea.level();
    if (lv === "k") {
      root.replaceChildren(el('<div class="panel"><p class="lead" style="margin-top:0">分類闖關要讀字，比較適合國小以上。幼兒園可以玩「翻牌配對」或「猜猜我是誰」喔！</p>' +
        '<p><a class="btn primary big" href="/memory">翻牌配對</a> <a class="btn big" href="/guess">猜猜我是誰</a></p></div>'));
      return;
    }
    const hardFirst = lv !== "e";
    root.replaceChildren(el(
      '<div class="panel"><p class="lead" style="margin-top:0">每一題會出現一種海洋生物，請選出牠屬於哪一類。一共 10 題。</p>' +
      '<p><button class="btn ' + (hardFirst ? "" : "primary ") + 'big" data-m="easy">入門（鯊魚、魟與鰩、鯨豚、海龜）</button></p>' +
      '<p><button class="btn ' + (hardFirst ? "primary " : "") + 'big" data-m="hard">挑戰（' + MODES.hard.groups.length + " 類都會出現）</button></p>" +
      '<p><button class="btn big" data-m="' + (hardFirst ? "hard" : "easy") + '" data-t="1">' + Sea.glyph("clock") + ' 60 秒挑戰（答越多越好）</button></p>' +
      "<details><summary>這些類別怎麼分？</summary><ul>" +
      MODES.hard.groups.map((id) => Sea.GROUP[id]).map((g) => "<li>" + Sea.ico(g.ico, 28) + " <b>" + esc(g.name) + "</b>：" + esc(g.hint) + "</li>").join("") +
      "</ul></details></div>"
    ));
    root.querySelectorAll("[data-m]").forEach((b) => (b.onclick = () => play(b.dataset.m, !!b.dataset.t)));
  }

  // timed：60 秒挑戰，多準備 40 題讓手快的學生答不完
  function play(mode, timed) {
    const n = timed ? 40 : 10;
    const ids = MODES[mode].groups;
    // 每一類至少出現一次，剩下隨機，題目才不會偏掉（鯨豚數量多，不然會一直出鯨豚）
    const chosen = [];
    ids.forEach((id) => { const c = shuffle(pool.filter((a) => a.g === id)); if (c[0]) chosen.push(c[0]); });
    const rest = shuffle(pool.filter((a) => ids.includes(a.g) && !chosen.includes(a)));
    const picked = shuffle(chosen.concat(rest.slice(0, n - chosen.length))).slice(0, n);
    const k = Sea.LEVELS[Sea.level()].choices + 1; // 國小 4 選 1、國中以上 5 選 1
    const rounds = picked.map((a) => {
      const others = shuffle(ids.filter((g) => g !== a.g)).slice(0, Math.min(ids.length, k) - 1);
      const opts = shuffle([a.g].concat(others)).map((id) => Sea.GROUP[id]);
      return {
        animal: a,
        prompt: "<b>" + esc(a.name) + "</b> 是哪一類？",
        options: opts.map((g) => ({ id: g.id, label: g.name })),
        answer: a.g,
        explain: esc(a.name) + "是" + esc(a.groupInfo.name) + "：" + esc(a.groupInfo.hint) + "。",
      };
    });
    Quiz.run(root, { key: "classify-" + mode + (timed ? "-timed" : ""), title: timed ? "60 秒分類挑戰" : "分類闖關", rounds, onAgain: menu, timed: timed ? 60 : 0 });
  }
  document.addEventListener("sea-level", menu);
  menu();
});
