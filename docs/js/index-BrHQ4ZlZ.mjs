const F = () => ({ guid: "", id: "", source: "", name: "", properties: {} }), ve = (a) => a.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
function Ne(a) {
  let e = 2166136261;
  for (let t = 0; t < a.length; t++) e = Math.imul(e ^ a.charCodeAt(t), 16777619);
  return (e >>> 0).toString(16);
}
function se(a) {
  try {
    a = decodeURIComponent(a);
  } catch {
  }
  return a.trim().replace(/\\/g, "/").replace(/^\.\//, "");
}
function oe(a) {
  const e = Object.entries(a), t = (u) => e.find(([l]) => u.test(ve(l)))?.[1] ?? "";
  return { guid: t(/ifcguid|globalid/), id: t(/^(объект)?id$|elementid|идентификаторэлемента/).replace(/^.*?:\s*/, ""), source: t(/файлиcточника|файлисточника|sourcefile/), name: t(/ifcname|^name$|^имя$/), properties: a };
}
const N = (a) => a?.textContent?.replace(/\s+/g, " ").trim() ?? "", ye = (a) => ({ id: a, name: "", status: "", distance: "", description: "", date: "", image: "", group: "", elements: [F(), F()], properties: {}, enabled: !0, reviewed: !1, excluded: !1, note: "" });
function Oe(a) {
  const e = ["X", "Y", "Z"].map((t) => a.match(new RegExp(t + "\\s*:\\s*([-+]?\\d+(?:[.,]\\d+)?(?:[eE][-+]?\\d+)?)", "i"))?.[1]);
  return e.every((t) => t !== void 0) ? e.map((t) => Number(t.replace(",", "."))) : void 0;
}
function Re(a, e) {
  if (a.length > 100 * 1024 * 1024) throw Error("Отчёт больше 100 МБ. Разделите его на несколько проверок.");
  const t = { version: 1, id: Ne(a), name: e, tests: [], images: {}, warnings: [] };
  if (/<\s*(?:\w+:)?(?:batchtest|clashtests|clashresults)\b/i.test(a) ? Te(a, t) : Ie(a, t), !t.tests.length) throw Error("Не найдены проверки Navisworks. Выберите отчёт HTML (табличный) или XML.");
  const l = t.tests.flatMap((n) => n.clashes).filter((n) => n.elements.some((s) => !s.guid)).length;
  return l && t.warnings.push(`У ${l} коллизий нет IFC GUID одного или обоих объектов. Для привязки потребуется совпадение ID и имени модели.`), t;
}
function Ie(a, e) {
  const t = document.createElement("template");
  t.innerHTML = a;
  let u = "Проверка";
  for (const l of t.content.querySelectorAll("table")) {
    if (l.matches(".testSummaryTable")) {
      u = N(l.querySelector(".testName")) || u;
      continue;
    }
    if (!l.matches(".mainTable")) continue;
    const n = { id: `${e.id}:t${e.tests.length}`, name: u, clashes: [] }, s = Array.from(l.rows), i = s.find((m) => Array.from(m.cells).some((g) => g.matches(".item1Header")));
    if (!i) {
      e.warnings.push(`Не распознаны колонки проверки «${u}».`);
      continue;
    }
    const h = Array.from(i.cells).flatMap((m) => Array.from({ length: m.colSpan }, () => ({ name: N(m), side: m.matches(".item1Header") ? 1 : m.matches(".item2Header") ? 2 : 0 })));
    let p = "";
    for (const m of s.filter((g) => g.matches(".contentRow,.childRow,.childRowLast,.clashGroupRow"))) {
      const g = ye(`${n.id}:c${n.clashes.length}`), b = [{}, {}];
      let v = 0;
      for (const x of Array.from(m.cells)) {
        const z = h[v];
        if (v += x.colSpan, !z) continue;
        const S = N(x), C = ve(z.name);
        z.side ? b[z.side - 1][z.name] = S : (g.properties[z.name] = S, /наименованиеконфликта|clashname/.test(C) ? g.name = S : /статус|status/.test(C) ? g.status = S : /расстояние|distance/.test(C) ? g.distance = S : /описание|description/.test(C) ? g.description = S : /датаобнаружения|datefound/.test(C) ? g.date = S : /точкаконфликта|clashpoint/.test(C) && (g.point = Oe(S)));
        const O = x.querySelector("img")?.getAttribute("src");
        O && (g.image = se(O));
      }
      if (m.matches(".clashGroupRow")) {
        p = g.name;
        continue;
      }
      m.matches(".contentRow") && (p = ""), g.group = p, g.elements = [oe(b[0]), oe(b[1])], g.name && n.clashes.push(g), m.matches(".childRowLast") && (p = "");
    }
    e.tests.push(n);
  }
}
function Te(a, e) {
  if (/<!DOCTYPE|<!ENTITY/i.test(a)) throw Error("XML с DTD/ENTITY не поддерживается. Экспортируйте стандартный XML Navisworks.");
  const t = new DOMParser().parseFromString(a, "application/xml");
  if (t.querySelector("parsererror")) throw Error("XML повреждён: проверьте закрывающие теги и кодировку.");
  for (const u of t.querySelectorAll("clashtest")) {
    const l = { id: `${e.id}:t${e.tests.length}`, name: u.getAttribute("name") || "Проверка", clashes: [] };
    for (const n of u.querySelectorAll("clashresult")) {
      const s = ye(`${l.id}:c${l.clashes.length}`);
      for (const m of ["name", "status", "distance"]) s[m] = n.getAttribute(m) || "";
      s.description = N(n.querySelector("description")), s.image = se(n.getAttribute("href") || ""), s.group = n.closest("clashgroup")?.getAttribute("name") || "";
      const i = n.querySelector("createddate date");
      s.date = i ? ["year", "month", "day"].map((m) => i.getAttribute(m) || "").join("-") : "";
      const h = n.querySelector("clashpoint pos3f");
      h && ["x", "y", "z"].every((m) => h.hasAttribute(m) && Number.isFinite(Number(h.getAttribute(m)))) && (s.point = ["x", "y", "z"].map((m) => Number(h.getAttribute(m)))), s.properties = { Name: s.name, Status: s.status, Distance: s.distance, Description: s.description, "Clash point": s.point?.join("; ") || "" };
      const p = Array.from(n.querySelectorAll("clashobjects clashobject")).map((m) => {
        const g = {};
        for (const x of m.querySelectorAll("objectattribute,smarttag")) {
          const z = N(x.querySelector("name"));
          z && (g[z] = N(x.querySelector("value")));
        }
        const b = oe(g), v = Array.from(m.querySelectorAll("pathlink node")).map(N);
        return b.source || (b.source = v.find((x) => /\.(ifc|smdx|rvt|nwc|nwd)$/i.test(x)) || ""), b.name || (b.name = N(m.querySelector("name")) || v.at(-1) || ""), b;
      });
      s.elements = [p[0] || F(), p[1] || F()], l.clashes.push(s);
    }
    e.tests.push(l);
  }
}
function ke(a) {
  for (const e of a.tests || []) for (const t of e.clashes || [])
    t.properties = t.properties && typeof t.properties == "object" ? t.properties : {}, t.enabled = typeof t.enabled == "boolean" ? t.enabled : !0, t.reviewed = !!t.reviewed, t.excluded = !!t.excluded, t.note = typeof t.note == "string" ? t.note : "";
  return a;
}
function Ye(a) {
  const e = JSON.parse(a), t = (l) => typeof l == "string";
  if (e?.version !== 1 || !t(e.id) || !t(e.name) || !Array.isArray(e.tests) || !e.images || typeof e.images != "object" || !Array.isArray(e.warnings) || !e.warnings.every(t)) throw Error("Неверный формат сессии.");
  const u = /* @__PURE__ */ new Set();
  for (const l of e.tests) {
    if (!t(l.id) || !t(l.name) || !Array.isArray(l.clashes)) throw Error("Повреждена проверка в сессии.");
    for (const n of l.clashes) {
      if (!["id", "name", "status", "distance", "description", "date", "image", "group", "note"].every((s) => t(n[s])) || typeof n.reviewed != "boolean" || n.enabled !== void 0 && typeof n.enabled != "boolean" || n.excluded !== void 0 && typeof n.excluded != "boolean" || n.properties !== void 0 && (!n.properties || typeof n.properties != "object" || !Object.values(n.properties).every(t)) || !Array.isArray(n.elements) || n.elements.length !== 2 || u.has(n.id)) throw Error("Повреждена коллизия в сессии.");
      if (u.add(n.id), n.point !== void 0 && (!Array.isArray(n.point) || n.point.length !== 3 || !n.point.every(Number.isFinite))) throw Error("Неверные координаты.");
      for (const s of n.elements) if (!s || !["guid", "id", "source", "name"].every((i) => t(s[i])) || !s.properties || typeof s.properties != "object" || !Object.values(s.properties).every(t)) throw Error("Повреждены свойства объекта.");
    }
  }
  for (const l of Object.values(e.images)) if (!t(l) || !/^data:image\/(png|jpeg|webp);base64,[a-zA-Z0-9+/=\s]+$/.test(l)) throw Error("Неподдерживаемое изображение в сессии.");
  return ke(e);
}
const w = (a) => String(a ?? "").replace(/[&<>"']/g, (e) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[e]), Ze = (a, e) => e ? "Исключена" : a ? "Отработана" : "В работе", Be = (a, e) => a ? `<a href="${w(a)}" target="_blank" title="Открыть снимок"><img src="${w(a)}" alt="Снимок ${w(e)}"></a>` : "—";
function Ue(a) {
  const e = w;
  let t = 0;
  const u = a.tests.flatMap((n) => n.clashes.map((s) => {
    t++;
    const i = Ze(s.reviewed, s.excluded), h = [t, s.name, n.name, i, s.status, s.group, s.note, s.point?.join(" "), ...s.elements.flatMap((p) => [p.name, p.id, p.guid, p.source, ...Object.values(p.properties)]), ...Object.values(s.properties)].join(" ").toLowerCase();
    return `<tr data-state="${e(i)}" data-test="${e(n.name)}" data-search="${e(h)}"><td>${t}</td><td><strong>${e(s.name || `Коллизия ${t}`)}</strong></td><td>${e(n.name)}</td><td><span class="state ${s.excluded ? "excluded" : s.reviewed ? "done" : "work"}">${e(i)}</span><small>${s.enabled ? "Знак показывается" : "Знак скрыт"}</small></td><td>${e(s.status || "—")}</td><td>${e(s.group || "—")}</td><td>${e(s.note || "—")}</td><td>${e(s.point?.map((p) => Number(p.toFixed(3))).join("; ") || "—")}<small>${e(s.distance)}</small></td><td>${Be(a.images[s.image] || "", s.name)}</td><td>${s.elements.map((p, m) => `<div class="object"><b>Элемент ${m + 1}</b><span>${e(p.name || p.id || "—")}</span><small>${e(p.source || "—")}</small><code>${e(p.guid || "GUID отсутствует")}</code></div>`).join("")}</td></tr>`;
  })).join(""), l = a.tests.filter((n) => n.clashes.length).map((n) => `<option value="${e(n.name)}">${e(n.name)}</option>`).join("");
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(a.name)} — отчёт о коллизиях</title><style>
  :root{color-scheme:light;font:14px/1.4 "Segoe UI",Arial,sans-serif;color:#172336;background:#f3f6fa}*{box-sizing:border-box}body{margin:0}.head{background:#17202b;color:#fff;padding:18px 24px;box-shadow:0 2px 12px #0003}.head h1{margin:0 0 3px;font-size:24px}.head p{margin:0;color:#b9c5d3}.filters{display:grid;grid-template-columns:minmax(240px,1fr) 190px 220px auto;gap:10px;margin-top:15px}.filters input,.filters select,.filters button{height:38px;border:1px solid #536274;border-radius:6px;background:#242f3c;color:#fff;padding:0 11px;font:inherit}.filters button{cursor:pointer;background:#356fb9}.count{align-self:center;color:#dce5ef;white-space:nowrap}.table-wrap{padding:18px;overflow:auto}table{border-collapse:separate;border-spacing:0;width:100%;min-width:1500px;background:#fff;box-shadow:0 4px 22px #21314a1c}th{background:#e5ebf2;color:#35465b;text-align:left;white-space:normal;line-height:1.3;vertical-align:bottom}th,td{border-right:1px solid #d9e0e8;border-bottom:1px solid #d9e0e8;padding:9px;vertical-align:top}td:first-child{width:55px;text-align:center}td:nth-child(2){min-width:170px}td:nth-child(7){min-width:220px;white-space:pre-wrap}td:nth-child(10){min-width:290px}tbody tr:hover td{background:#f2f7fc}small{display:block;color:#68788c;margin-top:3px}.state{display:inline-block;border-radius:999px;padding:3px 9px;font-weight:650}.state.work{background:#fff0c2;color:#6f5100}.state.done{background:#d9f4e5;color:#12683d}.state.excluded{background:#e4e7eb;color:#59616c}.object{display:grid;gap:2px;margin-bottom:10px}.object:last-child{margin-bottom:0}.object code{overflow-wrap:anywhere;color:#315f98}img{display:block;width:150px;height:90px;object-fit:contain;background:#eef2f6;cursor:zoom-in}[hidden]{display:none!important}@media print{.filters{display:none}.table-wrap{padding:0}tr{break-inside:avoid}body{background:#fff}}
  </style></head><body><header class="head"><h1>Отчёт о коллизиях</h1><p>${e(a.name)}</p><div class="filters"><input id="search" type="search" placeholder="Поиск по отчёту"><select id="state"><option value="">Все состояния</option><option>В работе</option><option>Отработана</option><option>Исключена</option></select><select id="test"><option value="">Все проверки</option>${l}</select><button onclick="window.print()">Печать</button><span class="count" id="count"></span></div></header><div class="table-wrap"><table><thead><tr><th>№</th><th>Коллизия</th><th>Проверка</th><th>Состояние</th><th>Статус Navisworks</th><th>Группа / назначение</th><th>Комментарий</th><th>Координаты / расстояние</th><th>Снимок</th><th>Объекты модели</th></tr></thead><tbody id="rows">${u}</tbody></table></div><script>
  const search=document.querySelector('#search'),state=document.querySelector('#state'),test=document.querySelector('#test'),rows=[...document.querySelectorAll('#rows tr')],count=document.querySelector('#count');function apply(){const q=search.value.trim().toLowerCase();let shown=0;for(const row of rows){const visible=(!q||row.dataset.search.includes(q))&&(!state.value||row.dataset.state===state.value)&&(!test.value||row.dataset.test===test.value);row.hidden=!visible;if(visible)shown++}count.textContent='Показано: '+shown+' из '+rows.length}search.addEventListener('input',apply);state.addEventListener('change',apply);test.addEventListener('change',apply);apply();
  <\/script></body></html>`;
}
function fe(a, e, t) {
  const u = URL.createObjectURL(new Blob([e], { type: t })), l = document.createElement("a");
  l.href = u, l.download = a, l.click(), setTimeout(() => URL.revokeObjectURL(u), 3e4);
}
const ge = () => ({ radius: 2, navigationRadius: 15, scale: 1, offset: [0, 0, 0], labelMode: "selected", showStem: !0, stemWidth: 6, unreviewedColor: "#e1372d", reviewedColor: "#28b94b", selectedColor: "#f2c94c" });
function q(a, e) {
  return a.point?.map((t, u) => t * e.scale + e.offset[u]);
}
function re(a) {
  if (!Number.isFinite(a.radius) || a.radius < 0.05 || !Number.isFinite(a.navigationRadius) || a.navigationRadius < 0.5 || !Number.isFinite(a.scale) || a.scale <= 0 || !a.offset.every(Number.isFinite)) throw Error("Размер знака и дистанция камеры должны быть положительными, смещения — конечными числами.");
  if (!Number.isFinite(a.stemWidth) || a.stemWidth < 1 || a.stemWidth > 30) throw Error("Толщина ножки должна быть от 1 до 30 пикселей.");
  if (!["selected", "all", "none"].includes(a.labelMode)) throw Error("Выбран неверный режим подписей.");
  if (![a.unreviewedColor, a.reviewedColor, a.selectedColor].every((e) => /^#[0-9a-f]{6}$/i.test(e))) throw Error("Цвет знака задан неверно.");
}
const ie = "nashepo.collision360.markers.v4", ae = "nashepo.collision360.selected.v4", ne = /* @__PURE__ */ new WeakMap();
function qe(a, e, t, u, l = 6, n) {
  const [s, i, h] = a, p = i - e * 0.12, m = h + e * 1.9, g = h + e * 5, b = e * 1.65, v = [];
  u && v.push({ type: "line", a: [s, i, h], b: [s, i, m + e * 0.08], color: n || t, width: l }), n && v.push({ type: "polyline", points: [[s - b - e * 0.34, i, m - e * 0.32], [s + b + e * 0.34, i, m - e * 0.32], [s, i, g + e * 0.38], [s - b - e * 0.34, i, m - e * 0.32]], color: n, fillColor: n, width: 2 }), v.push({ type: "polyline", points: [[s - b - e * 0.16, i, m - e * 0.14], [s + b + e * 0.16, i, m - e * 0.14], [s, i, g + e * 0.2], [s - b - e * 0.16, i, m - e * 0.14]], color: "#111111", fillColor: "#111111", width: 4 }), v.push({ type: "polyline", points: [[s - b + e * 0.15, i, m + e * 0.13], [s + b - e * 0.15, i, m + e * 0.13], [s, i, g - e * 0.18], [s - b + e * 0.15, i, m + e * 0.13]], color: t, fillColor: t, width: 2 });
  for (let S = 1; S <= 12; S++) {
    const C = S / 13, O = m + e * 0.13 + (g - m - e * 0.31) * C, R = (b - e * 0.15) * (1 - C) * 0.93;
    v.push({ type: "line", a: [s - R, i - e * 0.04, O], b: [s + R, i - e * 0.04, O], color: t, width: 12 });
  }
  const x = e * 0.13;
  v.push({ type: "polyline", points: [[s - x, p, h + e * 2.93], [s + x, p, h + e * 2.93], [s + x * 0.72, p, h + e * 4.13], [s - x * 0.72, p, h + e * 4.13], [s - x, p, h + e * 2.93]], color: "#ffffff", fillColor: "#ffffff", width: 2 });
  const z = e * 0.17;
  return v.push({ type: "polyline", points: [[s - z, p, h + e * 2.55], [s, p, h + e * 2.38], [s + z, p, h + e * 2.55], [s, p, h + e * 2.72], [s - z, p, h + e * 2.55]], color: "#ffffff", fillColor: "#ffffff", width: 2 }), v;
}
function Qe(a, e, t, u, l, n, s, i = !1) {
  const h = q(e, u), p = e.excluded ? "  [ИСКЛЮЧЕНА]" : e.reviewed ? "  [ОТРАБОТАНА]" : "", m = `#${t + 1}  ${e.name || "Коллизия"}${p}`, g = () => {
    l(e.id), ze(a, e, u);
  }, b = qe(h, u.radius, n, u.showStem, u.stemWidth, i ? u.selectedColor : void 0), v = [{ id: e.id, type: "shaped", shapes: b, activeShapes: b, activateCommand: g, dblCommand: g }];
  return s && v.push({ id: e.id + ":label", type: "simple", position: [h[0], h[1] - u.radius * 0.2, h[2] + u.radius * 5.35], attachment: "above", activateCommand: g, dblCommand: g, label: m, description: e.group || e.status || "Без статуса", labelColor: i ? "#171717" : "#ffffff", labelBackground: i ? u.selectedColor : n }), v;
}
function he(a, e, t, u, l, n, s, i, h = !1) {
  for (const p of Qe(e, t, u, l, n, s, i, h)) a.add(p);
}
const be = (a, e) => a.excluded ? "#78818c" : a.reviewed ? e.reviewedColor : e.unreviewedColor;
function Ge(a, e) {
  return JSON.stringify({ clashes: a.map((t) => [t.id, t.enabled, t.reviewed, t.excluded, t.name, t.group, t.status, t.point]), settings: { ...e, labelMode: e.labelMode === "all" ? "all" : "none" } });
}
function Fe(a, e, t, u, l = "") {
  re(t);
  const n = a.cadview;
  if (!n) throw Error("Создайте или откройте проект Топоматик 360.");
  let s = n.annotations.get(ie);
  s || (s = n.annotations.create(ie, 1e3));
  const i = n.annotations.get(ae);
  i && n.annotations.release(i);
  const h = n.annotations.create(ae, 1e4), p = Ge(e, t);
  ne.get(n)?.signature !== p && (s.clear(), e.forEach((x, z) => {
    if (!x.enabled || !q(x, t)) return;
    const S = be(x, t);
    he(s, a, x, z, t, u, S, t.labelMode === "all");
  }));
  const m = e.findIndex((x) => x.id === l), g = e[m];
  g?.enabled && q(g, t) && he(h, a, g, m, t, u, be(g, t), t.labelMode === "selected", !0), s.visible = !0, h.visible = !0, ne.set(n, { signature: p }), n.invalidate();
  const b = e.filter((x) => x.enabled && q(x, t)).length, v = e.filter((x) => !x.enabled).length;
  return `Показано знаков: ${b}. Отключено: ${v}. Без координат: ${e.length - b - v}.`;
}
function We(a) {
  const e = a.cadview;
  if (e) {
    for (const t of [ie, ae]) {
      const u = e.annotations.get(t);
      u && e.annotations.release(u);
    }
    ne.delete(e), e.invalidate();
  }
  return "Знаки скрыты.";
}
function ze(a, e, t) {
  re(t);
  const u = q(e, t), l = a.cadview;
  if (!u) throw Error("В отчёте нет координат этой коллизии.");
  if (!l) throw Error("Откройте окно проекта Топоматик 360.");
  const n = t.navigationRadius, s = u, i = [1.35, -1.35, 0.8], h = Math.hypot(...i), p = [s[0] + i[0] / h * n, s[1] + i[1] / h * n, s[2] + i[2] / h * n], m = [s[0] - p[0], s[1] - p[1], s[2] - p[2]], g = Math.hypot(...m) || 1, b = [m[0] / g, m[1] / g, m[2] / g];
  return l.camera?.id !== "3d" && l.setCameraType("3d"), l.lookAt(p, b, [0, 0, 1], !0, u), `Переход к ${e.name} с дистанцией ${n} м.`;
}
const He = [
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
], V = ["system:number", "system:state", "system:name", "system:test", "system:status", "system:group", "system:note", "e1:source", "e1:guid", "e2:source", "e2:guid"];
function K(a) {
  const e = [...He], t = new Set(e.map((l) => l.key)), u = (l, n, s) => {
    t.has(l) || (t.add(l), e.push({ key: l, label: n, source: s }));
  };
  for (const { clash: l } of a) {
    for (const n of Object.keys(l.properties || {})) u(`clash:${n}`, n, "HTML · коллизия");
    l.elements.forEach((n, s) => {
      for (const i of Object.keys(n.properties || {})) u(`e${s + 1}:prop:${i}`, i, `HTML · элемент ${s + 1}`);
    });
  }
  return e;
}
function xe(a, e) {
  const t = a.clash, u = {
    "system:number": String(a.number),
    "system:enabled": t.enabled ? "Да" : "Нет",
    "system:state": t.excluded ? "Исключена" : t.reviewed ? "Отработана" : "В работе",
    "system:reviewed": t.reviewed ? "Да" : "Нет",
    "system:excluded": t.excluded ? "Да" : "Нет",
    "system:name": t.name,
    "system:test": a.test,
    "system:status": t.status,
    "system:group": t.group,
    "system:note": t.note,
    "system:point": t.point?.map((n) => Number(n.toFixed(3))).join("; ") || "",
    "system:distance": t.distance,
    "system:date": t.date,
    "system:description": t.description,
    "e1:source": t.elements[0].source,
    "e1:name": t.elements[0].name,
    "e1:guid": t.elements[0].guid,
    "e1:id": t.elements[0].id,
    "e2:source": t.elements[1].source,
    "e2:name": t.elements[1].name,
    "e2:guid": t.elements[1].guid,
    "e2:id": t.elements[1].id
  };
  if (e in u) return u[e];
  if (e.startsWith("clash:")) return t.properties[e.slice(6)] || "";
  const l = /^e([12]):prop:(.*)$/.exec(e);
  return l && t.elements[Number(l[1]) - 1].properties[l[2]] || "";
}
function _(a, e) {
  let t = 0;
  return a?.tests.flatMap((u) => u.clashes.map((l) => ({ clash: l, test: u.name, testId: u.id, number: ++t }))).filter((u) => !e.size || e.has(u.testId)) || [];
}
function ee(a) {
  const e = a.map((t) => t.clash);
  return { total: e.length, remaining: e.filter((t) => !t.reviewed && !t.excluded).length, reviewed: e.filter((t) => t.reviewed && !t.excluded).length, excluded: e.filter((t) => t.excluded).length, disabled: e.filter((t) => !t.enabled).length };
}
function Pe(a, e) {
  return e.size ? { ...structuredClone(a), tests: a.tests.map((t) => ({ ...structuredClone(t), clashes: t.clashes.filter((u) => e.has(u.id)).map((u) => structuredClone(u)) })).filter((t) => t.clashes.length > 0) } : structuredClone(a);
}
const we = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFAAAABQCAYAAACOEfKtAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAydpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDkuMS1jMDAzIDc5Ljk2OTBhODdmYywgMjAyNS8wMy8wNi0yMDo1MDoxNiAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6RDZFQkU2NEQ4QUJDMTFGMUE5MjRBM0M2N0UyOTI4NDYiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6RDZFQkU2NEM4QUJDMTFGMUE5MjRBM0M2N0UyOTI4NDYiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIDI2LjExIChXaW5kb3dzKSI+IDx4bXBNTTpEZXJpdmVkRnJvbSBzdFJlZjppbnN0YW5jZUlEPSJ4bXAuaWlkOjRENDVBNjQzODQzRDExRjE5MkMwQ0YwNkU2ODQzQTZDIiBzdFJlZjpkb2N1bWVudElEPSJ4bXAuZGlkOjRENDVBNjQ0ODQzRDExRjE5MkMwQ0YwNkU2ODQzQTZDIi8+IDwvcmRmOkRlc2NyaXB0aW9uPiA8L3JkZjpSREY+IDwveDp4bXBtZXRhPiA8P3hwYWNrZXQgZW5kPSJyIj8+pHX+ogAAD+lJREFUeNrs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", Xe = ":host{display:block;width:100%;height:100%;min-height:240px;color:#24334a;font:12px/1.35 Segoe UI,Arial,sans-serif;container-type:size}*{box-sizing:border-box}button,input,select,textarea{font:inherit}button{cursor:pointer;border:1px solid #d7dfe9;background:#fff;color:#33445b;padding:6px 9px;border-radius:6px;white-space:nowrap}button:hover{background:#edf3fa}button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline:2px solid #427ad6;outline-offset:1px}button:disabled{opacity:.4;cursor:default}.primary{background:#2465ba;color:#fff;border-color:#2465ba}.primary:hover{background:#1d5197}input,select,textarea{border:1px solid #d7dfe9;padding:6px 7px;border-radius:5px;min-width:0;background:#fff;color:#24334a}textarea{resize:vertical}label{display:flex;flex-direction:column;gap:3px;color:#62728a;font-size:10px}h1,h2,h3,p{margin:0}h1{font-size:16px;line-height:1}h2{font-size:11px}small{font-size:9px;color:#7b899b}.app{height:100%;min-height:240px;background:#f5f7fa;display:flex;flex-direction:column;overflow:hidden}header{min-height:50px;background:#fff;padding:7px 12px;border-bottom:1px solid #dfe5ed;display:flex;align-items:center;gap:12px}.brand{display:flex;align-items:center;gap:7px;flex:0 0 auto}.brand small{letter-spacing:.9px;font-size:7px;font-weight:700}.brand-icon{width:28px;height:30px;display:grid;place-items:center;background:#2465ba;color:#fff;font-size:22px;font-weight:800;border-radius:7px}.version{color:#7c8a9a;font-size:8px}.toolbar{display:flex;gap:5px;flex-wrap:nowrap}.toolbar button{font-size:10px;padding:6px 8px}.notice{margin-left:auto;max-width:300px;font-size:9px;color:#66778f;text-align:right;overflow-wrap:anywhere}.notice.error{color:#b52c31;background:#fff1f0;padding:5px;border-radius:4px}#save-state{position:absolute;right:10px;bottom:3px}.workspace{display:grid;grid-template-columns:minmax(190px,15%) minmax(420px,1fr) minmax(360px,29%);flex:1;min-height:0;overflow:hidden}aside{padding:9px;border-right:1px solid #dfe5ed;background:#f8fafc;overflow:auto}.report-block{display:grid;grid-template-columns:1fr auto;gap:7px;align-items:end;margin-bottom:7px}.report-block label{margin:0}.summary{min-width:95px}.summary strong{font-size:20px;line-height:1;color:#243f64;margin-right:4px}.summary span{font-size:8px;color:#6e7e92}.summary div{font-size:8px;color:#8190a3;margin-top:3px}aside h2{display:flex;justify-content:space-between;margin:4px 2px}nav{max-height:calc(100% - 92px);overflow:auto;margin:0 -3px}nav button{display:flex;text-align:left;justify-content:space-between;width:100%;gap:6px;border:0;background:transparent;font-size:10px;padding:5px 6px;margin-bottom:1px}nav button.active{background:#e4edfa;color:#245d9f}nav b{font-size:8px;background:#eaf0f6;border-radius:4px;padding:1px 4px;height:14px}nav button span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.settings{border-top:1px solid #dde5ef;padding-top:7px;margin-top:7px;font-size:10px}.settings summary{cursor:pointer;font-weight:600;color:#40536b}.settings-grid{display:grid;grid-template-columns:repeat(2,minmax(75px,1fr));gap:6px;margin-top:7px}.settings-grid .check{grid-column:span 2;flex-direction:row;align-items:center}.settings-grid input[type=color]{height:29px;width:100%;padding:2px}.settings p{font-size:8px;color:#8894a5;margin-top:6px}.results{background:#fff;min-width:0;border-right:1px solid #dfe5ed;display:flex;flex-direction:column;overflow:hidden}.filters{display:grid;grid-template-columns:minmax(160px,1fr) 115px 115px auto auto;gap:5px;padding:7px 8px;border-bottom:1px solid #e7ecf2}.filters input,.filters select{font-size:10px}.list-head{display:flex;justify-content:space-between;align-items:center;padding:5px 9px;color:#71839a;font-size:9px}.legend{display:flex;gap:4px;align-items:center;font-size:8px;color:#7d8a9c}.legend i{width:6px;height:6px;background:#e53935;border-radius:50%}.legend i.green{background:#20a36b;margin-left:7px}.list{min-height:0;overflow:auto;flex:1}.clash{display:flex;width:100%;align-items:center;gap:7px;border:0;border-bottom:1px solid #edf0f4;border-radius:0;text-align:left;padding:7px 9px}.clash.selected{background:#eff5ff;border-left:3px solid #397bd2;padding-left:6px}.clash-sign{flex-shrink:0;display:grid;place-items:center;width:20px;height:22px;border-radius:5px;background:#ffebea;color:#d93434;font-size:15px;font-weight:700}.clash-sign.reviewed{background:#e4f4ed;color:#28946c;font-size:11px}.clash-text{min-width:0;display:flex;flex-direction:column;gap:1px;flex:1}.clash-text strong{font-size:10px;font-weight:600}.clash-text small{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:8px}.badge{color:#6782a6;background:#edf2f8;border-radius:4px;padding:2px 5px;font-size:8px;max-width:75px;overflow:hidden;text-overflow:ellipsis}.pager{display:flex;gap:10px;justify-content:center;align-items:center;padding:4px;color:#7b8da3;font-size:9px;border-top:1px solid #edf0f4}.pager button{padding:2px 8px}.detail{padding:8px;background:#fff;min-width:0;overflow:auto;display:grid;grid-template-columns:minmax(130px,42%) minmax(160px,1fr);gap:6px 9px;align-content:start}.detail-title{grid-column:1/-1}.detail-title small{letter-spacing:1px;font-size:7px}.detail-title h2{font-size:14px;margin:1px 0}.detail-title span{font-size:9px;color:#8390a0}.snapshot{grid-column:1;grid-row:2/7;border-radius:6px;background:#f2f5f9;border:1px solid #e7edf4;min-height:125px;display:grid;place-items:center;overflow:hidden}.snapshot img{width:100%;height:100%;max-height:190px;object-fit:contain}.snapshot>div{padding:10px;text-align:center;font-size:8px;color:#8795a7;overflow-wrap:anywhere}.snapshot p{margin:4px 0}.detail-actions{grid-column:2;display:flex;gap:4px;flex-wrap:wrap}.detail-actions button{font-size:9px;padding:5px 6px}.coords{grid-column:2;display:grid;grid-template-columns:repeat(3,1fr);padding:6px;border:1px solid #e1e7ef;border-radius:6px}.coords div{display:flex;flex-direction:column;gap:2px;padding:0 3px}.coords b{font:9px Consolas,monospace}.meta{grid-column:2;display:flex;justify-content:space-between;color:#8390a2;font-size:8px}.detail>.review-check{grid-column:2;flex-direction:row;align-items:center;color:#334b65;gap:5px}.detail>label:not(.review-check){grid-column:2}.detail textarea{min-height:36px}.element{grid-column:1/-1;border-top:1px solid #e5eaf0;padding:6px 0}.element summary{font-weight:600;font-size:9px;cursor:pointer}.element dl{font-size:8px;display:grid;grid-template-columns:minmax(65px,.55fr) 1fr;gap:4px;margin:6px 0}.element dt{color:#8a96a5}.element dd{margin:0;overflow-wrap:anywhere}.empty{grid-column:1/-1;text-align:center;padding:35px 14px;color:#98a4b3}.empty>span{display:inline-grid;place-items:center;background:#f1f5fa;border-radius:9px;width:36px;height:36px;font-size:20px;color:#9eb0c6;margin-bottom:8px}.empty h3{font-size:11px;color:#6b7f98;margin-bottom:4px}.empty p{font-size:9px;max-width:260px;margin:auto}footer{height:22px;display:flex;gap:15px;justify-content:space-between;padding:4px 10px;border-top:1px solid #e0e6ed;color:#91a0b3;font-size:8px}footer span{text-align:right}@container (max-width:1050px){.workspace{grid-template-columns:180px minmax(350px,1fr) minmax(310px,34%)}.filters{grid-template-columns:1fr 95px 95px}.filters #show,.filters #hide{grid-row:2}.notice{display:none}}@container (max-width:780px){header{overflow-x:auto}.workspace{grid-template-columns:165px minmax(340px,1fr)}.detail{display:none}.results{border-right:0}.toolbar button{padding:5px}.brand small,.version{display:none}}@container (max-height:360px){header{min-height:40px;padding:4px 8px}.brand-icon{width:24px;height:25px;font-size:18px}h1{font-size:13px}.workspace{grid-template-columns:minmax(175px,14%) minmax(400px,1fr) minmax(330px,28%)}footer{display:none}.filters{padding:4px 6px}.list-head{padding:3px 7px}.clash{padding-top:5px;padding-bottom:5px}.detail{padding:5px}.snapshot{min-height:90px}.snapshot img{max-height:135px}}:host{overflow:hidden}header{position:relative}aside{display:flex;flex-direction:column;overflow:hidden}.report-block{order:1;flex:0 0 auto}.settings{order:2;flex:0 0 auto;max-height:180px;overflow:auto;margin:0 0 7px}aside h2{order:3;flex:0 0 auto}nav{order:4;flex:1 1 auto;min-height:50px;max-height:none}@container (max-height:360px){.settings{max-height:135px}}.filters{grid-template-columns:minmax(150px,1fr) 105px 110px 108px auto auto}.grid-wrap{min-height:0;overflow:auto;flex:1}.data-grid{border-collapse:separate;border-spacing:0;min-width:100%;width:max-content;font-size:9px}.data-grid th{position:sticky;top:0;z-index:2;background:#eef3f8;color:#53677f;text-align:left;font-weight:600;border-bottom:1px solid #d9e1eb;padding:6px 8px;max-width:260px;white-space:nowrap}.data-grid td{height:29px;padding:5px 8px;border-bottom:1px solid #edf0f4;max-width:260px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:#fff}.data-grid tr{cursor:pointer}.data-grid tr:hover td{background:#f4f8fd}.data-grid tr.selected td{background:#e8f1ff;border-bottom-color:#cbdcf3}.data-grid tr.selected td:first-child{box-shadow:inset 3px 0 #397bd2}.data-grid tr.reviewed td{color:#27805f;background:#f1faf6}.data-grid tr.disabled td{color:#8c98a7;background:#f1f3f5;text-decoration:line-through}.legend i.gray{background:#96a0ac;margin-left:7px}.state-row{grid-column:2;display:flex;gap:12px;align-items:center}.state-row .review-check{flex-direction:row;align-items:center;color:#334b65}.state-row .worked{color:#21845e;font-weight:600}.columns-dialog{width:min(920px,92vw);height:min(680px,82vh);border:0;border-radius:10px;padding:0;color:#24334a;box-shadow:0 18px 60px #0006}.columns-dialog::backdrop{background:#17233399}.dialog-title{display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:1px solid #dfe5ed}.dialog-title h2{font-size:17px}.dialog-title button{border:0;font-size:22px}.column-options{display:flex;gap:9px;align-items:center;padding:10px 14px;background:#f6f8fb;border-bottom:1px solid #e2e7ee}.column-options .check{flex-direction:row;align-items:center;font-size:11px}.column-table-wrap{height:calc(100% - 145px);overflow:auto}.column-table{width:100%;border-collapse:collapse;font-size:11px}.column-table th{position:sticky;top:0;background:#edf2f7;text-align:left;padding:7px;border-bottom:1px solid #d8e0e9}.column-table td{padding:5px 7px;border-bottom:1px solid #edf0f4}.column-table td:first-child{width:85px;text-align:center}.column-table td:nth-child(2){width:45%}.column-table input[type=text],.column-table input:not([type]){width:100%}.column-table button{padding:3px 8px}.columns-dialog>p{padding:8px 14px;color:#718197;font-size:10px}@container (max-width:1050px){.filters{grid-template-columns:1fr 95px 100px 100px}.filters #show,.filters #hide{grid-row:2}}@container (max-height:360px){.data-grid td{height:25px;padding:3px 6px}.data-grid th{padding:4px 6px}.columns-dialog{height:92vh}}.settings-dialog[open]{display:flex;flex-direction:column}.settings-tabs{display:flex;gap:6px;padding:9px 14px;border-bottom:1px solid #e2e7ee;background:#f6f8fb}.settings-tabs button.active{background:#2465ba;border-color:#2465ba;color:#fff}.settings-page{min-height:0;overflow:auto;padding:18px}.marker-settings-page .settings-grid{grid-template-columns:repeat(3,minmax(150px,1fr));max-width:760px;gap:14px}.marker-settings-page .settings-grid .check{grid-column:1/-1}.marker-settings-page input[type=color]{width:100%;height:34px;padding:2px}.settings-note{padding:10px 0 0;color:#718197;font-size:11px}.columns-page:not([hidden]){display:flex;flex:1;flex-direction:column;padding:0}.columns-page .column-table-wrap{flex:1;height:auto}.columns-page .settings-note{padding:8px 14px}@container (max-width:700px){.marker-settings-page .settings-grid{grid-template-columns:repeat(2,minmax(120px,1fr))}}", Je = ":host{color:#d8dee8;color-scheme:dark}button{border-color:#46515f;background:#2c333d;color:#e6ebf2}button:hover{background:#3a4552}button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible{outline-color:#f2c94c}.primary{background:#2869bc;border-color:#3479cf;color:#fff}.primary:hover{background:#3479cf}input,select,textarea{border-color:#46515f;background:#20262e;color:#edf1f7}label{color:#aab5c3}small{color:#929eae}.app{background:#171b21}header{background:#20252d;border-bottom-color:#3c4653}.brand-icon{background:#3479cf}.version,.notice{color:#929eae}.notice.error{color:#ffaca8;background:#572b2d}aside{background:#1c2229;border-right-color:#3c4653}.summary strong{color:#f0f3f8}.summary span,.summary div{color:#98a4b3}nav button{color:#cdd5df}nav button:hover{background:#2d3743}nav button.active{background:#35485f;color:#f4ca4d}nav b{background:#303946;color:#cbd3de}.settings{border-top-color:#3c4653}.settings summary{color:#d5dce5}.settings p{color:#929eae}.results,.detail{background:#181d23;border-color:#3c4653}.filters,.pager,footer{border-color:#3c4653}.list-head,.legend,.pager{color:#929eae}.data-grid th{background:#252c35;color:#c3ccd8;border-bottom-color:#46515f}.data-grid td{background:#1b2027;color:#d7dde6;border-bottom-color:#303944}.data-grid tr:hover td{background:#29323d}.data-grid tr.selected td{background:#4b4326;color:#fff3bd;border-bottom-color:#736331}.data-grid tr.selected td:first-child{box-shadow:inset 3px 0 #f2c94c}.data-grid tr.reviewed td{color:#76d6a6;background:#1d3029}.data-grid tr.reviewed.selected td{color:#fff3bd;background:#4b4326}.data-grid tr.excluded td{color:#9aa4b1;background:#242930}.data-grid tr.excluded td:not(:first-child){text-decoration:line-through}.data-grid tr.disabled td{color:#77828f;background:#20252b}.detail-title span,.meta,.element dt{color:#929eae}.snapshot{background:#11151a;border-color:#3c4653}.snapshot>div{color:#929eae}.coords{border-color:#46515f;background:#20262e}.detail>.review-check,.state-row .review-check{color:#cfd6df}.element{border-top-color:#3c4653}.empty{color:#84909f}.empty>span{background:#252d36;color:#aeb9c7}.empty h3{color:#c9d2dd}.columns-dialog{background:#20262e;color:#dce3ec;box-shadow:0 18px 60px #000c}.columns-dialog::backdrop{background:#080b0dcc}.dialog-title{border-bottom-color:#46515f}.dialog-title button{background:transparent}.column-options{background:#191e25;border-bottom-color:#46515f}.column-table th{background:#29313b;color:#d7dee7;border-bottom-color:#46515f}.column-table td{background:#20262e;border-bottom-color:#38424e}.columns-dialog>p{color:#9aa6b6}[hidden]{display:none!important}:host{font-size:13px;line-height:1.4}button,input,select,textarea{font-size:12px}label{font-size:11px}small{font-size:10px}header{min-height:54px;padding:7px 12px}.brand{min-width:132px;gap:8px}.brand img{width:34px;height:34px;object-fit:contain;border-radius:7px}.brand strong{color:#f3f6fa;font-size:16px;letter-spacing:.15px}.brand .version{font-size:9px}.toolbar button{font-size:11px;padding:7px 9px}.toolbar{align-items:center}.toolbar-report{flex-direction:row;align-items:center;gap:6px;white-space:nowrap}.toolbar-report select{width:170px;padding:6px 7px}.notice{font-size:10px}.workspace{grid-template-columns:minmax(220px,16%) minmax(500px,1fr) minmax(390px,29%)}.summary span,.summary div,.summary small{font-size:10px}.summary div b{color:#f4ca4d}.settings summary,aside h2{font-size:12px}.settings p{font-size:10px}#tests{display:flex;flex-direction:column;gap:2px}.summary{order:1;flex:0 0 auto;margin-bottom:5px}.settings{order:2}.test-heading{order:3;display:flex;flex-direction:column;gap:4px;margin:1px 0 7px}.test-heading h2{display:flex;justify-content:space-between;margin:0 2px}.test-search{width:100%;margin:0}#tests{order:4}.test-item{display:grid;grid-template-columns:18px minmax(0,1fr) auto;align-items:center;gap:6px;width:100%;padding:7px 6px;border-radius:6px;color:#cdd5df;cursor:pointer}.test-item:hover{background:#2d3743}.test-item.active{background:#35485f;color:#f4ca4d}.test-item input{margin:0;accent-color:#f2c94c}.test-item span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px}.test-item span small{display:block;color:#929eae;font-size:9px}.test-item b{min-width:25px;padding:2px 5px;border-radius:5px;background:#303946;color:#cbd3de;text-align:center;font-size:10px}.filters{grid-template-columns:minmax(190px,1fr) 125px 125px 125px auto;align-items:center}.marker-toggle{min-width:142px;border-color:#5b6674}.marker-toggle.on{background:#1f6348;border-color:#2b9668;color:#eafff5}.bulk{display:flex;align-items:center;gap:6px;min-height:40px;padding:6px 9px;border-bottom:1px solid #46515f;background:#262f39;overflow-x:auto}.bulk strong{color:#f4ca4d;white-space:nowrap;margin-right:4px}.bulk button{padding:5px 8px}#clear-selection{margin-left:auto;font-size:18px;padding:1px 8px}.list-head{font-size:11px}.legend{font-size:10px}.data-grid{font-size:12px}.data-grid th{padding:7px 8px;font-size:12px;max-width:none;white-space:normal;line-height:1.25;vertical-align:bottom}.data-grid td{height:34px;padding:6px 8px;max-width:360px;min-width:80px;white-space:normal;overflow:visible;text-overflow:clip;overflow-wrap:anywhere;-webkit-user-select:text;user-select:text;cursor:text}.data-grid tr{cursor:default}.data-grid td:nth-child(2){min-width:46px}.select-cell{min-width:38px!important;width:38px;max-width:38px!important;text-align:center!important}.select-cell input{width:16px;height:16px;margin:0;accent-color:#f2c94c}.data-grid tr.selected td:nth-child(2){box-shadow:inset 3px 0 #f2c94c}.data-grid tr.selected td:first-child{box-shadow:none}.pager{font-size:11px}.detail-title small{font-size:9px}.detail-title h2{font-size:16px}.detail-title span{font-size:11px}.detail{grid-template-columns:minmax(145px,42%) minmax(180px,1fr)}.snapshot{grid-column:1;grid-row:1;min-height:145px;align-self:start}.detail-controls{grid-column:2;grid-row:1 / span 2;display:flex;flex-direction:column;gap:6px;min-width:0}.detail-title{grid-column:1;grid-row:2;padding:3px 2px 8px;align-self:start}.detail-controls .coords,.detail-controls .state-row,.detail-controls .work-actions,.detail-controls>label{grid-column:auto;width:100%}.detail-controls .work-actions{display:flex}.detail-actions button{font-size:11px}.snapshot-button{position:relative;padding:0;color:#fff;cursor:zoom-in}.snapshot-button:hover{background:#11151a}.snapshot-button span{position:absolute;left:8px;bottom:8px;padding:4px 7px;border-radius:5px;background:#111c;font-size:10px;pointer-events:none}.coords b{font-size:10px}.state-row .review-check,.detail>label{font-size:11px}.work-state{margin-left:auto;padding:3px 8px;border-radius:999px;font-size:10px}.work-state.work{color:#f4ca4d;background:#4b4326}.work-state.done{color:#76d6a6;background:#1d3029}.work-state.excluded{color:#c2c8d0;background:#343b44}.work-actions{grid-column:2;display:flex;gap:5px;flex-wrap:wrap}.work-actions button{padding:5px 7px;font-size:10px}.work-actions button.active{border-color:#f2c94c;color:#fff3bd;background:#4b4326}.work-actions button.active.danger{border-color:#bd7478;color:#ffd9dc;background:#522f33}.element summary{font-size:11px}.element dl{font-size:10px}.empty h3{font-size:15px}.empty p{font-size:12px}.welcome{display:flex;height:100%;min-height:210px;flex-direction:column;justify-content:center;align-items:center;gap:8px}.welcome img{width:58px;height:58px;object-fit:contain}.welcome button{margin-top:6px}.help-dialog{width:min(760px,90vw);height:auto;max-height:82vh}.help-content{padding:15px 18px 20px;overflow:auto;font-size:13px}.help-content h3{margin:14px 0 4px;color:#f0f3f8;font-size:14px}.help-content h3:first-child{margin-top:0}.help-content p{color:#bac4d0}.help-content dl{display:grid;grid-template-columns:155px 1fr;gap:8px 12px;margin:10px 0 0}.help-content dt{color:#f4ca4d;font-weight:600}.help-content dd{margin:0;color:#bac4d0}.developer-links{display:flex;flex-wrap:wrap;gap:10px}.developer-links a{padding:7px 11px;border:1px solid #546171;border-radius:6px;color:#f4ca4d;text-decoration:none}.developer-links a:hover{background:#2a323d;border-color:#f4ca4d}footer{height:25px;font-size:10px}.settings-tabs{background:#191e25;border-bottom-color:#46515f}.settings-tabs button.active{background:#4b4326;border-color:#f2c94c;color:#fff3bd}.settings-note{color:#9aa6b6}@container (max-width: 1100px){.workspace{grid-template-columns:200px minmax(430px,1fr) minmax(340px,32%)}.filters{grid-template-columns:minmax(180px,1fr) 110px 110px}.marker-toggle{grid-column:2 / 4}}";
async function Ve(a, e) {
  const t = "nashepo.collision360.marker-settings.v4", u = "nashepo.collision360.table-settings.v2", l = C(), n = O(), s = a.attachShadow ? a.shadowRoot || a.attachShadow({ mode: "open" }) : a;
  s.innerHTML = `<style>${Xe}${Je}</style><main class="app">
    <header>
      <div class="brand"><img src="${we}" alt=""><strong>НашеПО</strong><span class="version">0.5.6</span></div>
      <div class="toolbar"><button class="primary" id="import">＋ Открыть отчёт</button><label class="toolbar-report">Отчёт<select id="reports" aria-label="Текущий отчёт"></select></label><button id="folder" title="Подключить папку со снимками отчёта">Снимки</button><button id="settings">⚙ Настройки</button><button id="open-session" title="Продолжить работу из файла сессии">Открыть сессию</button><button id="session" title="Сохранить текущую работу в переносимый файл">Сохранить сессию</button><button id="export" title="Отчёт для передачи и печати">Сформировать отчёт</button><button id="help" aria-label="Справка">? Справка</button></div>
      <input type="file" id="files" accept=".html,.htm,.xml" multiple hidden><input type="file" id="session-file" accept=".json,.collision360.json" hidden><input type="file" id="directory" webkitdirectory multiple hidden>
      <div class="notice" role="status" id="message">${w(e.mode)}</div>
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
    <footer>Navisworks HTML / XML <span>Двойной щелчок по строке открывает коллизию в 3D</span></footer>
    <dialog id="settings-dialog" class="columns-dialog settings-dialog"><div class="dialog-title"><div><small>ПАРАМЕТРЫ РАБОТЫ</small><h2>Настройки плагина</h2></div><button id="close-settings" aria-label="Закрыть">×</button></div>
      <div class="settings-tabs" id="settings-tabs"><button class="active" data-settings-tab="markers">Знаки</button><button data-settings-tab="camera">Камера и координаты</button><button data-settings-tab="columns">Столбцы таблицы</button></div>
      <section class="settings-page marker-settings-page" data-settings-page="markers"><div class="settings-grid">
        <label>Размер знака, м<input id="radius" type="number" value="${l.radius}" min="0.05" step="0.25"></label><label>Подписи<select id="label-mode"><option value="selected">Только выбранная</option><option value="all">Все</option><option value="none">Не показывать</option></select></label>
        <label>Цвет новых<input id="unreviewed-color" type="color" value="${w(l.unreviewedColor)}"></label><label>Цвет отработанных<input id="reviewed-color" type="color" value="${w(l.reviewedColor)}"></label><label>Окантовка выбранного<input id="selected-color" type="color" value="${w(l.selectedColor)}"></label>
        <label>Толщина ножки, px<input id="stem-width" type="number" value="${l.stemWidth}" min="1" max="30" step="1"></label><label class="check"><input id="show-stem" type="checkbox" ${l.showStem ? "checked" : ""}> Ножка до точки конфликта</label>
      </div><p class="settings-note">Щелчок по знаку выбирает коллизию. Конец ножки расположен точно в координате конфликта.</p></section>
      <section class="settings-page marker-settings-page" data-settings-page="camera" hidden><div class="settings-grid">
        <label>Дистанция камеры, м<input id="navigation-radius" type="number" value="${l.navigationRadius}" min="0.5" step="1"></label><label>Масштаб координат<select id="scale"><option value="1">1 — как в отчёте</option><option value="0.001">0,001 — мм → м</option><option value="1000">1000 — м → мм</option></select></label>
        ${["X", "Y", "Z"].map((o, r) => `<label>Сдвиг ${o}<input id="offset${o}" type="number" value="${l.offset[r]}" step="0.1"></label>`).join("")}
      </div><p class="settings-note">Камера направляется на координату конфликта. Дистанция задаёт расстояние от камеры до этой точки.</p></section>
      <section class="settings-page columns-page" data-settings-page="columns" hidden><div class="column-options"><label class="check"><input id="show-all-columns" type="checkbox"> Все столбцы</label><label class="check"><input id="hide-empty-columns" type="checkbox"> Скрыть пустые</label><button id="select-columns">Выбрать все</button><button id="clear-columns">Снять все</button><button id="reset-columns">По умолчанию</button></div><div class="column-table-wrap"><table class="column-table"><thead><tr><th>Показывать</th><th>Имя столбца</th><th>Источник</th><th>Порядок</th></tr></thead><tbody id="column-settings"></tbody></table></div><p class="settings-note">Доступны все поля строки HTML и обоих элементов. Имя и порядок можно изменить.</p></section>
    </dialog>
    <dialog id="help-dialog" class="columns-dialog help-dialog"><div class="dialog-title"><div><small>КАК УСТРОЕНА РАБОТА</small><h2>Отчёт, сессия и поля ответа</h2></div><button id="close-help">×</button></div><div class="help-content">
      <h3>Начало работы</h3><p>Откройте HTML/XML-отчёт Navisworks. Плагин прочитает проверки и коллизии, создаст таблицу и расставит знаки в 3D по координатам отчёта. Кнопка «Снимки» подключает изображения, если они хранятся в отдельной папке.</p>
      <h3>Сессия и итоговый отчёт</h3><p><b>Сессия</b> — переносимый файл JSON с исходными данными, состояниями, назначениями, комментариями и снимками. Нажмите «Сохранить сессию», а для продолжения работы в следующий раз — «Открыть сессию» и выберите сохранённый файл. Загруженный отчёт не сохраняется в браузере автоматически. <b>Сформировать отчёт</b> создаёт самостоятельный HTML-документ для просмотра, поиска, фильтрации, передачи и печати. Если отмечены строки, в него попадут только они; иначе — выбранные наборы.</p>
      <h3>Состояния и поля</h3><dl><dt>Показывать знак</dt><dd>Управляет видимостью знака этой коллизии в 3D.</dd><dt>В работе</dt><dd>Коллизия требует проверки или решения.</dd><dt>Отработана</dt><dd>Проверка завершена; знак становится зелёным.</dd><dt>Исключена</dt><dd>Коллизия не учитывается в остатке работ.</dd><dt>Статус Navisworks</dt><dd>Статус из исходного отчёта. Он хранится отдельно от рабочего состояния.</dd><dt>Группа / назначение</dt><dd>Исполнитель, раздел или пакет работ.</dd><dt>Комментарий</dt><dd>Решение, результат проверки или причина исключения.</dd></dl>
      <h3>Разработчик</h3><p class="developer-links"><a href="https://nashepo.ru/" target="_blank" rel="noopener noreferrer">Сайт НашеПО</a><a href="https://t.me/RoburFan" target="_blank" rel="noopener noreferrer">Telegram-сообщество</a></p>
    </div></dialog>
  </main>`;
  const i = (o) => s.querySelector("#" + o);
  let h = [], p;
  const m = /* @__PURE__ */ new Set(), g = /* @__PURE__ */ new Set();
  let b = "", v = 0, x = !0;
  const z = 50, S = document.createElement("small");
  S.id = "save-state", S.setAttribute("role", "status"), s.querySelector("header").append(S);
  function C() {
    try {
      const o = JSON.parse(localStorage.getItem(t) || "{}");
      return { ...ge(), ...o, offset: Array.isArray(o.offset) ? o.offset : [0, 0, 0] };
    } catch {
      return ge();
    }
  }
  function O() {
    try {
      return { visible: [...V], order: [], names: {}, showAll: !1, hideEmpty: !1, ...JSON.parse(localStorage.getItem(u) || "{}") };
    } catch {
      return { visible: [...V], order: [], names: {}, showAll: !1, hideEmpty: !1 };
    }
  }
  const R = (o, r = !1) => {
    i("message").textContent = o, i("message").classList.toggle("error", r);
  }, M = async (o) => {
    try {
      const r = await o();
      typeof r == "string" && R(r);
    } catch (r) {
      R(r instanceof Error ? r.message : String(r), !0);
    }
  }, T = () => {
    p && (S.textContent = "Есть несохранённые изменения");
  }, I = () => localStorage.setItem(u, JSON.stringify(n));
  function Y() {
    return l.radius = Number(i("radius").value), l.navigationRadius = Number(i("navigation-radius").value), l.scale = Number(i("scale").value), l.labelMode = i("label-mode").value, l.offset = ["X", "Y", "Z"].map((o) => Number(i("offset" + o).value)), l.stemWidth = Number(i("stem-width").value), l.showStem = i("show-stem").checked, l.unreviewedColor = i("unreviewed-color").value, l.reviewedColor = i("reviewed-color").value, l.selectedColor = i("selected-color").value, re(l), localStorage.setItem(t, JSON.stringify(l)), l;
  }
  function $() {
    return _(p, /* @__PURE__ */ new Set());
  }
  function W() {
    return _(p, m);
  }
  function E() {
    const o = i("search").value.toLowerCase(), r = i("status").value, d = i("review").value, c = i("visibility").value;
    return W().filter((f) => (!r || f.clash.status === r) && (!d || (d === "work" ? !f.clash.reviewed && !f.clash.excluded : d === "reviewed" ? f.clash.reviewed && !f.clash.excluded : f.clash.excluded)) && (!c || f.clash.enabled === (c === "yes")) && (!o || JSON.stringify(f).toLowerCase().includes(o)));
  }
  const le = () => $().find((o) => o.clash.id === b)?.clash;
  function Z(o, r = !0) {
    b = o;
    const d = E().findIndex((c) => c.clash.id === o);
    d >= 0 && (v = Math.floor(d / z)), j(), B(), r && x && setTimeout(() => M(D), 0);
  }
  async function D() {
    x && p && await e.markers(E().map((o) => o.clash), Y(), Z, b);
  }
  function de() {
    const o = i("markers-toggle");
    o.classList.toggle("on", x), o.setAttribute("aria-checked", String(x)), o.textContent = x ? "● Знаки включены" : "○ Знаки выключены";
  }
  function Se() {
    const o = K($()), r = new Map(n.order.map((d, c) => [d, c]));
    return o.sort((d, c) => (r.get(d.key) ?? 99999) - (r.get(c.key) ?? 99999)).filter((d) => (n.showAll || n.visible.includes(d.key)) && (!n.hideEmpty || $().some((c) => xe(c, d.key).trim())));
  }
  const je = (o) => n.names[o.key]?.trim() || o.label;
  function H() {
    const o = ee(W()), r = m.size ? `в наборах · ${m.size}` : "во всех проверках";
    i("summary").innerHTML = `<strong>${o.total}</strong><span>коллизий</span><div><b>${o.remaining}</b> надо отработать · ${o.reviewed} готово</div><small>${r}${o.excluded ? ` · ${o.excluded} исключено` : ""}${o.disabled ? ` · ${o.disabled} знаков скрыто` : ""}</small>`;
  }
  function Q() {
    const o = i("test-search").value.trim().toLowerCase(), r = p?.tests.filter((c) => !o || c.name.toLowerCase().includes(o)) || [];
    i("test-count").textContent = o ? `${r.length} / ${p?.tests.length || 0}` : String(p?.tests.length || 0);
    const d = ee($());
    i("tests").innerHTML = `<label class="test-item all ${m.size ? "" : "active"}"><input type="checkbox" data-all-tests ${m.size ? "" : "checked"}><span>Все проверки<small>${d.remaining} надо отработать</small></span><b>${d.total}</b></label>` + r.map((c) => {
      const f = ee(_(p, /* @__PURE__ */ new Set([c.id])));
      return `<label class="test-item ${m.has(c.id) ? "active" : ""}"><input type="checkbox" data-test="${w(c.id)}" ${m.has(c.id) ? "checked" : ""}><span>${w(c.name)}<small>${f.remaining} в работе${f.excluded ? ` · ${f.excluded} исключено` : ""}</small></span><b>${f.total}</b></label>`;
    }).join("");
  }
  function ce() {
    i("bulk").hidden = !g.size, i("bulk-count").textContent = `Выбрано: ${g.size}`;
  }
  function j() {
    const o = E(), r = Math.ceil(o.length / z);
    v = Math.max(0, Math.min(v, Math.max(0, r - 1))), i("count").textContent = `Коллизии · ${o.length}`;
    const d = Se(), c = o.slice(v * z, v * z + z), f = c.length > 0 && c.every((y) => g.has(y.clash.id));
    i("list").innerHTML = c.length ? `<table class="data-grid"><thead><tr><th class="select-cell"><input id="select-page" type="checkbox" ${f ? "checked" : ""} aria-label="Выбрать строки страницы"></th>${d.map((y) => `<th title="${w(y.source)}">${w(je(y))}</th>`).join("")}</tr></thead><tbody>${c.map((y) => `<tr data-clash="${w(y.clash.id)}" class="${y.clash.id === b ? "selected " : ""}${y.clash.excluded ? "excluded " : y.clash.reviewed ? "reviewed " : ""}${y.clash.enabled ? "" : "disabled"}"><td class="select-cell"><input class="row-check" type="checkbox" ${g.has(y.clash.id) ? "checked" : ""} aria-label="Добавить в массовый выбор"></td>${d.map((A) => {
      const L = xe(y, A.key) || "—";
      return `<td title="${w(L)}">${w(L)}</td>`;
    }).join("")}</tr>`).join("")}</tbody></table>` : `<div class="empty welcome"><img src="${we}" alt=""><h3>${p ? "Нет совпадений" : "Загрузите отчёт"}</h3><p>${p ? "Измените поиск или фильтры." : "Откройте HTML/XML Navisworks или ранее сохранённую сессию. После загрузки появятся таблица, наборы и знаки."}</p>${p ? "" : '<button class="primary" id="welcome-import">＋ Открыть отчёт</button>'}</div>`, i("page").textContent = o.length ? `${v + 1} / ${r}` : "0 / 0", i("prev-page").disabled = v === 0, i("next-page").disabled = (v + 1) * z >= o.length, ce();
    const k = i("welcome-import");
    k && (k.onclick = () => i("files").click());
  }
  function B() {
    const o = le();
    if (!o) {
      i("detail").innerHTML = '<div class="empty"><h3>Карточка коллизии</h3><p>Выберите строку таблицы.</p></div>';
      return;
    }
    const r = p?.images[o.image], d = o.excluded ? "Исключена" : o.reviewed ? "Отработана" : "В работе";
    i("detail").innerHTML = `${r ? `<button class="snapshot snapshot-button" id="open-snapshot" title="Открыть снимок в отдельном окне"><img src="${w(r)}" alt="Снимок ${w(o.name)}"><span>Открыть крупнее</span></button>` : `<div class="snapshot"><div><b>Снимок не загружен</b><p>${w(o.image || "Изображение не указано")}</p></div></div>`}<div class="detail-controls"><div class="detail-actions"><button class="primary" id="focus">⌖ Перейти в 3D</button><button id="previous">← Предыдущая</button><button id="next">Следующая →</button></div><div class="coords">${o.point ? o.point.map((f, k) => `<div><small>${["X", "Y", "Z"][k]}</small><b>${f.toFixed(3)}</b></div>`).join("") : "В отчёте нет координат"}</div><div class="state-row"><label class="review-check" title="Включает или скрывает этот знак в 3D"><input id="enabled" type="checkbox" ${o.enabled ? "checked" : ""}> Показывать знак</label><strong class="work-state ${o.excluded ? "excluded" : o.reviewed ? "done" : "work"}">${d}</strong></div><div class="work-actions"><button id="work-review" class="${o.reviewed && !o.excluded ? "active" : ""}">✓ Отработана</button><button id="work-reopen" class="${!o.reviewed && !o.excluded ? "active" : ""}">Вернуть в работу</button><button id="work-exclude" class="${o.excluded ? "active danger" : ""}">Исключить</button></div><label title="Исходный статус из отчёта Navisworks">Статус Navisworks<input id="edit-status" value="${w(o.status)}" list="known-status"><datalist id="known-status">${["Новый", "Активн.", "Проверено", "Подтверждено", "Исправлено"].map((f) => `<option value="${f}">`).join("")}</datalist></label><label title="Исполнитель, раздел или пакет работ">Группа / назначение<input id="edit-group" value="${w(o.group)}" placeholder="Исполнитель или раздел"></label><label title="Ваш ответ по коллизии">Комментарий<textarea id="note" rows="3" placeholder="Решение, результат проверки…">${w(o.note)}</textarea></label></div><div class="detail-title"><small>КОЛЛИЗИЯ</small><h2>${w(o.name)}</h2><span>${w(o.description)}</span></div>${o.elements.map((f, k) => `<details class="element" ${k === 0 ? "open" : ""}><summary>Элемент ${k + 1} · ${w(f.name || f.id || "Без имени")}</summary><dl><dt>IFC GUID</dt><dd>${w(f.guid || "—")}</dd><dt>Источник</dt><dd>${w(f.source || "—")}</dd>${Object.entries(f.properties).map(([y, A]) => `<dt>${w(y)}</dt><dd>${w(A || "—")}</dd>`).join("")}</dl></details>`).join("")}`, i("focus").onclick = () => M(() => e.focus(o, Y()));
    for (const [f, k] of [["previous", -1], ["next", 1]]) i(f).onclick = () => M(() => Ce(k));
    i("enabled").onchange = () => Ae(o, i("enabled").checked), i("work-review").onclick = () => P(o, "reviewed"), i("work-reopen").onclick = () => P(o, "work"), i("work-exclude").onclick = () => P(o, "excluded");
    const c = i("open-snapshot");
    c && r && (c.onclick = () => Me(r, o.name)), i("edit-status").onchange = () => {
      o.status = i("edit-status").value, T(), pe(), j();
    }, i("edit-group").oninput = () => {
      o.group = i("edit-group").value, T(), j();
    }, i("note").oninput = () => {
      o.note = i("note").value, T(), j();
    };
  }
  function G() {
    T(), H(), Q(), j(), B(), M(D);
  }
  function Ae(o, r) {
    o.enabled = r, G();
  }
  function P(o, r) {
    o.reviewed = r === "reviewed", o.excluded = r === "excluded", G();
  }
  function Me(o, r) {
    const d = `<!doctype html><html lang="ru"><meta charset="utf-8"><title>${w(r)}</title><style>html,body{margin:0;width:100%;height:100%;background:#111;color:#fff}body{display:grid;place-items:center}img{max-width:100%;max-height:100%;object-fit:contain}</style><img src="${w(o)}" alt="${w(r)}">`, c = URL.createObjectURL(new Blob([d], { type: "text/html;charset=utf-8" })), f = window.open(c, "_blank", "width=1280,height=900");
    if (!f)
      throw URL.revokeObjectURL(c), Error("Браузер заблокировал окно снимка. Разрешите всплывающие окна для Топоматик 360.");
    f.opener = null, setTimeout(() => URL.revokeObjectURL(c), 6e4);
  }
  async function Ce(o) {
    const r = E(), d = r.findIndex((f) => f.clash.id === b), c = r[d + o];
    if (c)
      return Z(c.clash.id, !1), await D(), e.focus(c.clash, Y());
  }
  function pe() {
    const o = i("status"), r = o.value, d = [...new Set($().map((c) => c.clash.status))].filter(Boolean);
    o.innerHTML = '<option value="">Все статусы</option>' + d.map((c) => `<option value="${w(c)}">${w(c)}</option>`).join(""), o.value = d.includes(r) ? r : "";
  }
  function X() {
    i("reports").innerHTML = h.length ? h.map((o) => `<option value="${w(o.id)}">${w(o.name)}</option>`).join("") : '<option value="">Нет загруженных отчётов</option>', i("reports").value = p?.id || "", H(), Q(), pe(), j(), B(), de();
  }
  function U() {
    const o = K($()), r = new Map(n.order.map((c, f) => [c, f])), d = o.sort((c, f) => (r.get(c.key) ?? 99999) - (r.get(f.key) ?? 99999));
    n.order = d.map((c) => c.key), i("column-settings").innerHTML = d.map((c, f) => `<tr data-column-row="${w(c.key)}"><td><input class="column-visible" type="checkbox" ${n.visible.includes(c.key) ? "checked" : ""}></td><td><input class="column-name" value="${w(n.names[c.key] || c.label)}"></td><td>${w(c.source)}</td><td><button class="column-up" ${f === 0 ? "disabled" : ""}>↑</button><button class="column-down" ${f === d.length - 1 ? "disabled" : ""}>↓</button></td></tr>`).join(""), i("show-all-columns").checked = n.showAll, i("hide-empty-columns").checked = n.hideEmpty;
  }
  function $e(o, r) {
    const d = n.order.indexOf(o), c = d + r;
    d < 0 || c < 0 || c >= n.order.length || ([n.order[d], n.order[c]] = [n.order[c], n.order[d]], I(), U(), j());
  }
  function De() {
    if (!p) throw Error("Сначала откройте отчёт.");
    const o = g.size ? g : new Set(W().map((r) => r.clash.id));
    return Pe(p, o);
  }
  function ue(o) {
    for (const r of $()) g.has(r.clash.id) && (r.clash.enabled = o);
    G();
  }
  function J(o) {
    for (const r of $()) g.has(r.clash.id) && (r.clash.reviewed = o === "reviewed", r.clash.excluded = o === "excluded");
    G();
  }
  async function Ee(o, r = !1) {
    const d = ke(o), c = h.find((f) => f.id === d.id);
    if (c && r)
      h = h.map((f) => f.id === d.id ? d : f), p = d;
    else if (c) {
      const f = new Map(c.tests.flatMap((k) => k.clashes).map((k) => [k.id, k]));
      for (const k of d.tests) for (const y of k.clashes) {
        const A = f.get(y.id);
        A && Object.assign(y, { enabled: A.enabled, reviewed: A.reviewed, excluded: A.excluded, note: A.note, group: A.group });
      }
      d.images = { ...c.images, ...d.images }, h = h.map((k) => k.id === d.id ? d : k), p = d, R("Отчёт обновлён. Состояния и комментарии сохранены.");
    } else
      h.push(d), p = d;
    m.clear(), g.clear(), v = 0, b = $()[0]?.clash.id || "", x = !0, T(), X(), await D();
  }
  async function Le(o) {
    let r = 0;
    for (const d of o.filter((c) => /\.(html?|xml|json)$/i.test(c.name))) {
      const c = await d.arrayBuffer();
      let f = new TextDecoder().decode(c);
      /charset\s*=\s*["']?windows-1251/i.test(f) && (f = new TextDecoder("windows-1251").decode(c));
      const k = /\.json$/i.test(d.name), y = k ? Ye(f) : Re(f, d.name);
      await me(y, o), await Ee(y, k), r++;
    }
    !r && p && (await me(p, o), T(), B()), R(r ? `Загружено отчётов: ${r}. ${p?.warnings.join(" ") || ""}` : "Снимки подключены.");
  }
  async function me(o, r) {
    for (const d of new Set(o.tests.flatMap((c) => c.clashes.map((f) => f.image)).filter(Boolean))) {
      const c = r.filter((y) => {
        const A = se(y.webkitRelativePath || y.name);
        return A === d || A.endsWith("/" + d);
      }), f = r.filter((y) => y.name === d.split("/").at(-1)), k = c.length === 1 ? c[0] : f.length === 1 ? f[0] : void 0;
      !k || !/^image\/(jpeg|png|webp)$/.test(k.type) || (o.images[d] = await new Promise((y, A) => {
        const L = new FileReader();
        L.onload = () => y(L.result), L.onerror = () => A(L.error), L.readAsDataURL(k);
      }));
    }
  }
  i("scale").value = String(l.scale), i("label-mode").value = l.labelMode;
  for (const o of ["radius", "navigation-radius", "stem-width", "scale", "label-mode", "offsetX", "offsetY", "offsetZ", "show-stem", "unreviewed-color", "reviewed-color", "selected-color"]) i(o).addEventListener("change", () => M(async () => (Y(), await D(), x ? "Настройки применены." : "Настройки сохранены.")));
  i("import").onclick = () => i("files").click(), i("open-session").onclick = () => i("session-file").click(), i("folder").onclick = () => i("directory").click();
  for (const o of ["files", "session-file", "directory"]) i(o).onchange = () => M(async () => {
    const r = i(o);
    await Le(Array.from(r.files || [])), r.value = "";
  });
  i("reports").onchange = () => M(async () => {
    p = h.find((o) => o.id === i("reports").value), m.clear(), g.clear(), b = $()[0]?.clash.id || "", v = 0, x = !0, X(), await D();
  }), i("test-search").oninput = () => Q(), i("tests").onchange = (o) => M(async () => {
    const r = o.target;
    if (r.matches("[data-all-tests]")) m.clear();
    else if (r.matches("[data-test]")) {
      const d = r.dataset.test;
      r.checked ? m.add(d) : m.delete(d);
    }
    v = 0, E().some((d) => d.clash.id === b) || (b = E()[0]?.clash.id || ""), H(), Q(), j(), B(), await D();
  }), i("list").onclick = (o) => {
    const r = o.target;
    if (r.id === "select-page") {
      for (const c of E().slice(v * z, v * z + z)) r.checked ? g.add(c.clash.id) : g.delete(c.clash.id);
      j();
      return;
    }
    if (r.classList.contains("row-check")) {
      const c = r.closest("[data-clash]");
      c && (r.checked ? g.add(c.dataset.clash) : g.delete(c.dataset.clash)), ce();
      return;
    }
    if (window.getSelection()?.toString()) return;
    const d = r.closest("[data-clash]");
    d && Z(d.dataset.clash);
  }, i("list").ondblclick = (o) => {
    if (o.target.classList.contains("row-check")) return;
    const r = o.target.closest("[data-clash]");
    if (!r) return;
    Z(r.dataset.clash, !1);
    const d = le();
    d && M(async () => (await D(), e.focus(d, Y())));
  };
  for (const o of ["search", "status", "review", "visibility"]) i(o).addEventListener(o === "search" ? "input" : "change", () => {
    v = 0, j(), M(D);
  });
  i("prev-page").onclick = () => {
    v--, j();
  }, i("next-page").onclick = () => {
    v++, j();
  }, i("markers-toggle").onclick = () => M(async () => (x = !x, de(), x ? e.markers(E().map((o) => o.clash), Y(), Z, b) : e.hide())), i("bulk-review").onclick = () => J("reviewed"), i("bulk-reopen").onclick = () => J("work"), i("bulk-exclude").onclick = () => J("excluded"), i("bulk-show").onclick = () => ue(!0), i("bulk-hide").onclick = () => ue(!1), i("clear-selection").onclick = () => {
    g.clear(), j();
  }, i("settings").onclick = () => {
    U(), i("settings-dialog").showModal();
  }, i("close-settings").onclick = () => i("settings-dialog").close(), i("settings-tabs").onclick = (o) => {
    const r = o.target.closest("[data-settings-tab]");
    if (r) {
      for (const d of s.querySelectorAll("[data-settings-tab]")) d.classList.toggle("active", d === r);
      for (const d of s.querySelectorAll("[data-settings-page]")) d.hidden = d.dataset.settingsPage !== r.dataset.settingsTab;
    }
  }, i("help").onclick = () => i("help-dialog").showModal(), i("close-help").onclick = () => i("help-dialog").close(), i("column-settings").onchange = (o) => {
    const r = o.target, d = r.closest("[data-column-row]");
    if (!d) return;
    const c = d.dataset.columnRow;
    r.classList.contains("column-visible") && (n.visible = r.checked ? [.../* @__PURE__ */ new Set([...n.visible, c])] : n.visible.filter((f) => f !== c)), r.classList.contains("column-name") && (n.names[c] = r.value), I(), j();
  }, i("column-settings").onclick = (o) => {
    const r = o.target.closest("button"), d = r?.closest("[data-column-row]");
    r && d && (o.preventDefault(), $e(d.dataset.columnRow, r.classList.contains("column-up") ? -1 : 1));
  }, i("show-all-columns").onchange = () => {
    n.showAll = i("show-all-columns").checked, I(), j();
  }, i("hide-empty-columns").onchange = () => {
    n.hideEmpty = i("hide-empty-columns").checked, I(), j();
  }, i("select-columns").onclick = () => {
    n.visible = K($()).map((o) => o.key), I(), U(), j();
  }, i("clear-columns").onclick = () => {
    n.visible = [], n.showAll = !1, I(), U(), j();
  }, i("reset-columns").onclick = () => {
    Object.assign(n, { visible: [...V], order: [], names: {}, showAll: !1, hideEmpty: !1 }), I(), U(), j();
  }, i("session").onclick = () => M(() => {
    if (!p) throw Error("Сначала откройте отчёт.");
    return fe(p.name.replace(/\.[^.]+$/, "") + ".collision360.json", JSON.stringify(p, null, 2), "application/json"), S.textContent = "Сессия сохранена", "Рабочая сессия сохранена. Для продолжения используйте «Открыть сессию».";
  }), i("export").onclick = () => M(() => {
    const o = De();
    return fe(o.name.replace(/\.[^.]+$/, "") + "-review.html", Ue(o), "text/html;charset=utf-8"), `HTML-отчёт сформирован: ${o.tests.reduce((r, d) => r + d.clashes.length, 0)} коллизий.`;
  }), X();
}
function te(a) {
  return new Proxy(a, { get(e, t) {
    return t === "app" ? a.manager.activeApp : t === "cadview" ? a.manager.activeWindow?.context : Reflect.get(e, t);
  } });
}
const Ke = {
  open(a) {
    a.manager.revealView("nashepo.collision360/collision_panel");
  },
  async mount(a) {
    const e = a.el;
    if (!e) return;
    const t = document.createElement("div");
    t.style.height = "100%", e.replaceChildren(t), await Ve(t, {
      mode: "Загрузите отчёт или откройте сохранённую сессию",
      markers: (u, l, n, s) => Fe(te(a), u, l, (i) => {
        a.manager.revealView("nashepo.collision360/collision_panel"), n(i);
      }, s),
      hide: () => We(te(a)),
      focus: (u, l) => ze(te(a), u, l)
    });
  }
};
export {
  Ke as default
};
