/* Tyllage intelligence engine: forecasting, RFM segmentation and churn signals, experiment statistics,
   growth strategy, neighbourhood scoring, recommendations, the engagement assistant and farm stories.
   Everything is deterministic and explainable. Where a real model or an LLM would come later, the
   function says so in what it returns. Loads after data.js and extends window.TY. */
(function () {
  "use strict";
  const M = window.TY;

  /* ---------- extra demo data ---------- */

  // How each crop is usually cooked and what it tastes like (for content-based recommendations).
  const ATTR = {
    "nai-bai": { styles: ["stir-fry", "soup"], taste: "mild" },
    "kai-lan": { styles: ["stir-fry", "blanch"], taste: "bittersweet" },
    "tuscan-kale": { styles: ["soup", "salad", "bake"], taste: "earthy" },
    "choy-sum": { styles: ["stir-fry", "blanch"], taste: "mild" },
    "xiao-bai-cai": { styles: ["soup", "stir-fry"], taste: "sweet" },
    mesclun: { styles: ["salad"], taste: "fresh" }
  };

  // Orders that would have happened anyway during each campaign window (from the weeks before).
  const BASELINE = { "C-101": 40, "C-102": 40, "C-103": 20, "C-104": 60, "C-105": 15, "C-106": 18 };

  // Approved farm records: the only facts the storytelling assistant may use.
  const FARM_LOG = [
    { id: "FL-231", date: "2026-10-23", greenhouse: "GH-03", crop: "nai-bai", type: "Harvest", by: "Grower A", photo: "assets/img/veg-xiao-bai-cai.webp",
      facts: ["Harvested 43 kg of Nai Bai from GH-03", "Picked between 6am and 8am, before the heat", "Packed and sent out the same morning"] },
    { id: "FL-228", date: "2026-10-20", greenhouse: "GH-05", crop: "tuscan-kale", type: "Pest control", by: "Grower B", photo: "assets/img/ladybug-640.webp",
      facts: ["Released ladybirds in GH-05 to control aphids on the Tuscan Kale", "No pesticides were sprayed", "Aphid numbers dropped within a week"] },
    { id: "FL-225", date: "2026-10-17", greenhouse: "GH-01", crop: "mesclun", type: "Planting", by: "Grower A", photo: "assets/img/veg-mesclun.webp",
      facts: ["Sowed a new Mesclun Mix bed in GH-01", "Seven kinds of baby leaves in one bed", "First harvest expected in about four weeks"] },
    { id: "FL-219", date: "2026-10-12", greenhouse: "GH-02", crop: "kai-lan", type: "Weather", by: "Grower C", photo: "assets/img/fresh-produce.webp",
      facts: ["Heavy rain on Sunday afternoon", "GH-02's Kai Lan stayed dry under the greenhouse roof", "Harvest went ahead on Tuesday as planned"] }
  ];

  // Approved answers for the engagement assistant. It never answers outside these and the live data.
  const KB = [
    { id: "delivery", title: "Delivery", keys: ["deliver", "delivery", "shipping", "when arrive", "free delivery", "minimum"],
      answer: "Tyllage delivers on Tuesday, Thursday and Saturday. Delivery is free from S$60. Orders close at 10pm the night before." },
    { id: "pickup", title: "Group-buy pickup", keys: ["group buy", "groupbuy", "pickup", "pick up", "collect", "collection", "leader", "near me"],
      answer: "Neighbourhood group-buy leaders receive one delivery and you collect from them. Tell me your 6-digit postal code and I'll find the nearest pickup." },
    { id: "pesticide", title: "How Tyllage grows", keys: ["pesticide", "organic", "chemical", "spray", "how grown", "safe"],
      answer: "Tyllage grows without pesticides and uses helpful insects like ladybirds to control pests. (Tyllage's produce is pesticide-free; it isn't certified organic.)" },
    { id: "storage", title: "Storage", keys: ["store", "storage", "keep", "fridge", "how long", "last"],
      answer: "Keep leafy greens unwashed in a paper towel inside a bag in the fridge. Most stay fresh for 4–7 days. Wash just before cooking." },
    { id: "visit", title: "Farm visits", keys: ["visit", "tour", "school", "workshop", "excursion"],
      answer: "Tyllage runs farm tours, workshops and school visits in Kranji. Groups of up to 200 can be split into sessions. Staff confirm every booking." },
    { id: "payment", title: "Payment", keys: ["pay", "payment", "paynow", "card", "cash"],
      answer: "You pay when you check out on Tyllage. Group-buy payment is arranged by your leader." },
    { id: "lead", title: "Become a leader", keys: ["become leader", "be a leader", "start a group", "host", "commission"],
      answer: "Tyllage is looking for group-buy leaders in areas without a pickup. Leave your area below and a Tyllage staff member will follow up." }
  ];

  // Synthetic customers, generated the same way every time (seeded), pseudonymous IDs only.
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const CUSTOMERS = (function () {
    const r = rng(20261027);
    const pick = (a) => a[Math.floor(r() * a.length)];
    const out = [];
    for (let i = 1; i <= 80; i++) {
      const interval = pick([7, 7, 10, 14, 14, 21, 28]);
      const orders = Math.max(1, Math.round(r() ** 1.6 * 22));
      const overdue = pick([0.3, 0.6, 0.9, 1.1, 1.6, 2.2, 3, 5, 8]);
      const last = Math.max(1, Math.round(interval * overdue));
      const point = r() < 0.65 ? pick(M.POINTS).id : "";
      out.push({
        id: "CU-" + String(i).padStart(3, "0"),
        point, channel: point ? "Group buy" : "Tyllage",
        crop: pick(M.CROPS).id, interval, orders, lastDays: last,
        spend: orders * (1500 + Math.round(r() * 45) * 100),
        consent: r() < 0.7
      });
    }
    return out;
  })();

  /* ---------- small maths ---------- */

  function erf(x) { // Abramowitz–Stegun 7.1.26
    const s = Math.sign(x); x = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * x);
    const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
    return s * y;
  }
  const normCdf = (z) => 0.5 * (1 + erf(z / Math.SQRT2));

  /* ---------- 5. forecasting with uncertainty ---------- */

  // Linear trend with an 80% prediction interval. Honest about being a simple model.
  function fit(ys) {
    const n = ys.length, xs = ys.map((_, i) => i);
    const mx = M.avg(xs), my = M.avg(ys);
    const sxx = M.sum(xs.map((x) => (x - mx) ** 2));
    const b = sxx ? M.sum(xs.map((x, i) => (x - mx) * (ys[i] - my))) / sxx : 0;
    const a = my - b * mx;
    const resid = ys.map((y, i) => y - (a + b * i));
    const sd = n > 2 ? Math.sqrt(M.sum(resid.map((e) => e * e)) / (n - 2)) : 0;
    return { a, b, sd, n, mx, sxx };
  }

  function forecast(series, h) {
    if (series.length < 4) return null;
    const f = fit(series);
    const pts = [];
    for (let k = 0; k < h; k++) {
      const x = f.n + k;
      const mid = Math.max(0, f.a + f.b * x);
      const se = f.sd * Math.sqrt(1 + 1 / f.n + (x - f.mx) ** 2 / f.sxx);
      pts.push({ mid: Math.round(mid), lo: Math.max(0, Math.round(mid - 1.2816 * se)), hi: Math.round(mid + 1.2816 * se) });
    }
    // Backtest: fit without the last 2 weeks, predict them, compare.
    let mape = null;
    if (series.length >= 6) {
      const g = fit(series.slice(0, -2));
      const errs = series.slice(-2).map((y, k) => Math.abs(y - (g.a + g.b * (g.n + k))) / Math.max(1, y));
      mape = M.avg(errs);
    }
    return { pts, slope: f.b, mape };
  }

  // Forecast-aware read for one crop, building on the rule-based verdict.
  function forecastRead(c) {
    const v = M.plantingVerdict(c);
    const fc = forecast(c.paid, 4);
    if (!fc) return { fc: null, confidence: "Not enough history", note: "Needs at least 4 weeks of paid orders to forecast." };
    const lo = M.avg(fc.pts.map((p) => p.lo)), mid = M.avg(fc.pts.map((p) => p.mid)), hi = M.avg(fc.pts.map((p) => p.hi));
    let confidence, note;
    let trialKg = v.trialKg || 0;
    if (lo > v.supply) {
      confidence = "High";
      // The forecast's low end supports a bigger trial than recent weeks alone, within the cap.
      trialKg = Math.max(trialKg, Math.round(Math.min(lo - v.supply, c.expected * M.rules().maxTrialIncrease)));
      note = `Even the low end of the forecast (${Math.round(lo)} kg/wk) is above what's available (${v.supply} kg), which supports a trial of up to about +${trialKg} kg/week.`;
    }
    else if (mid > v.supply) { confidence = "Medium"; note = `The middle forecast (${Math.round(mid)} kg/wk) is above supply, but the low end (${Math.round(lo)} kg) isn't.`; }
    else if (hi < v.supply) { confidence = "Oversupplied"; note = `Even the high end (${Math.round(hi)} kg/wk) is below the ${v.supply} kg available.`; }
    else { confidence = "Balanced"; note = `Supply (${v.supply} kg) sits inside the forecast range (${Math.round(lo)}–${Math.round(hi)} kg).`; }
    return { fc, lo, mid, hi, confidence, note, trialKg };
  }

  // Grow a different crop? Pair crops with persistent spare supply against ones demand is outgrowing.
  function cropMix() {
    const rows = M.CROPS.map((c) => ({ c, v: M.plantingVerdict(c), f: forecastRead(c) }));
    const short = rows.filter((x) => x.v.key === "test-more");
    const spare = rows.filter((x) => x.f.confidence === "Oversupplied" && x.v.key !== "margin");
    return short.flatMap((s) => spare.map((o) => ({
      from: o.c, to: s.c,
      spareKg: Math.round(o.v.supply - o.f.hi),
      text: `${o.c.name} has had about ${Math.round(o.v.supply - o.f.hi)} kg/week more consumer supply than even the high forecast, while ${s.c.name} demand is outgrowing supply. Ask the farm manager whether part of a ${o.c.name} bed could trial ${s.c.name} for one cycle.`
    })));
  }

  /* ---------- 4. RFM segmentation and churn signals ---------- */

  function rfm(cu) {
    const R = cu.lastDays <= 14 ? 5 : cu.lastDays <= 30 ? 4 : cu.lastDays <= 45 ? 3 : cu.lastDays <= 75 ? 2 : 1;
    const F = cu.orders >= 12 ? 5 : cu.orders >= 8 ? 4 : cu.orders >= 4 ? 3 : cu.orders >= 2 ? 2 : 1;
    const Mo = cu.spend >= 40000 ? 5 : cu.spend >= 20000 ? 4 : cu.spend >= 10000 ? 3 : cu.spend >= 4000 ? 2 : 1;
    let seg;
    if (R >= 4 && F >= 4) seg = "Champions";
    else if (R >= 3 && F >= 4) seg = "Loyal";
    else if (R >= 4 && F <= 2) seg = "New";
    else if (R <= 2 && F >= 3) seg = "At risk";
    else if (R <= 2) seg = "Hibernating";
    else seg = "Needs attention";
    const overdue = cu.lastDays / cu.interval;
    // Rule-based churn signal: overdue against their own usual gap between orders.
    const risk = cu.orders < 2 ? "Too new" : overdue >= 4 ? "Lapsed" : overdue >= 1.5 ? "Likely lapsing" : "On track";
    return { R, F, M: Mo, score: "" + R + F + Mo, seg, overdue, risk };
  }

  const SEGMENT_ACTIONS = {
    Champions: "Invite to register weekly interest (Harvest Club). Their orders are the strongest planting signal.",
    Loyal: "Thank them with an early look at the next harvest. No discount needed.",
    New: "Welcome series: how Tyllage grows, one recipe for what they bought, how to find a pickup.",
    "Needs attention": "One useful recipe for their usual crop from this week's spare harvest.",
    "At risk": "Personal win-back: their usual crop is back, plus a pickup reminder. Opted-in only.",
    Hibernating: "Don't chase. One short 'what stopped you?' question tells Tyllage more than another offer."
  };

  function reengage(cu) {
    const c = M.crop(cu.crop);
    // Don't promote a crop that's fully committed or under the margin floor.
    const promotable = (x) => M.featuredCrops().includes(x) && M.plantingVerdict(x).key !== "margin";
    const available = promotable(c);
    const alt = available ? c : (recommendFor([cu.crop]).find((r) => promotable(r.c)) || {}).c;
    if (!cu.consent) return { text: cu.point ? `No consent to message. Leader ${cu.point} can mention ${alt ? alt.name : "this week's harvest"} in the group chat.` : "No consent to message. Leave them.", channel: "None" };
    return {
      text: available ? `Recipe for ${c.name} (harvest ${c.harvestDay}) with their usual pickup or delivery day.` : `${c.name} isn't one to promote this week. Suggest ${alt ? alt.name : "another green"} instead, with one recipe.`,
      channel: cu.point ? "WhatsApp via leader " + cu.point : "Email / WhatsApp (opted in)"
    };
  }

  /* ---------- 6. personalised recommender (content-based) ---------- */

  function recommendFor(liked, prefs) {
    const avail = M.featuredCrops();
    const likedAttr = liked.map((id) => ATTR[id]).filter(Boolean);
    return avail.filter((c) => !liked.includes(c.id)).map((c) => {
      const a = ATTR[c.id];
      const overlap = likedAttr.length ? M.avg(likedAttr.map((l) => l.styles.filter((s) => a.styles.includes(s)).length / a.styles.length)) : 0.5;
      const newTaste = likedAttr.every((l) => l.taste !== a.taste) ? 1 : 0;
      const spare = M.uncommittedKg(c) / c.expected;
      const score = overlap * 0.5 + newTaste * 0.25 + spare * 0.25;
      const shared = likedAttr.length ? [...new Set(likedAttr.flatMap((l) => l.styles))].filter((s) => a.styles.includes(s)) : [];
      const recipe = M.RECIPES.find((r) => r.crop === c.id && (!prefs || !prefs.includes("no-spicy") || !r.spicy) && (!prefs || prefs.filter((p) => p !== "no-spicy").every((p) => r.tags.includes(p))));
      const reason = shared.length
        ? `Cooks the same way (${shared.join(", ")}) but tastes ${a.taste}, so it adds variety.`
        : `Something different: great for ${a.styles.join(", ")}.`;
      return { c, score, reason, recipe };
    }).sort((x, y) => y.score - x.score);
  }

  /* ---------- 8. experiments ---------- */

  function campaignImpact(k) {
    const st = M.campaignStats(k);
    const base = BASELINE[k.id] || 0;
    const inc = Math.max(0, k.orders - base);
    const perOrder = k.orders ? (k.revenue * 0.45) / k.orders : 0;
    return { ...st, baseline: base, incremental: inc, incContribution: Math.round(inc * perOrder - k.spend - k.discount) };
  }

  // Two-proportion z-test.
  function compare(x1, n1, x2, n2) {
    const p1 = x1 / n1, p2 = x2 / n2, p = (x1 + x2) / (n1 + n2);
    const se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2));
    const z = se ? (p1 - p2) / se : 0;
    const pValue = 2 * (1 - normCdf(Math.abs(z)));
    return { p1, p2, z, pValue, significant: pValue < 0.05 };
  }

  // Buyers needed per arm to detect base → target at 95% confidence, 80% power.
  function sampleSize(base, target) {
    const pb = (base + target) / 2;
    const n = (1.96 * Math.sqrt(2 * pb * (1 - pb)) + 0.8416 * Math.sqrt(base * (1 - base) + target * (1 - target))) ** 2 / (base - target) ** 2;
    return Math.ceil(n);
  }

  /* ---------- 7. neighbourhood intelligence ---------- */

  const MIN_GROUP = 5; // never show a breakdown for fewer households than this

  function neighbourhood(p) {
    const st = M.pointStatus(p);
    let type;
    if (p.returning < 0.4) type = { key: "leaky", label: "Leaky", tone: "bad", text: "New households join but don't stay." };
    else if (st.util > 0.85) type = { key: "saturated", label: "Saturated", tone: "good", text: "Nearly full. Growth needs another slot or leader." };
    else if (st.trend >= 0.1 && p.returning >= 0.55) type = { key: "loyal", label: "Growing & loyal", tone: "good", text: "Best place to learn what works." };
    else if (st.util < 0.6) type = { key: "untapped", label: "Untapped", tone: "warn", text: "Loyal enough, with room for more households." };
    else type = { key: "stable", label: "Stable", tone: "neutral", text: "Holding steady." };
    // Opportunity: room to grow, weighted by whether people stay and the direction of travel.
    const score = Math.round(100 * Math.min(1, (1 - st.util) * 0.45 + p.returning * 0.35 + Math.max(-0.2, Math.min(0.4, st.trend)) * 0.5 + 0.05));
    const shares = [0.45, 0.3];
    const mix = M.CROPS.map((c) => {
      const i = p.topCrops.indexOf(c.id);
      const hh = Math.round(st.now * (i >= 0 ? shares[i] : 0.25 / Math.max(1, M.CROPS.length - p.topCrops.length)));
      return { c, hh, shown: hh >= MIN_GROUP ? String(hh) : "<" + MIN_GROUP };
    });
    return { ...st, type, score, mix };
  }

  /* ---------- 1. growth strategy advisor ---------- */

  function strategy() {
    const recs = [];
    const pts = M.POINTS.map((p) => ({ p, n: neighbourhood(p) }));

    // Expand what works: a growing, loyal area for a crop → a similar area with room. One per source area.
    const usedSrc = new Set();
    M.CROPS.forEach((c) => {
      const src = pts.filter((x) => x.p.topCrops.includes(c.id) && x.n.trend >= 0.1 && x.p.returning >= 0.55 && !usedSrc.has(x.p.id)).sort((a, b) => b.n.trend - a.n.trend)[0];
      if (!src) return;
      usedSrc.add(src.p.id);
      const tgt = pts.filter((x) => x !== src && x.p.returning >= 0.4 && x.n.util < 0.7 && (x.p.topCrops.includes(c.id) || x.p.day === src.p.day))
        .sort((a, b) => b.n.score - a.n.score)[0];
      if (!tgt) return;
      const room = tgt.p.capacity - tgt.n.now;
      recs.push({
        kind: "Expand", tone: "good", score: 60 + src.n.trend * 100,
        title: `Take ${c.name} from ${src.p.area} to ${tgt.p.area}`,
        text: `Repeat sales for ${c.name} are growing in ${src.p.area}: households up ${M.pct(src.n.trend)} in four weeks, and ${M.pct(src.p.returning)} of them come back. ${tgt.p.area} has room for about ${room} more households and similar buyers. Target there before increasing production.`,
        evidence: [`${src.p.id}: ${src.p.active.slice(-5)[0]} → ${src.n.now} households (Collection points)`, `${src.p.id} returning share ${M.pct(src.p.returning)}`, `${tgt.p.id}: ${tgt.n.now} of ${tgt.p.capacity} households, returning ${M.pct(tgt.p.returning)}`],
        impact: `Up to ${room} more households at ${tgt.p.id}`, effort: "Low", href: "#campaigns/" + c.id
      });
    });

    // Production trials, with forecast confidence.
    M.CROPS.forEach((c) => {
      const v = M.plantingVerdict(c);
      if (v.key !== "test-more") return;
      const f = forecastRead(c);
      recs.push({
        kind: "Grow", tone: "good", score: f.confidence === "High" ? 75 : 55,
        title: `Trial +${f.trialKg} kg/week of ${c.name}`,
        text: `${v.why} ${f.note} A one-cycle trial lets the farm learn without a big commitment.`,
        evidence: [`Paid demand last 4 weeks: ${c.paid.slice(-4).join(", ")} kg (Demand → Planting)`, `Available for consumers: ${v.supply} kg/week`, `Returning share ${M.pct(v.repeatNow)}, margin ${M.pct(v.margin)}`, `Forecast confidence: ${f.confidence}`],
        impact: `+${f.trialKg} kg/week sold at ${M.money(c.price)}/kg`, effort: "Medium", href: "#demand/" + c.id
      });
    });

    // Fix leaks before pouring in new customers.
    pts.filter((x) => x.n.type.key === "leaky").forEach(({ p, n }) => recs.push({
      kind: "Retain", tone: "bad", score: 70 - p.returning * 50,
      title: `Find out why ${p.area} households leave`,
      text: `${p.area} has ${p.active.slice(-5)[0] - n.now > 0 ? `lost ${p.active.slice(-5)[0] - n.now} household${p.active.slice(-5)[0] - n.now === 1 ? "" : "s"} in four weeks` : "not grown in four weeks"} and only ${M.pct(p.returning)} come back. More advertising here would mostly refill a leaking bucket. Ask leader ${p.id} what changed, then test one returning-buyer recipe campaign for this pickup only.`,
      evidence: [`${p.id}: ${p.active.slice(-5)[0]} → ${n.now} households`, `Returning share ${M.pct(p.returning)} (risk under 40%)`],
      impact: `Protects about ${n.now} households`, effort: "Low", href: "#points"
    }));

    // Move budget to what earns.
    const imp = M.CAMPAIGNS.map((k) => ({ k, i: campaignImpact(k) })).sort((a, b) => b.i.incContribution - a.i.incContribution);
    const best = imp[0], worst = imp[imp.length - 1];
    if (best.k.channel !== worst.k.channel) recs.push({
      kind: "Budget", tone: "warn", score: 50,
      title: `Shift spend from ${worst.k.channel} to ${best.k.channel}`,
      text: `${best.k.name} (${best.k.channel}) added about ${best.i.incremental} orders over the usual and ${M.money(best.i.incContribution)} after costs. ${worst.k.name} (${worst.k.channel}) got attention but added ${M.money(worst.i.incContribution)}. Keep a little in ${worst.k.channel} for awareness, but put the next campaign's budget where buyers come back.`,
      evidence: [`${best.k.id}: ${best.k.orders} orders vs ${best.i.baseline} usual`, `${worst.k.id}: ${worst.k.orders} orders vs ${worst.i.baseline} usual (Experiments)`],
      impact: `About ${M.money(best.i.incContribution - worst.i.incContribution)} better per campaign`, effort: "Low", href: "#experiments"
    });

    // Win back lapsing customers who agreed to hear from Tyllage.
    const lapsing = CUSTOMERS.filter((cu) => rfm(cu).risk === "Likely lapsing" && cu.consent);
    if (lapsing.length) recs.push({
      kind: "Win back", tone: "warn", score: 45 + lapsing.length,
      title: `Re-engage ${lapsing.length} customers drifting away`,
      text: `${lapsing.length} customers who agreed to hear from Tyllage are past 1.5× their usual gap between orders. One relevant recipe for the crop they normally buy is more useful to them than a discount.`,
      evidence: [`${lapsing.length} 'Likely lapsing' with consent (Customers)`, `Usual gaps range ${Math.min(...lapsing.map((c) => c.interval))}–${Math.max(...lapsing.map((c) => c.interval))} days`],
      impact: `${lapsing.length} customers`, effort: "Low", href: "#customers"
    });

    M.CROPS.filter((c) => M.plantingVerdict(c).key === "margin").forEach((c) => recs.push({
      kind: "Margin", tone: "bad", score: 65,
      title: `Fix ${c.name}'s margin before promoting it`,
      text: `${c.name} sells well, but each kg earns ${M.pct(M.margin(c))}, under the ${M.pct(M.rules().minMargin)} floor. Promoting or growing more would grow the loss. Review pack size, price or growing cost first.`,
      evidence: [`Price ${M.money(c.price)}/kg, cost ${M.money(c.cost)}/kg`],
      impact: "Stops losses on extra volume", effort: "Medium", href: "#demand/" + c.id
    }));

    // From the customer journey and feedback (insights.js), when loaded.
    if (M.journey) M.journey().anomalies.forEach((a) => recs.push({
      kind: "Convert", tone: "bad", score: 80,
      title: `Fix the checkout drop for ${a.band.replace(/^Cart/, "carts")}`,
      text: `Fewer ${a.band.replace(/^Cart/, "carts")} finish checkout: ${M.pct(a.now)} in the last 2 weeks vs ${M.pct(a.mean)} before, about ${a.lostOrders} orders a week. ${a.note}. Offer group-buy pickup before checkout rather than buying more traffic.`,
      evidence: [`"${a.from}" → "${a.step}": ${M.pct(a.mean)} → ${M.pct(a.now)} (Customer journey)`, "Carts of S$60+ unchanged"],
      impact: `About ${a.lostOrders} orders/week`, effort: "Low", href: "#journey"
    }));
    if (M.feedback) {
      const t = M.feedback().themes.find((x) => x.barrier && x.neg >= 3);
      if (t) recs.push({
        kind: "Barrier", tone: "warn", score: 58,
        title: `Remove a barrier: ${t.label.toLowerCase()}`,
        text: `${t.count} pieces of feedback mention ${t.label.toLowerCase()}, ${t.neg} negatively. ${t.action}`,
        evidence: t.hits.slice(0, 3).map((f) => `"${f.text}" (${f.source})`),
        impact: "Unblocks buyers already interested", effort: "Medium", href: "#feedback"
      });
    }
    return recs.sort((a, b) => b.score - a.score);
  }

  /* ---------- 9. engagement assistant (retrieval over approved info + live data) ---------- */

  const ESCALATE = /complain|refund|wrong|missing|rotten|damaged|sick|allerg|food poison|bulk|wholesale|corporate|catering|invoice|cancel/i;
  const BUY = /\b(buy|order|want|get)\b.*\b(\d+\s?(kg|g|pack|packs|bunch))\b|\bi('?d| would) like to (buy|order)\b|\bhow (do|can) i (buy|order)\b/i;

  function redact(text) {
    return text
      .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, "[email removed]")
      .replace(/(\+65\s?)?[689]\d{3}\s?\d{4}\b/g, "[phone removed]")
      .replace(/\b\d{6}\b/g, (m) => m.slice(0, 2) + "xxxx");
  }

  function answer(q) {
    const text = q.trim();
    const lower = text.toLowerCase();
    const crop = M.CROPS.find((c) => lower.includes(c.name.toLowerCase()) || lower.includes(c.zh));
    const postal = (text.match(/\b\d{6}\b/) || [])[0];
    const out = { parts: [], links: [], sources: [], escalate: false, intent: null };

    if (ESCALATE.test(lower)) {
      out.escalate = true;
      out.parts.push("I've passed this to a Tyllage staff member, who will reply during working hours. I can't handle refunds, complaints, health or bulk orders myself.");
      out.sources.push("Escalation rule");
      return out;
    }
    if (postal) {
      const near = M.nearestPoints(postal, 2);
      if (near) {
        out.parts.push("Nearest group-buy pickups:");
        near.forEach((p) => out.parts.push(`• ${p.area} (~${p.km.toFixed(1)} km), ${p.day} ${p.window}`));
        if (near[0].km > M.rules().nearPointKm) out.parts.push("Neither is very close. You can tell the farm you're interested on this page, so Tyllage knows there's demand near you.");
        out.sources.push("Live collection points");
      } else out.parts.push("I couldn't place that postal code. Check the 6 digits?");
    }
    if (crop) {
      const left = M.uncommittedKg(crop);
      const avail = M.featuredCrops().includes(crop);
      out.parts.push(avail ? `${crop.name}: about ${left} kg left this week, harvested ${crop.harvestDay}.` : `${crop.name} is fully booked this week. Try ${recommendFor([crop.id])[0]?.c.name || "another green"} instead.`);
      out.sources.push("Live harvest availability");
      if (/cook|recipe|make|dish/.test(lower)) {
        const rs = M.RECIPES.filter((r) => r.crop === crop.id).slice(0, 2);
        if (rs.length) { out.parts.push("Ideas: " + rs.map((r) => `${r.title} (${r.mins} min)`).join(", ") + "."); out.sources.push("Recipe library"); }
      }
      if (avail) out.links.push({ label: "Buy " + crop.name + " on Tyllage ↗", href: M.utm("tyllage", "assistant", "ask-tyllage", "crop-" + crop.id) });
    }
    if (BUY.test(lower) || (crop && /\b(buy|order)\b/.test(lower))) {
      out.intent = { crop: crop ? crop.id : "", qty: (lower.match(/\d+\s?(kg|g|packs?|bunch)/) || [""])[0] };
      out.parts.push("Orders are placed on Tyllage, or through your group-buy leader. I've noted your interest for the farm.");
    }
    // Approved FAQ retrieval: best keyword overlap.
    const scored = KB.map((k) => ({ k, s: k.keys.filter((key) => lower.includes(key)).length })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s);
    if (scored.length && !(postal && scored[0].k.id === "pickup")) { out.parts.push(scored[0].k.answer); out.sources.push("Approved FAQ: " + scored[0].k.title); }
    if (/what('?s| is) (fresh|available|in season)|this week/.test(lower) && !crop) {
      out.parts.push("This week we have most of: " + M.featuredCrops().slice(0, 3).map((c) => c.name).join(", ") + ".");
      out.sources.push("Live harvest availability");
    }
    if (!out.parts.length && /^(hi|hello|hey|good (morning|afternoon|evening))\b/.test(lower)) {
      out.parts.push("Hello! I can tell you what's being harvested this week, find a group-buy pickup near you, suggest recipes, or answer questions about delivery and how Tyllage grows.");
    }
    if (!out.parts.length) {
      out.parts.push("I only answer from Tyllage's approved information, and I don't have an answer for that. Would you like me to pass your question to a staff member? Type \"staff\".");
      if (/^staff$|human|person|talk to/.test(lower)) { out.parts = ["I've passed your question to a Tyllage staff member."]; out.escalate = true; }
    }
    return out;
  }

  /* ---------- 10. farm storytelling ---------- */

  function story(rec, tone) {
    const c = M.crop(rec.crop);
    const date = new Date(rec.date).toLocaleDateString("en-SG", { day: "numeric", month: "long" });
    const [f1, f2, f3] = rec.facts;
    const open = { warm: "A little news from the farm 🌱", informative: `Farm update, ${date}:`, kids: "Guess what happened at the farm this week? 🐞" }[tone];
    const close = { warm: `Grown in Kranji, Singapore, by the Tyllage team.`, informative: `${c.name} from Tyllage, grown in Kranji, Singapore.`, kids: "Ask a grown-up to find Tyllage's veggies with you!" }[tone];
    return {
      instagram: `${open}\n\n${f1}. ${f2}. ${f3}.\n\n${close}\nOrder on Tyllage (link in bio).`,
      blog: `${date} — ${f1}. ${f2}. ${f3}. ${c.name} from ${rec.greenhouse} goes out on Tyllage's ${c.harvestDay} harvest. ${ATTR[c.id] ? "It's best for " + ATTR[c.id].styles.join(" and ") + "." : ""}`,
      whatsapp: `Hi everyone! News from Tyllage in Kranji: ${f1}. ${f3}. Order ${c.name} through your usual pickup this week.`,
      facts: rec.facts.map((f) => ({ fact: f, source: `${rec.id} · ${rec.type} · ${rec.greenhouse} · ${rec.by}` }))
    };
  }

  /* ---------- 3. SEO clustering and page drafts ---------- */

  const CLUSTERS = [
    { id: "recipes", label: "Recipes & cooking", re: /recipe|cook|how to|what to|dish|stir|soup/ },
    { id: "group", label: "Group buy & pickup", re: /group ?buy|near me|collect|pickup|pick up/ },
    { id: "visit", label: "Farm visits", re: /tour|visit|kids|school|excursion|workshop/ },
    { id: "method", label: "How it's grown", re: /pesticide|organic|hydroponic|how .*grown|chemical/ },
    { id: "buy", label: "Buy local vegetables", re: /buy|delivery|fresh|local|singapore|vegetable|grocer/ }
  ];
  const clusterOf = (q) => (CLUSTERS.find((c) => c.re.test(q.toLowerCase())) || { id: "other", label: "Other" });

  function parseSearchCsv(text) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return { rows: [], error: "The file has no data rows." };
    const split = (l) => l.match(/("([^"]|"")*"|[^,]*)(,|$)/g).slice(0, -1).map((c) => c.replace(/,$/, "").replace(/^"|"$/g, "").replace(/""/g, '"').trim());
    const head = split(lines[0]).map((h) => h.toLowerCase());
    const col = (re) => head.findIndex((h) => re.test(h));
    const qi = col(/quer|keyword|top quer/), ci = col(/click/), ii = col(/impr/), pi = col(/pos/);
    if (qi < 0) return { rows: [], error: "Couldn't find a 'Query' column. Export 'Queries' from Search Console's Performance report." };
    const num = (v) => Number(String(v || "0").replace(/[%,]/g, "")) || 0;
    const rows = lines.slice(1, 2001).map(split).filter((r) => r[qi]).map((r) => ({
      query: r[qi].slice(0, 120), clicks: ci >= 0 ? num(r[ci]) : 0, impressions: ii >= 0 ? num(r[ii]) : 0, position: pi >= 0 ? num(r[pi]) : 0
    }));
    return { rows, error: rows.length ? "" : "No rows with a query." };
  }

  // Demo Search Console export (synthetic) so the clustering has something to show.
  const DEMO_SEARCH = [
    ["nai bai recipe", 38, 2100, 7.2], ["how to cook nai bai", 12, 1400, 11.5], ["kai lan recipe easy", 3, 1900, 18.3],
    ["vegetable group buy singapore", 9, 880, 9.8], ["vegetable group buy near me", 2, 640, 15.1], ["tyllage farm", 210, 900, 1.2],
    ["singapore farm tour for kids", 25, 1200, 5.4], ["kranji farm visit", 41, 1500, 3.9], ["pesticide free vegetables singapore", 6, 1100, 12.7],
    ["fresh vegetables delivery singapore", 4, 3200, 24.0], ["locally grown vegetables singapore", 11, 1700, 10.4], ["what to cook with tuscan kale", 1, 520, 19.8]
  ].map(([query, clicks, impressions, position]) => ({ query, clicks, impressions, position }));

  function clusterSearch(rows) {
    const map = {};
    rows.forEach((r) => {
      const c = clusterOf(r.query);
      const m = map[c.id] || (map[c.id] = { id: c.id, label: c.label, queries: [], clicks: 0, impressions: 0, posW: 0 });
      m.queries.push(r); m.clicks += r.clicks; m.impressions += r.impressions; m.posW += r.position * r.impressions;
    });
    return Object.values(map).map((m) => {
      const ctr = m.impressions ? m.clicks / m.impressions : 0;
      const pos = m.impressions ? m.posW / m.impressions : 0;
      // Opportunity: seen a lot, clicked little, and close enough to page 1 to move.
      const opp = m.impressions > 1000 && ctr < 0.02 && pos > 5 ? "High" : m.impressions > 500 && pos > 8 ? "Medium" : "Low";
      return { ...m, ctr, pos, opp };
    }).sort((a, b) => b.impressions - a.impressions);
  }

  function pageDraft(topic) {
    const q = topic.query.toLowerCase();
    const c = M.CROPS.find((x) => q.includes(x.name.toLowerCase())) || M.featuredCrops()[0];
    const recipes = M.RECIPES.filter((r) => r.crop === c.id).slice(0, 3);
    const cl = clusterOf(q).id;
    const title = cl === "group" ? "Vegetable Group Buys Near You | Tyllage, Singapore"
      : cl === "visit" ? "Farm Tours for Kids and Schools in Kranji | Tyllage"
      : `${c.name} (${c.zh}): How It's Grown, Stored and Cooked | Tyllage`;
    return {
      title, meta: `Singapore-grown ${c.name} from Tyllage in Kranji: harvest days, how to keep it fresh, and ${recipes.length} easy recipes. Order on Tyllage or collect from a group buy.`,
      h1: cl === "group" ? "Collect fresh Tyllage vegetables from a neighbour" : `Singapore-grown ${c.name}`,
      sections: [
        { h: `How Tyllage grows ${c.name}`, from: "Approved FAQ + farm log", body: "Grown in Kranji without pesticides, using helpful insects like ladybirds. Harvested the morning it leaves the farm. (Tyllage to add its own words and a photo.)" },
        { h: "When it's harvested", from: "Harvest plan", body: `${c.name} is harvested on ${c.harvestDay}s. Delivery Tue / Thu / Sat, free from S$60.` },
        { h: "Keeping it fresh", from: "Approved FAQ", body: KB.find((k) => k.id === "storage").answer },
        { h: "Easy recipes", from: "Recipe library", body: recipes.map((r) => `${r.title} (${r.mins} min)`).join(" · ") || "Tyllage to add recipes." },
        { h: "Where to buy", from: "Collection points", body: `Order on Tyllage, or collect from one of ${M.POINTS.length} neighbourhood group-buy pickups.` }
      ],
      faq: [`Is Tyllage's ${c.name} organic?`, `How long does ${c.name} keep in the fridge?`, "Can I collect instead of delivery?"],
      links: ["This Week at Tyllage", "Find your collection point", "Tyllage: " + c.name]
    };
  }

  Object.assign(M, {
    ATTR, FARM_LOG, KB, CUSTOMERS, MIN_GROUP, SEGMENT_ACTIONS, DEMO_SEARCH, CLUSTERS,
    forecast, forecastRead, cropMix, rfm, reengage, recommendFor, campaignImpact, compare, sampleSize,
    neighbourhood, strategy, answer, redact, story, parseSearchCsv, clusterSearch, clusterOf, pageDraft
  });
})();
