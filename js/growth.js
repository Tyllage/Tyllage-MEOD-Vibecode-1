/* Growth Intelligence Hub (farm view). Hash-routed tabs, all rendered with UI.h (textContent only). */
(function () {
  "use strict";
  const M = window.TY, { h, s, aiPill, toast, copy } = window.UI;

  // Grouped along the chain: Smart Value → Repeat customers → Verified demand → Farm growth.
  const GROUPS = [
    { id: "home", label: "Overview" },
    { id: "value", label: "1 · Smart Value" },
    { id: "keep", label: "2 · Repeat customers" },
    { id: "grow", label: "3 · Demand → Growth" },
    { id: "win", label: "Marketing" },
    { id: "admin", label: "Settings" }
  ];
  const TABS = [
    { id: "overview", group: "home", label: "Overview", render: overview },
    { id: "strategy", group: "home", label: "Strategy", render: strategy },
    { id: "value", group: "value", label: "Value engine", render: valueHome },
    { id: "prices", group: "value", label: "Price check", render: pricesView },
    { id: "offers", group: "value", label: "Offers & margin", render: offersView },
    { id: "fulfil", group: "value", label: "Fulfilment", render: fulfilView },
    { id: "offertest", group: "value", label: "Offer test", render: offerTestView },
    { id: "journey", group: "value", label: "Customer journey", render: journeyView },
    { id: "promotions", group: "win", label: "Promotions & budget", render: promotions },
    { id: "campaigns", group: "win", label: "Campaign Studio", render: campaigns },
    { id: "experiments", group: "win", label: "Experiments", render: experiments },
    { id: "seo", group: "win", label: "SEO", render: seo },
    { id: "trends", group: "win", label: "Trends & partners", render: trendsView },
    { id: "stories", group: "win", label: "Farm stories", render: stories },
    { id: "habits", group: "keep", label: "Habits & rewards", render: habitsView },
    { id: "customers", group: "keep", label: "Customers", render: customers },
    { id: "loyalty", group: "keep", label: "Loyalty & boxes", render: loyalty },
    { id: "feedback", group: "keep", label: "Feedback", render: feedbackView },
    { id: "points", group: "keep", label: "Neighbourhoods", render: points },
    { id: "inbox", group: "keep", label: "Inbox", render: inbox },
    { id: "verified", group: "grow", label: "Verified demand", render: verifiedView },
    { id: "demand", group: "grow", label: "Demand → Planting", render: demand },
    { id: "newcrops", group: "grow", label: "New crops", render: newCrops },
    { id: "settings", group: "admin", label: "Settings", render: settings }
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
      h("p", { class: "muted small" }, "Rule-based. Thresholds are in Settings and are illustrative until Tyllage confirms them."));
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
      { label: "First-time buyers", value: f.first },
      { label: "Came back within 28 days", value: f.repeat }
    ];
    const ev = M.state.events;
    const evCount = (t) => ev.filter((e) => e.type === t).length;

    return [
      band("Good to see you, " + (window.TyAccount && window.TyAccount.session() ? window.TyAccount.shortName(window.TyAccount.session().name) : "team"),
        `${recs.length} growth recommendations · ${verdicts.filter((x) => x.v.key === "test-more").length} crop ready for a production trial · ${openTickets} open customer question${openTickets === 1 ? "" : "s"}`,
        [h("a", { class: "btn btn-sm btn-gold", href: "#value" }, "Smart Value engine"), h("a", { class: "btn btn-sm btn-outline-light", href: "#strategy" }, "Open Strategy")]),
      panel("Smart Value → Repeat customers → Verified demand → Farm growth", chain()),
      kpis(
        kpi("Campaign visits", f.visits.toLocaleString(), "last 4 weeks"),
        kpi("First-time buyers", String(f.first), M.pct(f.first / f.visits) + " of visits"),
        kpi("Came back within 28 days", String(f.repeat), M.pct(f.repeat / f.first) + " of new buyers"),
        kpi("Repeat-backed demand", f.weeklyKg + " kg/wk", "latest week × returning share")),
      questions(),
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
          h("p", { class: "muted small" }, `Likes and views aren't counted. Only visits that reach Tyllage or a group buy, then real purchases. Separately, ${f.interested} households have registered interest; that's a lead, not a step in this funnel.`))),
      panel("Demand → Planting at a glance",
        table([{ label: "Crop" }, { label: "Latest paid", num: true }, { label: "Consumer supply", num: true }, { label: "Returning", num: true }, { label: "Forecast" }, { label: "Verdict" }],
          verdicts.map(({ c, v }) => [h("a", { href: "#demand/" + c.id, class: "link" }, c.name), v.latest + " kg", v.supply + " kg", M.pct(v.repeatNow), M.forecastRead(c).confidence, pill(v.tone, v.label)]))),
      panel("From this browser (live demo activity)",
        h("p", { class: "muted small" }, "Try the consumer page, then come back. These counts come from this browser only and are added to the totals above."),
        kpis(
          kpi("Page visits", String(evCount("page_visit"))),
          kpi("Store, product & recipe clicks", String(evCount("product_click") + evCount("store_click") + evCount("recipe_click") + evCount("rec_click"))),
          kpi("Ask Tyllage questions", String(evCount("assistant"))),
          kpi("Harvest interest", String(M.state.interests.length))))
    ];
  }

  // The three questions Tyllage answers, each with its headline from the other tabs.
  function questions() {
    const j = M.journey().anomalies[0];
    const fb = M.feedback().themes.find((t) => t.barrier && t.neg >= 2);
    const cl = M.clv()[0];
    const due = M.replenishment().filter((x) => x.cu.consent).length;
    const nai = M.scenarios(M.crop("nai-bai")).slice(1).filter((r) => r.extraContribution > 0 && r.pWaste < 0.15).sort((a, b) => b.extraContribution - a.extraContribution)[0];
    const trial = M.NEW_CROPS.map((n) => ({ n, r: M.newCropRead(n) })).find((x) => x.r.verdict.label === "Run a small trial");
    const card = (n, q, lines, href, cta) => h("div", { class: "q-card" },
      h("span", { class: "q-num" }, n), h("h2", null, q),
      h("ul", null, lines.filter(Boolean).map((l) => h("li", null, l))),
      h("a", { class: "link", href }, cta + " →"));
    return h("div", { class: "q-grid" },
      card("1", "How do we convince more people to buy Singapore-grown produce?", [
        j ? `Carts under S$60 are dropping at the delivery fee (about ${j.lostOrders} orders/week). Offer pickup first.` : null,
        fb ? `${fb.label} is the biggest complaint, so fix it before buying more ads.` : null,
        "Recipe-led beats discounts on buyers who come back."
      ], "#journey", "Win customers"),
      card("2", "How do we turn first-time buyers into consistent customers?", [
        `${cl.ch} customers are worth the most over 6 months (${M.money(cl.value)}).`,
        `${due} opted-in customers are due to reorder in the next 3 days.`,
        "Steady buyers could move to a weekly box."
      ], "#loyalty", "Keep customers"),
      card("3", "How do we use growing demand to expand production with confidence?", [
        nai ? `Nai Bai: the forecast supports a +${M.forecastRead(M.crop("nai-bai")).trialKg} kg/week trial; the simulator's best balance is +${M.pct(nai.pct)} (about ${M.money(nai.extraContribution)}/week more, low waste risk).` : null,
        trial ? `${trial.n.name}: reservations justify a small trial bed.` : null,
        ...M.CROPS.filter((c) => M.plantingVerdict(c).key === "grow-demand").map((c) => `${c.name}: don't grow more yet; build repeat demand first.`)
      ], "#demand", "Grow the farm"));
  }

  // 1. AI Growth Strategy Advisor
  function strategy() {
    const recs = M.strategy();
    const decided = (title) => M.state.decisions.filter((d) => d.kind === "strategy" && d.title === title).slice(-1)[0];
    return [
      band("Growth strategy", "Where Tyllage should focus next: ranked from customer behaviour, campaign results, repeat purchases and crop demand."),
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
        panel(aiTitle("Drafts to edit"),
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
              M.save(); toast("Sent to Tyllage for approval. Nothing has been posted."); route();
            } }, "Submit for approval"),
            h("span", { class: "muted small" }, "Approving never posts anything. Tyllage posts from its own accounts with the tracked link.")))
      ];
    }

    const queue = M.state.drafts.slice().reverse();
    const approvals = panel("Approval queue",
      queue.length ? table([{ label: "ID" }, { label: "Campaign" }, { label: "Channel" }, { label: "Status" }, { label: "" }],
        queue.map((d) => [d.id, d.title, d.channel, pill(d.status === "Approved" ? "good" : d.status === "Rejected" ? "bad" : "warn", d.status),
          d.status === "Waiting for approval" ? h("span", { class: "btn-pair" },
            h("button", { class: "btn btn-sm btn-forest", type: "button", onclick: () => { d.status = "Approved"; M.save(); route(); } }, "Approve"),
            h("button", { class: "btn btn-sm btn-outline", type: "button", onclick: () => { d.status = "Rejected"; M.save(); route(); } }, "Reject")) : ""]))
        : h("p", { class: "muted" }, "Nothing waiting. Submitted campaigns and farm stories appear here for a Tyllage manager."));

    // UTM builder.
    const out = h("code", { class: "utm" });
    const form = h("form", { class: "utm-form", onsubmit: (e) => e.preventDefault() },
      h("label", { class: "field" }, h("span", null, "Source"), h("input", { name: "src", value: "instagram" })),
      h("label", { class: "field" }, h("span", null, "Medium"), h("input", { name: "med", value: "social" })),
      h("label", { class: "field" }, h("span", null, "Campaign"), h("input", { name: "cmp", value: c.id.replace(/-/g, "") + "-" + ui.angle })));
    const clean = (v) => v.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "") || "unset";
    const upd = () => { out.textContent = M.utm(clean(form.src.value), clean(form.med.value), clean(form.cmp.value)); };
    form.addEventListener("input", upd); upd();
    const builder = panel("Tracked link builder", h("p", { class: "muted small" }, "Every post, QR code and leader message should use its own link so Tyllage can tell which ones bring buyers."),
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

    const title = h("input", { name: "title", value: "This Week at Tyllage | Fresh Vegetables Grown in Singapore" });
    const desc = h("textarea", { name: "desc", rows: 3 });
    desc.value = "See what Tyllage is harvesting in Kranji this week, with easy recipes and neighbourhood group-buy pickups across Singapore.";
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
        { ok: /tyllage/i.test(t), label: "Title includes the Tyllage brand" }
      ].map((c) => h("li", { class: c.ok ? "ok" : "no" }, (c.ok ? "✓ " : "✕ ") + c.label)));
    };
    [title, desc, kw].forEach((el) => el.addEventListener("input", run));
    run();

    return [
      band("SEO opportunities", "Help people searching for local vegetables find Tyllage. A person approves everything before it is published."),
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
        table([{ label: "Search topic" }, { label: "Intent" }, { label: "Tyllage page" }, { label: "Status" }, { label: "Suggestion" }],
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
        howNote("An outline filled from Tyllage's approved FAQ, harvest plan, recipes and pickups.", "An LLM helps write the prose; Tyllage edits and publishes one genuinely useful page at a time. Google rewards helpful, original pages, not lots of auto-generated ones.")),
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
      band("Customers", "Who buys often, who's new, and who is quietly drifting away — so Tyllage can be useful to them before they're gone."),
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
        howNote("RFM scores 1–5 from fixed cut-offs.", "Cut-offs set from Tyllage's real order history; a churn prediction model only once there are 6+ months of purchases per customer.")),
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
      panel(aiTitle("Opportunity finder: interest without orders"),
        table([{ label: "Area" }, { label: "Campaign visits", num: true }, { label: "Orders", num: true }, { label: "Visit → order", num: true }, { label: "Know the pickup", num: true }, { label: "Read" }, { label: "Suggested test" }],
          M.opportunities().map((o) => [h("strong", null, o.p.area), o.visits, o.orders, M.pct(o.conv), M.pct(o.aware), pill(o.kind.startsWith("Interest") ? "warn" : o.kind === "Converting well" ? "good" : "neutral", o.kind), o.action])),
        h("p", { class: "muted small" }, "Visits and orders are counted per area, never per household. 'Know the pickup' is from a short demo survey.")),
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
        howNote("Scores and types from fixed rules on each pickup's numbers.", "Clustering areas on purchase patterns, and forecasting each pickup's demand. Before adding a pickup, Tyllage checks delivery cost, leader commission and that perishables can be collected promptly."))
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
      panel(null, chipLinks(M.CROPS, c.id, (x) => "#demand/" + x.id),
        (() => { const x = M.smartDemand().crops.find((y) => y.c.id === c.id); return h("p", { class: "muted small" }, "From the savings checker: ", pill(x.signal.tone, x.signal.label), ` ${x.recurring[x.recurring.length - 1]} kg/week of ${c.name} now comes from repeat orders. `, h("a", { class: "link", href: "#verified" }, "Verified demand →")); })()),
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
        howNote("Rules plus a straight-line trend with an 80% range, checked against the last 2 weeks.", "A seasonal time-series model on Tyllage's full sales and confirmed group-buy orders, scored every week against what actually sold. Tyllage never changes a planting plan; a farm manager decides, considering seed lead times, space and yield risk.")),
      simulator(c),
      mix.length ? panel(aiTitle("Grow more, or grow something different?"),
        table([{ label: "Spare supply in" }, { label: "Spare kg/week", num: true }, { label: "Demand outgrowing" }, { label: "Suggestion" }],
          mix.map((m) => [m.from.name, m.spareKg, m.to.name, m.text]))) : null,
      panel("All crops",
        table([{ label: "Crop" }, { label: "Weeks", num: true }, { label: "Latest paid", num: true }, { label: "Available", num: true }, { label: "Weeks over", num: true }, { label: "Returning", num: true }, { label: "Margin", num: true }, { label: "Forecast" }, { label: "Verdict" }],
          M.CROPS.map((x) => { const w = M.plantingVerdict(x); return [h("a", { class: "link", href: "#demand/" + x.id }, x.name), x.paid.length, w.latest + " kg", w.supply + " kg", w.over + "/4", M.pct(w.repeatNow), M.pct(w.margin), M.forecastRead(x).confidence, pill(w.tone, w.label)]; })))
    ];
  }

  // AI Planting Scenario Simulator
  function simulator(c) {
    const rows = M.scenarios(c);
    const best = rows.slice(1).filter((r) => r.extraContribution > 0 && r.pWaste < 0.15).sort((a, b) => b.extraContribution - a.extraContribution)[0];
    return panel(aiTitle("What if we grow more " + c.name + "?"),
      table([{ label: "Grow" }, { label: "Extra kg/week", num: true }, { label: "Sold to consumers", num: true }, { label: "Unsold", num: true }, { label: "Chance of >10% unsold", num: true }, { label: "Extra contribution / week", num: true }, { label: "Total contribution, 80% range", num: true }],
        rows.map((r) => [r.pct ? "+" + M.pct(r.pct) : "As planned", r.extraKg, r.sold.toFixed(1) + " kg", r.unsold.toFixed(1) + " kg", M.pct(r.pWaste), r.pct ? (r.extraContribution >= 0 ? "+" : "") + M.money(r.extraContribution) : "—", M.money(r.p10) + " to " + M.money(r.p90)])),
      h("p", { class: "verdict-line" }, best ? pill("good", "Best balance") : pill("neutral", "Hold"),
        best ? ` +${M.pct(best.pct)} adds about ${M.money(best.extraContribution)} a week with only a ${M.pct(best.pWaste)} chance of more than 10% going unsold. Bigger increases add little or lose money, and the waste risk climbs fast.` : " No increase earns more than it risks right now."),
      howNote("2,000 simulated weeks: demand drawn from the forecast range, yield varying ±10%, committed orders served first, unsold kg counted as lost (worst case).", "Probabilistic forecasts from Tyllage's real sales and yields, plus real spoilage and clearance prices (unsold greens could go to Surprise Bags instead of waste)."));
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
      band("Inbox", "What customers asked Ask Tyllage on the consumer page: questions for staff, purchase intent, and questions it couldn't answer."),
      kpis(
        kpi("Open for staff", String(tickets.filter((t) => t.status === "Open").length)),
        kpi("Purchase intent", String(intents.length), "signals, not orders"),
        kpi("Couldn't answer", String(unanswered.length), "gaps in approved info"),
        kpi("All questions", String(items.length), "this browser")),
      panel("Handed to staff",
        tickets.length ? table([{ label: "When" }, { label: "Message (contact details removed)" }, { label: "Status" }, { label: "" }],
          tickets.map((t) => [when(t.at), t.text, pill(t.status === "Open" ? "warn" : "good", t.status),
            t.status === "Open" ? h("button", { class: "btn btn-sm btn-outline", type: "button", onclick: () => { t.status = "Resolved"; M.save(); route(); } }, "Mark resolved") : ""]))
          : h("p", { class: "muted" }, "Nothing yet. On the consumer page, open Ask Tyllage and try \"My order was missing items\".")),
      h("div", { class: "grid-2" },
        panel("Purchase intent by crop",
          intents.length ? hbars(Object.entries(byCrop).map(([id, value]) => ({ label: M.crop(id) ? M.crop(id).name : "Not specified", value }))) : h("p", { class: "muted" }, "None yet. Try \"I want to buy 2kg Nai Bai\"."),
          h("p", { class: "muted small" }, "Intent is a lead. It shows interest, but only paid orders count as demand.")),
        panel("Questions it couldn't answer",
          unanswered.length ? h("ul", { class: "seg-list" }, unanswered.slice(0, 10).map((q) => h("li", null, h("span", null, q.text), h("span", { class: "muted small" }, when(q.at)))))
            : h("p", { class: "muted" }, "None yet."),
          h("p", { class: "muted small" }, "Each one is a candidate for a new approved FAQ answer, or an SEO page."))),
      panel(null, howNote("Keyword retrieval over Tyllage's approved FAQ, plus live harvest, recipe and pickup data. Complaints, refunds, health and bulk orders always go to a person. Phone numbers, emails and full postal codes are removed before saving.",
        "Retrieval-augmented generation over the same approved knowledge, on Tyllage's authorised WhatsApp or website chat, with the same hand-over rules."))
    ];
  }

  // AI Conversion & Customer Journey Analyst
  function journeyView() {
    const J = M.JOURNEY, j = M.journey();
    const last = J.sessions.length - 1;
    const bandRows = Object.entries(J.bands).map(([band, b]) => {
      let n = J.sessions[last] * b.share;
      const counts = [Math.round(n)];
      b.rates.forEach((r) => { n *= r[last]; counts.push(Math.round(n)); });
      return { band, counts, rates: b.rates.map((r) => r[last]) };
    });
    return [
      band("Customer journey", "Why people visit Tyllage but don't buy, so we fix the step that's losing them instead of buying more traffic."),
      j.anomalies.length ? j.anomalies.map((a) => panel(aiTitle("Unusual drop: " + a.band.replace(/^Cart/, "carts")),
        h("div", { class: "verdict" },
          pill("bad", "−" + M.pct(Math.abs(a.rel)) + " vs usual"),
          h("p", null, h("strong", null, `Fewer ${a.band.replace(/^Cart/, "carts")} get from "${a.from}" to "${a.step}": ${M.pct(a.now)} in the last 2 weeks vs ${M.pct(a.mean)} before.`)),
          h("p", null, `${a.note}. That's about ${a.lostOrders} lost orders a week. Carts of S$60+ haven't changed, so the fee is the likely cause, not the site.`),
          h("p", null, "Suggested test: show group-buy pickup (no delivery fee) as an option on the cart page, before checkout, for half of visitors with carts under S$60 for two weeks. Compare paid orders.")),
        why([`Compared the last 2 weeks with the 6 weeks before, for every step and cart size.`, `This step moved ${Math.abs(a.z).toFixed(0)} standard deviations from its usual level; anything over 3 is flagged.`, "Other steps and the S$60+ carts stayed within their normal range."], "How this was spotted"))) :
        panel(null, h("p", null, "No unusual drops in the last 2 weeks.")),
      panel("Where visitors leave (latest week)",
        table([{ label: "Step" }].concat(bandRows.map((b) => ({ label: b.band, num: true }))),
          J.steps.map((s, i) => [s].concat(bandRows.map((b) => b.counts[i].toLocaleString() + (i ? " (" + M.pct(b.rates[i - 1]) + ")" : ""))))),
        h("p", { class: "muted small" }, "People reaching each step, with the share who continued from the step before. Demo numbers shaped like a Google Analytics checkout funnel.")),
      panel(null, howNote("Compares each step's recent conversion with its own history and flags big, unusual drops; the explanation is written from those figures.", "Read from our own store analytics (aggregated, no personal data), checked daily, with an LLM explaining what changed in plain words."))
    ];
  }

  // Promotion Profitability Optimiser + Marketing Budget Allocator
  function promotions() {
    ui.promo = ui.promo || { normal: 1200, offer: 1000, cost: 700 };
    ui.budget = ui.budget || 100000;
    const pc = M.promoCheck(ui.promo);
    const menu = M.promoMenu();
    const alloc = M.allocate(ui.budget);
    const D = M.DELIVERY;
    const survey = M.state.survey;
    const tally = (q) => ["yes", "maybe", "no"].map((v) => survey.filter((s) => s[q] === v).length);

    const promoForm = h("form", { class: "utm-form", onsubmit: (e) => e.preventDefault(), onchange: (e) => {
      const f = e.currentTarget;
      const cents = (v, d) => Math.max(0, Math.round((Number(v) || d / 100) * 100));
      ui.promo = { normal: cents(f.normal.value, 1200), offer: cents(f.offer.value, 1000), cost: cents(f.cost.value, 700) };
      route();
    } },
      h("label", { class: "field" }, h("span", null, "Normal bundle price (S$)"), h("input", { type: "number", step: "0.5", min: 0, name: "normal", value: ui.promo.normal / 100 })),
      h("label", { class: "field" }, h("span", null, "Offer price (S$)"), h("input", { type: "number", step: "0.5", min: 0, name: "offer", value: ui.promo.offer / 100 })),
      h("label", { class: "field" }, h("span", null, "Produce + packing cost (S$)"), h("input", { type: "number", step: "0.5", min: 0, name: "cost", value: ui.promo.cost / 100 })));

    return [
      band("Promotions & budget", "Make buying from the farm feel like a better deal without a price war: use neighbourhood pickup, bundles and loyalty, and check every offer's margin."),
      panel(aiTitle("Promotion profitability check"),
        promoForm,
        table([{ label: "Scenario" }, { label: "Customer pays", num: true }, { label: "Delivery / drop", num: true }, { label: "Leader", num: true }, { label: "Contribution", num: true }, { label: "Margin", num: true }, { label: "Margin Guard" }],
          pc.rows.map((r) => [r.label, M.money(r.e.customerPays), M.money(r.e.deliveryCost), M.money(r.e.leader), M.money(r.e.contribution), M.pct(r.e.margin), pill(r.ok ? "good" : "bad", r.ok ? "Passes" : "Below " + M.pct(pc.floor))])),
        h("p", { class: "verdict-line" }, pill(pc.verdict.tone, "Suggested"), " " + pc.verdict.text),
        h("p", { class: "muted small" }, `Home delivery costs Tyllage about ${M.money(D.homeCost)} per order; a group-buy drop costs about ${M.money(D.dropCost)} shared by ~${D.dropHouseholds} households (${M.money(Math.round(D.dropCost / D.dropHouseholds))} each) plus ${M.pct(D.leaderRate)} leader commission. Illustrative costs, before overheads, acquisition cost and spoilage.`)),
      panel(aiTitle("Which promotions to test"),
        table([{ label: "Promotion" }, { label: "Why customers like it" }, { label: "How Tyllage protects margin" }, { label: "This order", num: true }, { label: "Came back (evidence)", num: true }, { label: "6-month value", num: true }, { label: "" }],
          menu.map((m) => [h("strong", null, m.name), m.why, m.guard, M.money(m.e.contribution) + " (" + M.pct(m.e.margin) + ")", h("span", null, M.pct(m.repeat), h("br"), h("span", { class: "muted small" }, m.src)), M.money(m.sixMonth), pill(m.ok ? "good" : "warn", m.ok ? "Within guard" : "Below guard")])),
        h("p", { class: "muted small" }, "6-month value = this order's contribution + expected repeat orders at the normal price. A one-time voucher can be worth it if buyers come back; the evidence so far says discount buyers mostly don't. Free delivery on small orders loses money on every order.")),
      panel(aiTitle("Marketing budget allocator"),
        h("form", { class: "approve-row", onsubmit: (e) => e.preventDefault(), onchange: (e) => { ui.budget = Math.max(10000, Math.round((Number(e.target.value) || 1000) * 100)); route(); } },
          h("label", { class: "field", style: "margin:0" }, h("span", null, "Monthly budget (S$)"), h("input", { type: "number", min: 100, step: 50, value: ui.budget / 100 }))),
        table([{ label: "Channel" }, { label: "Cost per new buyer", num: true }, { label: "6-month value", num: true }, { label: "Suggested", num: true }, { label: "Expected new buyers", num: true }, { label: "Status" }],
          alloc.list.map((x) => [x.ch, M.money(Math.round(x.cpa)), M.money(x.value), M.money(x.alloc), x.alloc ? x.buyers + " (" + x.lo + "–" + x.hi + ")" : "—",
            !x.alloc ? pill("neutral", "Not funded: lower value") : x.alloc >= x.cap ? pill("neutral", "At limit") : x.proven ? pill("good", "Proven") : pill("warn", "Limited test (≤15%)")])),
        alloc.unallocated ? h("p", { class: "muted small" }, `${M.money(alloc.unallocated)} left unallocated: every channel is at its limit. Keep it, or fund a new test.`) : null,
        howNote("Spends in S$5 steps on whichever channel's next dollar earns the most, with diminishing returns, a limit of 3× past spend per channel, and at most 15% on channels with fewer than 30 buyers. Cost per new buyer includes staff time to make the content.", "Fitted response curves per channel from Tyllage's real spend and sales, re-run monthly.")),
      panel("What customers told us (from the consumer page)",
        survey.length ? table([{ label: "Question" }, { label: "Yes", num: true }, { label: "Maybe", num: true }, { label: "No", num: true }], [
          ["Cheaper, but collect it?", ...tally("q1")], ["Pay more for home delivery?", ...tally("q2")], ["Freshness + local enough without lowest price?", ...tally("q3")]
        ]) : h("p", { class: "muted" }, "No answers yet. Fill in 'Help Tyllage get the deal right' on the consumer page."))
    ];
  }

  // Seasonal Food Trend Radar + Creator & Community Matcher
  function trendsView() {
    const tr = M.trends(), ps = M.partners();
    return [
      band("Trends & partners", "Cooking topics people are turning to, checked against real purchases, and the creators and communities who fit them."),
      panel(aiTitle("Seasonal food trend radar"),
        table([{ label: "Topic" }, { label: "Season" }, { label: "Interest, 8 weeks" }, { label: "Interest change", num: true }, { label: "Recipe-link orders", num: true }, { label: "Status" }, { label: "Next" }],
          tr.map((t) => [h("strong", null, t.topic), t.season, sparkline(t.idx), (t.search >= 0 ? "+" : "") + M.pct(t.search), t.buys.some((x) => x) ? (t.buysGrowth >= 0 ? "+" : "") + M.pct(t.buysGrowth) : "none yet", pill(t.status.tone, t.status.label), h("span", null, t.status.next, h("br"), h("span", { class: "muted small" }, "Crops: " + t.crops.map((id) => M.crop(id).name).join(", ")))])),
        howNote("Last 4 weeks vs the 4 before, for a search/social interest index and for orders through recipe links. A topic needs both to rise before it becomes a campaign.", "Google Trends / Search Console and social listening with Tyllage's authorisation, clustered into topics automatically.")),
      panel(aiTitle("Creator & community matcher"),
        h("div", { class: "type-grid" }, ps.map((p) => h("div", { class: "type-card" },
          h("div", { class: "rec-top" }, h("strong", null, p.name), pill(p.score >= 65 ? "good" : "neutral", p.score + "/100")),
          h("p", { class: "muted small" }, p.type + " · " + p.langs),
          h("ul", { class: "small-list" }, p.why.map((w) => h("li", null, w)))))),
        h("p", { class: "muted small" }, "Scores use topic fit, whether their audience is near a pickup with room, and past results with Tyllage. Follower counts and engagement rates are never estimated; with no past results, the score says so."))
    ];
  }

  // Customer Lifetime Value + Subscription designer + Replenishment
  function loyalty() {
    const cl = M.clv(), subs = M.subscriptions(), due = M.replenishment();
    const best = cl[0], worst = cl[cl.length - 1];
    const fromSite = M.state.subs.length;
    return [
      band("Loyalty & boxes", "Which channels bring customers who keep buying, who's ready to reorder, and who might want a regular box."),
      panel(aiTitle("Lifetime value by how customers first found Tyllage"),
        table([{ label: "First came from" }, { label: "Customers", num: true }, { label: "Still buying at month 6", num: true }, { label: "6-month value", num: true }, { label: "Cost to acquire", num: true }, { label: "Value ÷ cost", num: true }],
          cl.map((c) => [c.ch, c.n, M.pct(c.m6), M.money(c.value), c.cac ? M.money(c.cac) : "—", c.ratio ? c.ratio.toFixed(1) + "×" : "—"])),
        h("p", { class: "verdict-line" }, pill("good", "Insight"), ` A customer who first came from ${best.ch} is worth about ${M.money(best.value)} over six months; one from ${worst.ch} about ${M.money(worst.value)}. Judge channels on this, not on first orders.`),
        howNote("Cohort retention × orders per month × average order × margin.", "Real cohorts from Tyllage customer IDs; a predictive value model once there's a year of history.")),
      panel(aiTitle("Ready to reorder"),
        due.length ? table([{ label: "Customer" }, { label: "Usual gap", num: true }, { label: "Due", num: true }, { label: "Usual day" }, { label: "Send" }, { label: "Suggested" }],
          due.map((x) => [x.cu.id, x.cu.interval + " days", x.due <= 0 ? "now" : "in " + x.due + " day" + (x.due > 1 ? "s" : ""), x.day, x.cu.consent ? x.when : "—", x.action])) : h("p", { class: "muted" }, "Nobody is due in the next 3 days."),
        h("p", { class: "muted small" }, "Uses each customer's own gap between orders. Reminders go only to customers who opted in, and never more than one per order cycle.")),
      panel(aiTitle("Weekly or fortnightly box"),
        h("p", null, `${subs.steady.length} customers already buy steadily (6+ orders, every 2 weeks or more often): ${subs.weekly.length} weekly-ish, ${subs.fortnightly.length} fortnightly. ${fromSite ? fromSite + " more said 'I'd like this weekly' on the consumer page." : ""}`),
        table([{ label: "Box" }, { label: "How often" }, { label: "Contents" }, { label: "Price", num: true }, { label: "Margin", num: true }, { label: "Margin Guard" }],
          subs.boxes.map((b) => [h("strong", null, b.name), b.freq, b.contents.map((c) => b.each + " g " + c).join(", "), M.money(b.price) + " (save " + M.money(b.full - b.price) + ")", M.pct(b.e.margin), pill(b.ok ? "good" : "bad", b.ok ? "Passes" : "Below floor")])),
        h("p", null, `If 25–40% of steady buyers opted in, that's roughly ${subs.demand.low}–${subs.demand.high} kg a week committed in advance — the most dependable demand Tyllage can plan around.`),
        howNote("Spots steady buyers from order history, prices boxes at 5% under buying separately (pickup only) and checks the margin. Test with interest sign-ups before building billing.", "Cohort analysis on real orders, box contents rotated by harvest, and a subscription-demand forecast feeding Demand → Planting."))
    ];
  }

  // Customer Feedback Intelligence
  function feedbackView() {
    const extra = M.state.inbox.filter((x) => x.kind !== "intent").map((x, i) => ({ id: "CH-" + i, source: "Chat", text: x.text, rating: null }));
    const fb = M.feedback(extra);
    return [
      band("Feedback", "Reviews, complaints, social comments, enquiries and Ask Tyllage chats, grouped into what's helping and what's holding growth back."),
      panel(aiTitle("Summary"), h("p", { class: "verdict-line" }, pill("warn", "Top barrier"), " " + fb.summary),
        howNote("Keyword topic grouping and a simple positive/negative word score, combined with star ratings.", "Topic clustering and sentiment models across reviews, social comments and support tickets, with an LLM writing the summary from the counted themes.")),
      panel("Themes",
        table([{ label: "Theme" }, { label: "Mentions", num: true }, { label: "Negative", num: true }, { label: "Positive", num: true }, { label: "Type" }, { label: "Suggested" }],
          fb.themes.map((t) => [h("details", { class: "cluster" }, h("summary", null, t.label), h("ul", null, t.hits.slice(0, 4).map((f) => h("li", null, `"${f.text}" — ${f.source}`)))), t.count, t.neg, t.pos, pill(t.barrier ? "warn" : "neutral", t.barrier ? "Growth barrier" : "Product"), t.action]))),
      panel("All feedback",
        table([{ label: "Source" }, { label: "Feedback" }, { label: "Rating", num: true }, { label: "Sentiment" }],
          fb.items.slice(0, 40).map((f) => [f.source, f.text, f.rating ? f.rating + "★" : "—", pill(f.sentiment === "Positive" ? "good" : f.sentiment === "Negative" ? "bad" : "neutral", f.sentiment)])),
        h("p", { class: "muted small" }, "Demo feedback plus Ask Tyllage questions from this browser (contact details removed)."))
    ];
  }

  // New Crop Demand Tester
  function newCrops() {
    const mine = (id, type) => M.state.newcrop.filter((x) => x.id === id && x.type === type).length;
    return [
      band("New crops", "Test demand for a crop before planting it: interest is cheap, reservations are a real commitment."),
      M.NEW_CROPS.map((nc) => {
        const r = M.newCropRead(nc, mine(nc.id, "interest"), mine(nc.id, "reserve"));
        return panel(aiTitle(nc.name + " (" + nc.zh + ")"),
          kpis(kpi("Interested", String(r.interest)), kpi("Reserved", String(r.reserved), M.pct(r.conv) + " of interested"), kpi("Reserved demand", r.kg + " kg/wk"), kpi("Margin", M.pct(r.margin), M.money(nc.price) + "/kg")),
          h("p", { class: "verdict-line" }, pill(r.verdict.tone, r.verdict.label), " " + r.verdict.text));
      }),
      panel(null, howNote("Separates interest from reservations, sizes a trial to reservations only, and checks the margin.", "Reservations taken on Tyllage with a small refundable deposit, and scenario modelling of trial-bed size vs sell-through."))
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
      band("Settings", "Decision thresholds are illustrative until Tyllage confirms them. Percentages are entered as whole numbers."),
      panel("Decision thresholds", form),
      panel("The AI features: what's real today",
        table([{ label: "Feature" }, { label: "In this prototype" }, { label: "Next, with real data" }, { label: "Where" }], [
          ["1. Growth Strategy Advisor", "Ranking rules; explanations written only from listed figures", "LLM explanations grounded in the same verified analytics", "Strategy"],
          ["2. Social Campaign Studio", "Rules + templates for Instagram, Facebook, TikTok, WhatsApp", "LLM drafts from farm data; results fed back", "Campaign Studio"],
          ["3. SEO & Search Advisor", "Query clustering, content gaps, page outlines; CSV import", "Search Console API access; AI-assisted page drafts", "SEO"],
          ["4. Segmentation & churn", "RFM cut-offs; overdue vs own usual gap", "Predictive churn model after 6+ months of history", "Customers"],
          ["5. Demand-to-Planting Forecaster", "Trend forecast with 80% range, backtest, crop-mix check", "Seasonal time-series model scored weekly", "Demand → Planting"],
          ["6. Personal recommender", "Content-based: cooking style, taste, spare harvest", "Order-history personalisation; collaborative filtering", "Consumer page"],
          ["7. Neighbourhood intelligence", "Opportunity score, area types, small-group suppression", "Clustering and per-area forecasts", "Neighbourhoods"],
          ["8. Experiment Optimiser", "Incremental orders, z-tests, sample-size planner", "Holdout groups; adaptive budget allocation", "Experiments"],
          ["9. Engagement assistant", "Keyword retrieval over approved FAQ + live data; hand-over", "RAG on Tyllage's authorised chat channels", "Consumer page, Inbox"],
          ["10. Farm storytelling", "Templates from approved farm records + fact checklist", "LLM storytelling from the same records, still verified", "Farm stories"],
          ["11. Conversion & journey analyst", "Step-by-step funnel by cart size; flags drops over 3 standard deviations", "Tyllage analytics with authorisation; daily checks; LLM explanations", "Customer journey"],
          ["12. Neighbourhood opportunity finder", "Visits vs orders vs pickup awareness per area", "Geographic clustering on aggregated campaign data", "Neighbourhoods"],
          ["13. Basket builder", "Household size + must-haves + complements, sized to the week; pickup vs delivery cost", "Order history, price sensitivity and stock-aware bundles", "Consumer page → Fresh deals"],
          ["14. Replenishment predictor", "Each customer's own reorder gap and usual day; consent-gated reminders", "Predictive reorder timing model", "Loyalty & boxes"],
          ["15. Feedback intelligence", "Keyword themes, sentiment words + ratings, barrier vs product", "Topic clustering, sentiment models, LLM summaries", "Feedback"],
          ["16. New crop demand tester", "Interest vs reservations; trial sized to reservations; margin check", "Deposits on Tyllage; trial-size scenarios", "New crops, consumer page"],
          ["17. Subscription & retention designer", "Steady-buyer cohorts, box pricing with Margin Guard, committed-kg range", "Real cohorts; box demand into Demand → Planting", "Loyalty & boxes"],
          ["18. Seasonal trend radar", "Interest index vs recipe-link orders; needs both to rise", "Search and social trend data with authorisation", "Trends & partners"],
          ["19. Creator & community matcher", "Topic fit + area fit + recorded Tyllage results; no invented metrics", "Content classification of real partner content", "Trends & partners"],
          ["20. Marketing budget allocator", "Greedy allocation by marginal value with caps and test limits", "Fitted channel response curves", "Promotions & budget"],
          ["21. Planting scenario simulator", "2,000 simulated weeks of demand and yield", "Probabilistic forecasts from real sales and yields", "Demand → Planting"],
          ["22. Lifetime value analyst", "Retention cohorts × order value × margin vs acquisition cost", "Real cohorts; predictive value model", "Loyalty & boxes"],
          ["Promotion profitability optimiser", "Deterministic margin check by pickup vs delivery; 6-month value per promotion", "Real costs and promotion results", "Promotions & budget"]
        ])),
      panel("Demo data",
        h("p", null, "Clears interest answers, activity, chat questions, drafts, decisions and thresholds saved in this browser."),
        h("button", { class: "btn btn-outline danger", type: "button", onclick: () => { if (confirm("Reset all demo data in this browser?")) { M.reset(); toast("Demo data reset."); route(); } } }, "Reset demo data"))
    ];
  }

  /* ---------- Smart Value & Demand Engine ---------- */

  // Smart Value → Repeat customers → Verified demand → Farm growth, with one number each.
  function chain() {
    const sd = M.smartDemand(), ex = M.experiment();
    const small = M.fulfilment({ qty: { "nai-bai": 2, "xiao-bai-cai": 2 }, postal: "" });
    const grow = sd.crops.filter((x) => x.signal.label === "Investigate growing more");
    const recurringKg = M.sum(sd.crops.map((x) => x.recurring[x.recurring.length - 1]));
    const steps = [
      { step: "Smart value", value: M.money(small.home.total - small.pick.total), text: `saved on a ${M.money(small.pick.goods)} basket by collecting instead of delivery`, href: "#fulfil" },
      { step: "Repeat customers", value: M.pct(ex.best.repeatRate), text: `of "${ex.best.name}" buyers ordered again within 28 days`, href: "#habits" },
      { step: "Verified demand", value: recurringKg.toFixed(0) + " kg/wk", text: `from repeat orders, ${M.pct(sd.repShare)} of savings-checker orders`, href: "#verified" },
      { step: "Farm growth", value: String(grow.length), text: grow.length ? `crop${grow.length > 1 ? "s" : ""} worth investigating: ${grow.map((x) => x.c.name).join(", ")}` : "crops ready to grow more yet", href: "#verified" }
    ];
    return h("ol", { class: "chain" }, steps.map((x) => h("li", null,
      h("span", { class: "chain-step" }, x.step), h("strong", null, x.value), h("p", null, x.text), h("a", { class: "link small", href: x.href }, "Open →"))));
  }

  function valueHome() {
    const ex = M.experiment(), sd = M.smartDemand();
    const ev = M.state.events, count = (t) => ev.filter((e) => e.type === t).length;
    const orders = M.state.orders || [];
    const first = M.sum(ex.rows.map((r) => r.firstOrders)), repeat = M.sum(ex.rows.map((r) => r.repeaters));
    const journey = [
      ["Sees an Instagram campaign", 12000 + count("page_visit")],
      ["Checks an approved basket in the savings checker", 1450 + count("quick_fill") + count("offer_click")],
      ["Chooses group-buy pickup", 610 + count("fulfil_switch") + orders.filter((o) => !o.repeat && o.mode === "pickup").length],
      ["Makes a first purchase", first],
      ["Gets an eligible retention offer", first],
      ["Buys again within 28 days", repeat],
      ["Counted as recurring demand", Math.round(M.sum(sd.crops.map((x) => x.recurring[x.recurring.length - 1]))) + " kg/wk"],
      ["Tyllage decides whether to grow more", sd.crops.filter((x) => x.signal.label === "Investigate growing more").length + " crop(s) flagged"]
    ];
    const barriers = [
      ["Price", "Like-for-like price check per 100 g; offers that keep a contribution floor.", "#prices", "Supermarket prices not checked yet"],
      ["Convenience", "Shows the full checkout total and the cheapest practical way to get it.", "#fulfil", "Pickup costs and windows to confirm with leaders"],
      ["Trust in freshness", "Harvested on delivery day, grown in Kranji. Shown next to every price.", "#feedback", "Track freshness complaints in Feedback"],
      ["Habit", "One-tap repeat order, reminders before the cutoff, a reward that must pay for itself.", "#habits", "Measure repeat purchases, not clicks"]
    ];
    return [
      band("Smart Value & Demand Engine", "Why would someone stop buying vegetables downstairs and order from us? Only if the total is fair, getting it is easy and the greens are fresher. This is how we test that, and turn it into demand we can grow for.",
        [h("a", { class: "btn btn-sm btn-gold", href: "index.html#savings" }, "Open the savings checker ↗"), h("a", { class: "btn btn-sm btn-outline-light", href: "#offertest" }, "Offer test results")]),
      panel("Smart Value → Repeat customers → Verified demand → Farm growth", chain()),
      h("div", { class: "grid-2" },
        panel("The journey we're demonstrating",
          h("ol", { class: "journey-steps" }, journey.map(([label, n], i) => h("li", null, h("span", null, String(i + 1)), h("span", null, label), h("strong", null, typeof n === "number" ? n.toLocaleString() : n)))),
          h("p", { class: "muted small" }, "Last 8 weeks, demo numbers plus anything done in this browser. Likes and views stop at step 1; everything after is a real action.")),
        panel("Four barriers to switching",
          table([{ label: "Barrier" }, { label: "What the engine does" }, { label: "Still to verify" }],
            barriers.map(([b, does, href, todo]) => [h("a", { class: "link", href }, h("strong", null, b)), does, h("span", { class: "muted small" }, todo)])),
          h("p", { class: "muted small" }, "Reported from YouGov's 2025 Singapore grocery research: about 7 in 10 shoppers look for the lowest price in a category, 74% would switch supermarket for better prices, and 49% chase promotions. Re-check the source before quoting it outside the team."))),
      panel(aiTitle("What we need before any of this is real"),
        h("ul", { class: "small-list" },
          h("li", null, "For our top five vegetables: production cost, retail price, group-buy price, leader commission and allocated delivery cost. Enter them in ", h("a", { class: "link", href: "#offers" }, "Offers & margin"), "."),
          h("li", null, "Current supermarket and wet-market prices for the same vegetable, origin and similar pack size, each with a source and date. Enter them in ", h("a", { class: "link", href: "#prices" }, "Price check"), "."),
          h("li", null, "Whether group-buy leaders charge anything extra for collection, and their real pickup windows."),
          h("li", null, "Which vouchers, if any, we'll actually offer. Everything on the consumer page is marked hypothetical until then.")),
        howNote("Every price, floor and saving is worked out by fixed formulas in the browser. Nothing is invented by a language model.", "The same formulas on verified prices and our real costs; an LLM may explain results in plain words but never sets a price."))
    ];
  }

  // A. Smart basket price comparison
  function pricesView() {
    const all = M.listings();
    const verified = all.filter((l) => l.verified).length;
    const cmp = M.CROPS.map(M.compareCrop);
    const save = (l, field, value) => {
      const key = l.crop + "|" + l.retailer, cur = M.st().prices[key] || { cents: l.cents, pack: l.pack, checked: "", source: "" };
      M.st().prices[key] = { ...cur, [field]: value };
      M.save();
      route();
    };
    return [
      band("Price check", "Compare our prices with the same vegetable, origin and similar pack size elsewhere. Imported greens are often cheaper, so they never count as like-for-like."),
      kpis(
        kpi("Retailer prices checked", verified + " of " + all.length, verified ? "with a source and date" : "all placeholders so far"),
        kpi("We're cheaper", String(cmp.filter((x) => x.verdict.label === "Cheaper").length) + " crops", "per 100 g, vs local"),
        kpi("About the same", String(cmp.filter((x) => x.verdict.label === "About the same").length) + " crops"),
        kpi("We're pricier", String(cmp.filter((x) => x.verdict.label === "Pricier").length) + " crops", "lead with bundles or freshness")),
      panel(aiTitle("Where we win and lose, like for like"),
        table([{ label: "Crop" }, { label: "Ours /100 g", num: true }, { label: "Best local elsewhere", num: true }, { label: "Cheapest any origin", num: true }, { label: "Verdict" }, { label: "So what" }],
          cmp.map((x) => [h("strong", null, x.c.name), M.money(Math.round(x.mine)), x.like ? M.money(Math.round(x.like.per100)) + " · " + x.like.retailerName : "—",
            M.money(Math.round(x.cheapest.per100)) + " · " + x.cheapest.retailerName + (x.cheapest.origin === "imported" ? " (imported)" : ""), pill(x.verdict.tone, x.verdict.label), h("span", { class: "small" }, x.verdict.text)])),
        h("p", { class: "muted small" }, "When we can't be the cheapest single vegetable, a fairly priced weekly bundle with free pickup and day-of-harvest freshness may be the better pitch.")),
      panel("Price book",
        table([{ label: "Crop" }, { label: "Where" }, { label: "Origin · grade" }, { label: "Pack (g)", num: true }, { label: "Price (S$)", num: true }, { label: "/100 g", num: true }, { label: "Promo" }, { label: "Source" }, { label: "Checked" }],
          all.map((l) => [M.crop(l.crop).name, l.retailerName, h("span", null, l.origin === "local" ? "Local" : "Imported", h("span", { class: "muted small block" }, l.grade)),
            h("input", { class: "price-input", type: "number", min: 10, step: 10, value: l.pack, "aria-label": "Pack grams", onchange: (e) => save(l, "pack", Math.max(10, Math.round(Number(e.target.value) || l.pack))) }),
            h("input", { class: "price-input", type: "number", min: 0.1, step: 0.05, value: (l.cents / 100).toFixed(2), "aria-label": "Price", onchange: (e) => save(l, "cents", Math.max(10, Math.round((Number(e.target.value) || l.cents / 100) * 100))) }),
            M.money(Math.round(l.per100)), l.promo || "—",
            h("input", { class: "price-input", style: "width:130px", value: l.source, placeholder: "e.g. in store", "aria-label": "Source", onchange: (e) => save(l, "source", e.target.value.trim().slice(0, 60)) }),
            l.verified ? pill("good", l.checked) : h("button", { class: "btn btn-sm btn-outline", type: "button", onclick: () => {
              if (!l.source) { toast("Add a source first (where you saw this price)."); return; }
              save(l, "checked", new Date().toISOString().slice(0, 10));
            } }, "Mark checked today")])),
        h("p", { class: "muted small" }, "Supermarket A and B stand for the chains we check by hand (for example FairPrice and Sheng Siong). Start with a small catalogue checked in person or from permitted data feeds; don't scrape sites that don't allow it. A price only shows as checked once it has a source and a date.")),
      panel(null, howNote("Unit price per 100 g; like-for-like means Singapore-grown and a pack between 40% and 250% of ours. Saved in this browser.", "A weekly manual check of 10–15 items, or a licensed price feed, with the date and source kept for every price."))
    ];
  }

  // B. Offer & bundle optimiser
  function offersView() {
    ui.uo = ui.uo || { price: 1000, cost: 470, mode: "pickup", discount: 100 };
    const u = ui.uo;
    const ue = M.unitEconomics(u);
    const floor = M.priceFloor(u.cost, u.mode);
    const opts = M.offerOptions({ price: u.price, cost: u.cost });
    const best = opts.find((o) => o.ok && o.id !== "none");
    const figs = M.figures();
    const max = Math.max(...ue.rows.map((r) => Math.abs(r.cents)));
    const form = h("form", { class: "utm-form", onsubmit: (e) => e.preventDefault(), onchange: (e) => {
      const f = e.currentTarget, c = (v, d) => Math.max(0, Math.round((Number(v) || d / 100) * 100));
      ui.uo = { price: c(f.price.value, 1000), cost: c(f.cost.value, 470), discount: c(f.discount.value, 0), mode: f.mode.value };
      route();
    } },
      h("label", { class: "field" }, h("span", null, "Bundle retail price (S$)"), h("input", { type: "number", step: "0.5", min: 0, name: "price", value: u.price / 100 })),
      h("label", { class: "field" }, h("span", null, "Production cost (S$, before packing)"), h("input", { type: "number", step: "0.1", min: 0, name: "cost", value: u.cost / 100 })),
      h("label", { class: "field" }, h("span", null, "Promotional discount (S$)"), h("input", { type: "number", step: "0.5", min: 0, name: "discount", value: u.discount / 100 })),
      h("label", { class: "field" }, h("span", null, "Fulfilment"), h("select", { name: "mode" },
        h("option", { value: "pickup", selected: u.mode === "pickup" }, "Group-buy pickup"), h("option", { value: "home", selected: u.mode === "home" }, "Home delivery"))));
    return [
      band("Offers & margin", "Find the offer that gives customers a real saving and still leaves us a contribution. Every number here comes from a formula, never from a language model."),
      h("div", { class: "stack-lg" },
        panel(aiTitle("One bundle, line by line"), form,
          h("ul", { class: "waterfall" }, ue.rows.map((r) => h("li", { class: r.total ? "total" : null },
            h("span", null, r.label),
            h("span", { class: "wf-track" }, h("span", { class: "wf-bar" + (r.cents < 0 ? " neg" : ""), style: `left:0;width:${Math.max(1, Math.round((Math.abs(r.cents) / max) * 100))}%` })),
            h("span", null, M.money(r.cents))))),
          h("p", { class: "verdict-line" }, pill(ue.margin >= M.rules().minMargin ? "good" : "bad", M.pct(ue.margin) + " margin"),
            ` The customer pays ${M.money(ue.pay)}. Lowest price that keeps the ${M.pct(M.rules().minMargin)} floor with ${u.mode === "home" ? "home delivery" : "pickup"}: ${M.money(floor)}.`),
          h("p", { class: "muted small" }, "Illustrative and before overheads, marketing and spoilage. Whether the remaining contribution covers the wider business needs our real figures.")),
        panel(aiTitle("Which offer to test"),
          table([{ label: "Offer" }, { label: "Customer pays", num: true }, { label: "Our contribution", num: true }, { label: "Came back" }, { label: "6-month value", num: true }, { label: "Cap" }, { label: "Floor" }],
            opts.map((o) => [h("strong", null, o.name), M.money(o.pay), M.money(o.e.contribution) + " (" + M.pct(o.e.margin) + ")", h("span", null, M.pct(o.repeat), h("span", { class: "muted small block" }, o.src)), M.money(o.sixMonth), h("span", { class: "small" }, o.cap), pill(o.ok ? "good" : "bad", o.ok ? "Passes" : "Below floor")])),
          best ? h("p", { class: "verdict-line" }, pill("good", "Suggested"), ` Test "${best.name}": it passes the floor and has the best expected 6-month value among the offers. Don't give everyone 20% off.`)
            : h("p", { class: "verdict-line" }, pill("bad", "None pass"), " No offer keeps the floor at this price. Raise basket value with a bundle, or compete on freshness and convenience instead."))),
      panel(aiTitle("Our figures for the top vegetables"),
        table([{ label: "Crop" }, { label: "Cost /kg", num: true }, { label: "Retail /kg", num: true }, { label: "Group-buy /kg", num: true }, { label: "Pickup margin", num: true }, { label: "Price floor /kg (pickup)", num: true }, { label: "" }],
          figs.map((f) => {
            const input = (field, v) => h("input", { class: "price-input", type: "number", step: 0.1, min: 0, value: (v / 100).toFixed(2), "aria-label": f.c.name + " " + field, onchange: (e) => {
              const st = M.st().figures; st[f.c.id] = { cost: f.cost, price: f.price, gbPrice: f.gbPrice, ...st[f.c.id], [field]: Math.round((Number(e.target.value) || 0) * 100) };
              M.save(); route();
            } });
            return [h("strong", null, f.c.name), input("cost", f.cost), input("price", f.price), input("gbPrice", f.gbPrice), pill(f.pickupMargin >= M.rules().minMargin ? "good" : "bad", M.pct(f.pickupMargin)), M.money(f.floorKg), f.entered ? pill("good", "Entered") : pill("neutral", "Demo value")];
          })),
        h("p", { class: "muted small" }, `Leader commission ${M.pct(M.DELIVERY.leaderRate)}, drop ${M.money(Math.round(M.DELIVERY.dropCost / M.DELIVERY.dropHouseholds))} per household, home delivery ${M.money(M.DELIVERY.homeCost)} per order, packing ${M.money(M.DELIVERY.packCost)}. Entered figures feed the consumer prices and every check above.`))
    ];
  }

  // C. Smart fulfilment
  function fulfilView() {
    const D = M.DELIVERY;
    const sizes = [800, 1200, 1800, 2500, 4000, 6000];
    const rows = sizes.map((cents) => {
      const cost = Math.round(cents * 0.55);
      const p = M.orderEconomics(cents, cost, "pickup"), hd = M.orderEconomics(cents, cost, "home");
      return { cents, p, hd };
    });
    const pts = M.POINTS.map((p) => ({ p, s: M.pointStatus(p) })).sort((a, b) => (b.p.capacity - b.s.now) - (a.p.capacity - a.s.now));
    return [
      band("Fulfilment", "A discounted basket isn't a bargain if delivery wipes out the saving. Show customers the full total and steer small baskets to pickup."),
      panel(aiTitle("Small baskets: what the customer pays and what we keep"),
        table([{ label: "Basket" }, { label: "Customer pays: pickup", num: true }, { label: "Customer pays: home", num: true }, { label: "Customer saves", num: true }, { label: "Our contribution: pickup", num: true }, { label: "Our contribution: home", num: true }, { label: "Recommend" }],
          rows.map((r) => [M.money(r.cents), M.money(r.p.customerPays), M.money(r.hd.customerPays), M.money(r.hd.customerPays - r.p.customerPays), M.money(r.p.contribution), M.money(r.hd.contribution),
            r.cents < D.freeFrom ? pill("good", "Pickup") : pill("neutral", "Either")])),
        h("p", { class: "verdict-line" }, pill("warn", "The problem"), ` Someone who wants ${M.money(1200)} of vegetables pays ${M.money(1200 + D.homeFee)} with home delivery. If they can walk downstairs to a supermarket, they won't. Pickup removes the fee and, on small baskets, earns us more too.`),
        h("p", { class: "muted small" }, "Product cost assumed at 55% of basket value. Delivery fee and threshold are our published terms; delivery, drop and packing costs are illustrative.")),
      panel(aiTitle("Pickups with room for savings-checker customers"),
        table([{ label: "Pickup" }, { label: "Day and window" }, { label: "Households", num: true }, { label: "Spare places", num: true }, { label: "Status" }],
          pts.map(({ p, s: st }) => [h("strong", null, p.area + " (" + p.id + ")"), p.day + " " + p.window, st.now + " / " + p.capacity, Math.max(0, p.capacity - st.now), pill(st.tone, st.label)])),
        h("p", { class: "muted small" }, "The consumer page only recommends a pickup within " + M.rules().nearPointKm + " km that isn't nearly full, and only for baskets of " + M.money(M.PICKUP_MIN) + " or more. Where there's none, it says so and offers delivery.")),
      panel(null, howNote("Compares checkout totals for both options from the basket, postal sector, pickup capacity and minimum basket.", "Real leader windows and capacities, travel time from the customer's block, and leader-confirmed collection charges."))
    ];
  }

  // Customer validation: three offers to test
  function offerTestView() {
    const ex = M.experiment();
    const mine = M.arm();
    const b = ex.rows.find((r) => r.id === "B"), a = ex.rows.find((r) => r.id === "A");
    const t = M.compare(b.repeaters, b.firstOrders, a.repeaters, a.firstOrders);
    return [
      band("Offer test", "Before building more AI, find out what actually makes people switch: a cheaper basket, convenience or loyalty. Count clicks, orders, repeat orders and what each customer cost."),
      panel(aiTitle("Results so far (8 weeks)"),
        table([{ label: "Offer" }, { label: "Shown", num: true }, { label: "Clicked", num: true }, { label: "First orders", num: true }, { label: "Ordered again", num: true }, { label: "Cost per customer", num: true }, { label: "8-week value", num: true }, { label: "Value − media cost", num: true }],
          ex.rows.map((r) => [h("span", null, h("strong", null, r.id + " · " + r.name), h("span", { class: "muted small block" }, r.pitch)), r.shown.toLocaleString(), r.clicks + " (" + M.pct(r.ctr) + ")", r.firstOrders + " (" + M.pct(r.conv) + " of clicks)", r.repeaters + " (" + M.pct(r.repeatRate) + ")", M.money(r.cac), M.money(r.value), pill(r.net > 0 ? "good" : "bad", M.money(r.net))])),
        h("p", { class: "verdict-line" }, pill("good", "So far"), ` "${ex.best.name}" leads on value per customer after media cost. The cheaper basket gets the most clicks and first orders, but fewer of those buyers come back.`),
        h("p", { class: "muted small" }, `Convenience vs cheaper basket, repeat rate: ${M.pct(t.p1)} vs ${M.pct(t.p2)}, p = ${t.pValue.toFixed(2)}. ${t.significant ? "That difference is unlikely to be chance." : "Not significant yet: keep the test running before switching budget."} About ${M.sampleSize(Math.min(t.p1, t.p2), Math.max(t.p1, t.p2))} first buyers per offer would be needed to be sure.`)),
      panel("This browser",
        h("p", null, "You're seeing offer ", h("strong", null, mine.id + " · " + mine.name), " on the consumer page. Each browser keeps the same offer so results stay clean."),
        h("a", { class: "btn btn-sm btn-outline", href: "index.html#savings" }, "See it on the consumer page ↗")),
      panel(null, howNote("Synthetic results plus this browser's views, clicks and demo orders. Two-proportion z-test on repeat rates; cost per customer includes the offer itself.", "Randomly assign real visitors to one offer, run until the planned sample size, and judge on repeat orders and contribution, not clicks."))
    ];
  }

  // D. Habits & rewards
  function habitsView() {
    ui.rw = ui.rw || { ...M.st().reward };
    const rc = M.rewardCheck(ui.rw);
    const due = M.replenishment().filter((x) => x.cu.consent).length;
    const orders = M.state.orders || [];
    return [
      band("Habits & rewards", "Give people a reason to come back every week, then check the reward creates profitable repeat orders, not just activity."),
      h("div", { class: "grid-2" },
        panel(aiTitle("Does the loyalty reward pay for itself?"),
          h("form", { class: "utm-form", onsubmit: (e) => e.preventDefault(), onchange: (e) => {
            const f = e.currentTarget;
            ui.rw = { amount: Math.max(0, Math.round((Number(f.amount.value) || 0) * 100)), every: Math.max(2, Math.round(Number(f.every.value) || 4)), min: Math.max(0, Math.round((Number(f.min.value) || 0) * 100)) };
            route();
          } },
            h("label", { class: "field" }, h("span", null, "Reward (S$ off)"), h("input", { type: "number", name: "amount", min: 0, step: 0.5, value: ui.rw.amount / 100 })),
            h("label", { class: "field" }, h("span", null, "On every Nth order"), h("input", { type: "number", name: "every", min: 2, step: 1, value: ui.rw.every })),
            h("label", { class: "field" }, h("span", null, "Qualifying order from (S$)"), h("input", { type: "number", name: "min", min: 0, step: 1, value: ui.rw.min / 100 }))),
          kpis(
            kpi("Extra orders", String(rc.extraOrders), "rewarded vs holdout, 8 weeks"),
            kpi("Rewards paid", M.money(rc.rewardCost), rc.rewardsPaid + " rewards"),
            kpi("Net contribution", M.money(rc.net), "after rewards")),
          h("p", { class: "verdict-line" }, pill(rc.verdict.tone, rc.net > 0 ? "Keep" : "Change it"), " " + rc.verdict.text),
          h("div", { class: "approve-row" }, h("button", { class: "btn btn-sm btn-forest", type: "button", onclick: () => { M.st().reward = { ...ui.rw }; M.save(); logDecision({ kind: "reward", title: `${M.money(ui.rw.amount)} off every ${ui.rw.every}th order`, status: "Approved" }); toast("Saved. The consumer page now shows this reward."); route(); } }, "Use this reward")),
          h("p", { class: "muted small" }, `Same 8 weeks: ${M.REWARD_TEST.rewarded.customers} customers offered the reward, ${M.REWARD_TEST.holdout.customers} held out. Contribution per extra order ${M.money(rc.contrib)}. Synthetic until we run it.`)),
        panel("Repeat habits",
          table([{ label: "Habit builder" }, { label: "Now" }, { label: "Measure" }], [
            ["Reorder reminders", due + " opted-in customers due in 3 days", "Orders within 48 hours of the reminder"],
            ["One-tap repeat order", orders.filter((o) => o.repeat).length + " demo repeat orders in this browser", "Share of orders that are repeats"],
            ["Same-basket weekly box", M.state.subs.length + " 'I'd like this weekly' sign-ups", "Boxes still active after 8 weeks"],
            ["Recipes for what they bought", "Shown after every order", "Fewer 'didn't finish it' complaints"]
          ]),
          h("a", { class: "link", href: "#loyalty" }, "Reminders, boxes and lifetime value →"))),
      panel(null, howNote("Compares the rewarded group with a holdout and subtracts what the rewards cost.", "A real holdout on our own customers, with rewards paid only after a qualifying order."))
    ];
  }

  // E. Demand-backed production planner
  function verifiedView() {
    const sd = M.smartDemand();
    const labels = M.weekLabels(sd.total.length);
    return [
      band("Verified demand", "Is the savings strategy bringing new and recurring orders? When repeat demand keeps growing past our spare harvest, look at growing more."),
      kpis(
        kpi("Orders this week", String(sd.total[sd.total.length - 1]), "from the savings checker"),
        kpi("New customers", String(sd.newO[sd.newO.length - 1])),
        kpi("Repeat orders", String(sd.rep[sd.rep.length - 1]), M.pct(sd.repShare) + " of orders"),
        kpi("Recurring kg", M.sum(sd.crops.map((x) => x.recurring[x.recurring.length - 1])).toFixed(1) + " kg/wk")),
      h("div", { class: "grid-2" },
        panel("Repeat orders per week", barChart({ labels, values: sd.rep, unit: "orders" }),
          h("p", { class: "muted small" }, "Repeat orders are the dependable part. A one-off spike from a voucher isn't.")),
        panel("New customers per week", barChart({ labels, values: sd.newO, unit: "orders" }))),
      panel(aiTitle("Should we grow more?"),
        table([{ label: "Crop" }, { label: "Recurring kg, 6 weeks" }, { label: "Latest", num: true }, { label: "4-week growth", num: true }, { label: "Spare supply", num: true }, { label: "Signal" }, { label: "" }],
          sd.crops.map((x) => [h("strong", null, x.c.name), sparkline(x.recurring), x.recurring[x.recurring.length - 1] + " kg", "+" + x.growth.toFixed(1) + " kg", Math.max(0, x.headroom) + " kg", h("span", null, pill(x.signal.tone, x.signal.label), h("span", { class: "muted small block" }, x.signal.text)), h("a", { class: "link", href: "#demand/" + x.c.id }, "Planting →")])),
        h("p", { class: "muted small" }, "Spare supply = harvest left after trade, group-buy and pre-order commitments, minus what's already paid for. A flag means 'investigate', not 'plant': the farm manager decides in Demand → Planting with forecasts, margin and yield risk.")),
      panel(null, howNote("Synthetic weekly orders from the savings checker plus this browser's demo orders, split by crop.", "Real orders tagged by the offer and channel that brought them, with repeat customers identified by their account."))
    ];
  }

  /* ---------- router ---------- */

  const nav = document.getElementById("hub-tabs");
  const subnav = document.getElementById("hub-subtabs");
  const view = document.getElementById("view");
  nav.replaceChildren(...GROUPS.map((g) => h("a", { href: "#" + TABS.find((t) => t.group === g.id).id, "data-group": g.id }, g.label)));

  function route() {
    const [id, param] = (location.hash.slice(1) || "overview").split("/");
    const tab = TABS.find((t) => t.id === id) || TABS[0];
    nav.querySelectorAll("a").forEach((a) => {
      const on = a.dataset.group === tab.group;
      a.classList.toggle("on", on);
      if (on) { a.setAttribute("aria-current", "true"); nav.scrollLeft = a.offsetLeft - 16; }
      else a.removeAttribute("aria-current");
    });
    const siblings = TABS.filter((t) => t.group === tab.group);
    subnav.hidden = siblings.length < 2;
    subnav.replaceChildren(...siblings.map((t) => h("a", { href: "#" + t.id, class: t.id === tab.id ? "on" : null, "aria-current": t.id === tab.id ? "page" : null }, t.label)));
    const cur = subnav.querySelector(".on");
    if (cur) subnav.scrollLeft = cur.offsetLeft - 16;
    const y = window.scrollY;
    view.replaceChildren(...[tab.render(param)].flat(Infinity).filter(Boolean));
    document.title = tab.label + " — Growth Intelligence | Tyllage";
    route.last === location.hash ? window.scrollTo(0, y) : window.scrollTo(0, 0);
    route.last = location.hash;
  }
  window.addEventListener("hashchange", route);
  route();
})();
