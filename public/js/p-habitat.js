/* 誰住哪片海：看生物選牠住的地方（6 種棲地），或選牠在海生館的哪個展館（3 館）。
   幼兒園：題目會唸出來，選項 3 個；國小 3 個；國中以上 4 個。 */
Sea.boot(function (data) {
  const { esc, el, shuffle } = Sea;
  const root = document.getElementById("root");
  const hallName = Object.fromEntries(data.halls.map((h) => [h.id, h.name]));
  const habAll = () => data.species.filter((a) => a.habInfo && (Sea.level() !== "k" || a.hasPhoto));

  function menu() {
    root.replaceChildren(el(
      '<div class="panel"><p class="lead" style="margin-top:0">每一題會出現一種海洋生物，請選出牠住在哪裡。一共 10 題。</p>' +
      '<p><button class="btn primary big" id="go">住在哪片海（10 題）</button></p>' +
      '<p class="nokid"><button class="btn big" id="hall">在海生館哪一館？（10 題）</button></p>' +
      '<p class="nokid"><button class="btn big" id="go60">⏱️ 60 秒挑戰（答越多越好）</button></p>' +
      "<details><summary>有哪些地方？</summary><ul>" +
      Sea.HABS.map((h) => "<li>" + h.emoji + " <b>" + esc(h.name) + "</b>：" + esc(h.hint) + "，在海生館的「" + esc(hallName[h.hall]) + "」</li>").join("") +
      "</ul></details></div>"
    ));
    root.querySelector("#go").onclick = () => play(false);
    root.querySelector("#go60").onclick = () => play(true);
    root.querySelector("#hall").onclick = hallPlay;
  }

  // 盡量讓每種棲地都出現
  function spread(pool, key, n) {
    const by = {};
    pool.forEach((a) => (by[a[key]] = (by[a[key]] || []).concat(a)));
    const first = Object.values(by).map((l) => shuffle(l)[0]);
    const rest = shuffle(pool.filter((a) => !first.includes(a)));
    return shuffle(shuffle(first).slice(0, n).concat(rest.slice(0, Math.max(0, n - first.length)))).slice(0, n);
  }

  function play(timed) {
    const n = timed ? 40 : 10;
    const k = Sea.LEVELS[Sea.level()].choices;
    const rounds = spread(habAll(), "h", n).map((a) => {
      const others = shuffle(Sea.HABS.filter((h) => h.id !== a.h)).slice(0, k - 1);
      const opts = shuffle([a.habInfo].concat(others));
      return {
        animal: a,
        prompt: "<b>" + esc(a.name) + "</b> 住在哪裡？",
        say: a.name + "住在哪裡？",
        options: opts.map((h) => ({ id: h.id, label: h.emoji + " " + h.name })),
        answer: a.h,
        explain: esc(a.name) + "住在" + esc(a.habInfo.name) + "（" + esc(a.habInfo.hint) + "）。",
      };
    });
    Quiz.run(root, { key: timed ? "habitat-timed" : "habitat", title: timed ? "60 秒棲地挑戰" : "誰住哪片海", rounds, onAgain: menu, timed: timed ? 60 : 0 });
  }

  // 展館題：三個館都出現；答完說明這個館展示什麼樣的水域
  function hallPlay() {
    const rounds = spread(habAll().filter((a) => a.hall), "hall", 10).map((a) => ({
      animal: a,
      prompt: "到海生館要去哪一館看 <b>" + esc(a.name) + "</b> 住的地方？",
      say: a.name + "在海生館的哪一館？",
      options: data.halls.map((h) => ({ id: h.id, label: h.name })),
      answer: a.hall,
      explain: esc(a.name) + "住在" + esc(a.habInfo.name) + "，海生館把這種水域放在「" + esc(hallName[a.hall]) + "」。",
    }));
    Quiz.run(root, { key: "hall", title: "在海生館哪一館", rounds, onAgain: menu });
  }
  menu();
});
