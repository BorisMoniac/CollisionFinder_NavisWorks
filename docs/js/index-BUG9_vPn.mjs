const ve = () => ({ guid: "", id: "", source: "", name: "", properties: {} }), tt = (t) => t.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
function gt(t) {
  let e = 2166136261;
  for (let o = 0; o < t.length; o++) e = Math.imul(e ^ t.charCodeAt(o), 16777619);
  return (e >>> 0).toString(16);
}
function ie(t) {
  try {
    t = decodeURIComponent(t);
  } catch {
  }
  return t.trim().replace(/\\/g, "/").replace(/^\.\//, "");
}
function De(t) {
  const e = Object.entries(t), o = (i) => e.find(([a]) => i.test(tt(a)))?.[1] ?? "";
  return { guid: o(/ifcguid|globalid/), id: o(/^(объект)?id$|elementid|идентификаторэлемента/).replace(/^.*?:\s*/, ""), source: o(/файлиcточника|файлисточника|sourcefile/), name: o(/ifcname|^name$|^имя$/), properties: t };
}
const V = (t) => t?.textContent?.replace(/\s+/g, " ").trim() ?? "", ot = (t) => ({ id: t, name: "", status: "", distance: "", description: "", date: "", image: "", group: "", elements: [ve(), ve()], properties: {}, enabled: !0, reviewed: !1, excluded: !1, note: "" });
function ht(t) {
  const e = ["X", "Y", "Z"].map((o) => t.match(new RegExp(o + "\\s*:\\s*([-+]?\\d+(?:[.,]\\d+)?(?:[eE][-+]?\\d+)?)", "i"))?.[1]);
  return e.every((o) => o !== void 0) ? e.map((o) => Number(o.replace(",", "."))) : void 0;
}
function nt(t, e) {
  if (t.length > 100 * 1024 * 1024) throw Error("Отчёт больше 100 МБ. Разделите его на несколько проверок.");
  const o = { version: 1, id: gt(t), name: e, tests: [], images: {}, warnings: [] };
  if (/<\s*(?:\w+:)?(?:batchtest|clashtests|clashresults)\b/i.test(t) ? xt(t, o) : bt(t, o), !o.tests.length) throw Error("Не найдены проверки Navisworks. Выберите отчёт HTML (табличный) или XML.");
  const a = o.tests.flatMap((s) => s.clashes).filter((s) => s.elements.some((l) => !l.guid)).length;
  return a && o.warnings.push(`У ${a} коллизий нет IFC GUID одного или обоих объектов. Для привязки потребуется совпадение ID и имени модели.`), o;
}
function bt(t, e) {
  const o = document.createElement("template");
  o.innerHTML = t;
  let i = "Проверка";
  for (const a of o.content.querySelectorAll("table")) {
    if (a.matches(".testSummaryTable")) {
      i = V(a.querySelector(".testName")) || i;
      continue;
    }
    if (!a.matches(".mainTable")) continue;
    const s = { id: `${e.id}:t${e.tests.length}`, name: i, clashes: [] }, l = Array.from(a.rows), n = l.filter((p) => Array.from(p.cells).some((c) => c.matches(".item1Header"))).sort((p, c) => c.cells.length - p.cells.length)[0];
    if (!n) {
      e.warnings.push(`Не распознаны колонки проверки «${i}».`);
      continue;
    }
    const h = Array.from(n.cells).flatMap((p) => Array.from({ length: p.colSpan }, () => ({ name: V(p), side: p.matches(".item1Header") ? 1 : p.matches(".item2Header") ? 2 : 0 })));
    let u = "";
    for (const p of l.filter((c) => c.matches(".contentRow,.childRow,.childRowLast,.clashGroupRow"))) {
      const c = ot(`${s.id}:c${s.clashes.length}`), g = [{}, {}];
      let x = 0;
      for (const w of Array.from(p.cells)) {
        const k = h[x];
        if (x += w.colSpan, !k) continue;
        const y = V(w), C = tt(k.name);
        k.side ? g[k.side - 1][k.name] = y : (c.properties[k.name] = y, /наименованиеконфликта|clashname/.test(C) ? c.name = y : /статус|status/.test(C) ? c.status = y : /расстояние|distance/.test(C) ? c.distance = y : /описание|description/.test(C) ? c.description = y : /датаобнаружения|datefound/.test(C) ? c.date = y : /точкаконфликта|clashpoint/.test(C) && (c.point = ht(y)));
        const T = w.querySelector("img")?.getAttribute("src");
        T && (c.image = ie(T));
      }
      if (p.matches(".clashGroupRow")) {
        u = c.name;
        continue;
      }
      p.matches(".contentRow") && (u = ""), c.group = u, c.elements = [De(g[0]), De(g[1])], c.name && s.clashes.push(c), p.matches(".childRowLast") && (u = "");
    }
    e.tests.push(s);
  }
}
function xt(t, e) {
  if (/<!DOCTYPE|<!ENTITY/i.test(t)) throw Error("XML с DTD/ENTITY не поддерживается. Экспортируйте стандартный XML Navisworks.");
  const o = new DOMParser().parseFromString(t, "application/xml");
  if (o.querySelector("parsererror")) throw Error("XML повреждён: проверьте закрывающие теги и кодировку.");
  for (const i of o.querySelectorAll("clashtest")) {
    const a = { id: `${e.id}:t${e.tests.length}`, name: i.getAttribute("name") || "Проверка", clashes: [] };
    for (const s of i.querySelectorAll("clashresult")) {
      const l = ot(`${a.id}:c${a.clashes.length}`);
      for (const p of ["name", "status", "distance"]) l[p] = s.getAttribute(p) || "";
      l.description = V(s.querySelector("description")), l.image = ie(s.getAttribute("href") || ""), l.group = s.closest("clashgroup")?.getAttribute("name") || "";
      const n = s.querySelector("createddate date");
      l.date = n ? ["year", "month", "day"].map((p) => n.getAttribute(p) || "").join("-") : "";
      const h = s.querySelector("clashpoint pos3f");
      h && ["x", "y", "z"].every((p) => h.hasAttribute(p) && Number.isFinite(Number(h.getAttribute(p)))) && (l.point = ["x", "y", "z"].map((p) => Number(h.getAttribute(p)))), l.properties = { Name: l.name, Status: l.status, Distance: l.distance, Description: l.description, "Clash point": l.point?.join("; ") || "" };
      const u = Array.from(s.querySelectorAll("clashobjects clashobject")).map((p) => {
        const c = {};
        for (const w of p.querySelectorAll("objectattribute,smarttag")) {
          const k = V(w.querySelector("name"));
          k && (c[k] = V(w.querySelector("value")));
        }
        const g = De(c), x = Array.from(p.querySelectorAll("pathlink node")).map(V);
        return g.source || (g.source = x.find((w) => /\.(ifc|smdx|rvt|nwc|nwd)$/i.test(w)) || ""), g.name || (g.name = V(p.querySelector("name")) || x.at(-1) || ""), g;
      });
      l.elements = [u[0] || ve(), u[1] || ve()], a.clashes.push(l);
    }
    e.tests.push(a);
  }
}
function at(t) {
  for (const e of t.tests || []) for (const o of e.clashes || [])
    o.properties = o.properties && typeof o.properties == "object" ? o.properties : {}, o.enabled = typeof o.enabled == "boolean" ? o.enabled : !0, o.reviewed = !!o.reviewed, o.excluded = !!o.excluded, o.note = typeof o.note == "string" ? o.note : "";
  return t;
}
function it(t) {
  const e = JSON.parse(t), o = (a) => typeof a == "string";
  if (e?.version !== 1 || !o(e.id) || !o(e.name) || !Array.isArray(e.tests) || !e.images || typeof e.images != "object" || !Array.isArray(e.warnings) || !e.warnings.every(o)) throw Error("Неверный формат сессии.");
  const i = /* @__PURE__ */ new Set();
  for (const a of e.tests) {
    if (!o(a.id) || !o(a.name) || !Array.isArray(a.clashes)) throw Error("Повреждена проверка в сессии.");
    for (const s of a.clashes) {
      if (!["id", "name", "status", "distance", "description", "date", "image", "group", "note"].every((l) => o(s[l])) || typeof s.reviewed != "boolean" || s.enabled !== void 0 && typeof s.enabled != "boolean" || s.excluded !== void 0 && typeof s.excluded != "boolean" || s.properties !== void 0 && (!s.properties || typeof s.properties != "object" || !Object.values(s.properties).every(o)) || !Array.isArray(s.elements) || s.elements.length !== 2 || i.has(s.id)) throw Error("Повреждена коллизия в сессии.");
      if (i.add(s.id), s.point !== void 0 && (!Array.isArray(s.point) || s.point.length !== 3 || !s.point.every(Number.isFinite))) throw Error("Неверные координаты.");
      for (const l of s.elements) if (!l || !["guid", "id", "source", "name"].every((n) => o(l[n])) || !l.properties || typeof l.properties != "object" || !Object.values(l.properties).every(o)) throw Error("Повреждены свойства объекта.");
    }
  }
  for (const a of Object.values(e.images)) if (!o(a) || !/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=\s]+$/.test(a)) throw Error("Неподдерживаемое изображение в сессии.");
  return at(e);
}
const v = (t) => String(t ?? "").replace(/[&<>"']/g, (e) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[e]), wt = (t, e) => e ? "Исключена" : t ? "Отработана" : "В работе", vt = (t, e) => t ? `<a href="${v(t)}" target="_blank" title="Открыть снимок"><img src="${v(t)}" alt="Снимок ${v(e)}"></a>` : "—";
function yt(t) {
  const e = v;
  let o = 0;
  const i = t.tests.flatMap((s) => s.clashes.map((l) => {
    o++;
    const n = wt(l.reviewed, l.excluded), h = [o, l.name, s.name, n, l.status, l.group, l.note, l.point?.join(" "), ...l.elements.flatMap((u) => [u.name, u.id, u.guid, u.source, ...Object.values(u.properties)]), ...Object.values(l.properties)].join(" ").toLowerCase();
    return `<tr data-state="${e(n)}" data-test="${e(s.name)}" data-search="${e(h)}"><td>${o}</td><td><strong>${e(l.name || `Коллизия ${o}`)}</strong></td><td>${e(s.name)}</td><td><span class="state ${l.excluded ? "excluded" : l.reviewed ? "done" : "work"}">${e(n)}</span><small>${l.enabled ? "Знак показывается" : "Знак скрыт"}</small></td><td>${e(l.status || "—")}</td><td>${e(l.group || "—")}</td><td>${e(l.note || "—")}</td><td>${e(l.point?.map((u) => Number(u.toFixed(3))).join("; ") || "—")}<small>${e(l.distance)}</small></td><td>${vt(t.images[l.image] || "", l.name)}</td><td>${l.elements.map((u, p) => `<div class="object"><b>Элемент ${p + 1}</b><span>${e(u.name || u.id || "—")}</span><small>${e(u.source || "—")}</small><code>${e(u.guid || "GUID отсутствует")}</code></div>`).join("")}</td></tr>`;
  })).join(""), a = t.tests.filter((s) => s.clashes.length).map((s) => `<option value="${e(s.name)}">${e(s.name)}</option>`).join("");
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(t.name)} — отчёт о коллизиях</title><style>
  :root{color-scheme:light;font:14px/1.4 "Segoe UI",Arial,sans-serif;color:#172336;background:#f3f6fa}*{box-sizing:border-box}body{margin:0}.head{background:#17202b;color:#fff;padding:18px 24px;box-shadow:0 2px 12px #0003}.head h1{margin:0 0 3px;font-size:24px}.head p{margin:0;color:#b9c5d3}.filters{display:grid;grid-template-columns:minmax(240px,1fr) 190px 220px auto;gap:10px;margin-top:15px}.filters input,.filters select,.filters button{height:38px;border:1px solid #536274;border-radius:6px;background:#242f3c;color:#fff;padding:0 11px;font:inherit}.filters button{cursor:pointer;background:#356fb9}.count{align-self:center;color:#dce5ef;white-space:nowrap}.table-wrap{padding:18px;overflow:auto}table{border-collapse:separate;border-spacing:0;width:100%;min-width:1500px;background:#fff;box-shadow:0 4px 22px #21314a1c}th{background:#e5ebf2;color:#35465b;text-align:left;white-space:normal;line-height:1.3;vertical-align:bottom}th,td{border-right:1px solid #d9e0e8;border-bottom:1px solid #d9e0e8;padding:9px;vertical-align:top}td:first-child{width:55px;text-align:center}td:nth-child(2){min-width:170px}td:nth-child(7){min-width:220px;white-space:pre-wrap}td:nth-child(10){min-width:290px}tbody tr:hover td{background:#f2f7fc}small{display:block;color:#68788c;margin-top:3px}.state{display:inline-block;border-radius:999px;padding:3px 9px;font-weight:650}.state.work{background:#fff0c2;color:#6f5100}.state.done{background:#d9f4e5;color:#12683d}.state.excluded{background:#e4e7eb;color:#59616c}.object{display:grid;gap:2px;margin-bottom:10px}.object:last-child{margin-bottom:0}.object code{overflow-wrap:anywhere;color:#315f98}img{display:block;width:150px;height:90px;object-fit:contain;background:#eef2f6;cursor:zoom-in}[hidden]{display:none!important}@media print{.filters{display:none}.table-wrap{padding:0}tr{break-inside:avoid}body{background:#fff}}
  </style></head><body><header class="head"><h1>Отчёт о коллизиях</h1><p>${e(t.name)}</p><div class="filters"><input id="search" type="search" placeholder="Поиск по отчёту"><select id="state"><option value="">Все состояния</option><option>В работе</option><option>Отработана</option><option>Исключена</option></select><select id="test"><option value="">Все проверки</option>${a}</select><button onclick="window.print()">Печать</button><span class="count" id="count"></span></div></header><div class="table-wrap"><table><thead><tr><th>№</th><th>Коллизия</th><th>Проверка</th><th>Состояние</th><th>Статус Navisworks</th><th>Группа / назначение</th><th>Комментарий</th><th>Координаты / расстояние</th><th>Снимок</th><th>Объекты модели</th></tr></thead><tbody id="rows">${i}</tbody></table></div><script>
  const search=document.querySelector('#search'),state=document.querySelector('#state'),test=document.querySelector('#test'),rows=[...document.querySelectorAll('#rows tr')],count=document.querySelector('#count');function apply(){const q=search.value.trim().toLowerCase();let shown=0;for(const row of rows){const visible=(!q||row.dataset.search.includes(q))&&(!state.value||row.dataset.state===state.value)&&(!test.value||row.dataset.test===test.value);row.hidden=!visible;if(visible)shown++}count.textContent='Показано: '+shown+' из '+rows.length}search.addEventListener('input',apply);state.addEventListener('change',apply);test.addEventListener('change',apply);apply();
  <\/script></body></html>`;
}
function Qe(t, e, o) {
  const i = URL.createObjectURL(new Blob([e], { type: o })), a = document.createElement("a");
  a.href = i, a.download = t, a.click(), setTimeout(() => URL.revokeObjectURL(i), 3e4);
}
const Ge = () => ({ radius: 2, navigationRadius: 15, scale: 1, offset: [0, 0, 0], labelMode: "selected", showStem: !0, stemWidth: 6, unreviewedColor: "#e1372d", reviewedColor: "#28b94b", selectedColor: "#f2c94c" });
function fe(t, e) {
  return t.point?.map((o, i) => o * e.scale + e.offset[i]);
}
function Ue(t) {
  if (!Number.isFinite(t.radius) || t.radius < 0.05 || !Number.isFinite(t.navigationRadius) || t.navigationRadius < 0.5 || !Number.isFinite(t.scale) || t.scale <= 0 || !t.offset.every(Number.isFinite)) throw Error("Размер знака и дистанция камеры должны быть положительными, смещения — конечными числами.");
  if (!Number.isFinite(t.stemWidth) || t.stemWidth < 1 || t.stemWidth > 30) throw Error("Толщина ножки должна быть от 1 до 30 пикселей.");
  if (!["selected", "all", "none"].includes(t.labelMode)) throw Error("Выбран неверный режим подписей.");
  if (![t.unreviewedColor, t.reviewedColor, t.selectedColor].every((e) => /^#[0-9a-f]{6}$/i.test(e))) throw Error("Цвет знака задан неверно.");
}
const Le = "nashepo.collision360.markers.v4", Ne = "nashepo.collision360.selected.v4", Oe = /* @__PURE__ */ new WeakMap();
function kt(t, e, o, i, a = 6, s) {
  const [l, n, h] = t, u = n - e * 0.12, p = h + e * 1.9, c = h + e * 5, g = e * 1.65, x = [];
  i && x.push({ type: "line", a: [l, n, h], b: [l, n, p + e * 0.08], color: s || o, width: a }), s && x.push({ type: "polyline", points: [[l - g - e * 0.34, n, p - e * 0.32], [l + g + e * 0.34, n, p - e * 0.32], [l, n, c + e * 0.38], [l - g - e * 0.34, n, p - e * 0.32]], color: s, fillColor: s, width: 2 }), x.push({ type: "polyline", points: [[l - g - e * 0.16, n, p - e * 0.14], [l + g + e * 0.16, n, p - e * 0.14], [l, n, c + e * 0.2], [l - g - e * 0.16, n, p - e * 0.14]], color: "#111111", fillColor: "#111111", width: 4 }), x.push({ type: "polyline", points: [[l - g + e * 0.15, n, p + e * 0.13], [l + g - e * 0.15, n, p + e * 0.13], [l, n, c - e * 0.18], [l - g + e * 0.15, n, p + e * 0.13]], color: o, fillColor: o, width: 2 });
  for (let y = 1; y <= 12; y++) {
    const C = y / 13, T = p + e * 0.13 + (c - p - e * 0.31) * C, L = (g - e * 0.15) * (1 - C) * 0.93;
    x.push({ type: "line", a: [l - L, n - e * 0.04, T], b: [l + L, n - e * 0.04, T], color: o, width: 12 });
  }
  const w = e * 0.13;
  x.push({ type: "polyline", points: [[l - w, u, h + e * 2.93], [l + w, u, h + e * 2.93], [l + w * 0.72, u, h + e * 4.13], [l - w * 0.72, u, h + e * 4.13], [l - w, u, h + e * 2.93]], color: "#ffffff", fillColor: "#ffffff", width: 2 });
  const k = e * 0.17;
  return x.push({ type: "polyline", points: [[l - k, u, h + e * 2.55], [l, u, h + e * 2.38], [l + k, u, h + e * 2.55], [l, u, h + e * 2.72], [l - k, u, h + e * 2.55]], color: "#ffffff", fillColor: "#ffffff", width: 2 }), x;
}
function zt(t, e, o, i, a, s, l, n = !1) {
  const h = fe(e, i), u = e.excluded ? "  [ИСКЛЮЧЕНА]" : e.reviewed ? "  [ОТРАБОТАНА]" : "", p = `#${o + 1}  ${e.name || "Коллизия"}${u}`, c = () => {
    a(e.id), rt(t, e, i);
  }, g = kt(h, i.radius, s, i.showStem, i.stemWidth, n ? i.selectedColor : void 0), x = [{ id: e.id, type: "shaped", shapes: g, activeShapes: g, activateCommand: c, dblCommand: c }];
  return l && x.push({ id: e.id + ":label", type: "simple", position: [h[0], h[1] - i.radius * 0.2, h[2] + i.radius * 5.35], attachment: "above", activateCommand: c, dblCommand: c, label: p, description: e.group || e.status || "Без статуса", labelColor: n ? "#171717" : "#ffffff", labelBackground: n ? i.selectedColor : s }), x;
}
function Pe(t, e, o, i, a, s, l, n, h = !1) {
  for (const u of zt(e, o, i, a, s, l, n, h)) t.add(u);
}
const We = (t, e) => t.excluded ? "#78818c" : t.reviewed ? e.reviewedColor : e.unreviewedColor;
function St(t, e) {
  return JSON.stringify({ clashes: t.map((o) => [o.id, o.enabled, o.reviewed, o.excluded, o.name, o.group, o.status, o.point]), settings: { ...e, labelMode: e.labelMode === "all" ? "all" : "none" } });
}
function At(t, e, o, i, a = "") {
  Ue(o);
  const s = t.cadview;
  if (!s) throw Error("Создайте или откройте проект Топоматик 360.");
  let l = s.annotations.get(Le);
  l || (l = s.annotations.create(Le, 1e3));
  const n = s.annotations.get(Ne);
  n && s.annotations.release(n);
  const h = s.annotations.create(Ne, 1e4), u = St(e, o);
  Oe.get(s)?.signature !== u && (l.clear(), e.forEach((w, k) => {
    if (!w.enabled || !fe(w, o)) return;
    const y = We(w, o);
    Pe(l, t, w, k, o, i, y, o.labelMode === "all");
  }));
  const p = e.findIndex((w) => w.id === a), c = e[p];
  c?.enabled && fe(c, o) && Pe(h, t, c, p, o, i, We(c, o), o.labelMode === "selected", !0), l.visible = !0, h.visible = !0, Oe.set(s, { signature: u }), s.invalidate();
  const g = e.filter((w) => w.enabled && fe(w, o)).length, x = e.filter((w) => !w.enabled).length;
  return `Показано знаков: ${g}. Отключено: ${x}. Без координат: ${e.length - g - x}.`;
}
function He(t) {
  const e = t.cadview;
  if (e) {
    for (const o of [Le, Ne]) {
      const i = e.annotations.get(o);
      i && e.annotations.release(i);
    }
    Oe.delete(e), e.invalidate();
  }
  return "Знаки скрыты.";
}
function rt(t, e, o) {
  Ue(o);
  const i = fe(e, o), a = t.cadview;
  if (!i) throw Error("В отчёте нет координат этой коллизии.");
  if (!a) throw Error("Откройте окно проекта Топоматик 360.");
  const s = o.navigationRadius, l = i, n = [1.35, -1.35, 0.8], h = Math.hypot(...n), u = [l[0] + n[0] / h * s, l[1] + n[1] / h * s, l[2] + n[2] / h * s], p = [l[0] - u[0], l[1] - u[1], l[2] - u[2]], c = Math.hypot(...p) || 1, g = [p[0] / c, p[1] / c, p[2] / c];
  return a.camera?.id !== "3d" && a.setCameraType("3d"), a.lookAt(u, g, [0, 0, 1], !0, i), `Переход к ${e.name} с дистанцией ${s} м.`;
}
const Ct = [
  { key: "system:number", label: "№", source: "Служебное" },
  { key: "system:enabled", label: "Показывать", source: "Служебное" },
  { key: "system:state", label: "Состояние работы", source: "Служебное" },
  { key: "system:reviewed", label: "Отработана", source: "Служебное" },
  { key: "system:excluded", label: "Исключена", source: "Служебное" },
  { key: "system:name", label: "Наименование конфликта", source: "Коллизия" },
  { key: "system:test", label: "Проверка", source: "Коллизия" },
  { key: "system:status", label: "Статус", source: "Коллизия" },
  { key: "system:group", label: "Группа", source: "Коллизия" },
  { key: "system:note", label: "Комментарий", source: "Коллизия" },
  { key: "system:point", label: "Точка конфликта", source: "Коллизия" },
  { key: "system:distance", label: "Расстояние", source: "Коллизия" },
  { key: "system:date", label: "Дата обнаружения", source: "Коллизия" },
  { key: "system:description", label: "Описание", source: "Коллизия" },
  { key: "e1:source", label: "Источник — элемент 1", source: "Элемент 1" },
  { key: "e1:name", label: "Имя — элемент 1", source: "Элемент 1" },
  { key: "e1:guid", label: "IFC GUID — элемент 1", source: "Элемент 1" },
  { key: "e1:id", label: "ID — элемент 1", source: "Элемент 1" },
  { key: "e2:source", label: "Источник — элемент 2", source: "Элемент 2" },
  { key: "e2:name", label: "Имя — элемент 2", source: "Элемент 2" },
  { key: "e2:guid", label: "IFC GUID — элемент 2", source: "Элемент 2" },
  { key: "e2:id", label: "ID — элемент 2", source: "Элемент 2" }
], ke = ["system:number", "system:state", "system:name", "system:test", "system:status", "system:group", "system:note", "e1:source", "e1:guid", "e2:source", "e2:guid"];
function ze(t) {
  const e = [...Ct], o = new Set(e.map((a) => a.key)), i = (a, s, l) => {
    o.has(a) || (o.add(a), e.push({ key: a, label: s, source: l }));
  };
  for (const { clash: a } of t) {
    for (const s of Object.keys(a.properties || {})) i(`clash:${s}`, s, "HTML · коллизия");
    a.elements.forEach((s, l) => {
      for (const n of Object.keys(s.properties || {})) i(`e${l + 1}:prop:${n}`, n, `HTML · элемент ${l + 1}`);
    });
  }
  return e;
}
function Xe(t, e) {
  const o = t.clash, i = {
    "system:number": String(t.number),
    "system:enabled": o.enabled ? "Да" : "Нет",
    "system:state": o.excluded ? "Исключена" : o.reviewed ? "Отработана" : "В работе",
    "system:reviewed": o.reviewed ? "Да" : "Нет",
    "system:excluded": o.excluded ? "Да" : "Нет",
    "system:name": o.name,
    "system:test": t.test,
    "system:status": o.status,
    "system:group": o.group,
    "system:note": o.note,
    "system:point": o.point?.map((s) => Number(s.toFixed(3))).join("; ") || "",
    "system:distance": o.distance,
    "system:date": o.date,
    "system:description": o.description,
    "e1:source": o.elements[0].source,
    "e1:name": o.elements[0].name,
    "e1:guid": o.elements[0].guid,
    "e1:id": o.elements[0].id,
    "e2:source": o.elements[1].source,
    "e2:name": o.elements[1].name,
    "e2:guid": o.elements[1].guid,
    "e2:id": o.elements[1].id
  };
  if (e in i) return i[e];
  if (e.startsWith("clash:")) return o.properties[e.slice(6)] || "";
  const a = /^e([12]):prop:(.*)$/.exec(e);
  return a && o.elements[Number(a[1]) - 1].properties[a[2]] || "";
}
function Se(t, e) {
  let o = 0;
  return t?.tests.flatMap((i) => i.clashes.map((a) => ({ clash: a, test: i.name, testId: i.id, number: ++o }))).filter((i) => !e.size || e.has(i.testId)) || [];
}
function Ae(t) {
  const e = t.map((o) => o.clash);
  return { total: e.length, remaining: e.filter((o) => !o.reviewed && !o.excluded).length, reviewed: e.filter((o) => o.reviewed && !o.excluded).length, excluded: e.filter((o) => o.excluded).length, disabled: e.filter((o) => !o.enabled).length };
}
function jt(t, e) {
  return e.size ? { ...structuredClone(t), tests: t.tests.map((o) => ({ ...structuredClone(o), clashes: o.clashes.filter((i) => e.has(i.id)).map((i) => structuredClone(i)) })).filter((o) => o.clashes.length > 0) } : structuredClone(t);
}
const Je = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAYAAACOEfKtAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAydpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDkuMS1jMDAzIDc5Ljk2OTBhODdmYywgMjAyNS8wMy8wNi0yMDo1MDoxNiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6RDZFQkU2NEQ4QUJDMTFGMUE5MjRBM0M2N0UyOTI4NDYiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6RDZFQkU2NEM4QUJDMTFGMUE5MjRBM0M2N0UyOTI4NDYiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIDI2LjExIChXaW5kb3dzKSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjRENDVBNjQzODQzRDExRjE5MkMwQ0YwNkU2ODQzQTZDIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjRENDVBNjQ0ODQzRDExRjE5MkMwQ0YwNkU2ODQzQTZDIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+pHX+ogAAD+lJREFUeNrs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";
var O = Uint8Array, ae = Uint16Array, Mt = Int32Array, st = new O([
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  0,
  1,
  1,
  1,
  1,
  2,
  2,
  2,
  2,
  3,
  3,
  3,
  3,
  4,
  4,
  4,
  4,
  5,
  5,
  5,
  5,
  0,
  /* unused */
  0,
  0,
  /* impossible */
  0
]), lt = new O([
  0,
  0,
  0,
  0,
  1,
  1,
  2,
  2,
  3,
  3,
  4,
  4,
  5,
  5,
  6,
  6,
  7,
  7,
  8,
  8,
  9,
  9,
  10,
  10,
  11,
  11,
  12,
  12,
  13,
  13,
  /* unused */
  0,
  0
]), $t = new O([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]), dt = function(t, e) {
  for (var o = new ae(31), i = 0; i < 31; ++i)
    o[i] = e += 1 << t[i - 1];
  for (var a = new Mt(o[30]), i = 1; i < 30; ++i)
    for (var s = o[i]; s < o[i + 1]; ++s)
      a[s] = s - o[i] << 5 | i;
  return { b: o, r: a };
}, ct = dt(st, 2), pt = ct.b, Et = ct.r;
pt[28] = 258, Et[258] = 28;
var Dt = dt(lt, 0), Lt = Dt.b, Re = new ae(32768);
for (var A = 0; A < 32768; ++A) {
  var J = (A & 43690) >> 1 | (A & 21845) << 1;
  J = (J & 52428) >> 2 | (J & 13107) << 2, J = (J & 61680) >> 4 | (J & 3855) << 4, Re[A] = ((J & 65280) >> 8 | (J & 255) << 8) >> 1;
}
var me = (function(t, e, o) {
  for (var i = t.length, a = 0, s = new ae(e); a < i; ++a)
    t[a] && ++s[t[a] - 1];
  var l = new ae(e);
  for (a = 1; a < e; ++a)
    l[a] = l[a - 1] + s[a - 1] << 1;
  var n;
  if (o) {
    n = new ae(1 << e);
    var h = 15 - e;
    for (a = 0; a < i; ++a)
      if (t[a])
        for (var u = a << 4 | t[a], p = e - t[a], c = l[t[a] - 1]++ << p, g = c | (1 << p) - 1; c <= g; ++c)
          n[Re[c] >> h] = u;
  } else
    for (n = new ae(i), a = 0; a < i; ++a)
      t[a] && (n[a] = Re[l[t[a] - 1]++] >> 15 - t[a]);
  return n;
}), ge = new O(288);
for (var A = 0; A < 144; ++A)
  ge[A] = 8;
for (var A = 144; A < 256; ++A)
  ge[A] = 9;
for (var A = 256; A < 280; ++A)
  ge[A] = 7;
for (var A = 280; A < 288; ++A)
  ge[A] = 8;
var ut = new O(32);
for (var A = 0; A < 32; ++A)
  ut[A] = 5;
var Nt = /* @__PURE__ */ me(ge, 9, 1), Ot = /* @__PURE__ */ me(ut, 5, 1), Ce = function(t) {
  for (var e = t[0], o = 1; o < t.length; ++o)
    t[o] > e && (e = t[o]);
  return e;
}, Z = function(t, e, o) {
  var i = e / 8 | 0;
  return (t[i] | t[i + 1] << 8) >> (e & 7) & o;
}, je = function(t, e) {
  var o = e / 8 | 0;
  return (t[o] | t[o + 1] << 8 | t[o + 2] << 16) >> (e & 7);
}, Rt = function(t) {
  return (t + 7) / 8 | 0;
}, Be = function(t, e, o) {
  return (e == null || e < 0) && (e = 0), (o == null || o > t.length) && (o = t.length), new O(t.subarray(e, o));
}, It = [
  "unexpected EOF",
  "invalid block type",
  "invalid length/literal",
  "invalid distance",
  "stream finished",
  "no stream handler",
  ,
  "no callback",
  "invalid UTF-8 data",
  "extra field too long",
  "date not in range 1980-2099",
  "filename too long",
  "stream finishing",
  "invalid zip data"
  // determined by unknown compression method
], I = function(t, e, o) {
  var i = new Error(e || It[t]);
  if (i.code = t, Error.captureStackTrace && Error.captureStackTrace(i, I), !o)
    throw i;
  return i;
}, Tt = function(t, e, o, i) {
  var a = t.length, s = i ? i.length : 0;
  if (!a || e.f && !e.l)
    return o || new O(0);
  var l = !o, n = l || e.i != 2, h = e.i;
  l && (o = new O(a * 3));
  var u = function(xe) {
    var we = o.length;
    if (xe > we) {
      var pe = new O(Math.max(we * 2, xe));
      pe.set(o), o = pe;
    }
  }, p = e.f || 0, c = e.p || 0, g = e.b || 0, x = e.l, w = e.d, k = e.m, y = e.n, C = a * 8;
  do {
    if (!x) {
      p = Z(t, c, 1);
      var T = Z(t, c + 1, 3);
      if (c += 3, T)
        if (T == 1)
          x = Nt, w = Ot, k = 9, y = 5;
        else if (T == 2) {
          var B = Z(t, c, 31) + 257, F = Z(t, c + 10, 15) + 4, Q = B + Z(t, c + 5, 31) + 1;
          c += 14;
          for (var E = new O(Q), K = new O(19), j = 0; j < F; ++j)
            K[$t[j]] = Z(t, c + j * 3, 7);
          c += F * 3;
          for (var re = Ce(K), _ = (1 << re) - 1, R = me(K, re, 1), j = 0; j < Q; ) {
            var se = R[Z(t, c, _)];
            c += se & 15;
            var L = se >> 4;
            if (L < 16)
              E[j++] = L;
            else {
              var H = 0, te = 0;
              for (L == 16 ? (te = 3 + Z(t, c, 3), c += 2, H = E[j - 1]) : L == 17 ? (te = 3 + Z(t, c, 7), c += 3) : L == 18 && (te = 11 + Z(t, c, 127), c += 7); te--; )
                E[j++] = H;
            }
          }
          var oe = E.subarray(0, B), N = E.subarray(B);
          k = Ce(oe), y = Ce(N), x = me(oe, k, 1), w = me(N, y, 1);
        } else
          I(1);
      else {
        var L = Rt(c) + 4, W = t[L - 4] | t[L - 3] << 8, $ = L + W;
        if ($ > a) {
          h && I(0);
          break;
        }
        n && u(g + W), o.set(t.subarray(L, $), g), e.b = g += W, e.p = c = $ * 8, e.f = p;
        continue;
      }
      if (c > C) {
        h && I(0);
        break;
      }
    }
    n && u(g + 131072);
    for (var he = (1 << k) - 1, M = (1 << y) - 1, G = c; ; G = c) {
      var H = x[je(t, c) & he], Y = H >> 4;
      if (c += H & 15, c > C) {
        h && I(0);
        break;
      }
      if (H || I(2), Y < 256)
        o[g++] = Y;
      else if (Y == 256) {
        G = c, x = null;
        break;
      } else {
        var be = Y - 254;
        if (Y > 264) {
          var j = Y - 257, P = st[j];
          be = Z(t, c, (1 << P) - 1) + pt[j], c += P;
        }
        var le = w[je(t, c) & M], de = le >> 4;
        le || I(3), c += le & 15;
        var N = Lt[de];
        if (de > 3) {
          var P = lt[de];
          N += je(t, c) & (1 << P) - 1, c += P;
        }
        if (c > C) {
          h && I(0);
          break;
        }
        n && u(g + 131072);
        var ce = g + be;
        if (g < N) {
          var ne = s - N, ee = Math.min(N, ce);
          for (ne + g < 0 && I(3); g < ee; ++g)
            o[g] = i[ne + g];
        }
        for (; g < ce; ++g)
          o[g] = o[g - N];
      }
    }
    e.l = x, e.p = G, e.b = g, e.f = p, x && (p = 1, e.m = k, e.d = w, e.n = y);
  } while (!p);
  return g != o.length && l ? Be(o, 0, g) : o.subarray(0, g);
}, Yt = /* @__PURE__ */ new O(0), q = function(t, e) {
  return t[e] | t[e + 1] << 8;
}, U = function(t, e) {
  return (t[e] | t[e + 1] << 8 | t[e + 2] << 16 | t[e + 3] << 24) >>> 0;
}, Me = function(t, e) {
  return U(t, e) + U(t, e + 4) * 4294967296;
};
function Zt(t, e) {
  return Tt(t, { i: 2 }, e && e.out, e && e.dictionary);
}
var Ie = typeof TextDecoder < "u" && /* @__PURE__ */ new TextDecoder(), Ut = 0;
try {
  Ie.decode(Yt, { stream: !0 }), Ut = 1;
} catch {
}
var Bt = function(t) {
  for (var e = "", o = 0; ; ) {
    var i = t[o++], a = (i > 127) + (i > 223) + (i > 239);
    if (o + a > t.length)
      return { s: e, r: Be(t, o - 1) };
    a ? a == 3 ? (i = ((i & 15) << 18 | (t[o++] & 63) << 12 | (t[o++] & 63) << 6 | t[o++] & 63) - 65536, e += String.fromCharCode(55296 | i >> 10, 56320 | i & 1023)) : a & 1 ? e += String.fromCharCode((i & 31) << 6 | t[o++] & 63) : e += String.fromCharCode((i & 15) << 12 | (t[o++] & 63) << 6 | t[o++] & 63) : e += String.fromCharCode(i);
  }
};
function Ft(t, e) {
  if (e) {
    for (var o = "", i = 0; i < t.length; i += 16384)
      o += String.fromCharCode.apply(null, t.subarray(i, i + 16384));
    return o;
  } else {
    if (Ie)
      return Ie.decode(t);
    var a = Bt(t), s = a.s, o = a.r;
    return o.length && I(8), s;
  }
}
var qt = function(t, e) {
  return e + 30 + q(t, e + 26) + q(t, e + 28);
}, Qt = function(t, e, o) {
  var i = q(t, e + 28), a = Ft(t.subarray(e + 46, e + 46 + i), !(q(t, e + 8) & 2048)), s = e + 46 + i, l = U(t, e + 20), n = o && l == 4294967295 ? Gt(t, s) : [l, U(t, e + 24), U(t, e + 42)], h = n[0], u = n[1], p = n[2];
  return [q(t, e + 10), h, u, a, s + q(t, e + 30) + q(t, e + 32), p];
}, Gt = function(t, e) {
  for (; q(t, e) != 1; e += 4 + q(t, e + 2))
    ;
  return [Me(t, e + 12), Me(t, e + 4), Me(t, e + 20)];
};
function Pt(t, e) {
  for (var o = {}, i = t.length - 22; U(t, i) != 101010256; --i)
    (!i || t.length - i > 65558) && I(13);
  var a = q(t, i + 8);
  if (!a)
    return {};
  var s = U(t, i + 16), l = s == 4294967295 || a == 65535;
  if (l) {
    var n = U(t, i - 12);
    l = U(t, n) == 101075792, l && (a = U(t, n + 32), s = U(t, n + 48));
  }
  for (var h = e && e.filter, u = 0; u < a; ++u) {
    var p = Qt(t, s, l), c = p[0], g = p[1], x = p[2], w = p[3], k = p[4], y = p[5], C = qt(t, y);
    s = k, (!h || h({
      name: w,
      size: g,
      originalSize: x,
      compression: c
    })) && (c ? c == 8 ? o[w] = Zt(t.subarray(C, C + g), { out: new O(x) }) : I(14, "unknown compression type " + c) : o[w] = Be(t, C, C + g));
  }
  return o;
}
const Wt = /\.(?:html?|xml|json|jpe?g|png|webp)$/i;
function Ht(t) {
  const e = Pt(new Uint8Array(t), {
    filter: (i) => Wt.test(i.name) && i.originalSize <= 104857600
  }), o = Object.entries(e).map(([i, a]) => ({ name: Jt(i), data: a })).filter((i) => i.name);
  if (o.length > 5e3) throw Error("В архиве слишком много файлов.");
  if (o.reduce((i, a) => i + a.data.length, 0) > 300 * 1024 * 1024) throw Error("Распакованные данные превышают 300 МБ.");
  return o;
}
const $e = (t) => new TextDecoder().decode(t.data);
async function Xt(t) {
  const e = t.name.split(".").pop()?.toLowerCase(), o = e === "png" ? "image/png" : e === "webp" ? "image/webp" : "image/jpeg", i = t.data.buffer.slice(t.data.byteOffset, t.data.byteOffset + t.data.byteLength);
  return await new Promise((a, s) => {
    const l = new FileReader();
    l.onload = () => a(l.result), l.onerror = () => s(l.error), l.readAsDataURL(new Blob([i], { type: o }));
  });
}
function Jt(t) {
  const e = t.replace(/\\/g, "/").split("/").filter(Boolean);
  if (e.includes("..")) throw Error("Архив содержит небезопасный путь.");
  return e.join("/");
}
async function Vt(t) {
  const e = Ht(t), o = e.find((n) => n.name.toLowerCase() === "manifest.json");
  let i = "review.json", a = "";
  if (o) {
    const n = JSON.parse($e(o));
    if (n?.format !== "nashepo.clash-package" || n.version !== 1) throw Error("Неподдерживаемый пакет коллизий.");
    i = String(n.files?.review || i), a = String(n.files?.report || "");
  }
  const s = Te(e, i);
  let l;
  if (s) l = it($e(s));
  else {
    const n = Te(e, a) || e.find((h) => /\.(html?|xml)$/i.test(h.name));
    if (!n) throw Error("В архиве не найден отчёт или review.json.");
    l = nt($e(n), n.name);
  }
  return await Kt(l, e), l;
}
function Te(t, e) {
  const o = ie(e);
  return t.find((i) => ie(i.name) === o) || t.find((i) => ie(i.name).endsWith("/" + o));
}
async function Kt(t, e) {
  for (const o of new Set(t.tests.flatMap((i) => i.clashes.map((a) => a.image)).filter(Boolean))) {
    const i = Te(e, o);
    i && /\.(jpe?g|png|webp)$/i.test(i.name) && (t.images[o] = await Xt(i));
  }
}
const Ee = "nashepo:clash-scene-owner";
function _t(t, e, o) {
  const i = crypto.randomUUID();
  let a = !1, s = !1;
  const l = () => {
    s && (s = !1, o());
  }, n = () => {
    !a || s || (window.dispatchEvent(new CustomEvent(Ee, { detail: i })), s = !0, e());
  }, h = () => {
    const g = t.isConnected && t.getClientRects().length > 0 && getComputedStyle(t).visibility !== "hidden";
    g !== a && (a = g, g ? n() : l());
  }, u = (g) => {
    g.detail !== i && l();
  };
  window.addEventListener(Ee, u), t.addEventListener("pointerdown", n);
  const p = new ResizeObserver(h);
  p.observe(t);
  const c = window.setInterval(h, 200);
  return h(), () => {
    p.disconnect(), clearInterval(c), window.removeEventListener(Ee, u), t.removeEventListener("pointerdown", n), l();
  };
}
const eo = ":host{display:block;width:100%;height:100%;min-height:240px;color:#24334a;font:12px/1.35 Segoe UI,Arial,sans-serif;container-type:size}*{box-sizing:border-box}button,input,select,textarea{font:inherit}button{cursor:pointer;border:1px solid #d7dfe9;background:#fff;color:#33445b;padding:6px 9px;border-radius:6px;white-space:nowrap}button:hover{background:#edf3fa}button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:2px solid #427ad6;outline-offset:1px}button:disabled{opacity:.4;cursor:default}.primary{background:#2465ba;color:#fff;border-color:#2465ba}.primary:hover{background:#1d5197}input,select,textarea{border:1px solid #d7dfe9;padding:6px 7px;border-radius:5px;min-width:0;background:#fff;color:#24334a}textarea{resize:vertical}label{display:flex;flex-direction:column;gap:3px;color:#62728a;font-size:10px}h1,h2,h3,p{margin:0}h1{font-size:16px;line-height:1}h2{font-size:11px}small{font-size:9px;color:#7b899b}.app{height:100%;min-height:240px;background:#f5f7fa;display:flex;flex-direction:column;overflow:hidden}header{min-height:50px;background:#fff;padding:7px 12px;border-bottom:1px solid #dfe5ed;display:flex;align-items:center;gap:12px}.brand{display:flex;align-items:center;gap:7px;flex:0 0 auto}.brand small{letter-spacing:.9px;font-size:7px;font-weight:700}.brand-icon{width:28px;height:30px;display:grid;place-items:center;background:#2465ba;color:#fff;font-size:22px;font-weight:800;border-radius:7px}.version{color:#7c8a9a;font-size:8px}.toolbar{display:flex;gap:5px;flex-wrap:nowrap}.toolbar button{font-size:10px;padding:6px 8px}.notice{margin-left:auto;max-width:300px;font-size:9px;color:#66778f;text-align:right;overflow-wrap:anywhere}.notice.error{color:#b52c31;background:#fff1f0;padding:5px;border-radius:4px}#save-state{position:absolute;right:10px;bottom:3px}.workspace{display:grid;grid-template-columns:minmax(190px,15%) minmax(420px,1fr) minmax(360px,29%);flex:1;min-height:0;overflow:hidden}aside{padding:9px;border-right:1px solid #dfe5ed;background:#f8fafc;overflow:auto}.report-block{display:grid;grid-template-columns:1fr auto;gap:7px;align-items:end;margin-bottom:7px}.report-block label{margin:0}.summary{min-width:95px}.summary strong{font-size:20px;line-height:1;color:#243f64;margin-right:4px}.summary span{font-size:8px;color:#6e7e92}.summary div{font-size:8px;color:#8190a3;margin-top:3px}aside h2{display:flex;justify-content:space-between;margin:4px 2px}nav{max-height:calc(100% - 92px);overflow:auto;margin:0 -3px}nav button{display:flex;text-align:left;justify-content:space-between;width:100%;gap:6px;border:0;background:transparent;font-size:10px;padding:5px 6px;margin-bottom:1px}nav button.active{background:#e4edfa;color:#245d9f}nav b{font-size:8px;background:#eaf0f6;border-radius:4px;padding:1px 4px;height:14px}nav button span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.settings{border-top:1px solid #dde5ef;padding-top:7px;margin-top:7px;font-size:10px}.settings summary{cursor:pointer;font-weight:600;color:#40536b}.settings-grid{display:grid;grid-template-columns:repeat(2,minmax(75px,1fr));gap:6px;margin-top:7px}.settings-grid .check{grid-column:span 2;flex-direction:row;align-items:center}.settings-grid input[type=color]{height:29px;width:100%;padding:2px}.settings p{font-size:8px;color:#8894a5;margin-top:6px}.results{background:#fff;min-width:0;border-right:1px solid #dfe5ed;display:flex;flex-direction:column;overflow:hidden}.filters{display:grid;grid-template-columns:minmax(160px,1fr) 115px 115px auto auto;gap:5px;padding:7px 8px;border-bottom:1px solid #e7ecf2}.filters input,.filters select{font-size:10px}.list-head{display:flex;justify-content:space-between;align-items:center;padding:5px 9px;color:#71839a;font-size:9px}.legend{display:flex;gap:4px;align-items:center;font-size:8px;color:#7d8a9c}.legend i{width:6px;height:6px;background:#e53935;border-radius:50%}.legend i.green{background:#20a36b;margin-left:7px}.list{min-height:0;overflow:auto;flex:1}.clash{display:flex;width:100%;align-items:center;gap:7px;border:0;border-bottom:1px solid #edf0f4;border-radius:0;text-align:left;padding:7px 9px}.clash.selected{background:#eff5ff;border-left:3px solid #397bd2;padding-left:6px}.clash-sign{flex-shrink:0;display:grid;place-items:center;width:20px;height:22px;border-radius:5px;background:#ffebea;color:#d93434;font-size:15px;font-weight:700}.clash-sign.reviewed{background:#e4f4ed;color:#28946c;font-size:11px}.clash-text{min-width:0;display:flex;flex-direction:column;gap:1px;flex:1}.clash-text strong{font-size:10px;font-weight:600}.clash-text small{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:8px}.badge{color:#6782a6;background:#edf2f8;border-radius:4px;padding:2px 5px;font-size:8px;max-width:75px;overflow:hidden;text-overflow:ellipsis}.pager{display:flex;gap:10px;justify-content:center;align-items:center;padding:4px;color:#7b8da3;font-size:9px;border-top:1px solid #edf0f4}.pager button{padding:2px 8px}.detail{padding:8px;background:#fff;min-width:0;overflow:auto;display:grid;grid-template-columns:minmax(130px,42%) minmax(160px,1fr);gap:6px 9px;align-content:start}.detail-title{grid-column:1/-1}.detail-title small{letter-spacing:1px;font-size:7px}.detail-title h2{font-size:14px;margin:1px 0}.detail-title span{font-size:9px;color:#8390a0}.snapshot{grid-column:1;grid-row:2/7;border-radius:6px;background:#f2f5f9;border:1px solid #e7edf4;min-height:125px;display:grid;place-items:center;overflow:hidden}.snapshot img{width:100%;height:100%;max-height:190px;object-fit:contain}.snapshot>div{padding:10px;text-align:center;font-size:8px;color:#8795a7;overflow-wrap:anywhere}.snapshot p{margin:4px 0}.detail-actions{grid-column:2;display:flex;gap:4px;flex-wrap:wrap}.detail-actions button{font-size:9px;padding:5px 6px}.coords{grid-column:2;display:grid;grid-template-columns:repeat(3,1fr);padding:6px;border:1px solid #e1e7ef;border-radius:6px}.coords div{display:flex;flex-direction:column;gap:2px;padding:0 3px}.coords b{font:9px Consolas,monospace}.meta{grid-column:2;display:flex;justify-content:space-between;color:#8390a2;font-size:8px}.detail>.review-check{grid-column:2;flex-direction:row;align-items:center;color:#334b65;gap:5px}.detail>label:not(.review-check){grid-column:2}.detail textarea{min-height:36px}.element{grid-column:1/-1;border-top:1px solid #e5eaf0;padding:6px 0}.element summary{font-weight:600;font-size:9px;cursor:pointer}.element dl{font-size:8px;display:grid;grid-template-columns:minmax(65px,.55fr) 1fr;gap:4px;margin:6px 0}.element dt{color:#8a96a5}.element dd{margin:0;overflow-wrap:anywhere}.empty{grid-column:1/-1;text-align:center;padding:35px 14px;color:#98a4b3}.empty>span{display:inline-grid;place-items:center;background:#f1f5fa;border-radius:9px;width:36px;height:36px;font-size:20px;color:#9eb0c6;margin-bottom:8px}.empty h3{font-size:11px;color:#6b7f98;margin-bottom:4px}.empty p{font-size:9px;max-width:260px;margin:auto}footer{height:22px;display:flex;gap:15px;justify-content:space-between;padding:4px 10px;border-top:1px solid #e0e6ed;color:#91a0b3;font-size:8px}footer span{text-align:right}@container (max-width:1050px){.workspace{grid-template-columns:180px minmax(350px,1fr) minmax(310px,34%)}.filters{grid-template-columns:1fr 95px 95px}.filters #show,.filters #hide{grid-row:2}.notice{display:none}}@container (max-width:780px){header{overflow-x:auto}.workspace{grid-template-columns:165px minmax(340px,1fr)}.detail{display:none}.results{border-right:0}.toolbar button{padding:5px}.brand small,.version{display:none}}@container (max-height:360px){header{min-height:40px;padding:4px 8px}.brand-icon{width:24px;height:25px;font-size:18px}h1{font-size:13px}.workspace{grid-template-columns:minmax(175px,14%) minmax(400px,1fr) minmax(330px,28%)}footer{display:none}.filters{padding:4px 6px}.list-head{padding:3px 7px}.clash{padding-top:5px;padding-bottom:5px}.detail{padding:5px}.snapshot{min-height:90px}.snapshot img{max-height:135px}}:host{overflow:hidden}header{position:relative}aside{display:flex;flex-direction:column;overflow:hidden}.report-block{order:1;flex:0 0 auto}.settings{order:2;flex:0 0 auto;max-height:180px;overflow:auto;margin:0 0 7px}aside h2{order:3;flex:0 0 auto}nav{order:4;flex:1 1 auto;min-height:50px;max-height:none}@container (max-height:360px){.settings{max-height:135px}}.filters{grid-template-columns:minmax(150px,1fr) 105px 110px 108px auto auto}.grid-wrap{min-height:0;overflow:auto;flex:1}.data-grid{border-collapse:separate;border-spacing:0;min-width:100%;width:max-content;font-size:9px}.data-grid th{position:sticky;top:0;z-index:2;background:#eef3f8;color:#53677f;text-align:left;font-weight:600;border-bottom:1px solid #d9e1eb;padding:6px 8px;max-width:260px;white-space:nowrap}.data-grid td{height:29px;padding:5px 8px;border-bottom:1px solid #edf0f4;max-width:260px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:#fff}.data-grid tr{cursor:pointer}.data-grid tr:hover td{background:#f4f8fd}.data-grid tr.selected td{background:#e8f1ff;border-bottom-color:#cbdcf3}.data-grid tr.selected td:first-child{box-shadow:inset 3px 0 #397bd2}.data-grid tr.reviewed td{color:#27805f;background:#f1faf6}.data-grid tr.disabled td{color:#8c98a7;background:#f1f3f5;text-decoration:line-through}.legend i.gray{background:#96a0ac;margin-left:7px}.state-row{grid-column:2;display:flex;gap:12px;align-items:center}.state-row .review-check{flex-direction:row;align-items:center;color:#334b65}.state-row .worked{color:#21845e;font-weight:600}.columns-dialog{width:min(920px,92vw);height:min(680px,82vh);border:0;border-radius:10px;padding:0;color:#24334a;box-shadow:0 18px 60px #0006}.columns-dialog::backdrop{background:#17233399}.dialog-title{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid #dfe5ed}.dialog-title h2{font-size:17px}.dialog-title button{border:0;font-size:22px}.column-options{display:flex;gap:9px;align-items:center;padding:10px 14px;background:#f6f8fb;border-bottom:1px solid #e2e7ee}.column-options .check{flex-direction:row;align-items:center;font-size:11px}.column-table-wrap{height:calc(100% - 145px);overflow:auto}.column-table{width:100%;border-collapse:collapse;font-size:11px}.column-table th{position:sticky;top:0;background:#edf2f7;text-align:left;padding:7px;border-bottom:1px solid #d8e0e9}.column-table td{padding:5px 7px;border-bottom:1px solid #edf0f4}.column-table td:first-child{width:85px;text-align:center}.column-table td:nth-child(2){width:45%}.column-table input[type=text],.column-table input:not([type]){width:100%}.column-table button{padding:3px 8px}.columns-dialog>p{padding:8px 14px;color:#718197;font-size:10px}@container (max-width:1050px){.filters{grid-template-columns:1fr 95px 100px 100px}.filters #show,.filters #hide{grid-row:2}}@container (max-height:360px){.data-grid td{height:25px;padding:3px 6px}.data-grid th{padding:4px 6px}.columns-dialog{height:92vh}}.settings-dialog[open]{display:flex;flex-direction:column}.settings-tabs{display:flex;gap:6px;padding:9px 14px;border-bottom:1px solid #e2e7ee;background:#f6f8fb}.settings-tabs button.active{background:#2465ba;border-color:#2465ba;color:#fff}.settings-page{min-height:0;overflow:auto;padding:18px}.marker-settings-page .settings-grid{grid-template-columns:repeat(3,minmax(150px,1fr));max-width:760px;gap:14px}.marker-settings-page .settings-grid .check{grid-column:1/-1}.marker-settings-page input[type=color]{width:100%;height:34px;padding:2px}.settings-note{padding:10px 0 0;color:#718197;font-size:11px}.columns-page:not([hidden]){display:flex;flex:1;flex-direction:column;padding:0}.columns-page .column-table-wrap{flex:1;height:auto}.columns-page .settings-note{padding:8px 14px}@container (max-width:700px){.marker-settings-page .settings-grid{grid-template-columns:repeat(2,minmax(120px,1fr))}}", to = ":host{color:#d8dee8;color-scheme:dark}button{border-color:#46515f;background:#2c333d;color:#e6ebf2}button:hover{background:#3a4552}button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline-color:#f2c94c}.primary{background:#2869bc;border-color:#3479cf;color:#fff}.primary:hover{background:#3479cf}input,select,textarea{border-color:#46515f;background:#20262e;color:#edf1f7}label{color:#aab5c3}small{color:#929eae}.app{background:#171b21}header{background:#20252d;border-bottom-color:#3c4653}.brand-icon{background:#3479cf}.version,.notice{color:#929eae}.notice.error{color:#ffaca8;background:#572b2d}aside{background:#1c2229;border-right-color:#3c4653}.summary strong{color:#f0f3f8}.summary span,.summary div{color:#98a4b3}nav button{color:#cdd5df}nav button:hover{background:#2d3743}nav button.active{background:#35485f;color:#f4ca4d}nav b{background:#303946;color:#cbd3de}.settings{border-top-color:#3c4653}.settings summary{color:#d5dce5}.settings p{color:#929eae}.results,.detail{background:#181d23;border-color:#3c4653}.filters,.pager,footer{border-color:#3c4653}.list-head,.legend,.pager{color:#929eae}.data-grid th{background:#252c35;color:#c3ccd8;border-bottom-color:#46515f}.data-grid td{background:#1b2027;color:#d7dde6;border-bottom-color:#303944}.data-grid tr:hover td{background:#29323d}.data-grid tr.selected td{background:#4b4326;color:#fff3bd;border-bottom-color:#736331}.data-grid tr.selected td:first-child{box-shadow:inset 3px 0 #f2c94c}.data-grid tr.reviewed td{color:#76d6a6;background:#1d3029}.data-grid tr.reviewed.selected td{color:#fff3bd;background:#4b4326}.data-grid tr.excluded td{color:#9aa4b1;background:#242930}.data-grid tr.excluded td:not(:first-child){text-decoration:line-through}.data-grid tr.disabled td{color:#77828f;background:#20252b}.detail-title span,.meta,.element dt{color:#929eae}.snapshot{background:#11151a;border-color:#3c4653}.snapshot>div{color:#929eae}.coords{border-color:#46515f;background:#20262e}.detail>.review-check,.state-row .review-check{color:#cfd6df}.element{border-top-color:#3c4653}.empty{color:#84909f}.empty>span{background:#252d36;color:#aeb9c7}.empty h3{color:#c9d2dd}.columns-dialog{background:#20262e;color:#dce3ec;box-shadow:0 18px 60px #000c}.columns-dialog::backdrop{background:#080b0dcc}.dialog-title{border-bottom-color:#46515f}.dialog-title button{background:transparent}.column-options{background:#191e25;border-bottom-color:#46515f}.column-table th{background:#29313b;color:#d7dee7;border-bottom-color:#46515f}.column-table td{background:#20262e;border-bottom-color:#38424e}.columns-dialog>p{color:#9aa6b6}[hidden]{display:none!important}:host{font-size:13px;line-height:1.4}button,input,select,textarea{font-size:12px}label{font-size:11px}small{font-size:10px}header{min-height:54px;padding:7px 12px}.brand{min-width:132px;gap:8px}.brand img{width:34px;height:34px;object-fit:contain;border-radius:7px}.brand strong{color:#f3f6fa;font-size:16px;letter-spacing:.15px}.brand .version{font-size:9px}.toolbar button{font-size:11px;padding:7px 9px}.toolbar{align-items:center}.toolbar-report{flex-direction:row;align-items:center;gap:6px;white-space:nowrap}.toolbar-report select{width:170px;padding:6px 7px}.notice{font-size:10px}.workspace{grid-template-columns:minmax(220px,16%) minmax(500px,1fr) minmax(390px,29%)}.summary span,.summary div,.summary small{font-size:10px}.summary div b{color:#f4ca4d}.settings summary,aside h2{font-size:12px}.settings p{font-size:10px}#tests{display:flex;flex-direction:column;gap:2px}.summary{order:1;flex:0 0 auto;margin-bottom:5px}.settings{order:2}.test-heading{order:3;display:flex;flex-direction:column;gap:4px;margin:1px 0 7px}.test-heading h2{display:flex;justify-content:space-between;margin:0 2px}.test-search{width:100%;margin:0}#tests{order:4}.test-item{display:grid;grid-template-columns:18px minmax(0,1fr) auto;align-items:center;gap:6px;width:100%;padding:7px 6px;border-radius:6px;color:#cdd5df;cursor:pointer}.test-item:hover{background:#2d3743}.test-item.active{background:#35485f;color:#f4ca4d}.test-item input{margin:0;accent-color:#f2c94c}.test-item span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px}.test-item span small{display:block;color:#929eae;font-size:9px}.test-item b{min-width:25px;padding:2px 5px;border-radius:5px;background:#303946;color:#cbd3de;text-align:center;font-size:10px}.filters{grid-template-columns:minmax(190px,1fr) 125px 125px 125px auto;align-items:center}.marker-toggle{min-width:142px;border-color:#5b6674}.marker-toggle.on{background:#1f6348;border-color:#2b9668;color:#eafff5}.bulk{display:flex;align-items:center;gap:6px;min-height:40px;padding:6px 9px;border-bottom:1px solid #46515f;background:#262f39;overflow-x:auto}.bulk strong{color:#f4ca4d;white-space:nowrap;margin-right:4px}.bulk button{padding:5px 8px}#clear-selection{margin-left:auto;font-size:18px;padding:1px 8px}.list-head{font-size:11px}.legend{font-size:10px}.data-grid{font-size:12px}.data-grid th{padding:7px 8px;font-size:12px;max-width:none;white-space:normal;line-height:1.25;vertical-align:bottom}.data-grid td{height:34px;padding:6px 8px;max-width:360px;min-width:80px;white-space:normal;overflow:visible;text-overflow:clip;overflow-wrap:anywhere;-webkit-user-select:text;user-select:text;cursor:text}.data-grid tr{cursor:default}.data-grid td:nth-child(2){min-width:46px}.select-cell{min-width:38px!important;width:38px;max-width:38px!important;text-align:center!important}.select-cell input{width:16px;height:16px;margin:0;accent-color:#f2c94c}.data-grid tr.selected td:nth-child(2){box-shadow:inset 3px 0 #f2c94c}.data-grid tr.selected td:first-child{box-shadow:none}.pager{font-size:11px}.detail-title small{font-size:9px}.detail-title h2{font-size:16px}.detail-title span{font-size:11px}.detail{grid-template-columns:minmax(145px,42%) minmax(180px,1fr)}.snapshot{grid-column:1;grid-row:1;min-height:145px;align-self:start}.detail-controls{grid-column:2;grid-row:1 / span 2;display:flex;flex-direction:column;gap:6px;min-width:0}.detail-title{grid-column:1;grid-row:2;padding:3px 2px 8px;align-self:start}.detail-controls .coords,.detail-controls .state-row,.detail-controls .work-actions,.detail-controls>label{grid-column:auto;width:100%}.detail-controls .work-actions{display:flex}.detail-actions button{font-size:11px}.snapshot-button{position:relative;padding:0;color:#fff;cursor:zoom-in}.snapshot-button:hover{background:#11151a}.snapshot-button span{position:absolute;left:8px;bottom:8px;padding:4px 7px;border-radius:5px;background:#111c;font-size:10px;pointer-events:none}.coords b{font-size:10px}.state-row .review-check,.detail>label{font-size:11px}.work-state{margin-left:auto;padding:3px 8px;border-radius:999px;font-size:10px}.work-state.work{color:#f4ca4d;background:#4b4326}.work-state.done{color:#76d6a6;background:#1d3029}.work-state.excluded{color:#c2c8d0;background:#343b44}.work-actions{grid-column:2;display:flex;gap:5px;flex-wrap:wrap}.work-actions button{padding:5px 7px;font-size:10px}.work-actions button.active{border-color:#f2c94c;color:#fff3bd;background:#4b4326}.work-actions button.active.danger{border-color:#bd7478;color:#ffd9dc;background:#522f33}.element summary{font-size:11px}.element dl{font-size:10px}.empty h3{font-size:15px}.empty p{font-size:12px}.welcome{display:flex;height:100%;min-height:210px;flex-direction:column;justify-content:center;align-items:center;gap:8px}.welcome img{width:58px;height:58px;object-fit:contain}.welcome button{margin-top:6px}.help-dialog{width:min(760px,90vw);height:auto;max-height:82vh}.help-content{padding:15px 18px 20px;overflow:auto;font-size:13px}.help-content h3{margin:14px 0 4px;color:#f0f3f8;font-size:14px}.help-content h3:first-child{margin-top:0}.help-content p{color:#bac4d0}.help-content dl{display:grid;grid-template-columns:155px 1fr;gap:8px 12px;margin:10px 0 0}.help-content dt{color:#f4ca4d;font-weight:600}.help-content dd{margin:0;color:#bac4d0}.developer-links{display:flex;flex-wrap:wrap;gap:10px}.developer-links a{padding:7px 11px;border:1px solid #546171;border-radius:6px;color:#f4ca4d;text-decoration:none}.developer-links a:hover{background:#2a323d;border-color:#f4ca4d}footer{height:25px;font-size:10px}.settings-tabs{background:#191e25;border-bottom-color:#46515f}.settings-tabs button.active{background:#4b4326;border-color:#f2c94c;color:#fff3bd}.settings-note{color:#9aa6b6}@container (max-width: 1100px){.workspace{grid-template-columns:200px minmax(430px,1fr) minmax(340px,32%)}.filters{grid-template-columns:minmax(180px,1fr) 110px 110px}.marker-toggle{grid-column:2 / 4}}", oo = "0.5.8";
async function no(t, e) {
  const o = "nashepo.collision360.marker-settings.v4", i = "nashepo.collision360.table-settings.v2", a = T(), s = L(), l = t.attachShadow ? t.shadowRoot || t.attachShadow({ mode: "open" }) : t;
  l.innerHTML = `<style>${eo}${to}</style><main class="app">
    <header>
      <div class="brand"><img src="${Je}" alt=""><strong>НашеПО</strong><span class="version">${oo}</span></div>
      <div class="toolbar"><button class="primary" id="import">＋ Открыть отчёт</button><label class="toolbar-report">Отчёт<select id="reports" aria-label="Текущий отчёт"></select></label><button id="folder" title="Подключить папку со снимками отчёта">Снимки</button><button id="settings">⚙ Настройки</button><button id="open-session" title="Продолжить работу из файла сессии">Открыть сессию</button><button id="session" title="Сохранить текущую работу в переносимый файл">Сохранить сессию</button><button id="export" title="Отчёт для передачи и печати">Сформировать отчёт</button><button id="help" aria-label="Справка">? Справка</button></div>
      <input type="file" id="files" accept=".zip,.html,.htm,.xml" multiple hidden><input type="file" id="session-file" accept=".json,.collision360.json,.zip" hidden><input type="file" id="directory" webkitdirectory multiple hidden>
      <div class="notice" role="status" id="message">${v(e.mode)}</div>
    </header>
    <div class="workspace">
      <aside>
        <div class="summary" id="summary"></div>
        <div class="test-heading"><h2>Наборы <span id="test-count"></span></h2><input id="test-search" class="test-search" type="search" placeholder="Найти набор"></div><nav id="tests" aria-label="Наборы проверок"></nav>
      </aside>
      <section class="results">
        <div class="filters"><input id="search" type="search" placeholder="Поиск по всем данным HTML"><select id="status"><option value="">Все статусы</option></select><select id="review"><option value="">Все состояния</option><option value="work">В работе</option><option value="reviewed">Отработаны</option><option value="excluded">Исключены</option></select><select id="visibility"><option value="">Все строки</option><option value="yes">Показываемые</option><option value="no">Скрытые знаки</option></select><button class="marker-toggle on" id="markers-toggle" role="switch" aria-checked="true">● Знаки включены</button></div>
        <div class="bulk" id="bulk" hidden><strong id="bulk-count"></strong><button id="bulk-review">✓ Отработать</button><button id="bulk-reopen">Вернуть в работу</button><button id="bulk-exclude">Исключить</button><button id="bulk-show">Показать знаки</button><button id="bulk-hide">Скрыть знаки</button><button id="clear-selection" aria-label="Снять выбор">×</button></div>
        <div class="list-head"><span id="count">Нет коллизий</span><span class="legend"><i></i>В работе <i class="green"></i>Отработаны <i class="gray"></i>Исключены</span></div>
        <div id="list" class="grid-wrap"></div><div class="pager"><button id="prev-page">←</button><span id="page"></span><button id="next-page">→</button></div>
      </section>
      <section id="detail" class="detail"></section>
    </div>
    <footer>Пакет НашеПО ZIP · Navisworks HTML / XML <span>Двойной щелчок по строке открывает коллизию в 3D</span></footer>
    <dialog id="settings-dialog" class="columns-dialog settings-dialog"><div class="dialog-title"><div><small>ПАРАМЕТРЫ РАБОТЫ</small><h2>Настройки плагина</h2></div><button id="close-settings" aria-label="Закрыть">×</button></div>
      <div class="settings-tabs" id="settings-tabs"><button class="active" data-settings-tab="markers">Знаки</button><button data-settings-tab="camera">Камера и координаты</button><button data-settings-tab="columns">Столбцы таблицы</button></div>
      <section class="settings-page marker-settings-page" data-settings-page="markers"><div class="settings-grid">
        <label>Размер знака, м<input id="radius" type="number" value="${a.radius}" min="0.05" step="0.25"></label><label>Подписи<select id="label-mode"><option value="selected">Только выбранная</option><option value="all">Все</option><option value="none">Не показывать</option></select></label>
        <label>Цвет новых<input id="unreviewed-color" type="color" value="${v(a.unreviewedColor)}"></label><label>Цвет отработанных<input id="reviewed-color" type="color" value="${v(a.reviewedColor)}"></label><label>Окантовка выбранного<input id="selected-color" type="color" value="${v(a.selectedColor)}"></label>
        <label>Толщина ножки, px<input id="stem-width" type="number" value="${a.stemWidth}" min="1" max="30" step="1"></label><label class="check"><input id="show-stem" type="checkbox" ${a.showStem ? "checked" : ""}> Ножка до точки конфликта</label>
      </div><p class="settings-note">Щелчок по знаку выбирает коллизию. Конец ножки расположен точно в координате конфликта.</p></section>
      <section class="settings-page marker-settings-page" data-settings-page="camera" hidden><div class="settings-grid">
        <label>Дистанция камеры, м<input id="navigation-radius" type="number" value="${a.navigationRadius}" min="0.5" step="1"></label><label>Масштаб координат<select id="scale"><option value="1">1 — как в отчёте</option><option value="0.001">0,001 — мм → м</option><option value="1000">1000 — м → мм</option></select></label>
        ${["X", "Y", "Z"].map((r, d) => `<label>Сдвиг ${r}<input id="offset${r}" type="number" value="${a.offset[d]}" step="0.1"></label>`).join("")}
      </div><p class="settings-note">Камера направляется на координату конфликта. Дистанция задаёт расстояние от камеры до этой точки.</p></section>
      <section class="settings-page columns-page" data-settings-page="columns" hidden><div class="column-options"><label class="check"><input id="show-all-columns" type="checkbox"> Все столбцы</label><label class="check"><input id="hide-empty-columns" type="checkbox"> Скрыть пустые</label><button id="select-columns">Выбрать все</button><button id="clear-columns">Снять все</button><button id="reset-columns">По умолчанию</button></div><div class="column-table-wrap"><table class="column-table"><thead><tr><th>Показывать</th><th>Имя столбца</th><th>Источник</th><th>Порядок</th></tr></thead><tbody id="column-settings"></tbody></table></div><p class="settings-note">Доступны все поля строки HTML и обоих элементов. Имя и порядок можно изменить.</p></section>
    </dialog>
    <dialog id="help-dialog" class="columns-dialog help-dialog"><div class="dialog-title"><div><small>КАК УСТРОЕНА РАБОТА</small><h2>Отчёт, сессия и поля ответа</h2></div><button id="close-help">×</button></div><div class="help-content">
      <h3>Начало работы</h3><p>Откройте ZIP-пакет НашеПО либо HTML/XML-отчёт Navisworks. ZIP сразу содержит машинные данные и снимки. Для распакованного или обычного отчёта кнопка «Снимки» подключает отдельную папку изображений.</p>
      <h3>Сессия и итоговый отчёт</h3><p><b>Сессия</b> — переносимый файл JSON с исходными данными, состояниями, назначениями, комментариями и снимками. Нажмите «Сохранить сессию», а для продолжения работы в следующий раз — «Открыть сессию» и выберите сохранённый файл. Загруженный отчёт не сохраняется в браузере автоматически. <b>Сформировать отчёт</b> создаёт самостоятельный HTML-документ для просмотра, поиска, фильтрации, передачи и печати. Если отмечены строки, в него попадут только они; иначе — выбранные наборы.</p>
      <h3>Состояния и поля</h3><dl><dt>Показывать знак</dt><dd>Управляет видимостью знака этой коллизии в 3D.</dd><dt>В работе</dt><dd>Коллизия требует проверки или решения.</dd><dt>Отработана</dt><dd>Проверка завершена; знак становится зелёным.</dd><dt>Исключена</dt><dd>Коллизия не учитывается в остатке работ.</dd><dt>Статус Navisworks</dt><dd>Статус из исходного отчёта. Он хранится отдельно от рабочего состояния.</dd><dt>Группа / назначение</dt><dd>Исполнитель, раздел или пакет работ.</dd><dt>Комментарий</dt><dd>Решение, результат проверки или причина исключения.</dd></dl>
      <h3>Разработчик</h3><p class="developer-links"><a href="https://nashepo.ru/" target="_blank" rel="noopener noreferrer">Сайт НашеПО</a><a href="https://t.me/RoburFan" target="_blank" rel="noopener noreferrer">Telegram-сообщество</a></p>
    </div></dialog>
  </main>`;
  const n = (r) => l.querySelector("#" + r);
  let h = [], u;
  const p = /* @__PURE__ */ new Set(), c = /* @__PURE__ */ new Set();
  let g = "", x = 0, w = !0, k = !1;
  const y = 50, C = document.createElement("small");
  C.id = "save-state", C.setAttribute("role", "status"), l.querySelector("header").append(C);
  function T() {
    try {
      const r = JSON.parse(localStorage.getItem(o) || "{}");
      return { ...Ge(), ...r, offset: Array.isArray(r.offset) ? r.offset : [0, 0, 0] };
    } catch {
      return Ge();
    }
  }
  function L() {
    try {
      return { visible: [...ke], order: [], names: {}, showAll: !1, hideEmpty: !1, ...JSON.parse(localStorage.getItem(i) || "{}") };
    } catch {
      return { visible: [...ke], order: [], names: {}, showAll: !1, hideEmpty: !1 };
    }
  }
  const W = (r, d = !1) => {
    n("message").textContent = r, n("message").classList.toggle("error", d);
  }, $ = async (r) => {
    try {
      const d = await r();
      typeof d == "string" && W(d);
    } catch (d) {
      W(d instanceof Error ? d.message : String(d), !0);
    }
  }, B = () => {
    u && (C.textContent = "Есть несохранённые изменения");
  }, F = () => localStorage.setItem(i, JSON.stringify(s));
  function Q() {
    return a.radius = Number(n("radius").value), a.navigationRadius = Number(n("navigation-radius").value), a.scale = Number(n("scale").value), a.labelMode = n("label-mode").value, a.offset = ["X", "Y", "Z"].map((r) => Number(n("offset" + r).value)), a.stemWidth = Number(n("stem-width").value), a.showStem = n("show-stem").checked, a.unreviewedColor = n("unreviewed-color").value, a.reviewedColor = n("reviewed-color").value, a.selectedColor = n("selected-color").value, Ue(a), localStorage.setItem(o, JSON.stringify(a)), a;
  }
  function E() {
    return Se(u, /* @__PURE__ */ new Set());
  }
  function K() {
    return Se(u, p);
  }
  function j() {
    const r = n("search").value.toLowerCase(), d = n("status").value, f = n("review").value, m = n("visibility").value;
    return K().filter((b) => (!d || b.clash.status === d) && (!f || (f === "work" ? !b.clash.reviewed && !b.clash.excluded : f === "reviewed" ? b.clash.reviewed && !b.clash.excluded : b.clash.excluded)) && (!m || b.clash.enabled === (m === "yes")) && (!r || JSON.stringify(b).toLowerCase().includes(r)));
  }
  const re = () => E().find((r) => r.clash.id === g)?.clash;
  function _(r, d = !0) {
    g = r;
    const f = j().findIndex((m) => m.clash.id === r);
    f >= 0 && (x = Math.floor(f / y)), M(), G(), d && w && setTimeout(() => $(R), 0);
  }
  async function R() {
    k && w && u && await e.markers(j().map((r) => r.clash), Q(), _, g);
  }
  function se() {
    const r = n("markers-toggle");
    r.classList.toggle("on", w), r.setAttribute("aria-checked", String(w)), r.textContent = w ? "● Знаки включены" : "○ Знаки выключены";
  }
  function H() {
    const r = ze(E()), d = new Map(s.order.map((f, m) => [f, m]));
    return r.sort((f, m) => (d.get(f.key) ?? 99999) - (d.get(m.key) ?? 99999)).filter((f) => (s.showAll || s.visible.includes(f.key)) && (!s.hideEmpty || E().some((m) => Xe(m, f.key).trim())));
  }
  const te = (r) => s.names[r.key]?.trim() || r.label;
  function oe() {
    const r = Ae(K()), d = p.size ? `в наборах · ${p.size}` : "во всех проверках";
    n("summary").innerHTML = `<strong>${r.total}</strong><span>коллизий</span><div><b>${r.remaining}</b> надо отработать · ${r.reviewed} готово</div><small>${d}${r.excluded ? ` · ${r.excluded} исключено` : ""}${r.disabled ? ` · ${r.disabled} знаков скрыто` : ""}</small>`;
  }
  function N() {
    const r = n("test-search").value.trim().toLowerCase(), d = u?.tests.filter((m) => !r || m.name.toLowerCase().includes(r)) || [];
    n("test-count").textContent = r ? `${d.length} / ${u?.tests.length || 0}` : String(u?.tests.length || 0);
    const f = Ae(E());
    n("tests").innerHTML = `<label class="test-item all ${p.size ? "" : "active"}"><input type="checkbox" data-all-tests ${p.size ? "" : "checked"}><span>Все проверки<small>${f.remaining} надо отработать</small></span><b>${f.total}</b></label>` + d.map((m) => {
      const b = Ae(Se(u, /* @__PURE__ */ new Set([m.id])));
      return `<label class="test-item ${p.has(m.id) ? "active" : ""}"><input type="checkbox" data-test="${v(m.id)}" ${p.has(m.id) ? "checked" : ""}><span>${v(m.name)}<small>${b.remaining} в работе${b.excluded ? ` · ${b.excluded} исключено` : ""}</small></span><b>${b.total}</b></label>`;
    }).join("");
  }
  function he() {
    n("bulk").hidden = !c.size, n("bulk-count").textContent = `Выбрано: ${c.size}`;
  }
  function M() {
    const r = j(), d = Math.ceil(r.length / y);
    x = Math.max(0, Math.min(x, Math.max(0, d - 1))), n("count").textContent = `Коллизии · ${r.length}`;
    const f = H(), m = r.slice(x * y, x * y + y), b = m.length > 0 && m.every((z) => c.has(z.clash.id));
    n("list").innerHTML = m.length ? `<table class="data-grid"><thead><tr><th class="select-cell"><input id="select-page" type="checkbox" ${b ? "checked" : ""} aria-label="Выбрать строки страницы"></th>${f.map((z) => `<th title="${v(z.source)}">${v(te(z))}</th>`).join("")}</tr></thead><tbody>${m.map((z) => `<tr data-clash="${v(z.clash.id)}" class="${z.clash.id === g ? "selected " : ""}${z.clash.excluded ? "excluded " : z.clash.reviewed ? "reviewed " : ""}${z.clash.enabled ? "" : "disabled"}"><td class="select-cell"><input class="row-check" type="checkbox" ${c.has(z.clash.id) ? "checked" : ""} aria-label="Добавить в массовый выбор"></td>${f.map((D) => {
      const X = Xe(z, D.key) || "—";
      return `<td title="${v(X)}">${v(X)}</td>`;
    }).join("")}</tr>`).join("")}</tbody></table>` : `<div class="empty welcome"><img src="${Je}" alt=""><h3>${u ? "Нет совпадений" : "Загрузите отчёт"}</h3><p>${u ? "Измените поиск или фильтры." : "Откройте HTML/XML Navisworks или ранее сохранённую сессию. После загрузки появятся таблица, наборы и знаки."}</p>${u ? "" : '<button class="primary" id="welcome-import">＋ Открыть отчёт</button>'}</div>`, n("page").textContent = r.length ? `${x + 1} / ${d}` : "0 / 0", n("prev-page").disabled = x === 0, n("next-page").disabled = (x + 1) * y >= r.length, he();
    const S = n("welcome-import");
    S && (S.onclick = () => n("files").click());
  }
  function G() {
    const r = re();
    if (!r) {
      n("detail").innerHTML = '<div class="empty"><h3>Карточка коллизии</h3><p>Выберите строку таблицы.</p></div>';
      return;
    }
    const d = u?.images[r.image], f = r.excluded ? "Исключена" : r.reviewed ? "Отработана" : "В работе";
    n("detail").innerHTML = `${d ? `<button class="snapshot snapshot-button" id="open-snapshot" title="Открыть снимок в отдельном окне"><img src="${v(d)}" alt="Снимок ${v(r.name)}"><span>Открыть крупнее</span></button>` : `<div class="snapshot"><div><b>Снимок не загружен</b><p>${v(r.image || "Изображение не указано")}</p></div></div>`}<div class="detail-controls"><div class="detail-actions"><button class="primary" id="focus">⌖ Перейти в 3D</button><button id="previous">← Предыдущая</button><button id="next">Следующая →</button></div><div class="coords">${r.point ? r.point.map((b, S) => `<div><small>${["X", "Y", "Z"][S]}</small><b>${b.toFixed(3)}</b></div>`).join("") : "В отчёте нет координат"}</div><div class="state-row"><label class="review-check" title="Включает или скрывает этот знак в 3D"><input id="enabled" type="checkbox" ${r.enabled ? "checked" : ""}> Показывать знак</label><strong class="work-state ${r.excluded ? "excluded" : r.reviewed ? "done" : "work"}">${f}</strong></div><div class="work-actions"><button id="work-review" class="${r.reviewed && !r.excluded ? "active" : ""}">✓ Отработана</button><button id="work-reopen" class="${!r.reviewed && !r.excluded ? "active" : ""}">Вернуть в работу</button><button id="work-exclude" class="${r.excluded ? "active danger" : ""}">Исключить</button></div><label title="Исходный статус из отчёта Navisworks">Статус Navisworks<input id="edit-status" value="${v(r.status)}" list="known-status"><datalist id="known-status">${["Новый", "Активн.", "Проверено", "Подтверждено", "Исправлено"].map((b) => `<option value="${b}">`).join("")}</datalist></label><label title="Исполнитель, раздел или пакет работ">Группа / назначение<input id="edit-group" value="${v(r.group)}" placeholder="Исполнитель или раздел"></label><label title="Ваш ответ по коллизии">Комментарий<textarea id="note" rows="3" placeholder="Решение, результат проверки…">${v(r.note)}</textarea></label></div><div class="detail-title"><small>КОЛЛИЗИЯ</small><h2>${v(r.name)}</h2><span>${v(r.description)}</span></div>${r.elements.map((b, S) => `<details class="element" ${S === 0 ? "open" : ""}><summary>Элемент ${S + 1} · ${v(b.name || b.id || "Без имени")}</summary><dl><dt>IFC GUID</dt><dd>${v(b.guid || "—")}</dd><dt>Источник</dt><dd>${v(b.source || "—")}</dd>${Object.entries(b.properties).map(([z, D]) => `<dt>${v(z)}</dt><dd>${v(D || "—")}</dd>`).join("")}</dl></details>`).join("")}`, n("focus").onclick = () => $(() => e.focus(r, Q()));
    for (const [b, S] of [["previous", -1], ["next", 1]]) n(b).onclick = () => $(() => de(S));
    n("enabled").onchange = () => be(r, n("enabled").checked), n("work-review").onclick = () => P(r, "reviewed"), n("work-reopen").onclick = () => P(r, "work"), n("work-exclude").onclick = () => P(r, "excluded");
    const m = n("open-snapshot");
    m && d && (m.onclick = () => le(d, r.name)), n("edit-status").onchange = () => {
      r.status = n("edit-status").value, B(), ce(), M();
    }, n("edit-group").oninput = () => {
      r.group = n("edit-group").value, B(), M();
    }, n("note").oninput = () => {
      r.note = n("note").value, B(), M();
    };
  }
  function Y() {
    B(), oe(), N(), M(), G(), $(R);
  }
  function be(r, d) {
    r.enabled = d, Y();
  }
  function P(r, d) {
    r.reviewed = d === "reviewed", r.excluded = d === "excluded", Y();
  }
  function le(r, d) {
    const f = `<!doctype html><html lang="ru"><meta charset="utf-8"><title>${v(d)}</title><style>html,body{margin:0;width:100%;height:100%;background:#111;color:#fff}body{display:grid;place-items:center}img{max-width:100%;max-height:100%;object-fit:contain}</style><img src="${v(r)}" alt="${v(d)}">`, m = URL.createObjectURL(new Blob([f], { type: "text/html;charset=utf-8" })), b = window.open(m, "_blank", "width=1280,height=900");
    if (!b)
      throw URL.revokeObjectURL(m), Error("Браузер заблокировал окно снимка. Разрешите всплывающие окна для Топоматик 360.");
    b.opener = null, setTimeout(() => URL.revokeObjectURL(m), 6e4);
  }
  async function de(r) {
    const d = j(), f = d.findIndex((b) => b.clash.id === g), m = d[f + r];
    if (m)
      return _(m.clash.id, !1), await R(), e.focus(m.clash, Q());
  }
  function ce() {
    const r = n("status"), d = r.value, f = [...new Set(E().map((m) => m.clash.status))].filter(Boolean);
    r.innerHTML = '<option value="">Все статусы</option>' + f.map((m) => `<option value="${v(m)}">${v(m)}</option>`).join(""), r.value = f.includes(d) ? d : "";
  }
  function ne() {
    n("reports").innerHTML = h.length ? h.map((r) => `<option value="${v(r.id)}">${v(r.name)}</option>`).join("") : '<option value="">Нет загруженных отчётов</option>', n("reports").value = u?.id || "", oe(), N(), ce(), M(), G(), se();
  }
  function ee() {
    const r = ze(E()), d = new Map(s.order.map((m, b) => [m, b])), f = r.sort((m, b) => (d.get(m.key) ?? 99999) - (d.get(b.key) ?? 99999));
    s.order = f.map((m) => m.key), n("column-settings").innerHTML = f.map((m, b) => `<tr data-column-row="${v(m.key)}"><td><input class="column-visible" type="checkbox" ${s.visible.includes(m.key) ? "checked" : ""}></td><td><input class="column-name" value="${v(s.names[m.key] || m.label)}"></td><td>${v(m.source)}</td><td><button class="column-up" ${b === 0 ? "disabled" : ""}>↑</button><button class="column-down" ${b === f.length - 1 ? "disabled" : ""}>↓</button></td></tr>`).join(""), n("show-all-columns").checked = s.showAll, n("hide-empty-columns").checked = s.hideEmpty;
  }
  function xe(r, d) {
    const f = s.order.indexOf(r), m = f + d;
    f < 0 || m < 0 || m >= s.order.length || ([s.order[f], s.order[m]] = [s.order[m], s.order[f]], F(), ee(), M());
  }
  function we() {
    if (!u) throw Error("Сначала откройте отчёт.");
    const r = c.size ? c : new Set(K().map((d) => d.clash.id));
    return jt(u, r);
  }
  function pe(r) {
    for (const d of E()) c.has(d.clash.id) && (d.clash.enabled = r);
    Y();
  }
  function ye(r) {
    for (const d of E()) c.has(d.clash.id) && (d.clash.reviewed = r === "reviewed", d.clash.excluded = r === "excluded");
    Y();
  }
  async function Fe(r, d = !1) {
    const f = at(r), m = h.find((b) => b.id === f.id);
    if (m && d)
      h = h.map((b) => b.id === f.id ? f : b), u = f;
    else if (m) {
      const b = new Map(m.tests.flatMap((S) => S.clashes).map((S) => [S.id, S]));
      for (const S of f.tests) for (const z of S.clashes) {
        const D = b.get(z.id);
        D && Object.assign(z, { enabled: D.enabled, reviewed: D.reviewed, excluded: D.excluded, note: D.note, group: D.group });
      }
      f.images = { ...m.images, ...f.images }, h = h.map((S) => S.id === f.id ? f : S), u = f, W("Отчёт обновлён. Состояния и комментарии сохранены.");
    } else
      h.push(f), u = f;
    p.clear(), c.clear(), x = 0, g = E()[0]?.clash.id || "", w = !0, B(), ne(), await R();
  }
  async function mt(r) {
    let d = 0;
    for (const f of r.filter((m) => /\.(zip|html?|xml|json)$/i.test(m.name))) {
      if (/\.zip$/i.test(f.name)) {
        const D = await Vt(await f.arrayBuffer());
        await Fe(D, !0), d++;
        continue;
      }
      const m = await f.arrayBuffer();
      let b = new TextDecoder().decode(m);
      /charset\s*=\s*["']?windows-1251/i.test(b) && (b = new TextDecoder("windows-1251").decode(m));
      const S = /\.json$/i.test(f.name), z = S ? it(b) : nt(b, f.name);
      await qe(z, r), await Fe(z, S), d++;
    }
    !d && u && (await qe(u, r), B(), G()), W(d ? `Загружено отчётов: ${d}. ${u?.warnings.join(" ") || ""}` : "Снимки подключены.");
  }
  async function qe(r, d) {
    for (const f of new Set(r.tests.flatMap((m) => m.clashes.map((b) => b.image)).filter(Boolean))) {
      const m = d.filter((z) => {
        const D = ie(z.webkitRelativePath || z.name);
        return D === f || D.endsWith("/" + f);
      }), b = d.filter((z) => z.name === f.split("/").at(-1)), S = m.length === 1 ? m[0] : b.length === 1 ? b[0] : void 0;
      !S || !/^image\/(jpeg|png|webp)$/.test(S.type) || (r.images[f] = await new Promise((z, D) => {
        const X = new FileReader();
        X.onload = () => z(X.result), X.onerror = () => D(X.error), X.readAsDataURL(S);
      }));
    }
  }
  n("scale").value = String(a.scale), n("label-mode").value = a.labelMode;
  for (const r of ["radius", "navigation-radius", "stem-width", "scale", "label-mode", "offsetX", "offsetY", "offsetZ", "show-stem", "unreviewed-color", "reviewed-color", "selected-color"]) n(r).addEventListener("change", () => $(async () => (Q(), await R(), w ? "Настройки применены." : "Настройки сохранены.")));
  n("import").onclick = () => n("files").click(), n("open-session").onclick = () => n("session-file").click(), n("folder").onclick = () => n("directory").click();
  for (const r of ["files", "session-file", "directory"]) n(r).onchange = () => $(async () => {
    const d = n(r);
    await mt(Array.from(d.files || [])), d.value = "";
  });
  n("reports").onchange = () => $(async () => {
    u = h.find((r) => r.id === n("reports").value), p.clear(), c.clear(), g = E()[0]?.clash.id || "", x = 0, w = !0, ne(), await R();
  }), n("test-search").oninput = () => N(), n("tests").onchange = (r) => $(async () => {
    const d = r.target;
    if (d.matches("[data-all-tests]")) p.clear();
    else if (d.matches("[data-test]")) {
      const f = d.dataset.test;
      d.checked ? p.add(f) : p.delete(f);
    }
    x = 0, j().some((f) => f.clash.id === g) || (g = j()[0]?.clash.id || ""), oe(), N(), M(), G(), await R();
  }), n("list").onclick = (r) => {
    const d = r.target;
    if (d.id === "select-page") {
      for (const m of j().slice(x * y, x * y + y)) d.checked ? c.add(m.clash.id) : c.delete(m.clash.id);
      M();
      return;
    }
    if (d.classList.contains("row-check")) {
      const m = d.closest("[data-clash]");
      m && (d.checked ? c.add(m.dataset.clash) : c.delete(m.dataset.clash)), he();
      return;
    }
    if (window.getSelection()?.toString()) return;
    const f = d.closest("[data-clash]");
    f && _(f.dataset.clash);
  }, n("list").ondblclick = (r) => {
    if (r.target.classList.contains("row-check")) return;
    const d = r.target.closest("[data-clash]");
    if (!d) return;
    _(d.dataset.clash, !1);
    const f = re();
    f && $(async () => (await R(), e.focus(f, Q())));
  };
  for (const r of ["search", "status", "review", "visibility"]) n(r).addEventListener(r === "search" ? "input" : "change", () => {
    x = 0, M(), $(R);
  });
  return n("prev-page").onclick = () => {
    x--, M();
  }, n("next-page").onclick = () => {
    x++, M();
  }, n("markers-toggle").onclick = () => $(async () => (w = !w, se(), w ? e.markers(j().map((r) => r.clash), Q(), _, g) : e.hide())), n("bulk-review").onclick = () => ye("reviewed"), n("bulk-reopen").onclick = () => ye("work"), n("bulk-exclude").onclick = () => ye("excluded"), n("bulk-show").onclick = () => pe(!0), n("bulk-hide").onclick = () => pe(!1), n("clear-selection").onclick = () => {
    c.clear(), M();
  }, n("settings").onclick = () => {
    ee(), n("settings-dialog").showModal();
  }, n("close-settings").onclick = () => n("settings-dialog").close(), n("settings-tabs").onclick = (r) => {
    const d = r.target.closest("[data-settings-tab]");
    if (d) {
      for (const f of l.querySelectorAll("[data-settings-tab]")) f.classList.toggle("active", f === d);
      for (const f of l.querySelectorAll("[data-settings-page]")) f.hidden = f.dataset.settingsPage !== d.dataset.settingsTab;
    }
  }, n("help").onclick = () => n("help-dialog").showModal(), n("close-help").onclick = () => n("help-dialog").close(), n("column-settings").onchange = (r) => {
    const d = r.target, f = d.closest("[data-column-row]");
    if (!f) return;
    const m = f.dataset.columnRow;
    d.classList.contains("column-visible") && (s.visible = d.checked ? [.../* @__PURE__ */ new Set([...s.visible, m])] : s.visible.filter((b) => b !== m)), d.classList.contains("column-name") && (s.names[m] = d.value), F(), M();
  }, n("column-settings").onclick = (r) => {
    const d = r.target.closest("button"), f = d?.closest("[data-column-row]");
    d && f && (r.preventDefault(), xe(f.dataset.columnRow, d.classList.contains("column-up") ? -1 : 1));
  }, n("show-all-columns").onchange = () => {
    s.showAll = n("show-all-columns").checked, F(), M();
  }, n("hide-empty-columns").onchange = () => {
    s.hideEmpty = n("hide-empty-columns").checked, F(), M();
  }, n("select-columns").onclick = () => {
    s.visible = ze(E()).map((r) => r.key), F(), ee(), M();
  }, n("clear-columns").onclick = () => {
    s.visible = [], s.showAll = !1, F(), ee(), M();
  }, n("reset-columns").onclick = () => {
    Object.assign(s, { visible: [...ke], order: [], names: {}, showAll: !1, hideEmpty: !1 }), F(), ee(), M();
  }, n("session").onclick = () => $(() => {
    if (!u) throw Error("Сначала откройте отчёт.");
    return Qe(u.name.replace(/\.[^.]+$/, "") + ".collision360.json", JSON.stringify(u, null, 2), "application/json"), C.textContent = "Сессия сохранена", "Рабочая сессия сохранена. Для продолжения используйте «Открыть сессию».";
  }), n("export").onclick = () => $(() => {
    const r = we();
    return Qe(r.name.replace(/\.[^.]+$/, "") + "-review.html", yt(r), "text/html;charset=utf-8"), `HTML-отчёт сформирован: ${r.tests.reduce((d, f) => d + f.clashes.length, 0)} коллизий.`;
  }), ne(), _t(t, () => {
    k = !0, $(R);
  }, () => {
    k = !1, $(() => e.hide());
  });
}
function Ve(t) {
  return new Proxy(t, { get(e, o) {
    return o === "app" ? t.manager.activeApp : o === "cadview" ? t.manager.activeWindow?.context : Reflect.get(e, o);
  } });
}
let Ke, Ye, ue, ft, _e, Ze = /* @__PURE__ */ new Map();
async function et(t) {
  const e = t.manager.activeApp || t.manager;
  ft = e;
  let o = Ze.get(e);
  if (!o) {
    const i = document.createElement("div");
    i.style.height = "100%";
    let a;
    o = { element: i, ready: no(i, {
      mode: "Загрузите отчёт или откройте сохранённую сессию",
      markers: (s, l, n, h) => {
        const u = Ve(t);
        return e !== (t.manager.activeApp || t.manager) ? "" : (a && a !== u.cadview && He({ ...t, cadview: a }), a = u.cadview, At(u, s, l, (p) => {
          t.manager.revealView("nashepo.collision360/collision_panel"), n(p);
        }, h));
      },
      hide: () => {
        const s = He({ ...t, cadview: a });
        return a = void 0, s;
      },
      focus: (s, l) => rt(Ve(t), s, l)
    }) }, Ze.set(e, o);
  }
  Ye?.replaceChildren(o.element), await o.ready;
}
const ao = {
  open(t) {
    t.manager.revealView("nashepo.collision360/collision_panel");
  },
  async mount(t) {
    const e = t.el;
    e && (Ke !== t.manager && (clearInterval(_e), Ze = /* @__PURE__ */ new Map(), Ke = t.manager, _e = window.setInterval(() => {
      ue && Ye?.isConnected && ft !== (ue.manager.activeApp || ue.manager) && et(ue);
    }, 200)), Ye = e, ue = t, await et(t));
  }
};
export {
  ao as default
};
