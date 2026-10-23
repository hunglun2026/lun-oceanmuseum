/* 逛海生館：海生館三個常設展館（官方展館介紹，資料集 9693）當地圖，點進去看那一館的水域住著哪些生物。
   網址 #taiwan／#coral／#world 可直接打開某一館。 */
Sea.boot(function (data) {
  const { esc, el } = Sea;
  const root = document.getElementById("root");
  const habsOf = (hid) => Sea.HABS.filter((h) => h.hall === hid); // 棲地 → 展館的對照在 data.js 的 HABS

  function lobby() {
    history.replaceState(null, "", location.pathname);
    root.replaceChildren(el('<div class="halls">' + data.halls.map((h) =>
      '<button class="hall" data-h="' + h.id + '"><span class="hico" aria-hidden="true">' + Sea.hallIco(h.id, 64) + "</span><b>" + esc(h.name) + "</b>" +
      '<small class="nokid">' + esc(h.intro.slice(0, 60)) + '…</small><span class="hn">' + h.count + " 種生物</span></button>").join("") + "</div>"));
    root.querySelectorAll("[data-h]").forEach((b) => (b.onclick = () => room(b.dataset.h)));
  }

  function room(hid) {
    const h = data.halls.find((x) => x.id === hid);
    if (!h) return lobby();
    history.replaceState(null, "", "#" + hid);
    const kid = Sea.level() === "k";
    const max = kid ? 8 : 12;
    const box = el('<div><p><button class="btn" id="back">← 回到大廳</button></p>' +
      '<div class="panel"><h2 style="margin-top:0">' + Sea.hallIco(hid, 40) + " " + esc(h.name) + ' <span id="sayh"></span></h2>' +
      '<p class="nokid">' + esc(h.intro) + '</p><p class="nokid" style="font-size:.85rem"><a href="' + esc(h.url) + '" target="_blank" rel="noopener">海生館官網的' + esc(h.name) + "介紹 →</a></p></div>" +
      '<div id="zones"></div><p class="nokid"><a class="btn primary" href="/animals?hall=' + hid + '">在小百科看這一館全部生物 →</a> ' +
      '<a class="btn" href="/habitat">玩「在海生館哪一館」</a></p></div>');
    box.querySelector("#sayh").appendChild(Sea.sayBtn(h.name, "唸出展館名稱"));
    const zones = box.querySelector("#zones");
    habsOf(hid).forEach((hab) => {
      const list = data.species.filter((a) => a.h === hab.id && (!kid || a.hasPhoto));
      if (!list.length) return;
      const z = el('<section class="zone"><h3>' + Sea.ico(hab.ico, 32) + " " + esc(hab.name) + '<small class="nokid">　' + esc(hab.hint) + "（" + list.length + ' 種）</small></h3><div class="grid"></div></section>');
      const g = z.querySelector(".grid");
      list.slice(0, max).forEach((a) => {
        const c = el('<a class="acard" href="/animals#' + encodeURIComponent(a.id) + '"><div class="info"><b>' + esc(a.name) + "</b><small>" + Sea.ico(a.groupInfo.ico) + esc(a.groupInfo.name) + "</small></div></a>");
        c.prepend(Sea.photo(a));
        g.appendChild(c);
      });
      if (list.length > max) z.appendChild(el('<p><a href="/animals?h=' + hab.id + '">還有 ' + (list.length - max) + " 種，看全部 →</a></p>"));
      zones.appendChild(z);
    });
    // 這一館辦過的特展
    const us = data.units.filter((u) => u.hall === h.name);
    if (us.length) zones.appendChild(el('<section class="zone nokid"><h3>這一館辦過的特展</h3><div class="chips">' +
      us.map((u) => '<a class="chip" style="text-decoration:none;color:inherit" href="/units#' + u.id + '">' + Sea.unitIco(u.id, 24) + esc(u.title) + "</a>").join("") + "</div></section>"));
    root.replaceChildren(box);
    box.querySelector("#back").onclick = lobby;
    if (kid) Sea.say(h.name);
    scrollTo({ top: 0, behavior: "smooth" });
  }
  document.addEventListener("sea-level", () => (location.hash ? room(location.hash.slice(1)) : lobby()));
  const want = location.hash.slice(1);
  want ? room(want) : lobby();
});
