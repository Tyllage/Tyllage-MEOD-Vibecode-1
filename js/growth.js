/* Growth Intelligence Hub (farm view). Hash-routed tabs, all rendered with UI.h (textContent only). */
(function () {
  "use strict";
  const M = window.MEOD, { h, s, aiPill, toast, copy } = window.UI;

  const TABS = [
    { id: "overview", label: "Overview", render: overview },
    { id: "campaigns", label: "Campaign Studio", render: campaigns },
    { id: "seo", label: "SEO", render: seo },
    { id: "customers", label: "Customers", render: customers },
    { id: "points", label: "Collection points", render: points },
    { id: "demand", label: "Demand → Planting", render: demand },
    { id: "settings", label: "Settings", render: settings }
  ];

  // Areas with interest but no pickup nearby (synthetic).
  const UNSERVED = [
    { area: "Pasir Ris", sector: "51", households: 14 },
    { area: "Yishun", sector: "76", households: 11 },
    { area: "Clementi", sector: "12", households: 9 }
  ];

  /* ---------- building blocks ---------- */

  const panel = (title, ...kids) => h("section", { class: "panel" }, title ? h("h2", { class: "panel-title" }, title) : null, kids);
  const aiTitle = (text) => h("span", { class: "ai-title" }, text, aiPill());
  const pill = (tone, label) => h("span", { class: "pill " + tone }, label);
  const kpi = (label, value, sub) => h("div", { class: "kpi" }, h("span", { class: "kpi-label" }, label), h("strong", null, value), sub ? h("span", { class: "kpi-sub" }, sub) : null);
  const kpis = (...items) => h("div", { class: "kpis" }, items);

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

  // Vertical bars with an optional reference line (e.g. available supply).
  function barChart({ labels, values, unit, ref, refLabel, max, fmt }) {
    const W = 560, H = 220, L = 36, B = 28, T = 14, R = 8;
    const top = max || Math.max(...values, ref || 0) * 1.15 || 1;
    const y = (v) => T + (H - T - B) * (1 - v / top);
    const bw = (W - L - R) / values.length;
    const ticks = [0, top / 2, top].map((v) => Math.round(v));
    const f = fmt || ((v) => v + (unit ? " " + unit : ""));
    return s("svg", { viewBox: `0 0 ${W} ${H}`, class: "chart", role: "img", "aria-label": "Bar chart" },
      ticks.map((t) => [
        s("line", { x1: L, x2: W - R, y1: y(t), y2: y(t), class: "grid" }),
        s("text", { x: L - 6, y: y(t) + 4, class: "axis", "text-anchor": "end" }, String(t))]),
      values.map((v, i) => {
        const x = L + i * bw + bw * 0.2, w = bw * 0.6, yy = y(v), hgt = Math.max(0, y(0) - yy);
        const bar = s("path", { class: "bar", d: `M${x},${y(0)} V${yy + 4} Q${x},${yy} ${x + 4},${yy} H${x + w - 4} Q${x + w},${yy} ${x + w},${yy + 4} V${y(0)} Z` });
        return [
          hover(s("g", { class: "hit" }, s("rect", { x: L + i * bw, y: T, width: bw, height: H - T - B, fill: "transparent" }), hgt > 0 ? bar : null), `${labels[i]}: ${f(v)}`),
          s("text", { x: x + w / 2, y: H - 10, class: "axis", "text-anchor": "middle" }, labels[i])];
      }),
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
    const pts = M.POINTS.map((p) => ({ p, st: M.pointStatus(p) }));
    const testMore = verdicts.filter((x) => x.v.key === "test-more");
    const roomy = pts.filter((x) => x.st.key === "underused");

    const actions = [];
    testMore.forEach(({ c, v }) => actions.push({ tone: "good", tag: "Planting", text: `${c.name}: repeat demand has beaten supply. Consider a +${v.trialKg} kg/week trial.`, href: "#demand/" + c.id }));
    verdicts.filter((x) => x.v.key === "margin").forEach(({ c }) => actions.push({ tone: "bad", tag: "Margin", text: `${c.name}: demand is there but margin is under the floor. Fix price or cost before growing.`, href: "#demand/" + c.id }));
    pts.filter((x) => x.st.key === "retention").forEach(({ p }) => actions.push({ tone: "bad", tag: "Retention", text: `${p.area}: only ${M.pct(p.returning)} of households come back.`, href: "#points" }));
    pts.filter((x) => x.st.key === "near-full").forEach(({ p }) => actions.push({ tone: "good", tag: "Capacity", text: `${p.area} is nearly full. Talk to leader ${p.id} about a second slot.`, href: "#points" }));
    verdicts.filter((x) => x.v.key === "grow-demand").forEach(({ c }) => actions.push({ tone: "warn", tag: "Campaign", text: `${c.name}: buyers don't come back. Run a recipe campaign for past buyers.`, href: "#campaigns/" + c.id }));
    const gaps = M.SEO_TOPICS.filter((t) => t.status === "gap").length;
    if (gaps) actions.push({ tone: "neutral", tag: "SEO", text: `${gaps} search topics have no MEOD page yet.`, href: "#seo" });

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
        `${testMore.length} crop${testMore.length === 1 ? "" : "s"} ready for a production trial · ${roomy.length} pickup points with room to grow · ${gaps} SEO gaps`,
        [h("a", { class: "btn btn-sm btn-gold", href: "#demand" }, "Open Demand → Planting"), h("a", { class: "btn btn-sm btn-outline-light", href: "#campaigns" }, "Plan a campaign")]),
      kpis(
        kpi("Campaign visits", f.visits.toLocaleString(), "last 4 weeks"),
        kpi("First-time buyers", String(f.first), M.pct(f.first / f.visits) + " of visits"),
        kpi("Came back within 28 days", String(f.repeat), M.pct(f.repeat / f.first) + " of new buyers"),
        kpi("Repeat-backed demand", f.weeklyKg + " kg/wk", "latest week × returning share")),
      h("div", { class: "grid-2" },
        panel(aiTitle("This week's top actions"),
          actions.length ? h("ul", { class: "actions" }, actions.map((a) =>
            h("li", null, pill(a.tone, a.tag), h("span", null, a.text), h("a", { href: a.href, class: "link" }, "Open →")))) : h("p", null, "Nothing needs attention.")),
        panel("From attention to dependable demand",
          h("ol", { class: "funnel" }, stages.map((st, i) => h("li", null,
            h("span", { class: "funnel-label" }, st.label),
            h("strong", null, st.value.toLocaleString()),
            h("span", { class: "muted small" }, i ? M.pct(st.value / stages[i - 1].value) + " of previous step" : "start")))),
          h("p", { class: "muted small" }, "Likes and views aren't counted. Only visits that reach MEOD Fresh or a group buy, then real purchases."))),
      panel("Demand → Planting at a glance",
        table([{ label: "Crop" }, { label: "Latest paid", num: true }, { label: "Consumer supply", num: true }, { label: "Returning", num: true }, { label: "Verdict" }],
          verdicts.map(({ c, v }) => [h("a", { href: "#demand/" + c.id, class: "link" }, c.name), v.latest + " kg", v.supply + " kg", M.pct(v.repeatNow), pill(v.tone, v.label)]))),
      panel("From this browser (live demo activity)",
        h("p", { class: "muted small" }, "Try the consumer page, then come back. These counts come from this browser only and are added to the totals above."),
        kpis(
          kpi("Page visits", String(evCount("page_visit"))),
          kpi("Store & product clicks", String(evCount("product_click") + evCount("store_click") + evCount("recipe_click"))),
          kpi("Pickup searches", String(evCount("postal_search"))),
          kpi("Harvest interest", String(M.state.interests.length))))
    ];
  }

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
      const ds = M.drafts(c, rec);
      recBlock = [
        panel(aiTitle("Suggested: " + rec.title),
          h("dl", { class: "facts" }, rows.map(([k, v]) => [h("dt", null, k), h("dd", null, v)])),
          h("div", { class: "link-row" },
            h("code", { class: "utm" }, rec.link),
            h("button", { class: "btn btn-sm btn-outline", type: "button", onclick: () => copy(rec.link) }, "Copy link")),
          h("p", { class: "muted small" }, "Committed orders are protected: a campaign never promises more than the uncommitted harvest, and any offer must pass Margin Guard."),
          why(rec.steps)),
        panel(aiTitle("Drafts for MEOD to edit"),
          h("div", { class: "drafts" }, ds.map((d) => {
            const ta = h("textarea", { rows: 9, "aria-label": d.channel + " draft" });
            ta.value = d.text;
            const checks = h("ul", { class: "checks" });
            const run = () => checks.replaceChildren(...M.captionChecks(ta.value, rec.link).map((k) =>
              h("li", { class: k.ok ? "ok" : "no" }, (k.ok ? "✓ " : "✕ ") + k.label)));
            ta.addEventListener("input", run);
            run();
            return h("div", { class: "draft" }, h("h3", null, d.channel), ta, checks,
              h("button", { class: "btn btn-sm btn-outline", type: "button", onclick: () => copy(ta.value) }, "Copy"));
          })),
          h("div", { class: "approve-row" },
            h("button", { class: "btn btn-forest", type: "button", onclick: () => {
              M.state.drafts.push({ id: "D-" + Date.now().toString(36).toUpperCase(), crop: c.id, title: rec.title, channel: rec.channel, status: "Waiting for approval", at: new Date().toISOString() });
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
        : h("p", { class: "muted" }, "Nothing waiting. Submitted campaigns appear here for a MEOD manager."));

    // Recipe vs discount experiment.
    const a = M.CAMPAIGNS[0], b = M.CAMPAIGNS[1], sa = M.campaignStats(a), sb = M.campaignStats(b);
    const exp = panel(aiTitle("Experiment: recipe vs discount (Nai Bai)"),
      h("p", { class: "muted small" }, "Same crop, same 2-week window, same S$120 budget, same audience size."),
      table([{ label: "" }, { label: "Recipe-led (C-101)", num: true }, { label: "10% off (C-102)", num: true }], [
        ["Visits", a.visits.toLocaleString(), b.visits.toLocaleString()],
        ["First-time buyers", a.firstBuyers, b.firstBuyers],
        ["Came back in 28 days", M.pct(sa.repeatRate), M.pct(sb.repeatRate)],
        ["Cost per new buyer", M.money(sa.cpa), M.money(sb.cpa)],
        ["Contribution after costs", M.money(sa.contribution), M.money(sb.contribution)]
      ], { compact: true }),
      h("p", { class: "verdict-line" }, pill("good", "Lean recipe-led"),
        ` The discount won ${b.firstBuyers - a.firstBuyers} more first orders, but recipe buyers came back ${(sa.repeatRate / sb.repeatRate).toFixed(1)}× as often and earned more after costs.`),
      h("p", { class: "muted small" }, "Small samples (45 and 52 buyers). Treat as directional and run it again on another crop before making it a rule."));

    const perf = panel("Channel results (last 8 weeks)",
      table([{ label: "Campaign" }, { label: "Channel" }, { label: "Theme" }, { label: "Visits", num: true }, { label: "New buyers", num: true }, { label: "Came back", num: true }, { label: "Cost / new buyer", num: true }, { label: "Contribution", num: true }],
        M.CAMPAIGNS.map((k) => { const st = M.campaignStats(k); return [k.name, k.channel, k.theme, k.visits.toLocaleString(), k.firstBuyers, M.pct(st.repeatRate), M.money(st.cpa), M.money(st.contribution)]; })),
      h("p", { class: "muted small" }, "The TikTok story got the most views but the fewest buyers who came back. The Punggol leader campaign was cheapest per new buyer and kept the most."));

    // UTM builder.
    const out = h("code", { class: "utm" });
    const form = h("form", { class: "utm-form", onsubmit: (e) => e.preventDefault() },
      h("label", { class: "field" }, h("span", null, "Source"), h("input", { name: "src", value: "instagram" })),
      h("label", { class: "field" }, h("span", null, "Medium"), h("input", { name: "med", value: "social" })),
      h("label", { class: "field" }, h("span", null, "Campaign"), h("input", { name: "cmp", value: c.id.replace(/-/g, "") + "-recipe" })));
    const upd = () => { out.textContent = M.utm(clean(form.src.value), clean(form.med.value), clean(form.cmp.value)); };
    const clean = (v) => v.trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "") || "unset";
    form.addEventListener("input", upd); upd();
    const builder = panel("Tracked link builder", h("p", { class: "muted small" }, "Every post, QR code and leader message should use its own link so MEOD Fresh can tell which ones bring buyers."),
      form, h("div", { class: "link-row" }, out, h("button", { class: "btn btn-sm btn-outline", type: "button", onclick: () => copy(out.textContent) }, "Copy")));

    return [
      band("Campaign Studio", "Pick a crop. Tyllage suggests who to reach, how and when, from this week's harvest and what has worked before."),
      panel(null, chips),
      recBlock,
      approvals,
      h("div", { class: "grid-2" }, exp, builder),
      perf
    ];
  }

  function seo() {
    const sk = M.CAMPAIGNS.find((k) => k.channel.includes("SEO")), st = M.campaignStats(sk);
    const tone = { gap: "bad", weak: "warn", exists: "good" }, label = { gap: "No page", weak: "Weak page", exists: "Has page" };

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
        kpi("Topics tracked", String(M.SEO_TOPICS.length)),
        kpi("No page yet", String(M.SEO_TOPICS.filter((t) => t.status === "gap").length)),
        kpi("New buyers from search", String(sk.firstBuyers), "recipe page, 4 weeks"),
        kpi("Search buyers who came back", M.pct(st.repeatRate))),
      panel(aiTitle("Search topics and content gaps"),
        table([{ label: "Search topic" }, { label: "Intent" }, { label: "MEOD page" }, { label: "Status" }, { label: "Suggestion" }],
          M.SEO_TOPICS.map((t) => [h("strong", null, t.query), t.intent, t.page, pill(tone[t.status], label[t.status]), t.idea])),
        h("p", { class: "muted small" }, "These are candidate topics, not verified search volumes. Check them in Google Search Console or a keyword tool before writing. Google rewards useful, original pages with clear titles, not lots of auto-generated ones.")),
      panel("Page title & description checker",
        h("div", { class: "grid-2 tight" },
          h("div", { class: "stack" },
            h("label", { class: "field" }, h("span", null, "Page title"), title),
            h("label", { class: "field" }, h("span", null, "Meta description"), desc),
            h("label", { class: "field" }, h("span", null, "Main topic"), kw)),
          h("div", null, h("h3", { class: "small-title" }, "Checks"), res)))
    ];
  }

  function customers() {
    const total = M.sum(M.SEGMENTS.map((x) => x.count));
    const ACT = {
      new: "Send a 3-part welcome: how MEOD grows, one recipe, how to find a pickup. No discount needed.",
      returning: "Invite them to register weekly interest (Harvest Club). Their orders are the strongest planting signal.",
      "at-risk": "One recipe message for a crop they bought before, from this week's spare harvest. Only to opted-in customers.",
      inactive: "Don't message repeatedly. A short 'what stopped you?' question once tells MEOD more than another offer."
    };
    const byChannel = {};
    M.CAMPAIGNS.forEach((k) => { byChannel[k.channel] = (byChannel[k.channel] || 0) + k.firstBuyers; });

    return [
      band("Customer growth", "Who is new, who keeps coming back, and who is drifting away — across MEOD Fresh and group buys."),
      kpis(...M.SEGMENTS.map((x) => kpi(x.label, String(x.count), M.pct(x.count / total) + " · " + x.rule))),
      h("div", { class: "grid-2" },
        panel(aiTitle("Suggested next step per group"),
          h("ul", { class: "seg-list" }, M.SEGMENTS.map((x) => h("li", null, h("strong", null, x.label + " (" + x.count + ")"), h("span", null, ACT[x.id])))),
          h("p", { class: "muted small" }, "Messages only go to customers who opted in. Group-buy members are contacted through their leader unless they've agreed to hear from MEOD directly.")),
        panel("Where new buyers came from",
          hbars(Object.entries(byChannel).map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value)),
          h("p", { class: "muted small" }, "First-time buyers by channel, last 8 weeks."))),
      panel("Harvest interest from this browser",
        M.state.interests.length
          ? table([{ label: "When" }, { label: "Crops" }, { label: "How often" }, { label: "Via" }, { label: "Sector" }],
            M.state.interests.slice().reverse().map((i) => [new Date(i.at).toLocaleString("en-SG"), i.crops.map((id) => M.crop(id).name).join(", "), i.freq, i.via, i.sector || "—"]))
          : h("p", { class: "muted" }, "None yet. Fill in 'Help shape our next harvest' on the consumer page to see it here."),
        h("p", { class: "muted small" }, "Interest is a lead, not demand. Demand → Planting weighs paid, repeat orders far above it."))
    ];
  }

  function points() {
    const R = M.rules();
    const list = M.POINTS.map((p) => ({ p, st: M.pointStatus(p) }));
    const now = M.sum(list.map((x) => x.st.now)), cap = M.sum(M.POINTS.map((p) => p.capacity));

    // Unserved demand: synthetic areas plus this browser's interest from sectors with no nearby pickup.
    const unserved = UNSERVED.map((u) => ({ ...u }));
    M.state.interests.filter((i) => i.sector).forEach((i) => {
      const near = M.nearestPoints(i.sector + "0000", 1);
      if (near && near[0].km > R.nearPointKm) {
        const hit = unserved.find((u) => u.sector === i.sector);
        if (hit) hit.households += 1; else unserved.push({ area: "Sector " + i.sector, sector: i.sector, households: 1 });
      }
    });

    return [
      band("Collection points", "Which group-buy pickups are growing, which have room, and where people want one but don't have one."),
      kpis(
        kpi("Active pickups", String(M.POINTS.length)),
        kpi("Households this week", String(now), "of " + cap + " capacity"),
        kpi("Average fill", M.pct(now / cap)),
        kpi("Returning households", M.pct(M.avg(M.POINTS.map((p) => p.returning))))),
      panel(aiTitle("Pickup health"),
        table([{ label: "Pickup" }, { label: "Day" }, { label: "8 weeks" }, { label: "Households", num: true }, { label: "4-wk trend", num: true }, { label: "Returning", num: true }, { label: "Status" }, { label: "Suggested action" }],
          list.map(({ p, st }) => [
            h("span", null, h("strong", null, p.area), h("br"), h("span", { class: "muted small" }, "Leader " + p.id)),
            p.day + " " + p.window, sparkline(p.active), st.now + " / " + p.capacity,
            (st.trend >= 0 ? "+" : "") + M.pct(st.trend), M.pct(p.returning), pill(st.tone, st.label), st.action]))),
      panel(aiTitle("Interest without a pickup nearby"),
        table([{ label: "Area" }, { label: "Interested households", num: true }, { label: "Nearest pickup" }, { label: "Suggestion" }],
          unserved.sort((a, b) => b.households - a.households).map((u) => {
            const near = M.nearestPoints(u.sector + "0000", 1);
            const n = near ? near[0] : null;
            return [u.area, u.households, n ? n.area + " (~" + n.km.toFixed(1) + " km)" : "—",
              u.households >= 10 ? "Enough interest to look for a leader here." : "Keep collecting interest."];
          })),
        h("p", { class: "muted small" }, "Before adding a pickup, MEOD should check delivery cost, the leader's commission and that perishables can be collected promptly."))
    ];
  }

  function demand(param) {
    const c = M.crop(param) || M.CROPS[0];
    const v = M.plantingVerdict(c);
    const labels = M.weekLabels(c.paid.length);
    M.state.decisions = M.state.decisions || [];
    const decided = M.state.decisions.filter((d) => d.crop === c.id).slice(-1)[0];

    const decide = (status) => {
      M.state.decisions.push({ crop: c.id, verdict: v.label, status, at: new Date().toISOString() });
      M.save(); toast(status + ". Logged for the farm manager."); route();
    };

    return [
      band("Demand → Planting", "Grow more only when paid, repeat demand keeps beating what the farm can sell — and the margin holds."),
      panel(null, h("div", { class: "chips" }, M.CROPS.map((x) =>
        h("a", { class: "chip" + (x.id === c.id ? " on" : ""), href: "#demand/" + x.id, "aria-current": x.id === c.id ? "true" : null }, x.name)))),
      kpis(
        kpi("Expected harvest", c.expected + " kg/wk"),
        kpi("Committed", M.committedKg(c) + " kg", `trade ${c.committed.trade} · group buy ${c.committed.groupBuy} · pre-order ${c.committed.preorder}`),
        kpi("For new consumer demand", v.supply + " kg/wk"),
        kpi("Margin", M.pct(v.margin), M.money(c.price) + "/kg · cost " + M.money(c.cost))),
      h("div", { class: "grid-2" },
        panel(c.name + ": paid consumer orders per week",
          barChart({ labels, values: c.paid, unit: "kg", ref: v.supply, refLabel: "Available" }),
          h("p", { class: "muted small" }, "Dashed line: harvest left after trade, group-buy and pre-order commitments.")),
        panel("Share of demand from returning buyers",
          barChart({ labels, values: c.repeat.map((x) => Math.round(x * 100)), max: 100, ref: Math.round(M.rules().repeatShareMin * 100), refLabel: "Dependable", fmt: (x) => x + "%" }),
          h("p", { class: "muted small" }, "Repeat orders count far more than first orders or registered interest."))),
      panel(aiTitle("Tyllage's read"),
        h("div", { class: "verdict" },
          pill(v.tone, v.label),
          h("p", null, h("strong", null, v.why)),
          h("p", null, v.next)),
        why(v.steps),
        h("div", { class: "approve-row" },
          h("button", { class: "btn btn-forest", type: "button", onclick: () => decide("Accepted by farm manager") }, "Accept"),
          h("button", { class: "btn btn-outline", type: "button", onclick: () => decide("Not now") }, "Not now"),
          decided ? h("span", { class: "muted small" }, "Last decision: " + decided.status + " (" + new Date(decided.at).toLocaleDateString("en-SG") + ")") : null),
        h("p", { class: "muted small" }, "Tyllage never changes a planting plan itself. A farm manager decides, considering seed lead times, space and yield risk.")),
      panel("All crops",
        table([{ label: "Crop" }, { label: "Weeks", num: true }, { label: "Latest paid", num: true }, { label: "Available", num: true }, { label: "Weeks over", num: true }, { label: "Returning", num: true }, { label: "Margin", num: true }, { label: "Verdict" }],
          M.CROPS.map((x) => { const w = M.plantingVerdict(x); return [h("a", { class: "link", href: "#demand/" + x.id }, x.name), x.paid.length, w.latest + " kg", w.supply + " kg", w.over + "/4", M.pct(w.repeatNow), M.pct(w.margin), pill(w.tone, w.label)]; })))
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
      panel("How Tyllage decides, and what's rule-based",
        table([{ label: "Part" }, { label: "How it works" }, { label: "Status" }], [
          ["Featured crops, consumer supply", "Calculation: expected − committed", "Now"],
          ["Demand → Planting verdict", "Explainable rules on paid demand, repeat share and margin", "Now"],
          ["Campaign suggestion", "Rules + recorded campaign results", "Now"],
          ["Post drafts", "Editable templates with caption checks", "Now"],
          ["Recipe ranking", "Filters and a simple score on spare harvest", "Now"],
          ["Attribution", "UTM-tagged links; real numbers need MEOD Fresh / Shopify analytics", "Needs integration"],
          ["Writing drafts with a language model", "Optional LLM, MEOD approves every post", "Future"],
          ["Demand forecasting", "Model trained on MEOD's real order history", "Future, once there's enough data"]
        ])),
      panel("Demo data",
        h("p", null, "Clears interest answers, activity, drafts, decisions and thresholds saved in this browser."),
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
    view.replaceChildren(...[tab.render(param)].flat(Infinity));
    document.title = tab.label + " — Growth Intelligence | Tyllage for MEOD";
    route.last === location.hash ? window.scrollTo(0, y) : window.scrollTo(0, 0);
    route.last = location.hash;
  }
  window.addEventListener("hashchange", route);
  route();
})();
