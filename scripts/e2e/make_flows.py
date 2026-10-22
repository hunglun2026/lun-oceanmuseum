"""產生 sg browse 用的端對端測試流程（scripts/e2e/site.json）。
用法：python scripts/e2e/make_flows.py [網址，預設 http://127.0.0.1:8814] [截圖資料夾]
再跑：sg browse --steps scripts/e2e/site.json（每個 eval 的回傳值會印出來，人工核對數字；assert 沒過離場碼非 0）
"""
import json
import sys
from pathlib import Path

B = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8814"
S = sys.argv[2] if len(sys.argv) > 2 else r"D:\claude測試資料\lun-oceanmuseum\2026-10-22"
W = ("const w=ms=>new Promise(r=>setTimeout(r,ms));const wf=async q=>{for(let i=0;i<100&&!document.querySelector(q);i++)await w(100);return document.querySelector(q)};"
     "const rd=async()=>{for(let i=0;i<100&&!document.documentElement.dataset.ready;i++)await w(100)};")
# 跑完一輪出題引擎：每題按第一個還能按的選項，再按「下一題」，直到出現成績
RUN = ("let n=0;for(let i=0;i<12;i++){const o=await wf('.opt:not([disabled])');if(!o)break;o.click();await w(120);"
       "const nx=document.querySelector('#nx button');if(!nx)break;nx.click();n++;await w(120);if(document.querySelector('.score'))break;}await w(300);")


def ev(body):
    return {"do": "eval", "expr": "(async()=>{" + W + "await rd();" + body + "})()"}


def shot(name, full=False):
    return {"do": "shot", "path": str(Path(S) / name), "full": full}


def go(path):
    return {"do": "goto", "url": B + path}


def level(v):
    return ev("localStorage.setItem('sea-level','" + v + "');return '程度=" + v + "'")


