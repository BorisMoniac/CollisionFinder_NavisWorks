const xe = () => ({ guid: "", id: "", source: "", name: "", properties: {} }), Pe = (t) => t.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
function at(t) {
  let e = 2166136261;
  for (let o = 0; o < t.length; o++) e = Math.imul(e ^ t.charCodeAt(o), 16777619);
  return (e >>> 0).toString(16);
}
function de(t) {
  try {
    t = decodeURIComponent(t);
  } catch {
  }
  return t.trim().replace(/\\/g, "/").replace(/^\.\//, "");
}
function $e(t) {
  const e = Object.entries(t), o = (a) => e.find(([r]) => a.test(Pe(r)))?.[1] ?? "";
  return { guid: o(/ifcguid|globalid/), id: o(/^(объект)?id$|elementid|идентификаторэлемента/).replace(/^.*?:\s*/, ""), source: o(/файлиcточника|файлисточника|sourcefile/), name: o(/ifcname|^name$|^имя$/), properties: t };
}
const ee = (t) => t?.textContent?.replace(/\s+/g, " ").trim() ?? "", We = (t) => ({ id: t, name: "", status: "", distance: "", description: "", date: "", image: "", group: "", elements: [xe(), xe()], properties: {}, enabled: !0, reviewed: !1, excluded: !1, note: "" });
function rt(t) {
  const e = ["X", "Y", "Z"].map((o) => t.match(new RegExp(o + "\\s*:\\s*([-+]?\\d+(?:[.,]\\d+)?(?:[eE][-+]?\\d+)?)", "i"))?.[1]);
  return e.every((o) => o !== void 0) ? e.map((o) => Number(o.replace(",", "."))) : void 0;
}
function He(t, e) {
  if (t.length > 100 * 1024 * 1024) throw Error("Отчёт больше 100 МБ. Разделите его на несколько проверок.");
  const o = { version: 1, id: at(t), name: e, tests: [], images: {}, warnings: [] };
  if (/<\s*(?:\w+:)?(?:batchtest|clashtests|clashresults)\b/i.test(t) ? lt(t, o) : st(t, o), !o.tests.length) throw Error("Не найдены проверки Navisworks. Выберите отчёт HTML (табличный) или XML.");
  const r = o.tests.flatMap((s) => s.clashes).filter((s) => s.elements.some((l) => !l.guid)).length;
  return r && o.warnings.push(`У ${r} коллизий нет IFC GUID одного или обоих объектов. Для привязки потребуется совпадение ID и имени модели.`), o;
}
function st(t, e) {
  const o = document.createElement("template");
  o.innerHTML = t;
  let a = "Проверка";
  for (const r of o.content.querySelectorAll("table")) {
    if (r.matches(".testSummaryTable")) {
      a = ee(r.querySelector(".testName")) || a;
      continue;
    }
    if (!r.matches(".mainTable")) continue;
    const s = { id: `${e.id}:t${e.tests.length}`, name: a, clashes: [] }, l = Array.from(r.rows), i = l.filter((u) => Array.from(u.cells).some((c) => c.matches(".item1Header"))).sort((u, c) => c.cells.length - u.cells.length)[0];
    if (!i) {
      e.warnings.push(`Не распознаны колонки проверки «${a}».`);
      continue;
    }
    const h = Array.from(i.cells).flatMap((u) => Array.from({ length: u.colSpan }, () => ({ name: ee(u), side: u.matches(".item1Header") ? 1 : u.matches(".item2Header") ? 2 : 0 })));
    let m = "";
    for (const u of l.filter((c) => c.matches(".contentRow,.childRow,.childRowLast,.clashGroupRow"))) {
      const c = We(`${s.id}:c${s.clashes.length}`), g = [{}, {}];
      let x = 0;
      for (const w of Array.from(u.cells)) {
        const y = h[x];
        if (x += w.colSpan, !y) continue;
        const k = ee(w), C = Pe(y.name);
        y.side ? g[y.side - 1][y.name] = k : (c.properties[y.name] = k, /наименованиеконфликта|clashname/.test(C) ? c.name = k : /статус|status/.test(C) ? c.status = k : /расстояние|distance/.test(C) ? c.distance = k : /описание|description/.test(C) ? c.description = k : /датаобнаружения|datefound/.test(C) ? c.date = k : /точкаконфликта|clashpoint/.test(C) && (c.point = rt(k)));
        const I = w.querySelector("img")?.getAttribute("src");
        I && (c.image = de(I));
      }
      if (u.matches(".clashGroupRow")) {
        m = c.name;
        continue;
      }
      u.matches(".contentRow") && (m = ""), c.group = m, c.elements = [$e(g[0]), $e(g[1])], c.name && s.clashes.push(c), u.matches(".childRowLast") && (m = "");
    }
    e.tests.push(s);
  }
}
function lt(t, e) {
  if (/<!DOCTYPE|<!ENTITY/i.test(t)) throw Error("XML с DTD/ENTITY не поддерживается. Экспортируйте стандартный XML Navisworks.");
  const o = new DOMParser().parseFromString(t, "application/xml");
  if (o.querySelector("parsererror")) throw Error("XML повреждён: проверьте закрывающие теги и кодировку.");
  for (const a of o.querySelectorAll("clashtest")) {
    const r = { id: `${e.id}:t${e.tests.length}`, name: a.getAttribute("name") || "Проверка", clashes: [] };
    for (const s of a.querySelectorAll("clashresult")) {
      const l = We(`${r.id}:c${r.clashes.length}`);
      for (const u of ["name", "status", "distance"]) l[u] = s.getAttribute(u) || "";
      l.description = ee(s.querySelector("description")), l.image = de(s.getAttribute("href") || ""), l.group = s.closest("clashgroup")?.getAttribute("name") || "";
      const i = s.querySelector("createddate date");
      l.date = i ? ["year", "month", "day"].map((u) => i.getAttribute(u) || "").join("-") : "";
      const h = s.querySelector("clashpoint pos3f");
      h && ["x", "y", "z"].every((u) => h.hasAttribute(u) && Number.isFinite(Number(h.getAttribute(u)))) && (l.point = ["x", "y", "z"].map((u) => Number(h.getAttribute(u)))), l.properties = { Name: l.name, Status: l.status, Distance: l.distance, Description: l.description, "Clash point": l.point?.join("; ") || "" };
      const m = Array.from(s.querySelectorAll("clashobjects clashobject")).map((u) => {
        const c = {};
        for (const w of u.querySelectorAll("objectattribute,smarttag")) {
          const y = ee(w.querySelector("name"));
          y && (c[y] = ee(w.querySelector("value")));
        }
        const g = $e(c), x = Array.from(u.querySelectorAll("pathlink node")).map(ee);
        return g.source || (g.source = x.find((w) => /\.(ifc|smdx|rvt|nwc|nwd)$/i.test(w)) || ""), g.name || (g.name = ee(u.querySelector("name")) || x.at(-1) || ""), g;
      });
      l.elements = [m[0] || xe(), m[1] || xe()], r.clashes.push(l);
    }
    e.tests.push(r);
  }
}
function Xe(t) {
  for (const e of t.tests || []) for (const o of e.clashes || [])
    o.properties = o.properties && typeof o.properties == "object" ? o.properties : {}, o.enabled = typeof o.enabled == "boolean" ? o.enabled : !0, o.reviewed = !!o.reviewed, o.excluded = !!o.excluded, o.note = typeof o.note == "string" ? o.note : "";
  return t;
}
function Je(t) {
  const e = JSON.parse(t), o = (r) => typeof r == "string";
  if (e?.version !== 1 || !o(e.id) || !o(e.name) || !Array.isArray(e.tests) || !e.images || typeof e.images != "object" || !Array.isArray(e.warnings) || !e.warnings.every(o)) throw Error("Неверный формат сессии.");
  const a = /* @__PURE__ */ new Set();
  for (const r of e.tests) {
    if (!o(r.id) || !o(r.name) || !Array.isArray(r.clashes)) throw Error("Повреждена проверка в сессии.");
    for (const s of r.clashes) {
      if (!["id", "name", "status", "distance", "description", "date", "image", "group", "note"].every((l) => o(s[l])) || typeof s.reviewed != "boolean" || s.enabled !== void 0 && typeof s.enabled != "boolean" || s.excluded !== void 0 && typeof s.excluded != "boolean" || s.properties !== void 0 && (!s.properties || typeof s.properties != "object" || !Object.values(s.properties).every(o)) || !Array.isArray(s.elements) || s.elements.length !== 2 || a.has(s.id)) throw Error("Повреждена коллизия в сессии.");
      if (a.add(s.id), s.point !== void 0 && (!Array.isArray(s.point) || s.point.length !== 3 || !s.point.every(Number.isFinite))) throw Error("Неверные координаты.");
      for (const l of s.elements) if (!l || !["guid", "id", "source", "name"].every((i) => o(l[i])) || !l.properties || typeof l.properties != "object" || !Object.values(l.properties).every(o)) throw Error("Повреждены свойства объекта.");
    }
  }
  for (const r of Object.values(e.images)) if (!o(r) || !/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=\s]+$/.test(r)) throw Error("Неподдерживаемое изображение в сессии.");
  return Xe(e);
}
const v = (t) => String(t ?? "").replace(/[&<>"']/g, (e) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[e]), dt = (t, e) => e ? "Исключена" : t ? "Отработана" : "В работе", ct = (t, e) => t ? `<a href="${v(t)}" target="_blank" title="Открыть снимок"><img src="${v(t)}" alt="Снимок ${v(e)}"></a>` : "—";
function pt(t) {
  const e = v;
  let o = 0;
  const a = t.tests.flatMap((s) => s.clashes.map((l) => {
    o++;
    const i = dt(l.reviewed, l.excluded), h = [o, l.name, s.name, i, l.status, l.group, l.note, l.point?.join(" "), ...l.elements.flatMap((m) => [m.name, m.id, m.guid, m.source, ...Object.values(m.properties)]), ...Object.values(l.properties)].join(" ").toLowerCase();
    return `<tr data-state="${e(i)}" data-test="${e(s.name)}" data-search="${e(h)}"><td>${o}</td><td><strong>${e(l.name || `Коллизия ${o}`)}</strong></td><td>${e(s.name)}</td><td><span class="state ${l.excluded ? "excluded" : l.reviewed ? "done" : "work"}">${e(i)}</span><small>${l.enabled ? "Знак показывается" : "Знак скрыт"}</small></td><td>${e(l.status || "—")}</td><td>${e(l.group || "—")}</td><td>${e(l.note || "—")}</td><td>${e(l.point?.map((m) => Number(m.toFixed(3))).join("; ") || "—")}<small>${e(l.distance)}</small></td><td>${ct(t.images[l.image] || "", l.name)}</td><td>${l.elements.map((m, u) => `<div class="object"><b>Элемент ${u + 1}</b><span>${e(m.name || m.id || "—")}</span><small>${e(m.source || "—")}</small><code>${e(m.guid || "GUID отсутствует")}</code></div>`).join("")}</td></tr>`;
  })).join(""), r = t.tests.filter((s) => s.clashes.length).map((s) => `<option value="${e(s.name)}">${e(s.name)}</option>`).join("");
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(t.name)} — отчёт о коллизиях</title><style>
  :root{color-scheme:light;font:14px/1.4 "Segoe UI",Arial,sans-serif;color:#172336;background:#f3f6fa}*{box-sizing:border-box}body{margin:0}.head{background:#17202b;color:#fff;padding:18px 24px;box-shadow:0 2px 12px #0003}.head h1{margin:0 0 3px;font-size:24px}.head p{margin:0;color:#b9c5d3}.filters{display:grid;grid-template-columns:minmax(240px,1fr) 190px 220px auto;gap:10px;margin-top:15px}.filters input,.filters select,.filters button{height:38px;border:1px solid #536274;border-radius:6px;background:#242f3c;color:#fff;padding:0 11px;font:inherit}.filters button{cursor:pointer;background:#356fb9}.count{align-self:center;color:#dce5ef;white-space:nowrap}.table-wrap{padding:18px;overflow:auto}table{border-collapse:separate;border-spacing:0;width:100%;min-width:1500px;background:#fff;box-shadow:0 4px 22px #21314a1c}th{background:#e5ebf2;color:#35465b;text-align:left;white-space:normal;line-height:1.3;vertical-align:bottom}th,td{border-right:1px solid #d9e0e8;border-bottom:1px solid #d9e0e8;padding:9px;vertical-align:top}td:first-child{width:55px;text-align:center}td:nth-child(2){min-width:170px}td:nth-child(7){min-width:220px;white-space:pre-wrap}td:nth-child(10){min-width:290px}tbody tr:hover td{background:#f2f7fc}small{display:block;color:#68788c;margin-top:3px}.state{display:inline-block;border-radius:999px;padding:3px 9px;font-weight:650}.state.work{background:#fff0c2;color:#6f5100}.state.done{background:#d9f4e5;color:#12683d}.state.excluded{background:#e4e7eb;color:#59616c}.object{display:grid;gap:2px;margin-bottom:10px}.object:last-child{margin-bottom:0}.object code{overflow-wrap:anywhere;color:#315f98}img{display:block;width:150px;height:90px;object-fit:contain;background:#eef2f6;cursor:zoom-in}[hidden]{display:none!important}@media print{.filters{display:none}.table-wrap{padding:0}tr{break-inside:avoid}body{background:#fff}}
  </style></head><body><header class="head"><h1>Отчёт о коллизиях</h1><p>${e(t.name)}</p><div class="filters"><input id="search" type="search" placeholder="Поиск по отчёту"><select id="state"><option value="">Все состояния</option><option>В работе</option><option>Отработана</option><option>Исключена</option></select><select id="test"><option value="">Все проверки</option>${r}</select><button onclick="window.print()">Печать</button><span class="count" id="count"></span></div></header><div class="table-wrap"><table><thead><tr><th>№</th><th>Коллизия</th><th>Проверка</th><th>Состояние</th><th>Статус Navisworks</th><th>Группа / назначение</th><th>Комментарий</th><th>Координаты / расстояние</th><th>Снимок</th><th>Объекты модели</th></tr></thead><tbody id="rows">${a}</tbody></table></div><script>
  const search=document.querySelector('#search'),state=document.querySelector('#state'),test=document.querySelector('#test'),rows=[...document.querySelectorAll('#rows tr')],count=document.querySelector('#count');function apply(){const q=search.value.trim().toLowerCase();let shown=0;for(const row of rows){const visible=(!q||row.dataset.search.includes(q))&&(!state.value||row.dataset.state===state.value)&&(!test.value||row.dataset.test===test.value);row.hidden=!visible;if(visible)shown++}count.textContent='Показано: '+shown+' из '+rows.length}search.addEventListener('input',apply);state.addEventListener('change',apply);test.addEventListener('change',apply);apply();
  <\/script></body></html>`;
}
function Be(t, e, o) {
  const a = URL.createObjectURL(new Blob([e], { type: o })), r = document.createElement("a");
  r.href = a, r.download = t, r.click(), setTimeout(() => URL.revokeObjectURL(a), 3e4);
}
const Ue = () => ({ radius: 2, navigationRadius: 15, scale: 1, offset: [0, 0, 0], labelMode: "selected", showStem: !0, stemWidth: 6, unreviewedColor: "#e1372d", reviewedColor: "#28b94b", selectedColor: "#f2c94c" });
function ue(t, e) {
  return t.point?.map((o, a) => o * e.scale + e.offset[a]);
}
function Ie(t) {
  if (!Number.isFinite(t.radius) || t.radius < 0.05 || !Number.isFinite(t.navigationRadius) || t.navigationRadius < 0.5 || !Number.isFinite(t.scale) || t.scale <= 0 || !t.offset.every(Number.isFinite)) throw Error("Размер знака и дистанция камеры должны быть положительными, смещения — конечными числами.");
  if (!Number.isFinite(t.stemWidth) || t.stemWidth < 1 || t.stemWidth > 30) throw Error("Толщина ножки должна быть от 1 до 30 пикселей.");
  if (!["selected", "all", "none"].includes(t.labelMode)) throw Error("Выбран неверный режим подписей.");
  if (![t.unreviewedColor, t.reviewedColor, t.selectedColor].every((e) => /^#[0-9a-f]{6}$/i.test(e))) throw Error("Цвет знака задан неверно.");
}
const De = "nashepo.collision360.markers.v4", Ee = "nashepo.collision360.selected.v4", Ne = /* @__PURE__ */ new WeakMap();
function ut(t, e, o, a, r = 6, s) {
  const [l, i, h] = t, m = i - e * 0.12, u = h + e * 1.9, c = h + e * 5, g = e * 1.65, x = [];
  a && x.push({ type: "line", a: [l, i, h], b: [l, i, u + e * 0.08], color: s || o, width: r }), s && x.push({ type: "polyline", points: [[l - g - e * 0.34, i, u - e * 0.32], [l + g + e * 0.34, i, u - e * 0.32], [l, i, c + e * 0.38], [l - g - e * 0.34, i, u - e * 0.32]], color: s, fillColor: s, width: 2 }), x.push({ type: "polyline", points: [[l - g - e * 0.16, i, u - e * 0.14], [l + g + e * 0.16, i, u - e * 0.14], [l, i, c + e * 0.2], [l - g - e * 0.16, i, u - e * 0.14]], color: "#111111", fillColor: "#111111", width: 4 }), x.push({ type: "polyline", points: [[l - g + e * 0.15, i, u + e * 0.13], [l + g - e * 0.15, i, u + e * 0.13], [l, i, c - e * 0.18], [l - g + e * 0.15, i, u + e * 0.13]], color: o, fillColor: o, width: 2 });
  for (let k = 1; k <= 12; k++) {
    const C = k / 13, I = u + e * 0.13 + (c - u - e * 0.31) * C, M = (g - e * 0.15) * (1 - C) * 0.93;
    x.push({ type: "line", a: [l - M, i - e * 0.04, I], b: [l + M, i - e * 0.04, I], color: o, width: 12 });
  }
  const w = e * 0.13;
  x.push({ type: "polyline", points: [[l - w, m, h + e * 2.93], [l + w, m, h + e * 2.93], [l + w * 0.72, m, h + e * 4.13], [l - w * 0.72, m, h + e * 4.13], [l - w, m, h + e * 2.93]], color: "#ffffff", fillColor: "#ffffff", width: 2 });
  const y = e * 0.17;
  return x.push({ type: "polyline", points: [[l - y, m, h + e * 2.55], [l, m, h + e * 2.38], [l + y, m, h + e * 2.55], [l, m, h + e * 2.72], [l - y, m, h + e * 2.55]], color: "#ffffff", fillColor: "#ffffff", width: 2 }), x;
}
function ft(t, e, o, a, r, s, l, i = !1) {
  const h = ue(e, a), m = e.excluded ? "  [ИСКЛЮЧЕНА]" : e.reviewed ? "  [ОТРАБОТАНА]" : "", u = `#${o + 1}  ${e.name || "Коллизия"}${m}`, c = () => {
    r(e.id), Ve(t, e, a);
  }, g = ut(h, a.radius, s, a.showStem, a.stemWidth, i ? a.selectedColor : void 0), x = [{ id: e.id, type: "shaped", shapes: g, activeShapes: g, activateCommand: c, dblCommand: c }];
  return l && x.push({ id: e.id + ":label", type: "simple", position: [h[0], h[1] - a.radius * 0.2, h[2] + a.radius * 5.35], attachment: "above", activateCommand: c, dblCommand: c, label: u, description: e.group || e.status || "Без статуса", labelColor: i ? "#171717" : "#ffffff", labelBackground: i ? a.selectedColor : s }), x;
}
function Fe(t, e, o, a, r, s, l, i, h = !1) {
  for (const m of ft(e, o, a, r, s, l, i, h)) t.add(m);
}
const qe = (t, e) => t.excluded ? "#78818c" : t.reviewed ? e.reviewedColor : e.unreviewedColor;
function mt(t, e) {
  return JSON.stringify({ clashes: t.map((o) => [o.id, o.enabled, o.reviewed, o.excluded, o.name, o.group, o.status, o.point]), settings: { ...e, labelMode: e.labelMode === "all" ? "all" : "none" } });
}
function gt(t, e, o, a, r = "") {
  Ie(o);
  const s = t.cadview;
  if (!s) throw Error("Создайте или откройте проект Топоматик 360.");
  let l = s.annotations.get(De);
  l || (l = s.annotations.create(De, 1e3));
  const i = s.annotations.get(Ee);
  i && s.annotations.release(i);
  const h = s.annotations.create(Ee, 1e4), m = mt(e, o);
  Ne.get(s)?.signature !== m && (l.clear(), e.forEach((w, y) => {
    if (!w.enabled || !ue(w, o)) return;
    const k = qe(w, o);
    Fe(l, t, w, y, o, a, k, o.labelMode === "all");
  }));
  const u = e.findIndex((w) => w.id === r), c = e[u];
  c?.enabled && ue(c, o) && Fe(h, t, c, u, o, a, qe(c, o), o.labelMode === "selected", !0), l.visible = !0, h.visible = !0, Ne.set(s, { signature: m }), s.invalidate();
  const g = e.filter((w) => w.enabled && ue(w, o)).length, x = e.filter((w) => !w.enabled).length;
  return `Показано знаков: ${g}. Отключено: ${x}. Без координат: ${e.length - g - x}.`;
}
function ht(t) {
  const e = t.cadview;
  if (e) {
    for (const o of [De, Ee]) {
      const a = e.annotations.get(o);
      a && e.annotations.release(a);
    }
    Ne.delete(e), e.invalidate();
  }
  return "Знаки скрыты.";
}
function Ve(t, e, o) {
  Ie(o);
  const a = ue(e, o), r = t.cadview;
  if (!a) throw Error("В отчёте нет координат этой коллизии.");
  if (!r) throw Error("Откройте окно проекта Топоматик 360.");
  const s = o.navigationRadius, l = a, i = [1.35, -1.35, 0.8], h = Math.hypot(...i), m = [l[0] + i[0] / h * s, l[1] + i[1] / h * s, l[2] + i[2] / h * s], u = [l[0] - m[0], l[1] - m[1], l[2] - m[2]], c = Math.hypot(...u) || 1, g = [u[0] / c, u[1] / c, u[2] / c];
  return r.camera?.id !== "3d" && r.setCameraType("3d"), r.lookAt(m, g, [0, 0, 1], !0, a), `Переход к ${e.name} с дистанцией ${s} м.`;
}
const bt = [
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
], ve = ["system:number", "system:state", "system:name", "system:test", "system:status", "system:group", "system:note", "e1:source", "e1:guid", "e2:source", "e2:guid"];
function ye(t) {
  const e = [...bt], o = new Set(e.map((r) => r.key)), a = (r, s, l) => {
    o.has(r) || (o.add(r), e.push({ key: r, label: s, source: l }));
  };
  for (const { clash: r } of t) {
    for (const s of Object.keys(r.properties || {})) a(`clash:${s}`, s, "HTML · коллизия");
    r.elements.forEach((s, l) => {
      for (const i of Object.keys(s.properties || {})) a(`e${l + 1}:prop:${i}`, i, `HTML · элемент ${l + 1}`);
    });
  }
  return e;
}
function Qe(t, e) {
  const o = t.clash, a = {
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
  if (e in a) return a[e];
  if (e.startsWith("clash:")) return o.properties[e.slice(6)] || "";
  const r = /^e([12]):prop:(.*)$/.exec(e);
  return r && o.elements[Number(r[1]) - 1].properties[r[2]] || "";
}
function ke(t, e) {
  let o = 0;
  return t?.tests.flatMap((a) => a.clashes.map((r) => ({ clash: r, test: a.name, testId: a.id, number: ++o }))).filter((a) => !e.size || e.has(a.testId)) || [];
}
function ze(t) {
  const e = t.map((o) => o.clash);
  return { total: e.length, remaining: e.filter((o) => !o.reviewed && !o.excluded).length, reviewed: e.filter((o) => o.reviewed && !o.excluded).length, excluded: e.filter((o) => o.excluded).length, disabled: e.filter((o) => !o.enabled).length };
}
function xt(t, e) {
  return e.size ? { ...structuredClone(t), tests: t.tests.map((o) => ({ ...structuredClone(o), clashes: o.clashes.filter((a) => e.has(a.id)).map((a) => structuredClone(a)) })).filter((o) => o.clashes.length > 0) } : structuredClone(t);
}
const Ge = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAYAAACOEfKtAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAydpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDkuMS1jMDAzIDc5Ljk2OTBhODdmYywgMjAyNS8wMy8wNi0yMDo1MDoxNiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6RDZFQkU2NEQ4QUJDMTFGMUE5MjRBM0M2N0UyOTI4NDYiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6RDZFQkU2NEM4QUJDMTFGMUE5MjRBM0M2N0UyOTI4NDYiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIDI2LjExIChXaW5kb3dzKSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjRENDVBNjQzODQzRDExRjE5MkMwQ0YwNkU2ODQzQTZDIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjRENDVBNjQ0ODQzRDExRjE5MkMwQ0YwNkU2ODQzQTZDIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+pHX+ogAAD+lJREFUeNrsnXtwVPUVx2/CZvMgQEhCSAwJJDzDqwgodCq08hAr7wpSo1M6o/5Rq6NUcdqp1XamdjqOY6mvWhWnttZpRRtbaRGpMMKMZlB8gaFaQoQQSEhIQt7hkfTzhY1ulnt37929mw1T7sxls3vv/f3O7/zO43vO7/wucd3d3calI/zDo3927txpnDx5MqaEpKenpyUlJWUlJCQM6+rqSm1vb/fyGRcfH9+dkpLSGRcX13Lq1Knajo6Omvr6+ia+x4zWtLQ0Y86cOee/SAKLiopiyjwYlz5ixIhyPk8PGDBAKnHB6fF4unU9Ly+vDCanxpLeqVOnnuObznj9kJycHFMGwpRrjh8/Xoh0ec6ePWt6z5kzZwxdr62tLcrPz786lvT68ys+1jYEaTJQx+tRT1v3w0QDabweSe0XNjDmDBwyZEh6U1PTPCfPtLS0LOK5QZcYyDF48OAFjY2N6U6eaWhoyIaBc//vGSg1RIXXSC2dHG1tbYbX610dS08cUwYmJiYa2dnZWRMmTFiO9C0Ipw3UfgnoYfHw4cMzYWZscWAEeChj2LBha8CQm+vq6g6D26xnKj5eWC+dZ67l71VI0dxDhw5lYM/C6vvYsWMZzc3Nm4cOHVo7atSot/Hem6DjzRMnTjQGCw4k9RkZGYWYgGtrampeZCKaIuKgOps+fbrj55AgwYmPkabunJyceqThEaQhT4wKJPiyyy4bx/VHgStVQABTnBfpCdjuhp7D9PMw9BQGemnRBc0FXP8tdDaKbhj/Hn+Pdjr2WbNmfYkDw2IgjJgDMdX+A1DEwG8nUEsNYJTUSp98fzIrK6tF16PBuMBT/cCUk/T7Gz5HiI7c3NwxfN8gxgXSweRWcv3KPmOgQG9mZmaz1QAUScDIhvHjx/8Zgmsx9GExAjXrLigo6Ebrw2YkdBwdN26c6GgKNoGYoXoioblRZyAqsoDOWqMlOVJDbKQY10Zf3VJ3feo7Nuvc92hJsqQWJn7DKQNtOxHEfCZw4xVCqRS3PNigQYMEpCv5/BBJfa+zs3MfElyB1D1RWlp6le45fPiwMXv27D2o4p04ikI+p0D4FTiQaXjw3HCdUOCBQxmMxJZgdubhoPa56kRQ2REw8LAbMy3jjRmoxiY9VVhYuABmDRKs6TnGjBlTTNKg1zP6zu83+sMgVHwwTmAhpuIZJKcWxroiibT1OTRluabCqampKajQO5ESBmCWOn6GF7wLdckyi2WZpALOBrPn9TsGv8AMliA52UzIj5iYA+onUloZ778xJ4muMBD1SoGwzyIhiIE3MMCfgNks01AQrLTa1mDt6LruC5JTHEI/D8ppRELvyJEjPxo4cKDXNScyevTomwPVyq668uxmGDg2VNg1ceLEO0JhRF2HiT8M1o76ob8izMO2cNRajoxnV7rqhZFCL7OyzwkhOIcuIMRPmUk70GgCxrvFTrvc18z940O1iekZgH38JbQ7Vd/3oHmA6zAGSbrJrhTidFox8KsCo5IgA93pZJCo6ds8F28nWQFDbka1OxxI34qo4EBmMgGmfBqKCHCiJGS+HQQgdUN175OqOzUNPLfeTjZG9+C8FsPEdhvS9z7SFx81II0UrglmpyCykxn8tl0IhVmYisFvDxP4tsOYqXb7gjkrMStnrNqDcWe5Z4lTIO0onQWQbfAt+lxwyNYRRfzg4MGDW2wmUhOQpGcBsElhAt8kJvNZtWPn/i+++KIE03K31fqPxqXxRS0bIxVmhj62in9xGE9pfcOu6k6aNOnBSMGvnqedB+wmVpVYgM4XrMJBNOxd7GB0VJhI4HtWtgpV2oskpNhcwjRwGt/CVp5yI3JQO7T3TbVr5wCLDiHaOGDlRGDid1yPhQVjWFa8j1jVbFFI4n8Xeck2q0Qqz3tQ78kQOI+k6yLWNOYQUycYLhxqBwncgj3dRV9bSdRuJ0beS6x81izBS98nsdXr8OL/CIyjtVQAU36MOXqttbW1yzUVxjEs1eyYzRoq8XJgSl2xKjnATKR2Cd7ycWZ1H/any40wK1S4qH7UH/0+pv5Fh3+s3UPf2LFj/2nWhnAjaONq1yRQdo2ZvUWzY5LSbyeNvl5runQcx/ciZk+dL2J2Z2PohyEJfbY+cfr0aYOlhTjOSXydBE13oiG12O5Svm9FqnYgnWWiCfru4fpC/u6lCbpGaH0ra887tJgf8ZoI4p6Lei40U01sz9sQlE9m5A6YOB9mToFpHruL5NE+xAzOYfy5FC1ZygSfAf7sxQa+hfS8zue7e/bsmRuo6jD3OmxlJuahLmIVRtRvCfSWwoL8LuDZKpEPN+scq1P04vTOJWo1jkBs60uffTdiFZaU4SCuC5QoPJ9x5MgRgwqqFOMiPDRwLcZxJgsXajxK3Bp+5SOYLgUEfwlrXRj9V6NDMcSrUdG5JoDa6C+1KYYLi/tmBU2Yo4WMfwVOaYj4EdQGqgHdhN6nq2QCyVuB07imoqIiB8N7wUMwtWvmzJmf7Nq1a1qwteCLgXkzZswo271798TAa0ePHs2BiSX4gCqY+CYOpYTvu6hNbOzFcH1ZsmTJdFz/CyQBjuFF7YDXJmZnFHZix8Vk+wJP6H9r8uTJExTDh7oX3KhEaxWQ7vnly5dP7RWJFBcXb3TSMThpr5A/uTmCkPyai5F5ohu4kqcYnr/LnTy7du3ax3slE3ASmU5EH3Uvl+qyenUYULrWt3Z70RyiV3RXV1dX+szXQSfPo85ZvZwIbj3DSQPcXynQqoPsyxuk0H9mNxaN9SE6off+8vLyN3rANzb/iMPxD+vFQBxFooOHJbp1PQU8mkGY+BA29LX+UG4WCpZBZwn0/qrH+Yl+6K5z0g78SurFQJIEHidE0GFbYBBOjfMtGNj/9mcGApw/h85bTcLSNieT788v1+oDCXvqmc1iDHN7f2Se6BJ9otP1AksM6hm7D0j0Ud9ki6zv+xjoO1Sy0Z8O0SO6oG+PxS0pTjYc+fMr3peO73QSBnFkWon8gQMHngcvPR0MvfflITqg53eiywpMczhyovCroxcDYYpTsc6zYpDi5srKynUY69L+wECl6UWPVYZI40CrRjiMpet6MZDA+YRDHDQaMba0uoQ8HaSEbqKepTqWzKP/Y6IDejqDwJoEoEyBQ6mu/ZKBsmm45d8zU6/QYb2dXUtkKwqxKzlG8FWzg2SxYyqFqFopdFSEsI/5jGdkqLZUk0P+sA6k8VeyOF+aA49gCcXepaRzVpMYzeYmbXpZAVPnEThnmG1BIEk5kFT5FMXcweAOkxNTdI3XTQpVHYEETqMwPcFqSxfOp5Y4eDtjKYFxO5iQ4/zWOxsjQypEXn3+eIkE6ktkZoYTbC/C7W/goaGBuI9n5uNItlp5LxHOtaQY5/2SguE70ci5kLzmBdeI88WodYx/G8C7tify8nM81jhQBhem1ezfv/+PMHKnmSfGDi7TaluIiCUxxgxMDCaB0J+EMCwyzLegbSsrK3sJ4N2LeY422ijMQXS3mC2Ys3Aznhm6KtjsMgBvjBnoDSaBmKz5mKlRZhuBEJAtdrBhyEgED/Yvrb4ZF274k/243aoaIU4LD/1YArUUize93Wy1Ea3T/pttrmz1YiG6kgWY7Rbh2zKytWMtJHBAP5FA07UHnODXUM9rLFT7DSTzuCsM9AHQ58xKa/FeiXT2oJkUQrinPzCQifSYSR8e9hcsTXhM6hXlUJ+zsyZsO5mApG0hjf+Z2TVmsRjoM8dEAj3Yz4RYMpD+TRnI0oX2yS03e4Zxfsh4t7u6WxN70MmsPRJYImGcX2CKg9DHkMTEfiiBqpvxBFRTpCJhG8z2GAr3wfCHwcBnXd/uyoz9CWy03+xaVVXVNLK8v/aPjyEkAcZ6YiyBCaLD8CtTwfY9ypq2aY0149sDDt4Ulf3CkkJm817fqt0FL4SAiXejGsV+EpggCQhn4LJRlGC0UjXwAZ9t4e4Hpn+P6OjBpdB3G8y7zWwpFkfJz13rnUif4/3CEJFkhY0Ea1Dx51ixO0bebQcz73Uigb79xN1AiFIkWXt//654GqNOmD56GZO0GkQwG+8YZ3ct2qfCXl858XU8+6QZbPHdq3fUJEatQpWBeKwqVP1PVKQBqblCZWUA1dOh7tfmQhhUxjrzQwxyurygRf9iwnTdR0Bfps2HNnZ8noaWDLLRc4LtMO05abcUtBEXlQpVBnmD3c3SSNIJOlnvA+BmBd1apD4CM5QFmsd9Xoc75b08N1/Pqx2rYgCkuY2NivfzedIO3WoHIVnsOgMlfajmRw4Xrs8VOxp+WxNwNI3sNHqFoszVwIW0SOtr9LzaUXtqV+37lyHTvzY2Ot1o806oOulwtnrd4HSrvl7VxHPa/dh9+eWXf8zmmJtQp5xovSDC53hy6Odm+lMN4Ln+RYcTuu1IoaNtDkhfMrjpAbOUT4istUFx0jnnAlZMIzHhxcNVR6v4Uu3iIGr14jKcRZr6Vf92IwrjqzVfwZ+fI4Vet7wwzim+wwgPh4l5OvNRrefBWeuQjMcJATeRzWl049V78t6oagZ27gaSv3eCAIoinSTalLTEueaF8agFDP6oG0U9vm38hygPfgQH8HUcQqLd/SX+6oqj0j7muXqZBO1VhbOb1DDfl1yB9851dZsD8W4FkrNKdXJIzsBIZlemgOWDfPDZPYDXe4AjBzD+eyBmN5LzKav+lZz1fO9Ags8qq8OZjASnw7g8PrWUcAUqOhNVLVBI5tZLJBEUacX1aEiV60AaBP8OErOGDv5GB143ymz10kfOMXwdg7Ffo8IfGNSFd21BKmU2ZMA82LEkbNMggWjtVXFq1+wcePM2+l/F5H4QtRfv+HY+Lg2281F5VL0nBmhRohmNZSE5/dcRDpbAnPZghfBoVhNwZ6ERxmtP4p0ymxl6Hc+8DMhQH8hcCG7Gtj2Jqs3gvpVI1Sy+/wEC+2zfg+gQw5jAZ5DkK1lUX4lkzdTLKSRlJgmEGuzyYu7bZvTlq5/oeBqz9h9tgYCZzQDZp/htTCA4loPAfk7h+tMY6Dqne4PtnnIi9FNDP0/QT1Fg5YS+Y2sncP1ZvftGu5owSZ/oFVZGX7/6yfiq0jObmb4XIsaGqoURY2F0Nip1K+cWBtMU6Xu0tP1M0Qftbeb8PhqQFSq6EZ1imujWy9PCGbdrDDQiqxLNo8D7Rql9OMyDCfU8vwqpz+3r6tiYM9BfGrBNr4XDQJ570c47GaLNwJi+wVJwhPNls6UCI0SdCuHlpv6wRyXm71DV+ithWKPDdFYN4eEOw7j0ElrFybUsSDliBjBqGwC86RIDjfPbDLAlr9qNh+UwyOy8avXC7pgw0Gwrf18ebNjZijc+EgoK6TrQqZxyvO2xpNe/5O8cxRs3bjT6cme5yVEHJpzBZzbAPAvpSiW3l+j/nxGA75qZ6OMQf4xYvCnGr67/KvK59N9hRHb8T4ABAPaAkPNeKkdCAAAAAElFTkSuQmCC";
var L = Uint8Array, le = Uint16Array, wt = Int32Array, Ke = new L([
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
]), _e = new L([
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
]), vt = new L([16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]), et = function(t, e) {
  for (var o = new le(31), a = 0; a < 31; ++a)
    o[a] = e += 1 << t[a - 1];
  for (var r = new wt(o[30]), a = 1; a < 30; ++a)
    for (var s = o[a]; s < o[a + 1]; ++s)
      r[s] = s - o[a] << 5 | a;
  return { b: o, r };
}, tt = et(Ke, 2), ot = tt.b, yt = tt.r;
ot[28] = 258, yt[258] = 28;
var kt = et(_e, 0), zt = kt.b, Le = new le(32768);
for (var j = 0; j < 32768; ++j) {
  var _ = (j & 43690) >> 1 | (j & 21845) << 1;
  _ = (_ & 52428) >> 2 | (_ & 13107) << 2, _ = (_ & 61680) >> 4 | (_ & 3855) << 4, Le[j] = ((_ & 65280) >> 8 | (_ & 255) << 8) >> 1;
}
var fe = (function(t, e, o) {
  for (var a = t.length, r = 0, s = new le(e); r < a; ++r)
    t[r] && ++s[t[r] - 1];
  var l = new le(e);
  for (r = 1; r < e; ++r)
    l[r] = l[r - 1] + s[r - 1] << 1;
  var i;
  if (o) {
    i = new le(1 << e);
    var h = 15 - e;
    for (r = 0; r < a; ++r)
      if (t[r])
        for (var m = r << 4 | t[r], u = e - t[r], c = l[t[r] - 1]++ << u, g = c | (1 << u) - 1; c <= g; ++c)
          i[Le[c] >> h] = m;
  } else
    for (i = new le(a), r = 0; r < a; ++r)
      t[r] && (i[r] = Le[l[t[r] - 1]++] >> 15 - t[r]);
  return i;
}), me = new L(288);
for (var j = 0; j < 144; ++j)
  me[j] = 8;
for (var j = 144; j < 256; ++j)
  me[j] = 9;
for (var j = 256; j < 280; ++j)
  me[j] = 7;
for (var j = 280; j < 288; ++j)
  me[j] = 8;
var it = new L(32);
for (var j = 0; j < 32; ++j)
  it[j] = 5;
var St = /* @__PURE__ */ fe(me, 9, 1), jt = /* @__PURE__ */ fe(it, 5, 1), Se = function(t) {
  for (var e = t[0], o = 1; o < t.length; ++o)
    t[o] > e && (e = t[o]);
  return e;
}, B = function(t, e, o) {
  var a = e / 8 | 0;
  return (t[a] | t[a + 1] << 8) >> (e & 7) & o;
}, je = function(t, e) {
  var o = e / 8 | 0;
  return (t[o] | t[o + 1] << 8 | t[o + 2] << 16) >> (e & 7);
}, At = function(t) {
  return (t + 7) / 8 | 0;
}, Te = function(t, e, o) {
  return (e == null || e < 0) && (e = 0), (o == null || o > t.length) && (o = t.length), new L(t.subarray(e, o));
}, Ct = [
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
], R = function(t, e, o) {
  var a = new Error(e || Ct[t]);
  if (a.code = t, Error.captureStackTrace && Error.captureStackTrace(a, R), !o)
    throw a;
  return a;
}, Mt = function(t, e, o, a) {
  var r = t.length, s = a ? a.length : 0;
  if (!r || e.f && !e.l)
    return o || new L(0);
  var l = !o, i = l || e.i != 2, h = e.i;
  l && (o = new L(r * 3));
  var m = function(be) {
    var pe = o.length;
    if (be > pe) {
      var se = new L(Math.max(pe * 2, be));
      se.set(o), o = se;
    }
  }, u = e.f || 0, c = e.p || 0, g = e.b || 0, x = e.l, w = e.d, y = e.m, k = e.n, C = r * 8;
  do {
    if (!x) {
      u = B(t, c, 1);
      var I = B(t, c + 1, 3);
      if (c += 3, I)
        if (I == 1)
          x = St, w = jt, y = 9, k = 5;
        else if (I == 2) {
          var T = B(t, c, 31) + 257, Q = B(t, c + 10, 15) + 4, N = T + B(t, c + 5, 31) + 1;
          c += 14;
          for (var G = new L(N), O = new L(19), E = 0; E < Q; ++E)
            O[vt[E]] = B(t, c + E * 3, 7);
          c += Q * 3;
          for (var P = Se(O), Y = (1 << P) - 1, ge = fe(O, P, 1), E = 0; E < N; ) {
            var he = ge[B(t, c, Y)];
            c += he & 15;
            var M = he >> 4;
            if (M < 16)
              G[E++] = M;
            else {
              var W = 0, H = 0;
              for (M == 16 ? (H = 3 + B(t, c, 3), c += 2, W = G[E - 1]) : M == 17 ? (H = 3 + B(t, c, 7), c += 3) : M == 18 && (H = 11 + B(t, c, 127), c += 7); H--; )
                G[E++] = W;
            }
          }
          var te = G.subarray(0, T), Z = G.subarray(T);
          y = Se(te), k = Se(Z), x = fe(te, y, 1), w = fe(Z, k, 1);
        } else
          R(1);
      else {
        var M = At(c) + 4, $ = t[M - 4] | t[M - 3] << 8, F = M + $;
        if (F > r) {
          h && R(0);
          break;
        }
        i && m(g + $), o.set(t.subarray(M, F), g), e.b = g += $, e.p = c = F * 8, e.f = u;
        continue;
      }
      if (c > C) {
        h && R(0);
        break;
      }
    }
    i && m(g + 131072);
    for (var A = (1 << y) - 1, oe = (1 << k) - 1, X = c; ; X = c) {
      var W = x[je(t, c) & A], J = W >> 4;
      if (c += W & 15, c > C) {
        h && R(0);
        break;
      }
      if (W || R(2), J < 256)
        o[g++] = J;
      else if (J == 256) {
        X = c, x = null;
        break;
      } else {
        var ne = J - 254;
        if (J > 264) {
          var E = J - 257, ie = Ke[E];
          ne = B(t, c, (1 << ie) - 1) + ot[E], c += ie;
        }
        var ce = w[je(t, c) & oe], ae = ce >> 4;
        ce || R(3), c += ce & 15;
        var Z = zt[ae];
        if (ae > 3) {
          var ie = _e[ae];
          Z += je(t, c) & (1 << ie) - 1, c += ie;
        }
        if (c > C) {
          h && R(0);
          break;
        }
        i && m(g + 131072);
        var re = g + ne;
        if (g < Z) {
          var V = s - Z, we = Math.min(Z, re);
          for (V + g < 0 && R(3); g < we; ++g)
            o[g] = a[V + g];
        }
        for (; g < re; ++g)
          o[g] = o[g - Z];
      }
    }
    e.l = x, e.p = X, e.b = g, e.f = u, x && (u = 1, e.m = y, e.d = w, e.n = k);
  } while (!u);
  return g != o.length && l ? Te(o, 0, g) : o.subarray(0, g);
}, $t = /* @__PURE__ */ new L(0), q = function(t, e) {
  return t[e] | t[e + 1] << 8;
}, U = function(t, e) {
  return (t[e] | t[e + 1] << 8 | t[e + 2] << 16 | t[e + 3] << 24) >>> 0;
}, Ae = function(t, e) {
  return U(t, e) + U(t, e + 4) * 4294967296;
};
function Dt(t, e) {
  return Mt(t, { i: 2 }, e && e.out, e && e.dictionary);
}
var Oe = typeof TextDecoder < "u" && /* @__PURE__ */ new TextDecoder(), Et = 0;
try {
  Oe.decode($t, { stream: !0 }), Et = 1;
} catch {
}
var Nt = function(t) {
  for (var e = "", o = 0; ; ) {
    var a = t[o++], r = (a > 127) + (a > 223) + (a > 239);
    if (o + r > t.length)
      return { s: e, r: Te(t, o - 1) };
    r ? r == 3 ? (a = ((a & 15) << 18 | (t[o++] & 63) << 12 | (t[o++] & 63) << 6 | t[o++] & 63) - 65536, e += String.fromCharCode(55296 | a >> 10, 56320 | a & 1023)) : r & 1 ? e += String.fromCharCode((a & 31) << 6 | t[o++] & 63) : e += String.fromCharCode((a & 15) << 12 | (t[o++] & 63) << 6 | t[o++] & 63) : e += String.fromCharCode(a);
  }
};
function Lt(t, e) {
  if (e) {
    for (var o = "", a = 0; a < t.length; a += 16384)
      o += String.fromCharCode.apply(null, t.subarray(a, a + 16384));
    return o;
  } else {
    if (Oe)
      return Oe.decode(t);
    var r = Nt(t), s = r.s, o = r.r;
    return o.length && R(8), s;
  }
}
var Ot = function(t, e) {
  return e + 30 + q(t, e + 26) + q(t, e + 28);
}, Rt = function(t, e, o) {
  var a = q(t, e + 28), r = Lt(t.subarray(e + 46, e + 46 + a), !(q(t, e + 8) & 2048)), s = e + 46 + a, l = U(t, e + 20), i = o && l == 4294967295 ? It(t, s) : [l, U(t, e + 24), U(t, e + 42)], h = i[0], m = i[1], u = i[2];
  return [q(t, e + 10), h, m, r, s + q(t, e + 30) + q(t, e + 32), u];
}, It = function(t, e) {
  for (; q(t, e) != 1; e += 4 + q(t, e + 2))
    ;
  return [Ae(t, e + 12), Ae(t, e + 4), Ae(t, e + 20)];
};
function Tt(t, e) {
  for (var o = {}, a = t.length - 22; U(t, a) != 101010256; --a)
    (!a || t.length - a > 65558) && R(13);
  var r = q(t, a + 8);
  if (!r)
    return {};
  var s = U(t, a + 16), l = s == 4294967295 || r == 65535;
  if (l) {
    var i = U(t, a - 12);
    l = U(t, i) == 101075792, l && (r = U(t, i + 32), s = U(t, i + 48));
  }
  for (var h = e && e.filter, m = 0; m < r; ++m) {
    var u = Rt(t, s, l), c = u[0], g = u[1], x = u[2], w = u[3], y = u[4], k = u[5], C = Ot(t, k);
    s = y, (!h || h({
      name: w,
      size: g,
      originalSize: x,
      compression: c
    })) && (c ? c == 8 ? o[w] = Dt(t.subarray(C, C + g), { out: new L(x) }) : R(14, "unknown compression type " + c) : o[w] = Te(t, C, C + g));
  }
  return o;
}
const Yt = /\.(?:html?|xml|json|jpe?g|png|webp)$/i;
function Zt(t) {
  const e = Tt(new Uint8Array(t), {
    filter: (a) => Yt.test(a.name) && a.originalSize <= 104857600
  }), o = Object.entries(e).map(([a, r]) => ({ name: Ut(a), data: r })).filter((a) => a.name);
  if (o.length > 5e3) throw Error("В архиве слишком много файлов.");
  if (o.reduce((a, r) => a + r.data.length, 0) > 300 * 1024 * 1024) throw Error("Распакованные данные превышают 300 МБ.");
  return o;
}
const Ce = (t) => new TextDecoder().decode(t.data);
async function Bt(t) {
  const e = t.name.split(".").pop()?.toLowerCase(), o = e === "png" ? "image/png" : e === "webp" ? "image/webp" : "image/jpeg", a = t.data.buffer.slice(t.data.byteOffset, t.data.byteOffset + t.data.byteLength);
  return await new Promise((r, s) => {
    const l = new FileReader();
    l.onload = () => r(l.result), l.onerror = () => s(l.error), l.readAsDataURL(new Blob([a], { type: o }));
  });
}
function Ut(t) {
  const e = t.replace(/\\/g, "/").split("/").filter(Boolean);
  if (e.includes("..")) throw Error("Архив содержит небезопасный путь.");
  return e.join("/");
}
async function Ft(t) {
  const e = Zt(t), o = e.find((i) => i.name.toLowerCase() === "manifest.json");
  let a = "review.json", r = "";
  if (o) {
    const i = JSON.parse(Ce(o));
    if (i?.format !== "nashepo.clash-package" || i.version !== 1) throw Error("Неподдерживаемый пакет коллизий.");
    a = String(i.files?.review || a), r = String(i.files?.report || "");
  }
  const s = Re(e, a);
  let l;
  if (s) l = Je(Ce(s));
  else {
    const i = Re(e, r) || e.find((h) => /\.(html?|xml)$/i.test(h.name));
    if (!i) throw Error("В архиве не найден отчёт или review.json.");
    l = He(Ce(i), i.name);
  }
  return await qt(l, e), l;
}
function Re(t, e) {
  const o = de(e);
  return t.find((a) => de(a.name) === o) || t.find((a) => de(a.name).endsWith("/" + o));
}
async function qt(t, e) {
  for (const o of new Set(t.tests.flatMap((a) => a.clashes.map((r) => r.image)).filter(Boolean))) {
    const a = Re(e, o);
    a && /\.(jpe?g|png|webp)$/i.test(a.name) && (t.images[o] = await Bt(a));
  }
}
const Qt = ":host{display:block;width:100%;height:100%;min-height:240px;color:#24334a;font:12px/1.35 Segoe UI,Arial,sans-serif;container-type:size}*{box-sizing:border-box}button,input,select,textarea{font:inherit}button{cursor:pointer;border:1px solid #d7dfe9;background:#fff;color:#33445b;padding:6px 9px;border-radius:6px;white-space:nowrap}button:hover{background:#edf3fa}button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:2px solid #427ad6;outline-offset:1px}button:disabled{opacity:.4;cursor:default}.primary{background:#2465ba;color:#fff;border-color:#2465ba}.primary:hover{background:#1d5197}input,select,textarea{border:1px solid #d7dfe9;padding:6px 7px;border-radius:5px;min-width:0;background:#fff;color:#24334a}textarea{resize:vertical}label{display:flex;flex-direction:column;gap:3px;color:#62728a;font-size:10px}h1,h2,h3,p{margin:0}h1{font-size:16px;line-height:1}h2{font-size:11px}small{font-size:9px;color:#7b899b}.app{height:100%;min-height:240px;background:#f5f7fa;display:flex;flex-direction:column;overflow:hidden}header{min-height:50px;background:#fff;padding:7px 12px;border-bottom:1px solid #dfe5ed;display:flex;align-items:center;gap:12px}.brand{display:flex;align-items:center;gap:7px;flex:0 0 auto}.brand small{letter-spacing:.9px;font-size:7px;font-weight:700}.brand-icon{width:28px;height:30px;display:grid;place-items:center;background:#2465ba;color:#fff;font-size:22px;font-weight:800;border-radius:7px}.version{color:#7c8a9a;font-size:8px}.toolbar{display:flex;gap:5px;flex-wrap:nowrap}.toolbar button{font-size:10px;padding:6px 8px}.notice{margin-left:auto;max-width:300px;font-size:9px;color:#66778f;text-align:right;overflow-wrap:anywhere}.notice.error{color:#b52c31;background:#fff1f0;padding:5px;border-radius:4px}#save-state{position:absolute;right:10px;bottom:3px}.workspace{display:grid;grid-template-columns:minmax(190px,15%) minmax(420px,1fr) minmax(360px,29%);flex:1;min-height:0;overflow:hidden}aside{padding:9px;border-right:1px solid #dfe5ed;background:#f8fafc;overflow:auto}.report-block{display:grid;grid-template-columns:1fr auto;gap:7px;align-items:end;margin-bottom:7px}.report-block label{margin:0}.summary{min-width:95px}.summary strong{font-size:20px;line-height:1;color:#243f64;margin-right:4px}.summary span{font-size:8px;color:#6e7e92}.summary div{font-size:8px;color:#8190a3;margin-top:3px}aside h2{display:flex;justify-content:space-between;margin:4px 2px}nav{max-height:calc(100% - 92px);overflow:auto;margin:0 -3px}nav button{display:flex;text-align:left;justify-content:space-between;width:100%;gap:6px;border:0;background:transparent;font-size:10px;padding:5px 6px;margin-bottom:1px}nav button.active{background:#e4edfa;color:#245d9f}nav b{font-size:8px;background:#eaf0f6;border-radius:4px;padding:1px 4px;height:14px}nav button span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.settings{border-top:1px solid #dde5ef;padding-top:7px;margin-top:7px;font-size:10px}.settings summary{cursor:pointer;font-weight:600;color:#40536b}.settings-grid{display:grid;grid-template-columns:repeat(2,minmax(75px,1fr));gap:6px;margin-top:7px}.settings-grid .check{grid-column:span 2;flex-direction:row;align-items:center}.settings-grid input[type=color]{height:29px;width:100%;padding:2px}.settings p{font-size:8px;color:#8894a5;margin-top:6px}.results{background:#fff;min-width:0;border-right:1px solid #dfe5ed;display:flex;flex-direction:column;overflow:hidden}.filters{display:grid;grid-template-columns:minmax(160px,1fr) 115px 115px auto auto;gap:5px;padding:7px 8px;border-bottom:1px solid #e7ecf2}.filters input,.filters select{font-size:10px}.list-head{display:flex;justify-content:space-between;align-items:center;padding:5px 9px;color:#71839a;font-size:9px}.legend{display:flex;gap:4px;align-items:center;font-size:8px;color:#7d8a9c}.legend i{width:6px;height:6px;background:#e53935;border-radius:50%}.legend i.green{background:#20a36b;margin-left:7px}.list{min-height:0;overflow:auto;flex:1}.clash{display:flex;width:100%;align-items:center;gap:7px;border:0;border-bottom:1px solid #edf0f4;border-radius:0;text-align:left;padding:7px 9px}.clash.selected{background:#eff5ff;border-left:3px solid #397bd2;padding-left:6px}.clash-sign{flex-shrink:0;display:grid;place-items:center;width:20px;height:22px;border-radius:5px;background:#ffebea;color:#d93434;font-size:15px;font-weight:700}.clash-sign.reviewed{background:#e4f4ed;color:#28946c;font-size:11px}.clash-text{min-width:0;display:flex;flex-direction:column;gap:1px;flex:1}.clash-text strong{font-size:10px;font-weight:600}.clash-text small{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:8px}.badge{color:#6782a6;background:#edf2f8;border-radius:4px;padding:2px 5px;font-size:8px;max-width:75px;overflow:hidden;text-overflow:ellipsis}.pager{display:flex;gap:10px;justify-content:center;align-items:center;padding:4px;color:#7b8da3;font-size:9px;border-top:1px solid #edf0f4}.pager button{padding:2px 8px}.detail{padding:8px;background:#fff;min-width:0;overflow:auto;display:grid;grid-template-columns:minmax(130px,42%) minmax(160px,1fr);gap:6px 9px;align-content:start}.detail-title{grid-column:1/-1}.detail-title small{letter-spacing:1px;font-size:7px}.detail-title h2{font-size:14px;margin:1px 0}.detail-title span{font-size:9px;color:#8390a0}.snapshot{grid-column:1;grid-row:2/7;border-radius:6px;background:#f2f5f9;border:1px solid #e7edf4;min-height:125px;display:grid;place-items:center;overflow:hidden}.snapshot img{width:100%;height:100%;max-height:190px;object-fit:contain}.snapshot>div{padding:10px;text-align:center;font-size:8px;color:#8795a7;overflow-wrap:anywhere}.snapshot p{margin:4px 0}.detail-actions{grid-column:2;display:flex;gap:4px;flex-wrap:wrap}.detail-actions button{font-size:9px;padding:5px 6px}.coords{grid-column:2;display:grid;grid-template-columns:repeat(3,1fr);padding:6px;border:1px solid #e1e7ef;border-radius:6px}.coords div{display:flex;flex-direction:column;gap:2px;padding:0 3px}.coords b{font:9px Consolas,monospace}.meta{grid-column:2;display:flex;justify-content:space-between;color:#8390a2;font-size:8px}.detail>.review-check{grid-column:2;flex-direction:row;align-items:center;color:#334b65;gap:5px}.detail>label:not(.review-check){grid-column:2}.detail textarea{min-height:36px}.element{grid-column:1/-1;border-top:1px solid #e5eaf0;padding:6px 0}.element summary{font-weight:600;font-size:9px;cursor:pointer}.element dl{font-size:8px;display:grid;grid-template-columns:minmax(65px,.55fr) 1fr;gap:4px;margin:6px 0}.element dt{color:#8a96a5}.element dd{margin:0;overflow-wrap:anywhere}.empty{grid-column:1/-1;text-align:center;padding:35px 14px;color:#98a4b3}.empty>span{display:inline-grid;place-items:center;background:#f1f5fa;border-radius:9px;width:36px;height:36px;font-size:20px;color:#9eb0c6;margin-bottom:8px}.empty h3{font-size:11px;color:#6b7f98;margin-bottom:4px}.empty p{font-size:9px;max-width:260px;margin:auto}footer{height:22px;display:flex;gap:15px;justify-content:space-between;padding:4px 10px;border-top:1px solid #e0e6ed;color:#91a0b3;font-size:8px}footer span{text-align:right}@container (max-width:1050px){.workspace{grid-template-columns:180px minmax(350px,1fr) minmax(310px,34%)}.filters{grid-template-columns:1fr 95px 95px}.filters #show,.filters #hide{grid-row:2}.notice{display:none}}@container (max-width:780px){header{overflow-x:auto}.workspace{grid-template-columns:165px minmax(340px,1fr)}.detail{display:none}.results{border-right:0}.toolbar button{padding:5px}.brand small,.version{display:none}}@container (max-height:360px){header{min-height:40px;padding:4px 8px}.brand-icon{width:24px;height:25px;font-size:18px}h1{font-size:13px}.workspace{grid-template-columns:minmax(175px,14%) minmax(400px,1fr) minmax(330px,28%)}footer{display:none}.filters{padding:4px 6px}.list-head{padding:3px 7px}.clash{padding-top:5px;padding-bottom:5px}.detail{padding:5px}.snapshot{min-height:90px}.snapshot img{max-height:135px}}:host{overflow:hidden}header{position:relative}aside{display:flex;flex-direction:column;overflow:hidden}.report-block{order:1;flex:0 0 auto}.settings{order:2;flex:0 0 auto;max-height:180px;overflow:auto;margin:0 0 7px}aside h2{order:3;flex:0 0 auto}nav{order:4;flex:1 1 auto;min-height:50px;max-height:none}@container (max-height:360px){.settings{max-height:135px}}.filters{grid-template-columns:minmax(150px,1fr) 105px 110px 108px auto auto}.grid-wrap{min-height:0;overflow:auto;flex:1}.data-grid{border-collapse:separate;border-spacing:0;min-width:100%;width:max-content;font-size:9px}.data-grid th{position:sticky;top:0;z-index:2;background:#eef3f8;color:#53677f;text-align:left;font-weight:600;border-bottom:1px solid #d9e1eb;padding:6px 8px;max-width:260px;white-space:nowrap}.data-grid td{height:29px;padding:5px 8px;border-bottom:1px solid #edf0f4;max-width:260px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:#fff}.data-grid tr{cursor:pointer}.data-grid tr:hover td{background:#f4f8fd}.data-grid tr.selected td{background:#e8f1ff;border-bottom-color:#cbdcf3}.data-grid tr.selected td:first-child{box-shadow:inset 3px 0 #397bd2}.data-grid tr.reviewed td{color:#27805f;background:#f1faf6}.data-grid tr.disabled td{color:#8c98a7;background:#f1f3f5;text-decoration:line-through}.legend i.gray{background:#96a0ac;margin-left:7px}.state-row{grid-column:2;display:flex;gap:12px;align-items:center}.state-row .review-check{flex-direction:row;align-items:center;color:#334b65}.state-row .worked{color:#21845e;font-weight:600}.columns-dialog{width:min(920px,92vw);height:min(680px,82vh);border:0;border-radius:10px;padding:0;color:#24334a;box-shadow:0 18px 60px #0006}.columns-dialog::backdrop{background:#17233399}.dialog-title{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid #dfe5ed}.dialog-title h2{font-size:17px}.dialog-title button{border:0;font-size:22px}.column-options{display:flex;gap:9px;align-items:center;padding:10px 14px;background:#f6f8fb;border-bottom:1px solid #e2e7ee}.column-options .check{flex-direction:row;align-items:center;font-size:11px}.column-table-wrap{height:calc(100% - 145px);overflow:auto}.column-table{width:100%;border-collapse:collapse;font-size:11px}.column-table th{position:sticky;top:0;background:#edf2f7;text-align:left;padding:7px;border-bottom:1px solid #d8e0e9}.column-table td{padding:5px 7px;border-bottom:1px solid #edf0f4}.column-table td:first-child{width:85px;text-align:center}.column-table td:nth-child(2){width:45%}.column-table input[type=text],.column-table input:not([type]){width:100%}.column-table button{padding:3px 8px}.columns-dialog>p{padding:8px 14px;color:#718197;font-size:10px}@container (max-width:1050px){.filters{grid-template-columns:1fr 95px 100px 100px}.filters #show,.filters #hide{grid-row:2}}@container (max-height:360px){.data-grid td{height:25px;padding:3px 6px}.data-grid th{padding:4px 6px}.columns-dialog{height:92vh}}.settings-dialog[open]{display:flex;flex-direction:column}.settings-tabs{display:flex;gap:6px;padding:9px 14px;border-bottom:1px solid #e2e7ee;background:#f6f8fb}.settings-tabs button.active{background:#2465ba;border-color:#2465ba;color:#fff}.settings-page{min-height:0;overflow:auto;padding:18px}.marker-settings-page .settings-grid{grid-template-columns:repeat(3,minmax(150px,1fr));max-width:760px;gap:14px}.marker-settings-page .settings-grid .check{grid-column:1/-1}.marker-settings-page input[type=color]{width:100%;height:34px;padding:2px}.settings-note{padding:10px 0 0;color:#718197;font-size:11px}.columns-page:not([hidden]){display:flex;flex:1;flex-direction:column;padding:0}.columns-page .column-table-wrap{flex:1;height:auto}.columns-page .settings-note{padding:8px 14px}@container (max-width:700px){.marker-settings-page .settings-grid{grid-template-columns:repeat(2,minmax(120px,1fr))}}", Gt = ":host{color:#d8dee8;color-scheme:dark}button{border-color:#46515f;background:#2c333d;color:#e6ebf2}button:hover{background:#3a4552}button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline-color:#f2c94c}.primary{background:#2869bc;border-color:#3479cf;color:#fff}.primary:hover{background:#3479cf}input,select,textarea{border-color:#46515f;background:#20262e;color:#edf1f7}label{color:#aab5c3}small{color:#929eae}.app{background:#171b21}header{background:#20252d;border-bottom-color:#3c4653}.brand-icon{background:#3479cf}.version,.notice{color:#929eae}.notice.error{color:#ffaca8;background:#572b2d}aside{background:#1c2229;border-right-color:#3c4653}.summary strong{color:#f0f3f8}.summary span,.summary div{color:#98a4b3}nav button{color:#cdd5df}nav button:hover{background:#2d3743}nav button.active{background:#35485f;color:#f4ca4d}nav b{background:#303946;color:#cbd3de}.settings{border-top-color:#3c4653}.settings summary{color:#d5dce5}.settings p{color:#929eae}.results,.detail{background:#181d23;border-color:#3c4653}.filters,.pager,footer{border-color:#3c4653}.list-head,.legend,.pager{color:#929eae}.data-grid th{background:#252c35;color:#c3ccd8;border-bottom-color:#46515f}.data-grid td{background:#1b2027;color:#d7dde6;border-bottom-color:#303944}.data-grid tr:hover td{background:#29323d}.data-grid tr.selected td{background:#4b4326;color:#fff3bd;border-bottom-color:#736331}.data-grid tr.selected td:first-child{box-shadow:inset 3px 0 #f2c94c}.data-grid tr.reviewed td{color:#76d6a6;background:#1d3029}.data-grid tr.reviewed.selected td{color:#fff3bd;background:#4b4326}.data-grid tr.excluded td{color:#9aa4b1;background:#242930}.data-grid tr.excluded td:not(:first-child){text-decoration:line-through}.data-grid tr.disabled td{color:#77828f;background:#20252b}.detail-title span,.meta,.element dt{color:#929eae}.snapshot{background:#11151a;border-color:#3c4653}.snapshot>div{color:#929eae}.coords{border-color:#46515f;background:#20262e}.detail>.review-check,.state-row .review-check{color:#cfd6df}.element{border-top-color:#3c4653}.empty{color:#84909f}.empty>span{background:#252d36;color:#aeb9c7}.empty h3{color:#c9d2dd}.columns-dialog{background:#20262e;color:#dce3ec;box-shadow:0 18px 60px #000c}.columns-dialog::backdrop{background:#080b0dcc}.dialog-title{border-bottom-color:#46515f}.dialog-title button{background:transparent}.column-options{background:#191e25;border-bottom-color:#46515f}.column-table th{background:#29313b;color:#d7dee7;border-bottom-color:#46515f}.column-table td{background:#20262e;border-bottom-color:#38424e}.columns-dialog>p{color:#9aa6b6}[hidden]{display:none!important}:host{font-size:13px;line-height:1.4}button,input,select,textarea{font-size:12px}label{font-size:11px}small{font-size:10px}header{min-height:54px;padding:7px 12px}.brand{min-width:132px;gap:8px}.brand img{width:34px;height:34px;object-fit:contain;border-radius:7px}.brand strong{color:#f3f6fa;font-size:16px;letter-spacing:.15px}.brand .version{font-size:9px}.toolbar button{font-size:11px;padding:7px 9px}.toolbar{align-items:center}.toolbar-report{flex-direction:row;align-items:center;gap:6px;white-space:nowrap}.toolbar-report select{width:170px;padding:6px 7px}.notice{font-size:10px}.workspace{grid-template-columns:minmax(220px,16%) minmax(500px,1fr) minmax(390px,29%)}.summary span,.summary div,.summary small{font-size:10px}.summary div b{color:#f4ca4d}.settings summary,aside h2{font-size:12px}.settings p{font-size:10px}#tests{display:flex;flex-direction:column;gap:2px}.summary{order:1;flex:0 0 auto;margin-bottom:5px}.settings{order:2}.test-heading{order:3;display:flex;flex-direction:column;gap:4px;margin:1px 0 7px}.test-heading h2{display:flex;justify-content:space-between;margin:0 2px}.test-search{width:100%;margin:0}#tests{order:4}.test-item{display:grid;grid-template-columns:18px minmax(0,1fr) auto;align-items:center;gap:6px;width:100%;padding:7px 6px;border-radius:6px;color:#cdd5df;cursor:pointer}.test-item:hover{background:#2d3743}.test-item.active{background:#35485f;color:#f4ca4d}.test-item input{margin:0;accent-color:#f2c94c}.test-item span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px}.test-item span small{display:block;color:#929eae;font-size:9px}.test-item b{min-width:25px;padding:2px 5px;border-radius:5px;background:#303946;color:#cbd3de;text-align:center;font-size:10px}.filters{grid-template-columns:minmax(190px,1fr) 125px 125px 125px auto;align-items:center}.marker-toggle{min-width:142px;border-color:#5b6674}.marker-toggle.on{background:#1f6348;border-color:#2b9668;color:#eafff5}.bulk{display:flex;align-items:center;gap:6px;min-height:40px;padding:6px 9px;border-bottom:1px solid #46515f;background:#262f39;overflow-x:auto}.bulk strong{color:#f4ca4d;white-space:nowrap;margin-right:4px}.bulk button{padding:5px 8px}#clear-selection{margin-left:auto;font-size:18px;padding:1px 8px}.list-head{font-size:11px}.legend{font-size:10px}.data-grid{font-size:12px}.data-grid th{padding:7px 8px;font-size:12px;max-width:none;white-space:normal;line-height:1.25;vertical-align:bottom}.data-grid td{height:34px;padding:6px 8px;max-width:360px;min-width:80px;white-space:normal;overflow:visible;text-overflow:clip;overflow-wrap:anywhere;-webkit-user-select:text;user-select:text;cursor:text}.data-grid tr{cursor:default}.data-grid td:nth-child(2){min-width:46px}.select-cell{min-width:38px!important;width:38px;max-width:38px!important;text-align:center!important}.select-cell input{width:16px;height:16px;margin:0;accent-color:#f2c94c}.data-grid tr.selected td:nth-child(2){box-shadow:inset 3px 0 #f2c94c}.data-grid tr.selected td:first-child{box-shadow:none}.pager{font-size:11px}.detail-title small{font-size:9px}.detail-title h2{font-size:16px}.detail-title span{font-size:11px}.detail{grid-template-columns:minmax(145px,42%) minmax(180px,1fr)}.snapshot{grid-column:1;grid-row:1;min-height:145px;align-self:start}.detail-controls{grid-column:2;grid-row:1 / span 2;display:flex;flex-direction:column;gap:6px;min-width:0}.detail-title{grid-column:1;grid-row:2;padding:3px 2px 8px;align-self:start}.detail-controls .coords,.detail-controls .state-row,.detail-controls .work-actions,.detail-controls>label{grid-column:auto;width:100%}.detail-controls .work-actions{display:flex}.detail-actions button{font-size:11px}.snapshot-button{position:relative;padding:0;color:#fff;cursor:zoom-in}.snapshot-button:hover{background:#11151a}.snapshot-button span{position:absolute;left:8px;bottom:8px;padding:4px 7px;border-radius:5px;background:#111c;font-size:10px;pointer-events:none}.coords b{font-size:10px}.state-row .review-check,.detail>label{font-size:11px}.work-state{margin-left:auto;padding:3px 8px;border-radius:999px;font-size:10px}.work-state.work{color:#f4ca4d;background:#4b4326}.work-state.done{color:#76d6a6;background:#1d3029}.work-state.excluded{color:#c2c8d0;background:#343b44}.work-actions{grid-column:2;display:flex;gap:5px;flex-wrap:wrap}.work-actions button{padding:5px 7px;font-size:10px}.work-actions button.active{border-color:#f2c94c;color:#fff3bd;background:#4b4326}.work-actions button.active.danger{border-color:#bd7478;color:#ffd9dc;background:#522f33}.element summary{font-size:11px}.element dl{font-size:10px}.empty h3{font-size:15px}.empty p{font-size:12px}.welcome{display:flex;height:100%;min-height:210px;flex-direction:column;justify-content:center;align-items:center;gap:8px}.welcome img{width:58px;height:58px;object-fit:contain}.welcome button{margin-top:6px}.help-dialog{width:min(760px,90vw);height:auto;max-height:82vh}.help-content{padding:15px 18px 20px;overflow:auto;font-size:13px}.help-content h3{margin:14px 0 4px;color:#f0f3f8;font-size:14px}.help-content h3:first-child{margin-top:0}.help-content p{color:#bac4d0}.help-content dl{display:grid;grid-template-columns:155px 1fr;gap:8px 12px;margin:10px 0 0}.help-content dt{color:#f4ca4d;font-weight:600}.help-content dd{margin:0;color:#bac4d0}.developer-links{display:flex;flex-wrap:wrap;gap:10px}.developer-links a{padding:7px 11px;border:1px solid #546171;border-radius:6px;color:#f4ca4d;text-decoration:none}.developer-links a:hover{background:#2a323d;border-color:#f4ca4d}footer{height:25px;font-size:10px}.settings-tabs{background:#191e25;border-bottom-color:#46515f}.settings-tabs button.active{background:#4b4326;border-color:#f2c94c;color:#fff3bd}.settings-note{color:#9aa6b6}@container (max-width: 1100px){.workspace{grid-template-columns:200px minmax(430px,1fr) minmax(340px,32%)}.filters{grid-template-columns:minmax(180px,1fr) 110px 110px}.marker-toggle{grid-column:2 / 4}}", Pt = "0.5.7";
async function Wt(t, e) {
  const o = "nashepo.collision360.marker-settings.v4", a = "nashepo.collision360.table-settings.v2", r = C(), s = I(), l = t.attachShadow ? t.shadowRoot || t.attachShadow({ mode: "open" }) : t;
  l.innerHTML = `<style>${Qt}${Gt}</style><main class="app">
    <header>
      <div class="brand"><img src="${Ge}" alt=""><strong>НашеПО</strong><span class="version">${Pt}</span></div>
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
        <label>Размер знака, м<input id="radius" type="number" value="${r.radius}" min="0.05" step="0.25"></label><label>Подписи<select id="label-mode"><option value="selected">Только выбранная</option><option value="all">Все</option><option value="none">Не показывать</option></select></label>
        <label>Цвет новых<input id="unreviewed-color" type="color" value="${v(r.unreviewedColor)}"></label><label>Цвет отработанных<input id="reviewed-color" type="color" value="${v(r.reviewedColor)}"></label><label>Окантовка выбранного<input id="selected-color" type="color" value="${v(r.selectedColor)}"></label>
        <label>Толщина ножки, px<input id="stem-width" type="number" value="${r.stemWidth}" min="1" max="30" step="1"></label><label class="check"><input id="show-stem" type="checkbox" ${r.showStem ? "checked" : ""}> Ножка до точки конфликта</label>
      </div><p class="settings-note">Щелчок по знаку выбирает коллизию. Конец ножки расположен точно в координате конфликта.</p></section>
      <section class="settings-page marker-settings-page" data-settings-page="camera" hidden><div class="settings-grid">
        <label>Дистанция камеры, м<input id="navigation-radius" type="number" value="${r.navigationRadius}" min="0.5" step="1"></label><label>Масштаб координат<select id="scale"><option value="1">1 — как в отчёте</option><option value="0.001">0,001 — мм → м</option><option value="1000">1000 — м → мм</option></select></label>
        ${["X", "Y", "Z"].map((n, d) => `<label>Сдвиг ${n}<input id="offset${n}" type="number" value="${r.offset[d]}" step="0.1"></label>`).join("")}
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
  const i = (n) => l.querySelector("#" + n);
  let h = [], m;
  const u = /* @__PURE__ */ new Set(), c = /* @__PURE__ */ new Set();
  let g = "", x = 0, w = !0;
  const y = 50, k = document.createElement("small");
  k.id = "save-state", k.setAttribute("role", "status"), l.querySelector("header").append(k);
  function C() {
    try {
      const n = JSON.parse(localStorage.getItem(o) || "{}");
      return { ...Ue(), ...n, offset: Array.isArray(n.offset) ? n.offset : [0, 0, 0] };
    } catch {
      return Ue();
    }
  }
  function I() {
    try {
      return { visible: [...ve], order: [], names: {}, showAll: !1, hideEmpty: !1, ...JSON.parse(localStorage.getItem(a) || "{}") };
    } catch {
      return { visible: [...ve], order: [], names: {}, showAll: !1, hideEmpty: !1 };
    }
  }
  const M = (n, d = !1) => {
    i("message").textContent = n, i("message").classList.toggle("error", d);
  }, $ = async (n) => {
    try {
      const d = await n();
      typeof d == "string" && M(d);
    } catch (d) {
      M(d instanceof Error ? d.message : String(d), !0);
    }
  }, F = () => {
    m && (k.textContent = "Есть несохранённые изменения");
  }, T = () => localStorage.setItem(a, JSON.stringify(s));
  function Q() {
    return r.radius = Number(i("radius").value), r.navigationRadius = Number(i("navigation-radius").value), r.scale = Number(i("scale").value), r.labelMode = i("label-mode").value, r.offset = ["X", "Y", "Z"].map((n) => Number(i("offset" + n).value)), r.stemWidth = Number(i("stem-width").value), r.showStem = i("show-stem").checked, r.unreviewedColor = i("unreviewed-color").value, r.reviewedColor = i("reviewed-color").value, r.selectedColor = i("selected-color").value, Ie(r), localStorage.setItem(o, JSON.stringify(r)), r;
  }
  function N() {
    return ke(m, /* @__PURE__ */ new Set());
  }
  function G() {
    return ke(m, u);
  }
  function O() {
    const n = i("search").value.toLowerCase(), d = i("status").value, p = i("review").value, f = i("visibility").value;
    return G().filter((b) => (!d || b.clash.status === d) && (!p || (p === "work" ? !b.clash.reviewed && !b.clash.excluded : p === "reviewed" ? b.clash.reviewed && !b.clash.excluded : b.clash.excluded)) && (!f || b.clash.enabled === (f === "yes")) && (!n || JSON.stringify(b).toLowerCase().includes(n)));
  }
  const E = () => N().find((n) => n.clash.id === g)?.clash;
  function P(n, d = !0) {
    g = n;
    const p = O().findIndex((f) => f.clash.id === n);
    p >= 0 && (x = Math.floor(p / y)), A(), oe(), d && w && setTimeout(() => $(Y), 0);
  }
  async function Y() {
    w && m && await e.markers(O().map((n) => n.clash), Q(), P, g);
  }
  function ge() {
    const n = i("markers-toggle");
    n.classList.toggle("on", w), n.setAttribute("aria-checked", String(w)), n.textContent = w ? "● Знаки включены" : "○ Знаки выключены";
  }
  function he() {
    const n = ye(N()), d = new Map(s.order.map((p, f) => [p, f]));
    return n.sort((p, f) => (d.get(p.key) ?? 99999) - (d.get(f.key) ?? 99999)).filter((p) => (s.showAll || s.visible.includes(p.key)) && (!s.hideEmpty || N().some((f) => Qe(f, p.key).trim())));
  }
  const W = (n) => s.names[n.key]?.trim() || n.label;
  function H() {
    const n = ze(G()), d = u.size ? `в наборах · ${u.size}` : "во всех проверках";
    i("summary").innerHTML = `<strong>${n.total}</strong><span>коллизий</span><div><b>${n.remaining}</b> надо отработать · ${n.reviewed} готово</div><small>${d}${n.excluded ? ` · ${n.excluded} исключено` : ""}${n.disabled ? ` · ${n.disabled} знаков скрыто` : ""}</small>`;
  }
  function te() {
    const n = i("test-search").value.trim().toLowerCase(), d = m?.tests.filter((f) => !n || f.name.toLowerCase().includes(n)) || [];
    i("test-count").textContent = n ? `${d.length} / ${m?.tests.length || 0}` : String(m?.tests.length || 0);
    const p = ze(N());
    i("tests").innerHTML = `<label class="test-item all ${u.size ? "" : "active"}"><input type="checkbox" data-all-tests ${u.size ? "" : "checked"}><span>Все проверки<small>${p.remaining} надо отработать</small></span><b>${p.total}</b></label>` + d.map((f) => {
      const b = ze(ke(m, /* @__PURE__ */ new Set([f.id])));
      return `<label class="test-item ${u.has(f.id) ? "active" : ""}"><input type="checkbox" data-test="${v(f.id)}" ${u.has(f.id) ? "checked" : ""}><span>${v(f.name)}<small>${b.remaining} в работе${b.excluded ? ` · ${b.excluded} исключено` : ""}</small></span><b>${b.total}</b></label>`;
    }).join("");
  }
  function Z() {
    i("bulk").hidden = !c.size, i("bulk-count").textContent = `Выбрано: ${c.size}`;
  }
  function A() {
    const n = O(), d = Math.ceil(n.length / y);
    x = Math.max(0, Math.min(x, Math.max(0, d - 1))), i("count").textContent = `Коллизии · ${n.length}`;
    const p = he(), f = n.slice(x * y, x * y + y), b = f.length > 0 && f.every((z) => c.has(z.clash.id));
    i("list").innerHTML = f.length ? `<table class="data-grid"><thead><tr><th class="select-cell"><input id="select-page" type="checkbox" ${b ? "checked" : ""} aria-label="Выбрать строки страницы"></th>${p.map((z) => `<th title="${v(z.source)}">${v(W(z))}</th>`).join("")}</tr></thead><tbody>${f.map((z) => `<tr data-clash="${v(z.clash.id)}" class="${z.clash.id === g ? "selected " : ""}${z.clash.excluded ? "excluded " : z.clash.reviewed ? "reviewed " : ""}${z.clash.enabled ? "" : "disabled"}"><td class="select-cell"><input class="row-check" type="checkbox" ${c.has(z.clash.id) ? "checked" : ""} aria-label="Добавить в массовый выбор"></td>${p.map((D) => {
      const K = Qe(z, D.key) || "—";
      return `<td title="${v(K)}">${v(K)}</td>`;
    }).join("")}</tr>`).join("")}</tbody></table>` : `<div class="empty welcome"><img src="${Ge}" alt=""><h3>${m ? "Нет совпадений" : "Загрузите отчёт"}</h3><p>${m ? "Измените поиск или фильтры." : "Откройте HTML/XML Navisworks или ранее сохранённую сессию. После загрузки появятся таблица, наборы и знаки."}</p>${m ? "" : '<button class="primary" id="welcome-import">＋ Открыть отчёт</button>'}</div>`, i("page").textContent = n.length ? `${x + 1} / ${d}` : "0 / 0", i("prev-page").disabled = x === 0, i("next-page").disabled = (x + 1) * y >= n.length, Z();
    const S = i("welcome-import");
    S && (S.onclick = () => i("files").click());
  }
  function oe() {
    const n = E();
    if (!n) {
      i("detail").innerHTML = '<div class="empty"><h3>Карточка коллизии</h3><p>Выберите строку таблицы.</p></div>';
      return;
    }
    const d = m?.images[n.image], p = n.excluded ? "Исключена" : n.reviewed ? "Отработана" : "В работе";
    i("detail").innerHTML = `${d ? `<button class="snapshot snapshot-button" id="open-snapshot" title="Открыть снимок в отдельном окне"><img src="${v(d)}" alt="Снимок ${v(n.name)}"><span>Открыть крупнее</span></button>` : `<div class="snapshot"><div><b>Снимок не загружен</b><p>${v(n.image || "Изображение не указано")}</p></div></div>`}<div class="detail-controls"><div class="detail-actions"><button class="primary" id="focus">⌖ Перейти в 3D</button><button id="previous">← Предыдущая</button><button id="next">Следующая →</button></div><div class="coords">${n.point ? n.point.map((b, S) => `<div><small>${["X", "Y", "Z"][S]}</small><b>${b.toFixed(3)}</b></div>`).join("") : "В отчёте нет координат"}</div><div class="state-row"><label class="review-check" title="Включает или скрывает этот знак в 3D"><input id="enabled" type="checkbox" ${n.enabled ? "checked" : ""}> Показывать знак</label><strong class="work-state ${n.excluded ? "excluded" : n.reviewed ? "done" : "work"}">${p}</strong></div><div class="work-actions"><button id="work-review" class="${n.reviewed && !n.excluded ? "active" : ""}">✓ Отработана</button><button id="work-reopen" class="${!n.reviewed && !n.excluded ? "active" : ""}">Вернуть в работу</button><button id="work-exclude" class="${n.excluded ? "active danger" : ""}">Исключить</button></div><label title="Исходный статус из отчёта Navisworks">Статус Navisworks<input id="edit-status" value="${v(n.status)}" list="known-status"><datalist id="known-status">${["Новый", "Активн.", "Проверено", "Подтверждено", "Исправлено"].map((b) => `<option value="${b}">`).join("")}</datalist></label><label title="Исполнитель, раздел или пакет работ">Группа / назначение<input id="edit-group" value="${v(n.group)}" placeholder="Исполнитель или раздел"></label><label title="Ваш ответ по коллизии">Комментарий<textarea id="note" rows="3" placeholder="Решение, результат проверки…">${v(n.note)}</textarea></label></div><div class="detail-title"><small>КОЛЛИЗИЯ</small><h2>${v(n.name)}</h2><span>${v(n.description)}</span></div>${n.elements.map((b, S) => `<details class="element" ${S === 0 ? "open" : ""}><summary>Элемент ${S + 1} · ${v(b.name || b.id || "Без имени")}</summary><dl><dt>IFC GUID</dt><dd>${v(b.guid || "—")}</dd><dt>Источник</dt><dd>${v(b.source || "—")}</dd>${Object.entries(b.properties).map(([z, D]) => `<dt>${v(z)}</dt><dd>${v(D || "—")}</dd>`).join("")}</dl></details>`).join("")}`, i("focus").onclick = () => $(() => e.focus(n, Q()));
    for (const [b, S] of [["previous", -1], ["next", 1]]) i(b).onclick = () => $(() => ce(S));
    i("enabled").onchange = () => J(n, i("enabled").checked), i("work-review").onclick = () => ne(n, "reviewed"), i("work-reopen").onclick = () => ne(n, "work"), i("work-exclude").onclick = () => ne(n, "excluded");
    const f = i("open-snapshot");
    f && d && (f.onclick = () => ie(d, n.name)), i("edit-status").onchange = () => {
      n.status = i("edit-status").value, F(), ae(), A();
    }, i("edit-group").oninput = () => {
      n.group = i("edit-group").value, F(), A();
    }, i("note").oninput = () => {
      n.note = i("note").value, F(), A();
    };
  }
  function X() {
    F(), H(), te(), A(), oe(), $(Y);
  }
  function J(n, d) {
    n.enabled = d, X();
  }
  function ne(n, d) {
    n.reviewed = d === "reviewed", n.excluded = d === "excluded", X();
  }
  function ie(n, d) {
    const p = `<!doctype html><html lang="ru"><meta charset="utf-8"><title>${v(d)}</title><style>html,body{margin:0;width:100%;height:100%;background:#111;color:#fff}body{display:grid;place-items:center}img{max-width:100%;max-height:100%;object-fit:contain}</style><img src="${v(n)}" alt="${v(d)}">`, f = URL.createObjectURL(new Blob([p], { type: "text/html;charset=utf-8" })), b = window.open(f, "_blank", "width=1280,height=900");
    if (!b)
      throw URL.revokeObjectURL(f), Error("Браузер заблокировал окно снимка. Разрешите всплывающие окна для Топоматик 360.");
    b.opener = null, setTimeout(() => URL.revokeObjectURL(f), 6e4);
  }
  async function ce(n) {
    const d = O(), p = d.findIndex((b) => b.clash.id === g), f = d[p + n];
    if (f)
      return P(f.clash.id, !1), await Y(), e.focus(f.clash, Q());
  }
  function ae() {
    const n = i("status"), d = n.value, p = [...new Set(N().map((f) => f.clash.status))].filter(Boolean);
    n.innerHTML = '<option value="">Все статусы</option>' + p.map((f) => `<option value="${v(f)}">${v(f)}</option>`).join(""), n.value = p.includes(d) ? d : "";
  }
  function re() {
    i("reports").innerHTML = h.length ? h.map((n) => `<option value="${v(n.id)}">${v(n.name)}</option>`).join("") : '<option value="">Нет загруженных отчётов</option>', i("reports").value = m?.id || "", H(), te(), ae(), A(), oe(), ge();
  }
  function V() {
    const n = ye(N()), d = new Map(s.order.map((f, b) => [f, b])), p = n.sort((f, b) => (d.get(f.key) ?? 99999) - (d.get(b.key) ?? 99999));
    s.order = p.map((f) => f.key), i("column-settings").innerHTML = p.map((f, b) => `<tr data-column-row="${v(f.key)}"><td><input class="column-visible" type="checkbox" ${s.visible.includes(f.key) ? "checked" : ""}></td><td><input class="column-name" value="${v(s.names[f.key] || f.label)}"></td><td>${v(f.source)}</td><td><button class="column-up" ${b === 0 ? "disabled" : ""}>↑</button><button class="column-down" ${b === p.length - 1 ? "disabled" : ""}>↓</button></td></tr>`).join(""), i("show-all-columns").checked = s.showAll, i("hide-empty-columns").checked = s.hideEmpty;
  }
  function we(n, d) {
    const p = s.order.indexOf(n), f = p + d;
    p < 0 || f < 0 || f >= s.order.length || ([s.order[p], s.order[f]] = [s.order[f], s.order[p]], T(), V(), A());
  }
  function be() {
    if (!m) throw Error("Сначала откройте отчёт.");
    const n = c.size ? c : new Set(G().map((d) => d.clash.id));
    return xt(m, n);
  }
  function pe(n) {
    for (const d of N()) c.has(d.clash.id) && (d.clash.enabled = n);
    X();
  }
  function se(n) {
    for (const d of N()) c.has(d.clash.id) && (d.clash.reviewed = n === "reviewed", d.clash.excluded = n === "excluded");
    X();
  }
  async function Ye(n, d = !1) {
    const p = Xe(n), f = h.find((b) => b.id === p.id);
    if (f && d)
      h = h.map((b) => b.id === p.id ? p : b), m = p;
    else if (f) {
      const b = new Map(f.tests.flatMap((S) => S.clashes).map((S) => [S.id, S]));
      for (const S of p.tests) for (const z of S.clashes) {
        const D = b.get(z.id);
        D && Object.assign(z, { enabled: D.enabled, reviewed: D.reviewed, excluded: D.excluded, note: D.note, group: D.group });
      }
      p.images = { ...f.images, ...p.images }, h = h.map((S) => S.id === p.id ? p : S), m = p, M("Отчёт обновлён. Состояния и комментарии сохранены.");
    } else
      h.push(p), m = p;
    u.clear(), c.clear(), x = 0, g = N()[0]?.clash.id || "", w = !0, F(), re(), await Y();
  }
  async function nt(n) {
    let d = 0;
    for (const p of n.filter((f) => /\.(zip|html?|xml|json)$/i.test(f.name))) {
      if (/\.zip$/i.test(p.name)) {
        const D = await Ft(await p.arrayBuffer());
        await Ye(D, !0), d++;
        continue;
      }
      const f = await p.arrayBuffer();
      let b = new TextDecoder().decode(f);
      /charset\s*=\s*["']?windows-1251/i.test(b) && (b = new TextDecoder("windows-1251").decode(f));
      const S = /\.json$/i.test(p.name), z = S ? Je(b) : He(b, p.name);
      await Ze(z, n), await Ye(z, S), d++;
    }
    !d && m && (await Ze(m, n), F(), oe()), M(d ? `Загружено отчётов: ${d}. ${m?.warnings.join(" ") || ""}` : "Снимки подключены.");
  }
  async function Ze(n, d) {
    for (const p of new Set(n.tests.flatMap((f) => f.clashes.map((b) => b.image)).filter(Boolean))) {
      const f = d.filter((z) => {
        const D = de(z.webkitRelativePath || z.name);
        return D === p || D.endsWith("/" + p);
      }), b = d.filter((z) => z.name === p.split("/").at(-1)), S = f.length === 1 ? f[0] : b.length === 1 ? b[0] : void 0;
      !S || !/^image\/(jpeg|png|webp)$/.test(S.type) || (n.images[p] = await new Promise((z, D) => {
        const K = new FileReader();
        K.onload = () => z(K.result), K.onerror = () => D(K.error), K.readAsDataURL(S);
      }));
    }
  }
  i("scale").value = String(r.scale), i("label-mode").value = r.labelMode;
  for (const n of ["radius", "navigation-radius", "stem-width", "scale", "label-mode", "offsetX", "offsetY", "offsetZ", "show-stem", "unreviewed-color", "reviewed-color", "selected-color"]) i(n).addEventListener("change", () => $(async () => (Q(), await Y(), w ? "Настройки применены." : "Настройки сохранены.")));
  i("import").onclick = () => i("files").click(), i("open-session").onclick = () => i("session-file").click(), i("folder").onclick = () => i("directory").click();
  for (const n of ["files", "session-file", "directory"]) i(n).onchange = () => $(async () => {
    const d = i(n);
    await nt(Array.from(d.files || [])), d.value = "";
  });
  i("reports").onchange = () => $(async () => {
    m = h.find((n) => n.id === i("reports").value), u.clear(), c.clear(), g = N()[0]?.clash.id || "", x = 0, w = !0, re(), await Y();
  }), i("test-search").oninput = () => te(), i("tests").onchange = (n) => $(async () => {
    const d = n.target;
    if (d.matches("[data-all-tests]")) u.clear();
    else if (d.matches("[data-test]")) {
      const p = d.dataset.test;
      d.checked ? u.add(p) : u.delete(p);
    }
    x = 0, O().some((p) => p.clash.id === g) || (g = O()[0]?.clash.id || ""), H(), te(), A(), oe(), await Y();
  }), i("list").onclick = (n) => {
    const d = n.target;
    if (d.id === "select-page") {
      for (const f of O().slice(x * y, x * y + y)) d.checked ? c.add(f.clash.id) : c.delete(f.clash.id);
      A();
      return;
    }
    if (d.classList.contains("row-check")) {
      const f = d.closest("[data-clash]");
      f && (d.checked ? c.add(f.dataset.clash) : c.delete(f.dataset.clash)), Z();
      return;
    }
    if (window.getSelection()?.toString()) return;
    const p = d.closest("[data-clash]");
    p && P(p.dataset.clash);
  }, i("list").ondblclick = (n) => {
    if (n.target.classList.contains("row-check")) return;
    const d = n.target.closest("[data-clash]");
    if (!d) return;
    P(d.dataset.clash, !1);
    const p = E();
    p && $(async () => (await Y(), e.focus(p, Q())));
  };
  for (const n of ["search", "status", "review", "visibility"]) i(n).addEventListener(n === "search" ? "input" : "change", () => {
    x = 0, A(), $(Y);
  });
  i("prev-page").onclick = () => {
    x--, A();
  }, i("next-page").onclick = () => {
    x++, A();
  }, i("markers-toggle").onclick = () => $(async () => (w = !w, ge(), w ? e.markers(O().map((n) => n.clash), Q(), P, g) : e.hide())), i("bulk-review").onclick = () => se("reviewed"), i("bulk-reopen").onclick = () => se("work"), i("bulk-exclude").onclick = () => se("excluded"), i("bulk-show").onclick = () => pe(!0), i("bulk-hide").onclick = () => pe(!1), i("clear-selection").onclick = () => {
    c.clear(), A();
  }, i("settings").onclick = () => {
    V(), i("settings-dialog").showModal();
  }, i("close-settings").onclick = () => i("settings-dialog").close(), i("settings-tabs").onclick = (n) => {
    const d = n.target.closest("[data-settings-tab]");
    if (d) {
      for (const p of l.querySelectorAll("[data-settings-tab]")) p.classList.toggle("active", p === d);
      for (const p of l.querySelectorAll("[data-settings-page]")) p.hidden = p.dataset.settingsPage !== d.dataset.settingsTab;
    }
  }, i("help").onclick = () => i("help-dialog").showModal(), i("close-help").onclick = () => i("help-dialog").close(), i("column-settings").onchange = (n) => {
    const d = n.target, p = d.closest("[data-column-row]");
    if (!p) return;
    const f = p.dataset.columnRow;
    d.classList.contains("column-visible") && (s.visible = d.checked ? [.../* @__PURE__ */ new Set([...s.visible, f])] : s.visible.filter((b) => b !== f)), d.classList.contains("column-name") && (s.names[f] = d.value), T(), A();
  }, i("column-settings").onclick = (n) => {
    const d = n.target.closest("button"), p = d?.closest("[data-column-row]");
    d && p && (n.preventDefault(), we(p.dataset.columnRow, d.classList.contains("column-up") ? -1 : 1));
  }, i("show-all-columns").onchange = () => {
    s.showAll = i("show-all-columns").checked, T(), A();
  }, i("hide-empty-columns").onchange = () => {
    s.hideEmpty = i("hide-empty-columns").checked, T(), A();
  }, i("select-columns").onclick = () => {
    s.visible = ye(N()).map((n) => n.key), T(), V(), A();
  }, i("clear-columns").onclick = () => {
    s.visible = [], s.showAll = !1, T(), V(), A();
  }, i("reset-columns").onclick = () => {
    Object.assign(s, { visible: [...ve], order: [], names: {}, showAll: !1, hideEmpty: !1 }), T(), V(), A();
  }, i("session").onclick = () => $(() => {
    if (!m) throw Error("Сначала откройте отчёт.");
    return Be(m.name.replace(/\.[^.]+$/, "") + ".collision360.json", JSON.stringify(m, null, 2), "application/json"), k.textContent = "Сессия сохранена", "Рабочая сессия сохранена. Для продолжения используйте «Открыть сессию».";
  }), i("export").onclick = () => $(() => {
    const n = be();
    return Be(n.name.replace(/\.[^.]+$/, "") + "-review.html", pt(n), "text/html;charset=utf-8"), `HTML-отчёт сформирован: ${n.tests.reduce((d, p) => d + p.clashes.length, 0)} коллизий.`;
  }), re();
}
function Me(t) {
  return new Proxy(t, { get(e, o) {
    return o === "app" ? t.manager.activeApp : o === "cadview" ? t.manager.activeWindow?.context : Reflect.get(e, o);
  } });
}
const Ht = {
  open(t) {
    t.manager.revealView("nashepo.collision360/collision_panel");
  },
  async mount(t) {
    const e = t.el;
    if (!e) return;
    const o = document.createElement("div");
    o.style.height = "100%", e.replaceChildren(o), await Wt(o, {
      mode: "Загрузите отчёт или откройте сохранённую сессию",
      markers: (a, r, s, l) => gt(Me(t), a, r, (i) => {
        t.manager.revealView("nashepo.collision360/collision_panel"), s(i);
      }, l),
      hide: () => ht(Me(t)),
      focus: (a, r) => Ve(Me(t), a, r)
    });
  }
};
export {
  Ht as default
};
