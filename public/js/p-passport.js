/* 探險護照：看過幾種海洋生物、徽章、各遊戲與特展星數、蓋過章的生物。紀錄邏輯在 progress.js。 */
Sea.boot(function (data) {
  const { esc, el } = Sea;
  const animals = data.species;
  const root = document.getElementById("root");

  function draw() {
    const s = Progress.get();
    const seen = animals.filter((a) => s.seen[a.id]);
    const pct = Math.round((seen.length / animals.length) * 100);
    const badges = Progress.badges(animals, data.units);
    const got = badges.filter((b) => b.got).length;
    root.replaceChildren(el(
      "<div>" +
      '<div class="panel"><h2 style="margin-top:0">' + Sea.ico("t-animals", 32) + ' 認識了 ' + seen.length + " / " + animals.length + " 種海洋生物</h2>" +
      '<div class="bar"><i style="width:' + pct + '%"></i></div>' +
      '<p class="lead" style="margin:0">' + (seen.length ? "繼續到<a href=\"/animals\">小百科</a>蓋更多章吧！" : "還沒有蓋章，先到<a href=\"/animals\">小百科</a>點一種海洋生物看看。") + "</p></div>" +
      "<h2>" + Sea.ico("b-trophy", 32) + " 徽章（" + got + " / " + badges.length + "）</h2>" +
      '<div class="badges">' + badges.map((b) =>
        '<div class="bdg' + (b.got ? " got" : "") + '"><div class="ico" aria-hidden="true">' + Sea.ico(b.icon, 56) + "</div><b>" + esc(b.name) + "</b><small>" +
        (b.got ? "已獲得！" : "怎麼拿：") + esc(b.how) + "</small></div>").join("") + "</div>" +
      "<h2>遊戲星星</h2>" +
      '<div class="panel"><table class="gtable"><tbody>' + Progress.GAMES.map(([k, name]) => {
        const n = s.stars[k] || 0;
        return "<tr><th scope=\"row\">" + esc(name) + '</th><td>' + (n ? Sea.stars(n) : "<small>還沒玩</small>") + "</td></tr>";
      }).join("") + data.units.map((u) => {
        const n = s.stars["unit-" + u.id] || 0;
        return "<tr><th scope=\"row\">特展：" + esc(u.title) + '</th><td>' + (n ? Sea.stars(n) : "<small>還沒讀</small>") + "</td></tr>";
      }).join("") + "</tbody></table></div>" +
      "<h2>" + Sea.ico("t-passport", 32) + " 蓋過章的海洋生物</h2>" +
      (seen.length
        ? Sea.GROUPS.map((g) => {
          const l = seen.filter((a) => a.g === g.id);
          return l.length ? "<h3>" + Sea.ico(g.ico, 28) + " " + esc(g.name) + "（" + l.length + "）</h3><div class=\"chips\">" +
            l.map((a) => '<a class="chip" style="text-decoration:none;color:inherit" href="/animals#' + encodeURIComponent(a.id) + '">' + esc(a.name) + "</a>").join("") + "</div>" : "";
        }).join("")
        : '<p class="lead">還沒有。</p>') +
      '<p style="margin-top:28px"><button class="btn danger" id="clear">清除我的紀錄</button></p></div>'
    ));
    root.querySelector("#clear").onclick = async () => {
      const ok = await Sea.dialog("確定要清除這台裝置上的護照紀錄嗎？蓋過的章和星星都會不見。", [{ label: "取消", value: false }, { label: "清除", value: true, danger: true }]);
      if (ok) { Progress.clear(); draw(); }
    };
  }
  draw();
});
