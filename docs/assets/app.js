/* HAMON site — interactive pages.
 *
 * INTEGRITY RULE (mirrors the on-page methodology note):
 *   • All HAMON data and loss numbers are TEXT, straight from hamonpy's round-trip
 *     report. They never pass through music21 or Verovio.
 *   • The engraved score is an ILLUSTRATIVE music21→Verovio realization, for visual
 *     reference only. If it can't render, we show text and say so — the data is intact.
 */
"use strict";

const $ = (sel, el = document) => el.querySelector(sel);
const el = (tag, attrs = {}, html = "") => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v; else if (k === "dataset") Object.assign(e.dataset, v);
    else e.setAttribute(k, v);
  }
  if (html) e.innerHTML = html;
  return e;
};
const esc = (s) => (s == null ? "" : String(s).replace(/[&<>"]/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])));

/** A scrollable code panel whose lines can be highlighted by substring. */
function codePanel(title, text, extraHead = "") {
  const lines = (text || "").replace(/\n$/, "").split("\n");
  const body = lines.map((l, i) =>
    `<span class="ln" data-i="${i}">${esc(l) || "&nbsp;"}</span>`).join("");
  return `<div class="panel"><div class="phead"><span>${esc(title)}</span><span>${extraHead}</span></div>`
    + `<pre>${body}</pre></div>`;
}

function highlightLines(panelPre, needles) {
  panelPre.querySelectorAll(".ln").forEach((ln) => {
    const t = ln.textContent;
    ln.classList.toggle("hl", needles.some((n) => n && t.includes(n)));
  });
}

/** Illustrative-score block: renders MusicXML via Verovio, or a clear text fallback. */
function scoreBlock(container, musicxml) {
  const LABEL = "Illustrative engraving — music21 realization → Verovio "
    + "(display only; not part of the HAMON pipeline).";
  if (!musicxml) {
    container.className = "score empty";
    container.innerHTML = "No engraved preview for this example — the display realizer covers "
      + "chord symbols &amp; Roman numerals only. The HAMON data below is complete and unaffected.";
    return;
  }
  container.className = "score";
  container.innerHTML = `<div class="slabel">${LABEL}</div><div class="svg">rendering…</div>`;
  const slot = $(".svg", container);
  if (!window.HamonVerovio) { slot.textContent = "(Verovio unavailable)"; return; }
  window.HamonVerovio.render(musicxml)
    .then((svg) => { slot.innerHTML = svg; })
    .catch(() => {
      container.className = "score empty";
      container.innerHTML = "Score preview unavailable (Verovio could not render / load). "
        + "This is a display limitation only — the HAMON data below is intact.";
    });
}

async function loadJSON(path) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(`${path}: ${r.status}`);
  return r.json();
}

/* ── ICCCM'26 loss viewer ──────────────────────────────────────────────── */
async function initIcccm26() {
  const data = await loadJSON("assets/data/icccm26.json");
  const root = $("#viewer");
  let exi = 0, tgt = data.examples[0].targets[0].target;

  const exTabs = el("div", { class: "tabs ex-tabs" });
  data.examples.forEach((ex, i) => {
    const b = el("button", i === 0 ? { class: "active" } : {}, esc(ex.label));
    b.onclick = () => { exi = i; render(); };
    exTabs.appendChild(b);
  });
  const fmtTabs = el("div", { class: "tabs fmt-tabs" });
  const grid = el("div", { class: "grid" });
  root.append(exTabs, fmtTabs, grid);

  function render() {
    const ex = data.examples[exi];
    [...exTabs.children].forEach((b, i) => b.classList.toggle("active", i === exi));
    if (!ex.targets.some((t) => t.target === tgt)) tgt = ex.targets[0].target;

    fmtTabs.innerHTML = "";
    ex.targets.forEach((t) => {
      const badge = t.target === "hamon" ? "✓" : (t.semantic ? `−${t.semantic}` : "≈");
      const b = el("button", t.target === tgt ? { class: "active" } : {},
        `${esc(data.formatLabels[t.target] || t.target)} <small>${badge}</small>`);
      b.onclick = () => { tgt = t.target; render(); };
      fmtTabs.appendChild(b);
    });

    const t = ex.targets.find((x) => x.target === tgt);
    const dl = `<a class="dl" href="${esc(t.exportPath)}" download>download .${esc(t.ext)}</a>`;
    const semList = t.findings.filter((f) => !f.notational);
    const notList = t.findings.filter((f) => f.notational);
    const summary =
      `<div class="loss-summary">`
      + (t.lossless ? `<span class="chip ok">lossless ✓</span>`
        : `<span class="chip sem">semantic −${t.semantic}</span>`
        + `<span class="chip not">notational ≈${t.notational}</span>`)
      + `</div>`;
    const lossItems = (arr, cls) => arr.map((f, i) =>
      `<li class="${cls}" data-src="${esc(f.source || "")}" data-out="${esc(f.output || "")}">`
      + `<div class="lp">${esc(f.path)} · ${esc(f.kind)}</div>${esc(f.summary)}</li>`).join("");

    grid.innerHTML =
      `<div>`
      + codePanel(`HAMON source · @${esc(ex.systemHint || "auto")}`, ex.hamonText)
      + `<div class="score" id="ic-score" style="margin-top:12px"></div></div>`
      + `<div>` + codePanel(`Export → ${esc(data.formatLabels[tgt] || tgt)}`, t.output, dl) + `</div>`
      + `<div><h3 style="margin:2px 0 4px;font-size:15px">Round-trip loss</h3>`
      + `<div class="hint" style="font-size:12px">HAMON → ${esc(data.formatLabels[tgt] || tgt)} → HAMON, measured by hamonpy.</div>`
      + summary
      + (semList.length ? `<ul class="loss-list">${lossItems(semList, "sem")}</ul>` : "")
      + (notList.length ? `<details><summary class="hint">${notList.length} notational re-spellings (expected)</summary>`
        + `<ul class="loss-list">${lossItems(notList, "not")}</ul></details>` : "")
      + `</div>`;

    scoreBlock($("#ic-score", grid), ex.musicxml);

    const srcPre = grid.querySelector(".panel pre");
    const outPre = grid.querySelectorAll(".panel pre")[1];
    grid.querySelectorAll(".loss-list li").forEach((li) => {
      li.onmouseenter = () => {
        highlightLines(srcPre, [li.dataset.src]);
        if (outPre) highlightLines(outPre, [li.dataset.out]);
      };
      li.onmouseleave = () => { highlightLines(srcPre, []); if (outPre) highlightLines(outPre, []); };
    });
  }
  render();
}

/* ── Fixtures browser ──────────────────────────────────────────────────── */
async function initFixtures() {
  const data = await loadJSON("assets/data/fixtures.json");
  const list = $("#fx-list"), detail = $("#fx-detail");
  let active = data.cases[0]?.id;

  const filter = el("div", { class: "fx-filter" });
  const input = el("input", { type: "search", placeholder: `Filter ${data.cases.length} cases…` });
  filter.appendChild(input);
  const listBody = el("div");
  list.append(filter, listBody);

  function renderList(q = "") {
    listBody.innerHTML = "";
    q = q.toLowerCase();
    data.categories.forEach((cat) => {
      const cases = data.cases.filter((c) => c.category === cat &&
        (!q || c.id.toLowerCase().includes(q) || (c.description || "").toLowerCase().includes(q)));
      if (!cases.length) return;
      listBody.appendChild(el("div", { class: "cat" }, esc(cat)));
      cases.forEach((c) => {
        const item = el("div", { class: "item" + (c.id === active ? " active" : "") }, esc(c.id));
        item.title = c.description || "";
        item.onclick = () => { active = c.id; renderDetail(c); renderList(input.value); };
        listBody.appendChild(item);
      });
    });
  }

  function renderDetail(c) {
    const encTabs = Object.entries(c.encodings);
    let encKey = encTabs[0]?.[0];
    const expected = c.expected ? JSON.stringify(c.expected, null, 2) : "";
    detail.innerHTML =
      `<h2>${esc(c.id)}</h2>`
      + `<div class="meta-row">${esc(c.category)}${c.description ? " · " + esc(c.description) : ""}`
      + ` · <code>${esc(c.path)}</code></div>`
      + `<div class="score" id="fx-score"></div>`
      + `<div class="grid-2" style="margin-top:14px">`
      + `<div>` + codePanel("HAMON surface", c.hamonText) + `</div>`
      + `<div>` + codePanel("Expected semantics (fixture JSON)", expected) + `</div>`
      + `</div>`
      + `<h3 style="font-size:15px;margin:18px 0 6px">Source encodings (verbatim)</h3>`
      + `<div class="tabs" id="fx-enc-tabs"></div><div id="fx-enc-body"></div>`;

    scoreBlock($("#fx-score", detail), c.musicxml);

    const encTabsEl = $("#fx-enc-tabs", detail), encBody = $("#fx-enc-body", detail);
    function renderEnc() {
      encTabsEl.innerHTML = "";
      encTabs.forEach(([k]) => {
        const b = el("button", k === encKey ? { class: "active" } : {}, esc(k));
        b.onclick = () => { encKey = k; renderEnc(); };
        encTabsEl.appendChild(b);
      });
      const e = c.encodings[encKey];
      encBody.innerHTML = e ? codePanel(esc(e.file), e.text) : `<p class="hint">no encodings</p>`;
    }
    if (encTabs.length) renderEnc(); else encBody.innerHTML = `<p class="hint">no source encodings for this case.</p>`;
  }

  input.oninput = () => renderList(input.value);
  renderList();
  const first = data.cases.find((c) => c.id === active) || data.cases[0];
  if (first) renderDetail(first);
}

/* ── boot ──────────────────────────────────────────────────────────────── */
(async function () {
  try {
    if (window.__PAGE__ === "icccm26") await initIcccm26();
    else if (window.__PAGE__ === "fixtures") await initFixtures();
  } catch (e) {
    const m = document.querySelector("main");
    if (m) m.appendChild(el("p", { class: "method" }, "Failed to load page data: " + esc(e.message)
      + ". If you opened the file directly, serve it over HTTP: <code>python -m http.server -d docs</code>."));
  }
})();
