/* 特展教室：海生館的特展（資料集 90320）做成主題課：讀一篇 → 5 題閱讀測驗 → 相關生物。
   幼兒園一句話（可唸）、國小國中讀改寫、高中讀特展原文；國中可展開原文。網址 #單元id 直接打開。 */
Sea.boot(function (data) {
  const { esc, el, shuffle } = Sea;
  const root = document.getElementById("root");

  function list() {
    history.replaceState(null, "", location.pathname);
    const s = Progress.get();
    root.replaceChildren(el('<div class="units">' + data.units.map((u) => {
      const n = s.stars["unit-" + u.id] || 0;
      return '<button class="unit" data-u="' + u.id + '"><span class="uico" aria-hidden="true">' + u.emoji + "</span><b>" + esc(u.title) + "</b>" +
        "<small>海生館" + esc(u.hall) + '</small><span class="ust">' + (n ? "⭐".repeat(n) : "還沒讀") + "</span></button>";
    }).join("") + "</div>"));
    root.querySelectorAll("[data-u]").forEach((b) => (b.onclick = () => open(b.dataset.u)));
  }

  function related(u) {
    const r = u.related || {};
    return data.species.filter((a) =>
      (r.group && [].concat(r.group).includes(a.g)) || (r.hab && a.h === r.hab) || (r.ids && r.ids.includes(a.id)) || (r.tag === "toxic" && a.toxic));
  }

  function open(id) {
    const u = data.units.find((x) => x.id === id);
    if (!u) return list();
    history.replaceState(null, "", "#" + id);
    const lv = Sea.level();
    const text = lv === "k" ? u.k : lv === "s" ? u.orig : u.e;
    const how = lv === "s" ? "內容為原文" : "本站依原文改寫（AI 改寫，事實都來自原文）";
    const box = el('<div><p><button class="btn" id="back">◀ 全部特展</button></p>' +
      '<article class="panel reading"><p class="uhall">' + u.emoji + " 海生館" + esc(u.hall) + "・原特展：" + esc(u.origTitle) + "</p>" +
      "<h2>" + esc(u.title) + ' <span id="sayu"></span></h2><p class="utext"></p>' +
      (lv === "j" ? '<details class="orig"><summary>讀特展原文</summary><p>' + esc(u.orig) + "</p></details>" : "") +
      '<p class="credit">來源：<a href="' + esc(u.url) + '" target="_blank" rel="noopener">國立海洋生物博物館特展介紹</a>（政府資料開放授權），' + how + "。</p></article>" +
      '<h3 class="nokid">讀完了嗎？來回答 5 題</h3><div id="quiz" class="nokid"></div>' +
      '<h3>和這個特展有關的海洋生物</h3><div class="grid" id="rel"></div></div>');
    box.querySelector(".utext").textContent = text;
    box.querySelector("#sayu").appendChild(Sea.sayBtn(u.k, "唸給我聽"));
    const rel = box.querySelector("#rel");
    related(u).filter((a) => a.hasPhoto || lv !== "k").slice(0, 12).forEach((a) => {
      const c = el('<a class="acard" href="/animals#' + encodeURIComponent(a.id) + '"><div class="info"><b>' + esc(a.name) + "</b></div></a>");
      c.prepend(Sea.photo(a));
      rel.appendChild(c);
    });
    root.replaceChildren(box);
    box.querySelector("#back").onclick = list;
    if (lv !== "k") quiz(u, box.querySelector("#quiz"));
    else Sea.say(u.k);
    scrollTo({ top: 0, behavior: "smooth" });
  }

  // 閱讀測驗：題目、選項、解釋都來自 data/units.json（tools/unit_check.py 查核過），選項每次打亂
  function quiz(u, slot) {
    const start = el('<p><button class="btn primary big">開始作答</button></p>');
    slot.replaceChildren(start);
    start.querySelector("button").onclick = () => {
      const rounds = u.quiz.map((q) => ({
        animal: null, noPic: true, prompt: esc(q.q), text: q.q,
        options: shuffle(q.o.map((o, i) => ({ id: String(i), label: o }))),
        answer: String(q.a), explain: esc(q.x),
      }));
      Quiz.run(slot, { key: "unit-" + u.id, title: u.title, rounds, onAgain: () => quiz(u, slot) });
    };
  }
  document.addEventListener("sea-level", () => (location.hash ? open(location.hash.slice(1)) : list()));
  const want = location.hash.slice(1);
  want ? open(want) : list();
});
