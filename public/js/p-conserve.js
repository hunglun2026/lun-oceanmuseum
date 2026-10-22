/* 保育小尖兵：臺灣保育等級與 IUCN 兩道階梯、「牠們遇到什麼危險」、「誰比較危險」小測驗。 */
Sea.boot(function (data) {
  const { esc, el, shuffle } = Sea;
  const all = data.species;
  const list = document.getElementById("ladder-list");
  const chips = (arr) => "<div class='chips'>" + arr.map((a) => '<a class="chip" style="text-decoration:none;color:inherit" href="/animals#' +
    encodeURIComponent(a.id) + '">' + a.groupInfo.emoji + " " + esc(a.name) + "</a>").join("") + "</div>";

  // ---- 1. 臺灣保育等級 ----
  const TW = [["I", "一級：瀕臨絕種"], ["II", "二級：珍貴稀有"], ["III", "三級：其他應予保育"]];
  TW.forEach(([code, text]) => {
    const arr = all.filter((a) => a.prot === code);
    if (!arr.length) return;
    const b = el('<button class="rung" style="background:' + Sea.PROT[code].color + '">' + esc(text) + "<span>" + arr.length + " 種</span></button>");
    b.onclick = () => { list.hidden = false; list.innerHTML = "<h3 style='margin-top:0'>臺灣" + esc(text) + "（" + arr.length + " 種）</h3>" + chips(arr); };
    document.getElementById("ladder-tw").appendChild(b);
  });
  // ---- 2. IUCN ----
  const IU = [["CR", "非常危險，很快可能消失"], ["EN", "很危險，數量少得很快"], ["VU", "有危險，需要保護"], ["NT", "快要有危險了"], ["LC", "暫時還安全"]];
  IU.forEach(([code, text]) => {
    const c = Sea.IUCN[code], arr = all.filter((a) => a.iucn === code);
    if (!arr.length) return;
    const b = el('<button class="rung" style="background:' + c.color + '">' + esc(c.name) + "（" + code + "）：" + esc(text) + "<span>" + arr.length + " 種</span></button>");
    b.onclick = () => { list.hidden = false; list.innerHTML = "<h3 style='margin-top:0'>" + esc(c.name) + "（" + arr.length + " 種）</h3>" + chips(arr); };
    document.getElementById("ladder").appendChild(b);
  });

  // ---- 3. 牠們遇到什麼危險：從查核過的國小改寫裡，挑寫到捕撈、漁網、撞船、瀕危的 ----
  const RISK = /捕|漁網|纏住|撞|瀕危|極危|絕種|稀少|數量.{0,4}少|保育/;
  const risky = all.filter((a) => RISK.test(a.e) && a.hasPhoto);
  const why = document.getElementById("why");
  function showWhy() {
    const a = shuffle(risky)[0];
    why.replaceChildren();
    why.appendChild(Sea.photo(a));
    const badge = a.protInfo ? ' <span class="badge" style="background:' + a.protInfo.color + '">' + esc(a.protInfo.name) + "</span>"
      : a.iucnInfo ? ' <span class="badge" style="background:' + a.iucnInfo.color + '">' + esc(a.iucnInfo.name) + "</span>" : "";
    why.appendChild(el("<div><h3>" + esc(a.name) + badge + '</h3><div class="clue" style="max-width:640px">' +
      esc(Sea.level() === "k" ? a.k : a.e) + "</div></div>"));
    const more = el('<p><button class="btn primary">換一種</button> <a class="btn" href="/animals#' + encodeURIComponent(a.id) + '">看完整介紹</a></p>');
    more.querySelector("button").onclick = showWhy;
    why.appendChild(more);
  }
  if (risky.length) showWhy();

  // ---- 4. 誰比較危險（照 IUCN 等級）----
  const duel = document.getElementById("duel");
  const known = all.filter((a) => a.iucnInfo && a.iucnInfo.rank >= 2 && a.hasPhoto);
  function playDuel() {
    let i = 0, score = 0, combo = 0;
    const N = 5, wrongs = [];
    const next = () => {
      if (i >= N) return end();
      let a, b;
      do { a = shuffle(known)[0]; b = shuffle(known)[0]; } while (a.iucnInfo.rank === b.iucnInfo.rank);
      duel.replaceChildren(el("<div><p>第 " + (i + 1) + " / " + N + " 題　⭐ " + score + "</p>" +
        (combo >= 2 ? '<p class="combo">🔥 連續答對 ' + combo + " 題！</p>" : "") + '<h3 style="margin:.2em 0">國際紅色名錄裡，哪一種比較危險？</h3></div>'));
      const row = el('<div class="opts"></div>');
      [a, b].forEach((x) => {
        const o = el('<button class="opt"><span class="ph-slot"></span>' + esc(x.name) + "</button>");
        o.querySelector(".ph-slot").replaceWith(Sea.photo(x));
        o.onclick = () => {
          const hi = a.iucnInfo.rank > b.iucnInfo.rank ? a : b, lo = hi === a ? b : a;
          const ok = x === hi;
          combo = ok ? combo + 1 : 0;
          if (ok) { score += 10; Fx.right(); }
          else { Fx.wrong(); wrongs.push({ animal: hi, answer: hi.name + "（" + hi.iucnInfo.name + "）比" + lo.name + "（" + lo.iucnInfo.name + "）危險" }); }
          row.querySelectorAll(".opt").forEach((btn, k) => {
            const y = k === 0 ? a : b;
            btn.disabled = true;
            btn.insertAdjacentHTML("beforeend", "<small>" + esc(y.iucnInfo.name) + "</small>");
            if (y === hi) btn.classList.add("right");
          });
          if (!ok) o.classList.add("wrong");
          const nx = el('<p><button class="btn primary big">' + (i === N - 1 ? "看成績" : "下一題 ➜") + "</button></p>");
          nx.querySelector("button").onclick = () => { i++; next(); };
          duel.appendChild(el('<div class="feedback ' + (ok ? "ok" : "no") + '">' + (ok ? "答對了！🎉" : "再想想，看看上面的等級～") + "</div>"));
          duel.appendChild(nx);
        };
        row.appendChild(o);
      });
      duel.appendChild(row);
    };
    const end = () => {
      const stars = score >= 50 ? 3 : score >= 30 ? 2 : score > 0 ? 1 : 0;
      Progress.stars("conserve", stars);
      if (stars === 3) Fx.confetti();
      duel.replaceChildren(el('<div><h3>完成！</h3><div class="stars" aria-label="' + stars + ' 顆星">' + "⭐".repeat(stars) + "☆".repeat(3 - stars) + "</div>" +
        '<div class="score">' + score + " / " + N * 10 + '</div><div id="rv"></div><p><button class="btn primary big">再玩一次</button></p></div>'));
      duel.querySelector("#rv").appendChild(Quiz.review(wrongs));
      duel.querySelector("button").onclick = playDuel;
    };
    next();
  }
  playDuel();
});