steps = [
    go("/"), level("e"), go("/"),
    {"do": "assert_text", "text": "十二個學習工具"},
    ev("const t=document.querySelectorAll('#today .acard').length;const h=document.querySelectorAll('#hallcards .hall').length;"
       "document.querySelector('[data-who=student]').click();await w(100);document.querySelector('[data-lv=j]').click();await w(100);"
       "return '今天卡片='+t+' 展館卡='+h+' 推薦='+document.querySelectorAll('#g-recs .tool').length+' 程度='+localStorage.getItem('sea-level')"),
    shot("01-home.png", True),
    go("/animals"),
    ev("const c0=document.getElementById('count').textContent;const q=document.getElementById('q');q.value='鯨鯊';q.dispatchEvent(new Event('input'));await w(200);"
       "document.querySelector('.acard').click();await w(500);return c0+' / 標題='+document.querySelector('#dlg-body h2').textContent+' / 出處='+document.querySelector('#dlg-body .credit').textContent.slice(0,60)"),
    shot("02-animal-detail-j.png"),
    ev("document.getElementById('dlg').close();const q=document.getElementById('q');q.value='';q.dispatchEvent(new Event('input'));"
       "document.querySelectorAll('.chips')[0].querySelector('.chip').click();await w(200);const a=document.getElementById('count').textContent;"
       "[...document.querySelectorAll('.chips')[4].querySelectorAll('.chip')][1].click();await w(200);return '鯊魚='+a+' 加有毒='+document.getElementById('count').textContent"),
    go("/classify"),
    ev("(await wf('[data-m=hard]')).click();" + RUN + "return '分類闖關 '+n+' 題，成績='+(document.querySelector('.score')||{}).textContent"),
    shot("03-classify-done.png"),
    go("/habitat"),
    ev("(await wf('#go')).click();" + RUN + "return '棲地 '+n+' 題，成績='+(document.querySelector('.score')||{}).textContent"),
    go("/habitat"),
    ev("(await wf('#hall')).click();await w(200);const p=document.querySelector('.stage h2').textContent;" + RUN + "return '展館題：'+p.slice(0,30)+' / '+n+' 題'"),
    go("/guess"),
    ev("(await wf('#solo')).click();await w(300);const c=document.querySelectorAll('.clue').length;const opts=document.querySelectorAll('.opt').length;"
       "document.querySelector('#more').click();await w(100);return '猜謎線索='+c+' 選項='+opts+' 加線索後='+document.querySelectorAll('.clue').length"),
    shot("04-guess.png"),
    go("/memory"),
    ev("(await wf('[data-m=easy]')).click();await w(300);return '翻牌牌數='+document.querySelectorAll('.mcard').length+' 照片='+document.querySelectorAll('.mcard img').length"),
    go("/conserve"),
    ev("await wf('#duel .opt');return '臺灣階梯='+document.querySelectorAll('#ladder-tw .rung').length+' IUCN='+document.querySelectorAll('#ladder .rung').length"
       "+' 危險卡='+!!document.querySelector('#why h3')+' 對決選項='+document.querySelectorAll('#duel .opt').length"),
    shot("05-conserve.png", True),
    go("/units#shark"),
    ev("const t=document.querySelector('.utext').textContent.slice(0,20);(await wf('#quiz .btn')).click();await w(200);" + RUN +
       "return '特展 '+t+' / 答 '+n+' 題 / 成績='+(document.querySelector('.score')||{}).textContent+' 相關='+document.querySelectorAll('#rel .acard').length"),
    shot("06-unit-shark.png", True),
    go("/halls#coral"),
    ev("return '珊瑚王國館分區='+document.querySelectorAll('.zone').length+' 卡片='+document.querySelectorAll('.zone .acard').length"),
    shot("07-halls-coral.png", True),
    go("/explore"),
    ev("await wf('#map circle');document.querySelectorAll('#map circle')[5].dispatchEvent(new MouseEvent('click',{bubbles:true}));await w(200);"
       "return '測站='+document.querySelectorAll('#map circle').length+' 圖表='+document.querySelectorAll('figure.bars').length+' 資訊='+document.querySelector('#stinfo h3').textContent+' / '+document.getElementById('ew').textContent.slice(0,50)"),
    shot("08-explore.png", True),
    go("/teacher"),
    ev("document.getElementById('theme').value='u-toxic';document.getElementById('gen').click();await w(600);const a=document.querySelectorAll('#sheet .q').length;"
       "document.getElementById('theme').value='all';document.getElementById('kind').value='picture';document.getElementById('gen').click();await w(600);"
       "return '特展學習單題數='+a+' 看圖題='+document.querySelectorAll('#sheet .q').length+' 圖='+document.querySelectorAll('#sheet img').length"),
    shot("09-teacher-sheet.png"),
    go("/passport"),
    ev("return '徽章='+document.querySelectorAll('.bdg').length+' 已得='+document.querySelectorAll('.bdg.got').length+' 標題='+document.querySelector('#root h2').textContent"),
    # 幼兒園
    level("k"), go("/guess"),
    ev("(await wf('#kid')).click();await w(300);const pics=document.querySelectorAll('.picopts .opt img, .picopts .opt .ph').length;"
       "const say=[...document.querySelectorAll('.say')].filter(b=>!b.hidden).length;" + RUN + "return '幼兒園找照片 照片選項='+pics+' 喇叭='+say+' 跑完='+n"),
    go("/memory"),
    ev("(await wf('[data-m=easy]')).click();await w(300);return '幼兒園翻牌 牌='+document.querySelectorAll('.mcard').length+' 照片='+document.querySelectorAll('.mcard img').length+' 文字牌='+document.querySelectorAll('.mcard .front b').length"),
    go("/animals"),
    ev("const nav=[...document.querySelectorAll('header nav a')].filter(a=>getComputedStyle(a).display!=='none').length;document.querySelector('.acard').click();await w(400);"
       "return '幼兒園導覽連結='+nav+' 卡片='+document.querySelectorAll('.acard').length+' 介紹='+document.getElementById('introtext').textContent"),
    shot("10-kid-detail.png"),
    level("s"), go("/units#deepsea"),
    ev("return '高中特展原文開頭='+document.querySelector('.utext').textContent.slice(0,25)"),
    level("e"),
]
out = Path(__file__).with_name("site.json")
out.write_text(json.dumps(steps, ensure_ascii=False, indent=1), "utf-8")
print(f"{len(steps)} 步 → {out}")
