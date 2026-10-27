/* Growth Intelligence Hub (farm view). Hash-routed tabs, all rendered with UI.h (textContent only). */
(function () {
  "use strict";
  const M = window.MEOD, { h, s, aiPill, toast, copy } = window.UI;

  const TABS = [
    { id: "overview", label: "Overview", render: overview },
    { id: "strategy", label: "Strategy", render: strategy },
    { id: "campaigns", label: "Campaign Studio", render: campaigns },
    { id: "experiments", label: "Experiments", render: experiments },
    { id: "stories", label: "Farm stories", render: stories },
    { id: "seo", label: "SEO", render: seo },
    { id: "customers", label: "Customers", render: customers },
    { id: "points", label: "Neighbourhoods", render: points },
    { id: "demand", label: "Demand → Planting", render: demand },
    { id: "inbox", label: "Inbox", render: inbox },
    { id: "settings", label: "Settings", render: settings }
  ];

  // Areas with interest but no pickup nearby (synthetic).
  const UNSERVED = [
    { area: "Tengah", sector: "69", households: 14 },
    { area: "Yishun", sector: "76", households: 11 },
    { area: "Clementi", sector: "12", households: 9 }
  ];

  // Session-only UI choices (not saved).
  const ui = { angle: "recipe", tone: "warm", story: M.FARM_LOG[0].id, seoTopic: 3, searchRows: null, searchName: "", point: M.POINTS[0].id, arms: ["Recipe", "Farm story"], base: 25, target: 35 };

  /* ---------- building blocks ---------- */

  const panel = (title, ...kids) => h("section", { class: "panel" }, title ? h("h2", { class: "panel-title" }, title) : null, kids);
  const aiTitle = (text) => h("span", { class: "ai-title" }, text, aiPill());
  const pill = (tone, label) => h("span", { class: "pill " + tone }, label);
  const kpi = (label, value, sub) => h("div", { class: "kpi" }, h("span", { class: "kpi-label" }, label), h("strong", null, value), sub ? h("span", { class: "kpi-sub" }, sub) : null);
  const kpis = (...items) => h("div", { class: "kpis" }, items);
  const howNote = (now, later) => h("p", { class: "how" }, h("strong", null, "Now: "), now, h("br"), h("strong", null, "With real data: "), later);
  const chipLinks = (items, current, href) => h("div", { class: "chips" }, items.map((x) =>
    h("a", { class: "chip" + (x.id === current ? " on" : ""), href: href(x), "aria-current": x.id === current ? "true" : null }, x.name || x.label)));

  function table(cols, rows, opts) {
    return h("div", { class: "table-wrap" },
      h("table", { class: "data-table" + (opts && opts.compact ? " compact" : "") },
        h("thead", null, h("tr", null, cols.map((c) => h("th", { scope: "col", class: c.num ? "num" : null }, c.label)))),
        h("tbody", null, rows.map((r) => h("tr", null, cols.map((c, i) =>
          h("td", { class: c.num ? "num" : null, "data-label": c.label }, r[i])))))));
  }

  function why(steps, title) {
    return h("details", { class: "why" },
      h("summary", null, title || "Why? How Tyllage worked this out"),
      h("ol", null, steps.map((t) => h("li", null, t))),
      h("p", { class: "muted small" }, "Rule-based. Thresholds are in Settings and are illustrative until MEOD confirms them."));
  }

  function band(title, line, actions) {
    const today = new Date().toLocaleDateString("en-SG", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    return h("div", { class: "band" },
      h("span", { class: "band-date" }, today),
      h("h1", null, title),
      h("p", null, line),
      actions ? h("div", { class: "band-actions" }, actions) : null);
  }

  function textareaWithChecks(text, link, rows) {
    const ta = h("textarea", { rows: rows || 9 });
    ta.value = text;
    const checks = h("ul", { class: "checks" });
    const run = () => checks.replaceChildren(...M.captionChecks(ta.value, link).map((k) =>
      h("li", { class: k.ok ? "ok" : "no" }, (k.ok ? "✓ " : "✕ ") + k.label)));
    ta.addEventListener("input", run);
    run();
    return { ta, checks };
  }

  function logDecision(entry) {
    M.state.decisions.push({ ...entry, at: new Date().toISOString() });
    M.save();
  }

  /* ---------- tooltip + charts (single hue, one axis, hover on every mark) ---------- */

  const tip = h("div", { class: "chart-tip", role: "tooltip", hidden: true });
  document.body.append(tip);
  function hover(el, text) {
    el.setAttribute("tabindex", "0");
    el.setAttribute("aria-label", text);
    const show = (e) => {
      tip.textContent = text;
      tip.hidden = false;
      const r = el.getBoundingClientRect();
      const x = e && e.clientX ? e.clientX : r.left + r.width / 2;
      const y = e && e.clientY ? e.clientY : r.top;
      tip.style.left = Math.min(window.innerWidth - tip.offsetWidth - 8, Math.max(8, x - tip.offsetWidth / 2)) + "px";
      tip.style.top = Math.max(8, y - tip.offsetHeight - 12) + "px";
    };
    el.addEventListener("mousemove", show);
    el.addEventListener("focus", () => show());
    el.addEventListener("mouseleave", () => { tip.hidden = true; });
    el.addEventListener("blur", () => { tip.hidden = true; });
    return el;
  }

  function futureLabels(n) {
    const d = new Date();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return Array.from({ length: n }, (_, i) => {
      const w = new Date(d); w.setDate(d.getDate() + 7 * (i + 1));
      return w.toLocaleDateString("en-SG", { day: "numeric", month: "short" });
    });
  }

  // Vertical bars, optional forecast bars with 80% range whiskers, optional reference line.
  function barChart({ labels, values, unit, ref, refLabel, max, fmt, fc }) {
    const W = 560, H = 220, L = 36, B = 28, T = 14, R = 8;
    const all = values.concat(fc ? fc.map((p) => p.hi) : []);
    const top = max || Math.max(...all, ref || 0) * 1.15 || 1;
    const y = (v) => T + (H - T - B) * (1 - v / top);
    const n = values.length + (fc ? fc.length : 0);
    const bw = (W - L - R) / n;
    const ticks = [0, top / 2, top].map((v) => Math.round(v));
    const f = fmt || ((v) => v + (unit ? " " + unit : ""));
    const barPath = (x, w, v) => { const yy = y(v); return `M${x},${y(0)} V${yy + 4} Q${x},${yy} ${x + 4},${yy} H${x + w - 4} Q${x + w},${yy} ${x + w},${yy + 4} V${y(0)} Z`; };
    const flabels = fc ? futureLabels(fc.length) : [];
    return s("svg", { viewBox: `0 0 ${W} ${H}`, class: "chart", role: "img", "aria-label": "Bar chart" },
      ticks.map((t) => [
        s("line", { x1: L, x2: W - R, y1: y(t), y2: y(t), class: "grid" }),
        s("text", { x: L - 6, y: y(t) + 4, class: "axis", "text-anchor": "end" }, String(t))]),
      values.map((v, i) => {
        const x = L + i * bw + bw * 0.2, w = bw * 0.6;
        return [
          hover(s("g", { class: "hit" }, s("rect", { x: L + i * bw, y: T, width: bw, height: H - T - B, fill: "transparent" }), v > 0 ? s("path", { class: "bar", d: barPath(x, w, v) }) : null), `${labels[i]}: ${f(v)}`),
          s("text", { x: x + w / 2, y: H - 10, class: "axis", "text-anchor": "middle" }, labels[i])];
      }),
      fc ? fc.map((p, k) => {
        const i = values.length + k, x = L + i * bw + bw * 0.2, w = bw * 0.6, cx = x + w / 2;
        return [
          hover(s("g", { class: "hit" }, s("rect", { x: L + i * bw, y: T, width: bw, height: H - T - B, fill: "transparent" }),
            p.mid > 0 ? s("path", { class: "bar-fc", d: barPath(x, w, p.mid) }) : null,
            s("line", { x1: cx, x2: cx, y1: y(p.lo), y2: y(p.hi), class: "whisker" }),
            s("line", { x1: cx - 5, x2: cx + 5, y1: y(p.hi), y2: y(p.hi), class: "whisker" }),
            s("line", { x1: cx - 5, x2: cx + 5, y1: y(p.lo), y2: y(p.lo), class: "whisker" })),
          `${flabels[k]} (forecast): ${f(p.mid)}, 80% range ${p.lo}–${p.hi}`),
          s("text", { x: cx, y: H - 10, class: "axis", "text-anchor": "middle" }, flabels[k])];
      }) : null,
      ref != null ? [
        s("line", { x1: L, x2: W - R, y1: y(ref), y2: y(ref), class: "ref" }),
        s("text", { x: L + 4, y: y(ref) - 6, class: "ref-label", "text-anchor": "start" }, refLabel + " " + f(ref))] : null);
  }

  // Horizontal bars for comparing categories.
  function hbars(items, fmt) {
    const max = Math.max(...items.map((i) => i.value)) || 1;
    return h("ul", { class: "hbars" }, items.map((i) =>
      hover(h("li", null,
        h("span", { class: "bar-label" }, i.label),
        h("span", { class: "bar-track" }, h("span", { class: "bar-fill", style: "width:" + Math.max(2, Math.round((i.value / max) * 100)) + "%" })),
        h("span", { class: "bar-val" }, fmt ? fmt(i.value) : String(i.value))), `${i.label}: ${fmt ? fmt(i.value) : i.value}${i.note ? " · " + i.note : ""}`)));
  }

  function sparkline(values) {
    const W = 90, H = 26, max = Math.max(...values), min = Math.min(...values);
    const x = (i) => 2 + (i * (W - 4)) / (values.length - 1);
    const y = (v) => H - 3 - ((v - min) / (max - min || 1)) * (H - 6);
    const last = values.length - 1;
    return s("svg", { viewBox: `0 0 ${W} ${H}`, class: "spark", role: "img", "aria-label": "Households per week: " + values.join(", ") },
      s("polyline", { points: values.map((v, i) => x(i) + "," + y(v)).join(" "), class: "spark-line" }),
      s("circle", { cx: x(last), cy: y(values[last]), r: 3, class: "spark-dot" }));
  }

  /* ---------- derived numbers ---------- */

  function funnel() {
    const ev = M.state.events;
    const count = (t) => ev.filter((e) => e.type === t).length;
    const visits = M.sum(M.CAMPAIGNS.map((k) => k.visits)) + count("page_visit");
    const interested = 120 + M.state.interests.length;
    const first = M.sum(M.CAMPAIGNS.map((k) => k.firstBuyers));
    const repeat = M.sum(M.CAMPAIGNS.map((k) => k.repeatBuyers));
    const weeklyKg = Math.round(M.sum(M.CROPS.map((c) => c.paid[c.paid.length - 1] * c.repeat[c.repeat.length - 1])));
    return { visits, interested, first, repeat, weeklyKg };
  }

  /* ---------- views ---------- */

  function overview() {
    const f = funnel();
    const verdicts = M.CROPS.map((c) => ({ c, v: M.plantingVerdict(c) }));
    const recs = M.strategy();
    const openTickets = M.state.inbox.filter((x) => x.kind === "ticket" && x.status === "Open").length;
    const stages = [
      { label: "Campaign visits", value: f.visits },
      { label: "Interested households", value: f.interested },
      { label: "First-time buyers", value: f.first },
      { label: "Repeat buyers", value: f.repeat }
    ];
    const ev = M.state.events;
    const evCount = (t) => ev.filter((e) => e.type === t).length;

    return [
      band("Good to see you, MEOD team",
        `${recs.length} growth recommendations · ${verdicts.filter((x) => x.v.key === "test-more").length} crop ready for a production trial · ${openTickets} open customer question${openTickets === 1 ? "" : "s"}`,
        [h("a", { class: "btn btn-sm btn-gold", href: "#strategy" }, "Open Strategy"), h("a", { class: "btn btn-sm btn-outline-light", href: "#demand" }, "Demand → Planting")]),
      kpis(
        kpi("Campaign visits", f.visits.toLocaleString(), "last 4 weeks"),
        kpi("First-time buyers", String(f.first), M.pct(f.first / f.visits) + " of visits"),
        kpi("Came back within 28 days", String(f.repeat), M.pct(f.repeat / f.first) + " of new buyers"),
        kpi("Repeat-backed demand", f.weeklyKg + " kg/wk", "latest week × returning share")),
      h("div", { class: "grid-2" },
        panel(aiTitle("Top recommendations"),
          h("ul", { class: "actions" }, recs.slice(0, 5).map((r) =>
            h("li", null, pill(r.tone, r.kind), h("span", null, r.title), h("a", { href: r.href, class: "link" }, "Open →")))),
          h("a", { class: "link", href: "#strategy" }, "See all " + recs.length + " with evidence →")),
        panel("From attention to dependable demand",
          h("ol", { class: "funnel" }, stages.map((st, i) => h("li", null,
            h("span", { class: "funnel-label" }, st.label),
            h("strong", null, st.value.toLocaleString()),
            h("span", { class: "muted small" }, i ? M.pct(st.value / stages[i - 1].value) + " of previous step" : "start")))),
          h("p", { class: "muted small" }, "Likes and views aren't counted. Only visits that reach MEOD Fresh or a group buy, then real purchases."))),
      panel("Demand → Planting at a glance",
        table([{ label: "Crop" }, { label: "Latest paid", num: true }, { label: "Consumer supply", num: true }, { label: "Returning", num: true }, { label: "Forecast" }, { label: "Verdict" }],
          verdicts.map(({ c, v }) => [h("a", { href: "#demand/" + c.id, class: "link" }, c.name), v.latest + " kg", v.supply + " kg", M.pct(v.repeatNow), M.forecastRead(c).confidence, pill(v.tone, v.label)]))),
      panel("From this browser (live demo activity)",
        h("p", { class: "muted small" }, "Try the consumer page, then come back. These counts come from this browser only and are added to the totals above."),
        kpis(
          kpi("Page visits", String(evCount("page_visit"))),
          kpi("Store, product & recipe clicks", String(evCount("product_click") + evCount("store_click") + evCount("recipe_click") + evCount("rec_click"))),
          kpi("Ask MEOD questions", String(evCount("assistant"))),
          kpi("Harvest interest", String(M.state.interests.length))))
    ];
  }

  // 1. AI Growth Strategy Advisor
  function strategy() {
    const recs = M.strategy();
    const decided = (title) => M.state.decisions.filter((d) => d.kind === "strategy" && d.title === title).slice(-1)[0];
    return [
      band("Growth strategy", "Where MEOD should focus next: ranked from customer behaviour, campaign results, repeat purchases and crop demand."),
      panel(null, howNote(
        "Ranking rules over the hub's own figures. Each explanation is written only from the figures listed under Evidence.",
        "An LLM could rephrase the explanation for different readers, but it would be given only these verified figures and could not add new ones.")),
      recs.map((r, i) => {
        const d = decided(r.title);
        return h("section", { class: "panel rec-card" },
          h("div", { class: "rec-top" }, h("span", { class: "rank" }, "#" + (i + 1)), pill(r.tone, r.kind), h("h2", { class: "panel-title" }, r.title)),
          h("p", null, r.text),
          h("div", { class: "rec-meta" },
            h("span", null, h("strong", null, "Impact: "), r.impact),
            h("span", null, h("strong", null, "Effort: "), r.effort)),
          h("details", { class: "why" }, h("summary", null, "Evidence"), h("ul", null, r.evidence.map((e) => h("li", null, e)))),
          h("div", { class: "approve-row" },
            h("a", { class: "btn btn-sm btn-outline", href: r.href }, "Open the data"),
            h("button", { class: "btn btn-sm btn-forest", type: "button", onclick: () => { logDecision({ kind: "strategy", title: r.title, status: "Planned" }); toast("Added to the plan."); route(); } }, "Plan it"),
            h("button", { class: "btn btn-sm btn-outline", type: "button", onclick: () => { logDecision({ kind: "strategy", title: r.title, status: "Dismissed" }); route(); } }, "Dismiss"),
            d ? pill(d.status === "Planned" ? "good" : "neutral", d.status) : null));
      })
    ];
  }

  // 2. AI Social Media Campaign Studio
  function campaigns(param) {
    const featured = M.featuredCrops();
    const c = M.crop(param) || M.CROPS[0];
    const rec = M.recommendCampaign(c);

    const chips = h("div", { class: "chips" }, M.CROPS.map((x) =>
      h("a", { class: "chip" + (x.id === c.id ? " on" : ""), href: "#campaigns/" + x.id, "aria-current": x.id === c.id ? "true" : null },
        x.name, featured.includes(x) ? null : " · fully committed")));

    let recBlock;
    if (rec.none) {
      recBlock = panel(aiTitle(rec.title), h("p", null, rec.why), why(rec.steps));
    } else {
      const rows = [
        ["Objective", rec.objective], ["Audience", rec.audience], ["Channel", rec.channel], ["Lead with", rec.theme],
        ["Offer", rec.offer], ["Promote at most", rec.capKg + " kg (uncommitted this week)"], ["When", rec.window], ["Measure", rec.measure]
      ];
      const ds = M.drafts(c, rec, ui.angle);
      const angles = [{ id: "recipe", label: "Recipe" }, { id: "story", label: "Farm story" }, { id: "bundle", label: "Intro bundle" }];
      recBlock = [
        panel(aiTitle("Suggested: " + rec.title),
          h("dl", { class: "facts" }, rows.map(([k, v]) => [h("dt", null, k), h("dd", null, v)])),
          h("div", { class: "link-row" },
            h("code", { class: "utm" }, rec.link),
            h("button", { class: "btn btn-sm btn-outline", type: "button", onclick: () => copy(rec.link) }, "Copy link")),
          h("p", { class: "muted small" }, "Committed orders are protected: a campaign never promises more than the uncommitted harvest, and any offer must pass Margin Guard."),
          why(rec.steps)),
        panel(aiTitle("Drafts for MEOD to edit"),
          h("div", { class: "angle-row" }, h("span", { class: "muted small" }, "Campaign angle:"),
            h("div", { class: "chips" }, angles.map((a) => h("button", { type: "button", class: "chip" + (ui.angle === a.id ? " on" : ""), "aria-pressed": String(ui.angle === a.id), onclick: () => { ui.angle = a.id; route(); } }, a.label)))),
          h("div", { class: "drafts" }, ds.map((d) => {
            const { ta, checks } = textareaWithChecks(d.text, rec.link);
            ta.setAttribute("aria-label", d.channel + " draft");
            return h("div", { class: "draft" }, h("h3", null, d.channel), ta, checks,
              h("button", { class: "btn btn-sm btn-outline", type: "button", onclick: () => copy(ta.value) }, "Copy"));
          })),
          howNote("Templates filled with this week's harvest, recipes, pickups and the tracked link.", "An LLM drafts more varied wording from the same facts. Staff still edit and approve every post."),
          h("div", { class: "approve-row" },
            h("button", { class: "btn btn-forest", type: "button", onclick: () => {
              M.state.drafts.push({ id: "D-" + Date.now().toString(36).toUpperCase(), crop: c.id, title: rec.title + " (" + ui.angle + ")", channel: rec.channel, status: "Waiting for approval", at: new Date().toISOString() });
              M.save(); toast("Sent to MEOD for approval. Nothing has been posted."); route();
            } }, "Submit for MEOD approval"),
            h("span", { class: "muted small" }, "Approving never posts anything. MEOD posts from its own accounts with the tracked link.")))
      ];
    }

    const queue = M.state.drafts.slice().reverse();
    const approvals = panel("Approval queue",
      queue.length ? table([{ label: "ID" }, { label: "Campaign" }, { label: "Channel" }, { label: "Status" }, { label: "" }],
        queue.map((d) => [d.id, d.title, d.channel, pill(d.status === "Approved" ? "good" : d.status === "Rejected" ? "bad" : "warn", d.status),
          d.status === "Waiting for approval" ? h("span", { class: "btn-pair" },
            h("button", { class: "btn btn-sm btn-forest", type: "button", onclick: () => { d.status = "Approved"; M.save(); route(); } }, "Approve"),
            h("button", { class: "btn btn-sm btn-outline", type: "button", onclick: () => { d.status = "Rejected"; M.save(); route(); } }, "Reject")) : ""]))
        : h("p", { class: "muted" }, "Nothing waiting. Submitted campaigns and farm stories appear here for a MEOD manager."));

    // UTM builder.
    const out = h("code", { class: "utm" });
    const form = h("form", { class: "utm-form", onsubmit: (e) => e.preventDefault() },
      h("label", { class: "field" }, h("span", null, "Source"), h("input", { name: "src", value: "instagram" })),
      h("label", { class: "field" }, h("span", null, "Medium"), h("input", { name: "med", value: "social" })),
      h("label", { class: "field" }, h("span", null, "Campaign"), h("input", { name: "cmp", value: c.id.replace(/-/g, "") + "-" + ui.angle })));
    const clean = (v) => v.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "") || "unset";
    const upd = () => { out.textContent = M.utm(clean(form.src.value), clean(form.med.value), clean(form.cmp.value)); };
    form.addEventListener("input", upd); upd();
    const builder = panel("Tracked link builder", h("p", { class: "muted small" }, "Every post, QR code and leader message should use its own link so MEOD Fresh can tell which ones bring buyers."),
      form, h("div", { class: "link-row" }, out, h("button", { class: "btn btn-sm btn-outline", type: "button", onclick: () => copy(out.textContent) }, "Copy")));

    return [
      band("Campaign Studio", "Pick a crop. Tyllage suggests who to reach, how and when, from this week's harvest and what has worked before."),
      panel(null, chips),
      recBlock,
      h("div", { class: "grid-2" }, approvals, builder)
    ];
  }

  // 8. AI Campaign Experiment Optimiser
  function experiments() {
    const rows = M.CAMPAIGNS.map((k) => ({ k, i: M.campaignImpact(k) })).sort((a, b) => b.i.incContribution - a.i.incContribution);
    const a = M.CAMPAIGNS[0], b = M.CAMPAIGNS[1];
    const conv = M.compare(a.firstBuyers, a.visits, b.firstBuyers, b.visits);
    const rep = M.compare(a.repeatBuyers, a.firstBuyers, b.repeatBuyers, b.firstBuyers);
    const ia = M.campaignImpact(a), ib = M.campaignImpact(b);
    const sig = (r) => r.significant ? pill("good", "Real difference (p = " + r.pValue.toFixed(3) + ")") : pill("neutral", "Could be chance (p = " + r.pValue.toFixed(2) + ")");

    // Planner.
    const n = M.sampleSize(ui.base / 100, ui.target / 100);
    const perWeek = Math.max(1, Math.round(M.sum(M.CAMPAIGNS.map((k) => k.firstBuyers)) / 8 / Math.max(1, ui.arms.length)));
    const weeks = Math.ceil(n / perWeek);
    const byTheme = {};
    M.CAMPAIGNS.forEach((k) => { const t = k.theme === "Group buy" ? "Group buy" : k.theme; (byTheme[t] = byTheme[t] || []).push(M.campaignImpact(k)); });
    const ARMS = ["Recipe", "Farm story", "Intro bundle", "Group buy"];
    const plannerForm = h("form", { class: "planner", onsubmit: (e) => e.preventDefault(), onchange: (e) => {
      const f = e.currentTarget;
      ui.arms = [...f.querySelectorAll("input[name=arm]:checked")].map((x) => x.value);
      ui.base = Math.min(90, Math.max(1, Number(f.base.value) || 25));
      ui.target = Math.min(95, Math.max(ui.base + 1, Number(f.target.value) || 35));
      route();
    } },
      h("fieldset", null, h("legend", null, "Approaches to compare"), h("div", { class: "chips" }, ARMS.map((x) =>
        h("label", { class: "chip" }, h("input", { type: "checkbox", name: "arm", value: x, checked: ui.arms.includes(x) }), " " + x)))),
      h("div", { class: "grid-2 tight" },
        h("label", { class: "field" }, h("span", null, "Repeat rate today (%)"), h("input", { type: "number", name: "base", min: 1, max: 90, value: ui.base })),
        h("label", { class: "field" }, h("span", null, "Smallest improvement worth knowing (%)"), h("input", { type: "number", name: "target", min: 2, max: 95, value: ui.target }))));

    return [
      band("Experiments", "Compare approved campaign approaches on what they add: extra orders over the usual, and contribution after costs — not engagement."),
      panel(aiTitle("Which campaigns actually added orders"),
        table([{ label: "Campaign" }, { label: "Theme" }, { label: "Orders", num: true }, { label: "Usual orders", num: true }, { label: "Extra orders", num: true }, { label: "New buyers who came back", num: true }, { label: "Extra contribution", num: true }],
          rows.map(({ k, i }) => [h("span", null, h("strong", null, k.name), h("br"), h("span", { class: "muted small" }, k.id + " · " + k.channel)), k.theme, k.orders, i.baseline, "+" + i.incremental, M.pct(i.repeatRate), M.money(i.incContribution)])),
        h("p", { class: "muted small" }, "Usual orders = what the same crop sold in the weeks before each campaign. Extra contribution = extra orders × margin − spend − discounts.")),
      panel(aiTitle("Recipe vs discount (Nai Bai): is the difference real?"),
        h("p", { class: "muted small" }, "Same crop, same 2-week window, same S$120 budget, same audience size."),
        table([{ label: "Measure" }, { label: "Recipe-led (C-101)", num: true }, { label: "10% off (C-102)", num: true }, { label: "Statistical test" }], [
          ["Visit → first order", (conv.p1 * 100).toFixed(1) + "%", (conv.p2 * 100).toFixed(1) + "%", sig(conv)],
          ["New buyers who came back", M.pct(rep.p1), M.pct(rep.p2), sig(rep)],
          ["Extra orders", "+" + ia.incremental, "+" + ib.incremental, "—"],
          ["Extra contribution", M.money(ia.incContribution), M.money(ib.incContribution), "—"]
        ], { compact: true }),
        h("p", { class: "verdict-line" }, pill("good", "Lean recipe-led"),
          " Both turned visits into first orders at about the same rate, but recipe buyers were much more likely to come back, and that difference is unlikely to be chance."),
        howNote("Two-proportion z-test on recorded results.", "Holdout groups (people who see no campaign) give true incremental orders; later, adaptive testing shifts budget toward the winner while a test runs.")),
      panel(aiTitle("Plan the next experiment"),
        plannerForm,
        ui.arms.length < 2 ? h("p", { class: "form-error" }, "Pick at least two approaches.") : h("div", { class: "kpis" },
          kpi("New buyers per approach", String(n), "to spot " + ui.base + "% → " + ui.target + "% repeat"),
          kpi("Total new buyers", String(n * ui.arms.length)),
          kpi("At recent pace", "~" + weeks + " weeks", "about " + perWeek + " new buyers/week each"),
          kpi("Split", ui.arms.map(() => Math.round(100 / ui.arms.length) + "%").join(" / "))),
        h("ul", { class: "seg-list" }, ui.arms.map((t) => {
          const past = byTheme[t];
          return h("li", null, h("strong", null, t), h("span", null, past ? `Past results: ${past.length} campaign${past.length > 1 ? "s" : ""}, ${M.pct(M.avg(past.map((x) => x.repeatRate)))} came back, ${M.money(Math.round(M.avg(past.map((x) => x.incContribution))))} extra contribution on average.` : "No past campaigns of this type yet. Worth testing."));
        })),
        h("p", { class: "muted small" }, "95% confidence, 80% power. Fewer buyers than this and a 'winner' could easily be luck. Keep budget, window and audience size the same for every approach."))
    ];
  }

  // 10. AI Farm Storytelling Assistant
  function stories() {
    const rec = M.FARM_LOG.find((r) => r.id === ui.story) || M.FARM_LOG[0];
    const st = M.story(rec, ui.tone);
    const verified = new Set();
    const send = h("button", { class: "btn btn-forest", type: "button", disabled: true, onclick: () => {
      M.state.drafts.push({ id: "S-" + Date.now().toString(36).toUpperCase(), crop: rec.crop, title: "Farm story: " + rec.type + " " + rec.greenhouse, channel: "Instagram / Facebook / Blog", status: "Waiting for approval", at: new Date().toISOString() });
      M.save(); toast("Story sent for approval. See Campaign Studio → Approval queue.");
    } }, "Send for approval");
    const tones = [{ id: "warm", label: "Warm" }, { id: "informative", label: "Informative" }, { id: "kids", label: "For families" }];

    return [
      band("Farm stories", "Turn approved greenhouse updates into farm-to-table stories. Every sentence comes from a farm record a person has checked."),
      panel("1. Pick an approved farm record",
        h("div", { class: "log-grid" }, M.FARM_LOG.map((r) => h("button", { type: "button", class: "log-card" + (r.id === rec.id ? " on" : ""), "aria-pressed": String(r.id === rec.id), onclick: () => { ui.story = r.id; route(); } },
          h("img", { src: r.photo, alt: "", width: 120, height: 90, loading: "lazy" }),
          h("span", { class: "log-body" },
            h("strong", null, r.type + " · " + M.crop(r.crop).name),
            h("span", { class: "muted small" }, new Date(r.date).toLocaleDateString("en-SG", { day: "numeric", month: "short" }) + " · " + r.greenhouse + " · " + r.by)))))),
      panel(aiTitle("2. Drafts"),
        h("div", { class: "angle-row" }, h("span", { class: "muted small" }, "Tone:"),
          h("div", { class: "chips" }, tones.map((t) => h("button", { type: "button", class: "chip" + (ui.tone === t.id ? " on" : ""), "aria-pressed": String(ui.tone === t.id), onclick: () => { ui.tone = t.id; route(); } }, t.label)))),
        h("div", { class: "drafts three" }, [["Instagram / Facebook", st.instagram], ["Blog / SEO paragraph", st.blog], ["WhatsApp (leader)", st.whatsapp]].map(([label, text]) => {
          const { ta, checks } = textareaWithChecks(text, null, 8);
          ta.setAttribute("aria-label", label + " draft");
          return h("div", { class: "draft" }, h("h3", null, label), ta, checks, h("button", { class: "btn btn-sm btn-outline", type: "button", onclick: () => copy(ta.value) }, "Copy"));
        }))),
      panel("3. Verify every fact before it goes out",
        h("ul", { class: "verify" }, st.facts.map((f, i) => h("li", null,
          h("label", { class: "check" },
            h("input", { type: "checkbox", onchange: (e) => { e.target.checked ? verified.add(i) : verified.delete(i); send.disabled = verified.size < st.facts.length; } }),
            h("span", null, f.fact, h("br"), h("span", { class: "muted small" }, "Source: " + f.source)))))),
        h("div", { class: "approve-row" }, send, h("span", { class: "muted small" }, "Unlocks when every fact is ticked.")),
        howNote("Templates that only stitch together the record's own facts.", "An LLM writes more natural stories, but only from the record's facts and photo, and the fact checklist stays."))
    ];
  }

  // 3. AI SEO & Search Opportunity Advisor
  function seo() {
    const sk = M.CAMPAIGNS.find((k) => k.channel.includes("SEO")), st = M.campaignStats(sk);
    const tone = { gap: "bad", weak: "warn", exists: "good" }, label = { gap: "No page", weak: "Weak page", exists: "Has page" };
    const rows = ui.searchRows || M.DEMO_SEARCH;
    const clusters = M.clusterSearch(rows);

    const file = h("input", { type: "file", accept: ".csv,text/csv", class: "sr-only", id: "gsc-file", onchange: (e) => {
      const f = e.target.files[0];
      if (!f) return;
      if (f.size > 2 * 1024 * 1024) { toast("That file is over 2 MB. Export fewer rows."); return; }
      f.text().then((t) => {
        const r = M.parseSearchCsv(t);
        if (r.error) { toast(r.error); return; }
        ui.searchRows = r.rows; ui.searchName = f.name; route();
        toast(r.rows.length + " queries loaded. They stay in this tab and aren't saved.");
      });
    } });

    const topic = M.SEO_TOPICS[ui.seoTopic] || M.SEO_TOPICS[0];
    const draft = M.pageDraft(topic);

    const title = h("input", { name: "title", value: "This Week at MEOD | Fresh Vegetables Grown in Singapore" });
    const desc = h("textarea", { name: "desc", rows: 3 });
    desc.value = "See what MEOD Farm is harvesting in Kranji this week, with easy recipes and neighbourhood group-buy pickups across Singapore.";
    const kw = h("input", { name: "kw", value: "vegetables singapore" });
    const res = h("ul", { class: "checks" });
    const run = () => {
      const t = title.value, d = desc.value, k = kw.value.trim().toLowerCase();
      const repeats = k ? (t + " " + d).toLowerCase().split(k).length - 1 : 0;
      res.replaceChildren(...[
        { ok: t.length >= 30 && t.length <= 60, label: `Title is ${t.length} characters (aim for 30–60)` },
        { ok: d.length >= 70 && d.length <= 155, label: `Description is ${d.length} characters (aim for 70–155)` },
        { ok: !!k && t.toLowerCase().includes(k.split(" ")[0]), label: "Title mentions the main topic" },
        { ok: /singapore|kranji/i.test(t + d), label: "Says where it's grown" },
        { ok: repeats <= 2, label: `Topic phrase used ${repeats}× (more than 2 looks like keyword stuffing)` },
        { ok: /meod/i.test(t), label: "Title includes the MEOD brand" }
      ].map((c) => h("li", { class: c.ok ? "ok" : "no" }, (c.ok ? "✓ " : "✕ ") + c.label)));
    };
    [title, desc, kw].forEach((el) => el.addEventListener("input", run));
    run();

    return [
      band("SEO opportunities", "Help people searching for local vegetables find MEOD — not Tyllage. MEOD controls what gets published."),
      kpis(
        kpi("Search queries", String(rows.length), ui.searchRows ? "from " + ui.searchName : "demo export"),
        kpi("Topic clusters", String(clusters.length)),
        kpi("New buyers from search", String(sk.firstBuyers), "recipe page, 4 weeks"),
        kpi("Search buyers who came back", M.pct(st.repeatRate))),
      panel(aiTitle("Search demand, grouped by topic"),
        h("div", { class: "approve-row" },
          h("label", { class: "btn btn-sm btn-outline", for: "gsc-file" }, "Import Search Console CSV"), file,
          ui.searchRows ? h("button", { class: "btn btn-sm btn-outline", type: "button", onclick: () => { ui.searchRows = null; route(); } }, "Back to demo data") : null,
          h("span", { class: "muted small" }, ui.searchRows ? "Your export, read in this browser only." : "Showing a made-up export. Search Console → Performance → Export → Queries.")),
        table([{ label: "Topic cluster" }, { label: "Queries", num: true }, { label: "Impressions", num: true }, { label: "Clicks", num: true }, { label: "CTR", num: true }, { label: "Avg position", num: true }, { label: "Opportunity" }],
          clusters.map((c) => [h("details", { class: "cluster" }, h("summary", null, c.label), h("ul", null, c.queries.map((q) => h("li", null, `${q.query} — ${q.impressions.toLocaleString()} impr., pos. ${q.position.toFixed(1)}`)))),
            c.queries.length, c.impressions.toLocaleString(), c.clicks.toLocaleString(), (c.ctr * 100).toFixed(1) + "%", c.pos.toFixed(1), pill(c.opp === "High" ? "good" : c.opp === "Medium" ? "warn" : "neutral", c.opp)])),
        h("p", { class: "muted small" }, "High opportunity = seen often, clicked rarely and not yet on page 1. Those are the clusters where a better page could bring buyers.")),
      panel(aiTitle("Content gaps"),
        table([{ label: "Search topic" }, { label: "Intent" }, { label: "MEOD page" }, { label: "Status" }, { label: "Suggestion" }],
          M.SEO_TOPICS.map((t) => [h("strong", null, t.query), t.intent, t.page, pill(tone[t.status], label[t.status]), t.idea]))),
      panel(aiTitle("Draft a useful page"),
        h("label", { class: "field" }, h("span", null, "Topic"),
          h("select", { onchange: (e) => { ui.seoTopic = Number(e.target.value); route(); } },
            M.SEO_TOPICS.map((t, i) => h("option", { value: i, selected: i === ui.seoTopic }, t.query)))),
        h("div", { class: "page-draft" },
          h("p", { class: "serp-title" }, draft.title),
          h("p", { class: "serp-desc" }, draft.meta),
          h("h3", null, "H1: " + draft.h1),
          draft.sections.map((x) => h("div", { class: "pd-sec" }, h("h4", null, x.h, " ", h("span", { class: "muted small" }, "· from " + x.from)), h("p", null, x.body))),
          h("h4", null, "FAQ"), h("ul", null, draft.faq.map((q) => h("li", null, q))),
          h("h4", null, "Link to"), h("ul", null, draft.links.map((q) => h("li", null, q)))),
        howNote("An outline filled from MEOD's approved FAQ, harvest plan, recipes and pickups.", "An LLM helps write the prose; MEOD edits and publishes one genuinely useful page at a time. Google rewards helpful, original pages, not lots of auto-generated ones.")),
      panel("Page title & description checker",
        h("div", { class: "grid-2 tight" },
          h("div", { class: "stack" },
            h("label", { class: "field" }, h("span", null, "Page title"), title),
            h("label", { class: "field" }, h("span", null, "Meta description"), desc),
            h("label", { class: "field" }, h("span", null, "Main topic"), kw)),
          h("div", null, h("h3", { class: "small-title" }, "Checks"), res)))
    ];
  }

  // 4. AI Customer Segmentation & Churn
  function customers() {
    const all = M.CUSTOMERS.map((cu) => ({ cu, r: M.rfm(cu) }));
    const SEGS = ["Champions", "Loyal", "New", "Needs attention", "At risk", "Hibernating"];
    const count = (seg) => all.filter((x) => x.r.seg === seg).length;
    const lapsing = all.filter((x) => x.r.risk === "Likely lapsing").sort((a, b) => b.cu.orders - a.cu.orders);
    const byChannel = {};
    M.CAMPAIGNS.forEach((k) => { byChannel[k.channel] = (byChannel[k.channel] || 0) + k.firstBuyers; });

    return [
      band("Customers", "Who buys often, who's new, and who is quietly drifting away — so MEOD can be useful to them before they're gone."),
      kpis(
        kpi("Customers", String(all.length), "demo, pseudonymous"),
        kpi("Champions + Loyal", String(count("Champions") + count("Loyal"))),
        kpi("Likely lapsing", String(lapsing.length), "past 1.5× their usual gap"),
        kpi("Can be messaged", M.pct(all.filter((x) => x.cu.consent).length / all.length), "opted in")),
      panel(aiTitle("Segments (recency, frequency, spend)"),
        table([{ label: "Segment" }, { label: "Customers", num: true }, { label: "Who they are" }, { label: "Suggested next step" }],
          SEGS.map((sg) => [h("strong", null, sg), count(sg), {
            Champions: "Ordered recently and often", Loyal: "Order often, a little less recently", New: "First or second order, recently",
            "Needs attention": "Middle of the road", "At risk": "Used to order often, not lately", Hibernating: "Few orders, long ago"
          }[sg], M.SEGMENT_ACTIONS[sg]])),
        howNote("RFM scores 1–5 from fixed cut-offs.", "Cut-offs set from MEOD's real order history; a churn prediction model only once there are 6+ months of purchases per customer.")),
      panel(aiTitle("Likely lapsing: worth a gentle nudge"),
        table([{ label: "Customer" }, { label: "Segment" }, { label: "Usual gap", num: true }, { label: "Since last order", num: true }, { label: "Overdue", num: true }, { label: "Usually buys" }, { label: "Suggested" }],
          lapsing.slice(0, 12).map(({ cu, r }) => {
            const g = M.reengage(cu);
            return [h("span", null, h("strong", null, cu.id), h("br"), h("span", { class: "muted small" }, cu.channel + (cu.point ? " · " + cu.point : ""))),
              r.seg + " (" + r.score + ")", cu.interval + " days", cu.lastDays + " days", r.overdue.toFixed(1) + "×", M.crop(cu.crop).name,
              h("span", null, g.text, h("br"), h("span", { class: "muted small" }, g.channel))];
          })),
        h("p", { class: "muted small" }, (lapsing.length > 12 ? `Showing 12 of ${lapsing.length}. ` : "") + "'Overdue' compares days since their last order with their own usual gap, so a fortnightly buyer isn't flagged after 8 days. Customers without consent are never messaged directly.")),
      h("div", { class: "grid-2" },
        panel("Where new buyers came from",
          hbars(Object.entries(byChannel).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)),
          h("p", { class: "muted small" }, "First-time buyers by channel, last 8 weeks.")),
        panel("Harvest interest from this browser",
          M.state.interests.length
            ? table([{ label: "When" }, { label: "Crops" }, { label: "How often" }, { label: "Via" }],
              M.state.interests.slice().reverse().map((i) => [new Date(i.at).toLocaleDateString("en-SG"), i.crops.map((id) => M.crop(id).name).join(", "), i.freq, i.via]))
            : h("p", { class: "muted" }, "None yet. Fill in 'Help shape our next harvest' on the consumer page to see it here."),
          h("p", { class: "muted small" }, "Interest is a lead, not demand. Demand → Planting weighs paid, repeat orders far above it.")))
    ];
  }

  // 7. AI Neighbourhood Demand Intelligence
  function points() {
    const R = M.rules();
    const list = M.POINTS.map((p) => ({ p, n: M.neighbourhood(p) }));
    const now = M.sum(list.map((x) => x.n.now)), cap = M.sum(M.POINTS.map((p) => p.capacity));
    const sel = list.find((x) => x.p.id === ui.point) || list[0];

    const unserved = UNSERVED.map((u) => ({ ...u }));
    M.state.interests.filter((i) => i.sector).forEach((i) => {
      const near = M.nearestPoints(i.sector + "0000", 1);
      if (near && near[0].km > R.nearPointKm) {
        const hit = unserved.find((u) => u.sector === i.sector);
        if (hit) hit.households += 1; else unserved.push({ area: "Sector " + i.sector, sector: i.sector, households: 1 });
      }
    });

    const types = {};
    list.forEach((x) => { (types[x.n.type.label] = types[x.n.type.label] || []).push(x); });

    return [
      band("Neighbourhoods", "How each group-buy area is doing, where growth is promising, where people are leaving, and where a new pickup could pay off."),
      kpis(
        kpi("Active pickups", String(M.POINTS.length)),
        kpi("Households this week", String(now), "of " + cap + " capacity"),
        kpi("Average fill", M.pct(now / cap)),
        kpi("Returning households", M.pct(M.avg(M.POINTS.map((p) => p.returning))))),
      panel(aiTitle("Area types"),
        h("div", { class: "type-grid" }, Object.entries(types).map(([label, xs]) => h("div", { class: "type-card" },
          pill(xs[0].n.type.tone, label), h("p", null, xs[0].n.type.text), h("p", { class: "muted small" }, xs.map((x) => x.p.area).join(", ")))))),
      panel(aiTitle("Pickup health and opportunity"),
        table([{ label: "Pickup" }, { label: "8 weeks" }, { label: "Households", num: true }, { label: "4-wk trend", num: true }, { label: "Returning", num: true }, { label: "Opportunity", num: true }, { label: "Type" }, { label: "Suggested action" }],
          list.sort((a, b) => b.n.score - a.n.score).map(({ p, n }) => [
            h("span", null, h("strong", null, p.area), h("br"), h("span", { class: "muted small" }, p.id + " · " + p.day + " " + p.window)),
            sparkline(p.active), n.now + " / " + p.capacity,
            (n.trend >= 0 ? "+" : "") + M.pct(n.trend), M.pct(p.returning), String(n.score), pill(n.type.tone, n.type.label), M.pointStatus(p).action])),
        h("p", { class: "muted small" }, "Opportunity (0–100) weighs spare capacity, how many households come back, and the direction of travel.")),
      panel("What each area buys",
        h("label", { class: "field" }, h("span", null, "Pickup"),
          h("select", { onchange: (e) => { ui.point = e.target.value; route(); } }, M.POINTS.map((p) => h("option", { value: p.id, selected: p.id === sel.p.id }, p.area + " (" + p.id + ")")))),
        hbars(sel.n.mix.map((m) => ({ label: m.c.name, value: m.hh >= M.MIN_GROUP ? m.hh : 0, note: m.shown + " households" })), (v) => (v ? String(v) : "<" + M.MIN_GROUP)),
        h("p", { class: "muted small" }, `Households per crop this week. Groups smaller than ${M.MIN_GROUP} are shown as "<${M.MIN_GROUP}" so nobody can be singled out. Individual addresses are never shown.`)),
      panel(aiTitle("Interest without a pickup nearby"),
        table([{ label: "Area" }, { label: "Interested households", num: true }, { label: "Nearest pickup" }, { label: "Suggestion" }],
          unserved.sort((a, b) => b.households - a.households).map((u) => {
            const near = M.nearestPoints(u.sector + "0000", 1);
            const n = near ? near[0] : null;
            return [u.area, u.households >= M.MIN_GROUP ? String(u.households) : "<" + M.MIN_GROUP, n ? n.area + " (~" + n.km.toFixed(1) + " km)" : "—",
              u.households >= 10 ? "Enough interest to look for a leader here." : "Keep collecting interest."];
          })),
        howNote("Scores and types from fixed rules on each pickup's numbers.", "Clustering areas on purchase patterns, and forecasting each pickup's demand. Before adding a pickup, MEOD checks delivery cost, leader commission and that perishables can be collected promptly."))
    ];
  }

  // 5. AI Demand-to-Planting Forecaster
  function demand(param) {
    const c = M.crop(param) || M.CROPS[0];
    const v = M.plantingVerdict(c);
    const f = M.forecastRead(c);
    const labels = M.weekLabels(c.paid.length);
    const decided = M.state.decisions.filter((d) => d.crop === c.id).slice(-1)[0];
    const mix = M.cropMix();

    const decide = (status) => {
      logDecision({ kind: "planting", crop: c.id, verdict: v.label, status });
      toast(status + ". Logged for the farm manager."); route();
    };

    return [
      band("Demand → Planting", "Grow more only when paid, repeat demand keeps beating what the farm can sell — and the margin holds."),
      panel(null, chipLinks(M.CROPS, c.id, (x) => "#demand/" + x.id)),
      kpis(
        kpi("Expected harvest", c.expected + " kg/wk"),
        kpi("Committed", M.committedKg(c) + " kg", `trade ${c.committed.trade} · group buy ${c.committed.groupBuy} · pre-order ${c.committed.preorder}`),
        kpi("For new consumer demand", v.supply + " kg/wk"),
        kpi("Margin", M.pct(v.margin), M.money(c.price) + "/kg · cost " + M.money(c.cost))),
      h("div", { class: "grid-2" },
        panel(c.name + ": paid orders and 4-week forecast",
          barChart({ labels, values: c.paid, unit: "kg", ref: v.supply, refLabel: "Available", fc: f.fc ? f.fc.pts : null }),
          h("p", { class: "muted small" }, "Solid: paid orders. Pale: forecast, with whiskers for the 80% range. Dashed line: harvest left after trade, group-buy and pre-order commitments.")),
        panel("Share of demand from returning buyers",
          barChart({ labels, values: c.repeat.map((x) => Math.round(x * 100)), max: 100, ref: Math.round(M.rules().repeatShareMin * 100), refLabel: "Dependable", fmt: (x) => x + "%" }),
          h("p", { class: "muted small" }, "Repeat orders count far more than first orders or registered interest."))),
      panel(aiTitle("Tyllage's read"),
        h("div", { class: "verdict" },
          h("div", { class: "approve-row" }, pill(v.tone, v.label), h("span", { class: "muted small" }, "Forecast confidence: "), pill(f.confidence === "High" ? "good" : f.confidence === "Medium" ? "warn" : "neutral", f.confidence)),
          h("p", null, h("strong", null, v.why)),
          h("p", null, f.note),
          // Recent weeks give the cautious trial size; a confident forecast sets the upper end.
          h("p", null, v.key === "test-more" && f.trialKg > v.trialKg ? v.next.replace(`+${v.trialKg} kg`, `+${v.trialKg} to +${f.trialKg} kg`) : v.next)),
        why(v.steps.concat(f.fc ? [
          `Forecast (straight-line trend): next 4 weeks ${f.fc.pts.map((p) => p.mid).join(", ")} kg, 80% range ${Math.round(f.lo)}–${Math.round(f.hi)} kg/week on average.`,
          f.fc.mape != null ? `Backtest: predicting the last 2 weeks from the earlier ones was off by ${M.pct(f.fc.mape)} on average.` : "Not enough weeks to backtest yet."
        ] : [])),
        h("div", { class: "approve-row" },
          h("button", { class: "btn btn-forest", type: "button", onclick: () => decide("Accepted by farm manager") }, "Accept"),
          h("button", { class: "btn btn-outline", type: "button", onclick: () => decide("Not now") }, "Not now"),
          decided ? h("span", { class: "muted small" }, "Last decision: " + decided.status + " (" + new Date(decided.at).toLocaleDateString("en-SG") + ")") : null),
        howNote("Rules plus a straight-line trend with an 80% range, checked against the last 2 weeks.", "A seasonal time-series model on MEOD's full sales and confirmed group-buy orders, scored every week against what actually sold. Tyllage never changes a planting plan; a farm manager decides, considering seed lead times, space and yield risk.")),
      mix.length ? panel(aiTitle("Grow more, or grow something different?"),
        table([{ label: "Spare supply in" }, { label: "Spare kg/week", num: true }, { label: "Demand outgrowing" }, { label: "Suggestion" }],
          mix.map((m) => [m.from.name, m.spareKg, m.to.name, m.text]))) : null,
      panel("All crops",
        table([{ label: "Crop" }, { label: "Weeks", num: true }, { label: "Latest paid", num: true }, { label: "Available", num: true }, { label: "Weeks over", num: true }, { label: "Returning", num: true }, { label: "Margin", num: true }, { label: "Forecast" }, { label: "Verdict" }],
          M.CROPS.map((x) => { const w = M.plantingVerdict(x); return [h("a", { class: "link", href: "#demand/" + x.id }, x.name), x.paid.length, w.latest + " kg", w.supply + " kg", w.over + "/4", M.pct(w.repeatNow), M.pct(w.margin), M.forecastRead(x).confidence, pill(w.tone, w.label)]; })))
    ];
  }

  // 9. AI Customer Engagement Assistant — the staff side
  function inbox() {
    const items = M.state.inbox.slice().reverse();
    const tickets = items.filter((x) => x.kind === "ticket");
    const intents = items.filter((x) => x.kind === "intent");
    const unanswered = items.filter((x) => x.kind === "question" && !x.answered);
    const byCrop = {};
    intents.forEach((i) => { const k = i.crop || "unspecified"; byCrop[k] = (byCrop[k] || 0) + 1; });
    const when = (t) => new Date(t).toLocaleString("en-SG", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

    return [
      band("Inbox", "What customers asked Ask MEOD on the consumer page: questions for staff, purchase intent, and questions it couldn't answer."),
      kpis(
        kpi("Open for staff", String(tickets.filter((t) => t.status === "Open").length)),
        kpi("Purchase intent", String(intents.length), "signals, not orders"),
        kpi("Couldn't answer", String(unanswered.length), "gaps in approved info"),
        kpi("All questions", String(items.length), "this browser")),
      panel("Handed to staff",
        tickets.length ? table([{ label: "When" }, { label: "Message (contact details removed)" }, { label: "Status" }, { label: "" }],
          tickets.map((t) => [when(t.at), t.text, pill(t.status === "Open" ? "warn" : "good", t.status),
            t.status === "Open" ? h("button", { class: "btn btn-sm btn-outline", type: "button", onclick: () => { t.status = "Resolved"; M.save(); route(); } }, "Mark resolved") : ""]))
          : h("p", { class: "muted" }, "Nothing yet. On the consumer page, open Ask MEOD and try \"My order was missing items\".")),
      h("div", { class: "grid-2" },
        panel("Purchase intent by crop",
          intents.length ? hbars(Object.entries(byCrop).map(([id, value]) => ({ label: M.crop(id) ? M.crop(id).name : "Not specified", value }))) : h("p", { class: "muted" }, "None yet. Try \"I want to buy 2kg Nai Bai\"."),
          h("p", { class: "muted small" }, "Intent is a lead. It shows interest, but only paid orders count as demand.")),
        panel("Questions it couldn't answer",
          unanswered.length ? h("ul", { class: "seg-list" }, unanswered.slice(0, 10).map((q) => h("li", null, h("span", null, q.text), h("span", { class: "muted small" }, when(q.at)))))
            : h("p", { class: "muted" }, "None yet."),
          h("p", { class: "muted small" }, "Each one is a candidate for a new approved FAQ answer, or an SEO page."))),
      panel(null, howNote("Keyword retrieval over MEOD's approved FAQ, plus live harvest, recipe and pickup data. Complaints, refunds, health and bulk orders always go to a person. Phone numbers, emails and full postal codes are removed before saving.",
        "Retrieval-augmented generation over the same approved knowledge, on MEOD's authorised WhatsApp or website chat, with the same hand-over rules."))
    ];
  }

  function settings() {
    const R = M.rules();
    const FIELDS = [
      ["minWeeks", "Weeks of paid orders before a planting call", 1, 12, 1, false],
      ["weeksOverSupply", "Weeks (of last 4) demand must beat supply", 1, 4, 1, false],
      ["repeatShareMin", "Returning share that counts as dependable", 0.1, 0.9, 0.05, true],
      ["repeatShareWeak", "Returning share below which to fix retention first", 0.05, 0.6, 0.05, true],
      ["minMargin", "Margin Guard: minimum contribution margin", 0.05, 0.5, 0.01, true],
      ["maxTrialIncrease", "Largest trial increase (share of expected harvest)", 0.05, 0.5, 0.05, true],
      ["noPromoUncommitted", "No promotion when uncommitted share is at or under", 0, 0.5, 0.05, true],
      ["discountUncommitted", "Consider a bundle offer above this uncommitted share", 0.2, 0.9, 0.05, true],
      ["underusedUtil", "Pickup has room to grow below this fill", 0.2, 0.9, 0.05, true],
      ["retentionRisk", "Pickup retention risk below this returning share", 0.1, 0.8, 0.05, true],
      ["nearPointKm", "A pickup counts as 'near' within (km)", 1, 10, 0.5, false]
    ];
    const form = h("form", { class: "rules-form", onsubmit: (e) => {
      e.preventDefault();
      const next = {};
      FIELDS.forEach(([k, , min, max, , isPct]) => {
        let val = Number(form[k].value);
        if (isPct) val = val / 100;
        if (Number.isFinite(val)) next[k] = Math.min(max, Math.max(min, val));
      });
      M.state.rules = next; M.save(); toast("Saved. Every screen now uses these thresholds."); route();
    } },
      FIELDS.map(([k, label, min, max, step, isPct]) => h("label", { class: "field" },
        h("span", null, label, " ", h("span", { class: "muted small" }, "(default " + (isPct ? M.pct(M.RULES[k]) : M.RULES[k]) + ")")),
        h("input", { type: "number", name: k, min: isPct ? min * 100 : min, max: isPct ? max * 100 : max, step: isPct ? step * 100 : step, value: isPct ? Math.round(R[k] * 100) : R[k] }))),
      h("div", { class: "approve-row" },
        h("button", { class: "btn btn-forest", type: "submit" }, "Save thresholds"),
        h("button", { class: "btn btn-outline", type: "button", onclick: () => { M.state.rules = {}; M.save(); toast("Back to defaults."); route(); } }, "Use defaults")));

    return [
      band("Settings", "Decision thresholds are illustrative until MEOD confirms them. Percentages are entered as whole numbers."),
      panel("Decision thresholds", form),
      panel("The 10 AI features: what's real today",
        table([{ label: "Feature" }, { label: "In this prototype" }, { label: "Next, with real data" }, { label: "Where" }], [
          ["1. Growth Strategy Advisor", "Ranking rules; explanations written only from listed figures", "LLM explanations grounded in the same verified analytics", "Strategy"],
          ["2. Social Campaign Studio", "Rules + templates for Instagram, Facebook, TikTok, WhatsApp", "LLM drafts from farm data; results fed back", "Campaign Studio"],
          ["3. SEO & Search Advisor", "Query clustering, content gaps, page outlines; CSV import", "Search Console API access; AI-assisted page drafts", "SEO"],
          ["4. Segmentation & churn", "RFM cut-offs; overdue vs own usual gap", "Predictive churn model after 6+ months of history", "Customers"],
          ["5. Demand-to-Planting Forecaster", "Trend forecast with 80% range, backtest, crop-mix check", "Seasonal time-series model scored weekly", "Demand → Planting"],
          ["6. Personal recommender", "Content-based: cooking style, taste, spare harvest", "Order-history personalisation; collaborative filtering", "Consumer page"],
          ["7. Neighbourhood intelligence", "Opportunity score, area types, small-group suppression", "Clustering and per-area forecasts", "Neighbourhoods"],
          ["8. Experiment Optimiser", "Incremental orders, z-tests, sample-size planner", "Holdout groups; adaptive budget allocation", "Experiments"],
          ["9. Engagement assistant", "Keyword retrieval over approved FAQ + live data; hand-over", "RAG on MEOD's authorised chat channels", "Consumer page, Inbox"],
          ["10. Farm storytelling", "Templates from approved farm records + fact checklist", "LLM storytelling from the same records, still verified", "Farm stories"]
        ])),
      panel("Demo data",
        h("p", null, "Clears interest answers, activity, chat questions, drafts, decisions and thresholds saved in this browser."),
        h("button", { class: "btn btn-outline danger", type: "button", onclick: () => { if (confirm("Reset all demo data in this browser?")) { M.reset(); toast("Demo data reset."); route(); } } }, "Reset demo data"))
    ];
  }

  /* ---------- router ---------- */

  const nav = document.getElementById("hub-tabs");
  const view = document.getElementById("view");
  nav.replaceChildren(...TABS.map((t) => h("a", { href: "#" + t.id, "data-tab": t.id }, t.label)));

  function route() {
    const [id, param] = (location.hash.slice(1) || "overview").split("/");
    const tab = TABS.find((t) => t.id === id) || TABS[0];
    nav.querySelectorAll("a").forEach((a) => {
      const on = a.dataset.tab === tab.id;
      a.classList.toggle("on", on);
      if (on) { a.setAttribute("aria-current", "page"); nav.scrollLeft = a.offsetLeft - 16; }
      else a.removeAttribute("aria-current");
    });
    const y = window.scrollY;
    view.replaceChildren(...[tab.render(param)].flat(Infinity).filter(Boolean));
    document.title = tab.label + " — Growth Intelligence | Tyllage for MEOD";
    route.last === location.hash ? window.scrollTo(0, y) : window.scrollTo(0, 0);
    route.last = location.hash;
  }
  window.addEventListener("hashchange", route);
  route();
})();
