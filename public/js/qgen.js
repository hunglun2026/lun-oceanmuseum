/* 出題產生器：學習單與「出題投影」共用。
   Qgen.make(pool, types, n, all) → [{ kind, animal, q, choices[], answer, pic }]
   all：全部物種，主題內同類不夠時從這裡補干擾選項。選項數依程度（Sea.LEVELS[...].choices）。
   pic＝true 的題目要配照片（看圖認生物）。choices 是顯示用文字；answer 是正確答案文字。所有題目都是選擇題，答案唯一。
   Qgen.unit(u) → 特展單元的閱讀測驗（題目與選項來自 data/units.json，選項打亂）。 */
(function () {
  "use strict";
  const { shuffle } = Sea;
  const nChoices = () => Sea.LEVELS[Sea.level()].choices;

  const KINDS = {
    habitat: { name: "住在哪裡", ok: (a) => a.habInfo },
    hall: { name: "在海生館哪一館", ok: (a) => a.hall },
    group: { name: "屬於哪一類", ok: (a) => Sea.CLASSIFY_GROUPS.includes(a.g) },
    diet: { name: "吃什麼", ok: (a) => a.dietInfo },
    riddle: { name: "猜猜我是誰", ok: (a) => a.c && a.c.length === 3 },
    picture: { name: "看圖認生物", ok: (a) => a.hasPhoto },
  };
  const HALLS = { taiwan: "台灣水域館", coral: "珊瑚王國館", world: "世界水域館" };

  function build(kind, a, pool, all) {
    const k = nChoices();
    if (kind === "habitat") {
      const others = shuffle(Sea.HABS.filter((h) => h.id !== a.h)).slice(0, k - 1);
      const ch = shuffle([a.habInfo].concat(others)).map((h) => h.name);
      return { q: a.name + " 住在哪裡？", choices: ch, answer: a.habInfo.name };
    }
    if (kind === "hall") {
      return { q: "到海生館要去哪一館看 " + a.name + " 住的水域？", choices: Object.values(HALLS), answer: HALLS[a.hall] };
    }
    if (kind === "group") {
      const others = shuffle(Sea.CLASSIFY_GROUPS.filter((g) => g !== a.g)).slice(0, k - 1).map((id) => Sea.GROUP[id]);
      const ch = shuffle([a.groupInfo].concat(others)).map((g) => g.name);
      return { q: a.name + " 是哪一類？", choices: ch, answer: a.groupInfo.name };
    }
    if (kind === "diet") {
      const ch = Object.values(Sea.DIETS).map((d) => d.name);
      return { q: a.name + " 吃什麼？", choices: ch, answer: a.dietInfo.name };
    }
    // 干擾選項：主題內同類 → 全部同類 → 主題內其他 → 全部其他。同類優先，不然一看類別就知道答案
    const ok = (x) => x.id !== a.id;
    const src = all || pool;
    const same = [...new Set([].concat(
      shuffle(pool.filter((x) => ok(x) && x.g === a.g)), shuffle(src.filter((x) => ok(x) && x.g === a.g)),
      shuffle(pool.filter(ok)), shuffle(src.filter(ok))))].slice(0, k - 1);
    if (kind === "picture") {
      return { q: "照片裡的是哪一種海洋生物？", choices: shuffle([a].concat(same)).map((x) => x.name), answer: a.name, pic: true };
    }
    // 猜謎：兩條遮住名字的特徵線索，從同類裡選
    return {
      q: Sea.mask(a, a.c[0]) + Sea.mask(a, a.c[1]) + "我是誰？",
      choices: shuffle([a].concat(same)).map((x) => x.name),
      answer: a.name,
    };
  }

  function make(pool, types, n, all) {
    const out = [];
    const used = new Set();
    let t = 0;
    for (const a of shuffle(pool)) {
      if (out.length >= n) break;
      // 這種生物適合哪種題型，從輪到的題型開始找
      for (let k = 0; k < types.length; k++) {
        const kind = types[(t + k) % types.length];
        if (!used.has(a.id) && KINDS[kind].ok(a)) {
          out.push(Object.assign({ kind, animal: a }, build(kind, a, pool, all)));
          used.add(a.id);
          t = (t + k + 1) % types.length;
          break;
        }
      }
    }
    return out;
  }

  function unit(u) {
    return u.quiz.map((x) => ({ kind: "unit", animal: null, q: x.q, choices: shuffle(x.o), answer: x.o[x.a], explain: x.x }));
  }
  window.Qgen = { make, unit, KINDS };
})();
