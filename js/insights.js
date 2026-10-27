/* Tyllage insights, part 2: customer journey, promotions and delivery economics, baskets and boxes,
   replenishment, feedback, new-crop tests, trends, partners, budget allocation, planting scenarios
   and lifetime value. Deterministic and explainable, like intel.js. Loads after intel.js. */
(function () {
  "use strict";
  const M = window.MEOD;

  /* ---------- demo data (synthetic, illustrative) ---------- */

  // Delivery economics. Customer-facing fee and threshold are from MEOD Fresh's published shipping
  // policy (check before use); MEOD's own costs are made up.
  const DELIVERY = {
    homeFee: 1000,          // charged to the customer below the free-delivery threshold
    freeFrom: 6000,
    homeCost: 1200,         // what one home delivery costs MEOD (courier/driver), illustrative
    dropCost: 2000,         // one consolidated drop to a group-buy leader, illustrative
    dropHouseholds: 20,     // typical households sharing a drop
    leaderRate: 0.05,       // leader commission on net merchandise
    packCost: 80            // packing per order
  };

  // MEOD Fresh checkout funnel, 8 weeks, split by cart size. Rates are step-to-step conversion.
  const JOURNEY = {
    weeks: 8,
    steps: ["Visited", "Viewed a product", "Added to cart", "Started checkout", "Chose delivery", "Paid"],
    sessions: [2400, 2500, 2450, 2600, 2550, 2700, 2650, 2800],
    bands: {
      "Cart under S$60": { share: 0.62, rates: [
        [0.58, 0.58, 0.57, 0.59, 0.58, 0.58, 0.59, 0.58],
        [0.22, 0.23, 0.22, 0.22, 0.23, 0.22, 0.22, 0.23],
        [0.62, 0.61, 0.63, 0.62, 0.62, 0.61, 0.62, 0.62],
        [0.80, 0.81, 0.79, 0.80, 0.81, 0.80, 0.80, 0.79],
        [0.55, 0.54, 0.56, 0.53, 0.55, 0.54, 0.38, 0.36]] },
      "Cart S$60+": { share: 0.38, rates: [
        [0.60, 0.61, 0.60, 0.60, 0.61, 0.60, 0.61, 0.60],
        [0.30, 0.29, 0.30, 0.31, 0.30, 0.30, 0.29, 0.30],
        [0.70, 0.71, 0.70, 0.69, 0.70, 0.71, 0.70, 0.70],
        [0.84, 0.85, 0.84, 0.85, 0.84, 0.85, 0.84, 0.85],
        [0.86, 0.87, 0.85, 0.86, 0.87, 0.86, 0.86, 0.85]] }
    },
    // What the customer sees at each step (used to explain a drop).
    stepNotes: ["", "Product pages", "Cart", "Checkout start", "Delivery options", "The S$10 delivery fee for carts under S$60 is added to the total on this step"]
  };

  // Campaign visits and orders by pickup area (aggregated, last 4 weeks).
  const AREA_VISITS = {
    "PG-01": [520, 61], "SK-01": [410, 19], "TM-01": [640, 22], "BD-01": [180, 15], "TP-01": [300, 31],
    "AM-01": [350, 29], "JW-01": [560, 14], "BP-01": [260, 27], "WL-01": [470, 12], "QT-01": [240, 23]
  };
  // Share of surveyed households in each area who know there's a pickup near them (demo).
  const AREA_AWARE = { "PG-01": 0.71, "SK-01": 0.32, "TM-01": 0.55, "BD-01": 0.48, "TP-01": 0.66, "AM-01": 0.5, "JW-01": 0.27, "BP-01": 0.62, "WL-01": 0.24, "QT-01": 0.58 };

  const FEEDBACK = [
    ["Review", "Super fresh nai bai, still crunchy after 5 days in the fridge", 5],
    ["Review", "Kai lan was fresh but a bit pricey compared to the supermarket", 3],
    ["Complaint", "Pickup time 7-9pm on Tuesday is too late for us with kids", 2],
    ["Social", "Love that it's grown in Singapore! Where can I collect in Woodlands?", 4],
    ["Enquiry", "Is there a pickup on weekends? Weekday evenings don't work", 3],
    ["Review", "Mesclun mix was wilted on arrival", 1],
    ["Complaint", "Delivery fee of $10 for a small order is too much", 2],
    ["Social", "Made the garlic stir fry recipe, kids finished everything", 5],
    ["Enquiry", "How do I cook tuscan kale? Never tried it", 3],
    ["Review", "Fresh and tasty, will order again", 5],
    ["Complaint", "Missed the pickup window and the leader had already left", 2],
    ["Social", "Wish the minimum for free delivery was lower, I only need a few veg", 2],
    ["Review", "Xiao bai cai is sweet, my favourite", 5],
    ["Enquiry", "Can I collect on Saturday morning instead of Thursday night?", 3],
    ["Review", "Too much plastic packaging", 2],
    ["Social", "Cheaper at the wet market but this lasts longer", 3],
    ["Complaint", "Leader's block is far from my flat, pickup isn't convenient", 2],
    ["Review", "Nai bai crunchy and fresh, worth the price", 5],
    ["Enquiry", "Do you have recipes for kai lan that kids like?", 3],
    ["Social", "Pickup timing clashes with work, wish there were more slots", 2],
    ["Review", "Packaging could be less plastic", 3],
    ["Complaint", "Yellow leaves in my choy sum", 1],
    ["Review", "Great value with the group buy, no delivery fee", 5],
    ["Social", "Didn't know there was a pickup near me in Jurong!", 4]
  ].map(([source, text, rating], i) => ({ id: "F-" + (100 + i), source, text, rating }));

  const THEMES = [
    { id: "pickup", label: "Pickup convenience", re: /pickup|collect|window|slot|timing|weekend|weekday|far from|clash/i, barrier: true,
      action: "Treat this as a growth barrier, not an advertising problem: test a weekend or earlier pickup slot with one leader before spending more on ads." },
    { id: "fee", label: "Delivery fee & minimum", re: /delivery fee|minimum|\$10|free delivery|small order/i, barrier: true,
      action: "Show group-buy pickup as the no-fee option before checkout, and test a farm bundle that reaches the free-delivery threshold." },
    { id: "fresh", label: "Freshness & quality", re: /fresh|crunchy|wilted|yellow|lasts|tasty|sweet/i, barrier: false,
      action: "Freshness is the strongest reason people buy. Lead campaigns with it; trace any quality complaint to its harvest batch." },
    { id: "price", label: "Price & value", re: /price|pricey|cheap|expensive|value|worth|wet market|supermarket/i, barrier: true,
      action: "Compete on value (fresher, lasts longer, no delivery fee via pickup), not on the lowest price per item." },
    { id: "cook", label: "Knowing how to cook it", re: /how do i cook|how to cook|recipe|never tried|kids like|kids finished/i, barrier: true,
      action: "Recipes work: add one to every unfamiliar crop's page and post." },
    { id: "pack", label: "Packaging", re: /plastic|packaging/i, barrier: false,
      action: "Ask MEOD whether a lower-plastic pack is possible for pickup orders." },
    { id: "aware", label: "Didn't know about pickup", re: /didn't know|where can i collect|near me/i, barrier: true,
      action: "Awareness gap: leaders and pickup pages, not more product ads." }
  ];
  const POS = /fresh|crunchy|love|great|tasty|sweet|favourite|worth|finished|lasts|good|value/i;
  const NEG = /wilted|yellow|too much|too late|pricey|missed|far|clash|doesn't|don't work|isn't|wish|plastic|expensive/i;

  // Crops MEOD could grow next, with interest vs real reservations (pay at collection).
  const NEW_CROPS = [
    { id: "bayam", name: "Red Bayam", zh: "红苋菜", interest: 46, reserved: 19, kgPerHH: 0.35, price: 1300, cost: 750, weeksToHarvest: 4, img: "" },
    { id: "spinach", name: "Baby Spinach", zh: "嫩菠菜", interest: 61, reserved: 9, kgPerHH: 0.25, price: 2600, cost: 1700, weeksToHarvest: 5, img: "" },
    { id: "kangkong", name: "Kangkong", zh: "空心菜", interest: 22, reserved: 14, kgPerHH: 0.4, price: 1000, cost: 600, weeksToHarvest: 3, img: "" }
  ];

  // Topic interest (search/social index, 8 weeks) and whether recipe-link orders moved with it.
  const TRENDS = [
    { topic: "Quick weekday recipes", season: "All year", idx: [40, 42, 41, 45, 52, 56, 61, 66], buys: [12, 13, 12, 14, 17, 18, 20, 22], crops: ["nai-bai", "xiao-bai-cai"] },
    { topic: "Soups for rainy days", season: "Nov–Jan monsoon", idx: [20, 22, 25, 30, 36, 41, 47, 52], buys: [6, 6, 7, 7, 8, 8, 9, 9], crops: ["xiao-bai-cai", "tuscan-kale"] },
    { topic: "Kids' lunchbox veg", season: "School term", idx: [35, 34, 36, 35, 33, 34, 35, 34], buys: [8, 8, 9, 8, 8, 9, 8, 9], crops: ["xiao-bai-cai"] },
    { topic: "Chinese New Year greens", season: "Jan–Feb", idx: [5, 5, 6, 7, 9, 12, 15, 19], buys: [0, 0, 0, 0, 0, 0, 1, 1], crops: ["kai-lan", "choy-sum"] },
    { topic: "Salad bowls", season: "Mid-year", idx: [48, 46, 44, 41, 37, 35, 32, 30], buys: [11, 11, 10, 10, 9, 9, 8, 8], crops: ["mesclun"] }
  ];

  // Possible partners. Pseudonymous; no follower counts are invented. Past results only where recorded.
  const PARTNERS = [
    { name: "Home-cook creator A", type: "Creator", topics: ["Quick weekday recipes", "Chinese home cooking"], areas: ["PG-01", "SK-01"], langs: "EN · 中文", past: null },
    { name: "Punggol residents' network", type: "Community", topics: ["Neighbourhood events"], areas: ["PG-01"], langs: "EN", past: { campaign: "C-104", newBuyers: 38, repeat: 0.63 } },
    { name: "Parents' group B (Jurong)", type: "Community", topics: ["Kids' lunchbox veg", "Quick weekday recipes"], areas: ["JW-01"], langs: "EN", past: null },
    { name: "Fitness creator C", type: "Creator", topics: ["Salad bowls"], areas: ["QT-01"], langs: "EN", past: null },
    { name: "Woodlands school eco club", type: "School", topics: ["Farm visits", "Kids' lunchbox veg"], areas: ["WL-01"], langs: "EN · BM", past: { campaign: "C-106", newBuyers: 9, repeat: 0.44 } },
    { name: "Soup-recipe creator D", type: "Creator", topics: ["Soups for rainy days"], areas: ["TM-01", "BD-01"], langs: "中文", past: null }
  ];

  // Six-month retention by acquisition channel: share of a cohort still buying in month 1..6.
  const COHORTS = {
    "Farm visit":        { n: 22, retention: [1, 0.68, 0.6, 0.55, 0.52, 0.5], ordersPerMonth: 2.6 },
    "WhatsApp (leader)": { n: 38, retention: [1, 0.74, 0.66, 0.6, 0.57, 0.55], ordersPerMonth: 3.4 },
    "Search (SEO)":      { n: 14, retention: [1, 0.6, 0.5, 0.44, 0.4, 0.38], ordersPerMonth: 2.2 },
    "Instagram":         { n: 97, retention: [1, 0.45, 0.33, 0.27, 0.24, 0.22], ordersPerMonth: 2.0 },
    "TikTok":            { n: 21, retention: [1, 0.3, 0.2, 0.15, 0.12, 0.1], ordersPerMonth: 1.8 },
    "Discount voucher":  { n: 52, retention: [1, 0.25, 0.15, 0.1, 0.08, 0.07], ordersPerMonth: 1.6 }
  };
  const AVG_ORDER = 2800, ORDER_MARGIN = 0.45;
  // Staff time to make each campaign's content, in cents (illustrative). Counted in acquisition cost.
  const CONTENT_COST = { Instagram: 30000, TikTok: 30000, "WhatsApp (leader)": 5000, "Search (SEO)": 40000, "Farm visit": 20000 };
  const acqCost = (k) => k.spend + (CONTENT_COST[k.channel] || 0) + k.discount;
  const channelOf = (k) => (k.theme === "Discount" ? "Discount voucher" : k.channel);

  /* ---------- 1. conversion & journey ---------- */

  function journey() {
    const out = [];
    Object.entries(JOURNEY.bands).forEach(([band, b]) => {
      b.rates.forEach((series, s) => {
        const prev = series.slice(0, -2), recent = series.slice(-2);
        const mean = M.avg(prev), sd = Math.sqrt(M.avg(prev.map((x) => (x - mean) ** 2))) || 0.005;
        const now = M.avg(recent), z = (now - mean) / sd, rel = (now - mean) / mean;
        if (Math.abs(z) > 3 && Math.abs(rel) > 0.1) out.push({ band, step: JOURNEY.steps[s + 1], from: JOURNEY.steps[s], mean, now, z, rel, note: JOURNEY.stepNotes[s + 1] });
      });
    });
    const latest = (b) => b.rates.map((r) => r[r.length - 1]);
    const lost = out.map((a) => {
      const b = JOURNEY.bands[a.band];
      const s = JOURNEY.steps.indexOf(a.step) - 1;
      const reach = JOURNEY.sessions[JOURNEY.sessions.length - 1] * b.share * b.rates.slice(0, s).reduce((p, r) => p * r[r.length - 1], 1);
      return { ...a, lostOrders: Math.round(reach * (a.mean - a.now)) };
    });
    return { anomalies: lost, latest: Object.fromEntries(Object.entries(JOURNEY.bands).map(([k, b]) => [k, latest(b)])) };
  }

  /* ---------- 2. neighbourhood opportunity finder ---------- */

  function opportunities() {
    return M.POINTS.map((p) => {
      const [visits, orders] = AREA_VISITS[p.id] || [0, 0];
      const conv = visits ? orders / visits : 0;
      const aware = AREA_AWARE[p.id] || 0;
      let kind, action;
      if (visits >= 400 && conv < 0.05 && aware < 0.4) { kind = "Interest, low awareness"; action = `Lots of campaign visits but few orders, and only ${M.pct(aware)} know the pickup exists. Test pickup awareness (leader posts, a pickup page, a poster at the block) before more product ads.`; }
      else if (visits >= 400 && conv < 0.05) { kind = "Interest, low conversion"; action = "People know about the pickup but don't buy. Check the feedback for this area (timing, distance, price) before spending more."; }
      else if (conv >= 0.08) { kind = "Converting well"; action = "Visits turn into orders. Worth more reach here if the pickup has room."; }
      else { kind = "Steady"; action = "No change."; }
      return { p, visits, orders, conv, aware, kind, action };
    }).sort((a, b) => b.visits * (0.1 - b.conv) - a.visits * (0.1 - a.conv));
  }

  /* ---------- delivery economics + promotion profitability ---------- */

  // Contribution of one order. mode: "pickup" | "home". All cents.
  function orderEconomics(subtotal, productCost, mode) {
    const D = DELIVERY;
    if (mode === "home") {
      const fee = subtotal >= D.freeFrom ? 0 : D.homeFee;
      const contribution = subtotal + fee - productCost - D.packCost - D.homeCost;
      return { customerPays: subtotal + fee, fee, deliveryCost: D.homeCost, leader: 0, contribution, margin: contribution / subtotal };
    }
    const drop = Math.round(D.dropCost / D.dropHouseholds);
    const leader = Math.round(subtotal * D.leaderRate);
    const contribution = subtotal - productCost - D.packCost - drop - leader;
    return { customerPays: subtotal, fee: 0, deliveryCost: drop, leader, contribution, margin: contribution / subtotal };
  }

  // A deterministic check of a proposed promotion, plus a ranked recommendation.
  function promoCheck({ normal, offer, cost }) {
    const R = M.rules();
    const floor = R.minMargin;
    const rows = ["pickup", "home"].flatMap((mode) => [
      { label: (mode === "pickup" ? "Group-buy pickup" : "Home delivery") + " · normal price", mode, price: normal },
      { label: (mode === "pickup" ? "Group-buy pickup" : "Home delivery") + " · offer price", mode, price: offer }
    // The cost entered already includes packing, so take packing back out before orderEconomics adds it.
    ]).map((r) => ({ ...r, e: orderEconomics(r.price, cost - DELIVERY.packCost, r.mode) }))
      .map((r) => ({ ...r, ok: r.e.margin >= floor }));
    const offerPickup = rows[1], offerHome = rows[3];
    let verdict;
    if (offerPickup.ok && !offerHome.ok) verdict = { tone: "good", text: `Test the ${M.money(offer)} offer through group-buy pickup only. It keeps a ${M.pct(offerPickup.e.margin)} margin there, but home delivery would fall to ${M.pct(offerHome.e.margin)}. Compare its extra sales with the normal-price offer before repeating it.` };
    else if (offerPickup.ok && offerHome.ok) verdict = { tone: "good", text: `The offer passes Margin Guard for both pickup and delivery. Test it, and measure whether buyers come back at the normal price.` };
    else verdict = { tone: "bad", text: `The offer breaks Margin Guard even with pickup (${M.pct(offerPickup.e.margin)} vs ${M.pct(floor)} floor). Try a smaller discount, a bundle that lifts basket value, or a non-price reason to buy (recipe, freshness).` };
    return { rows, verdict, floor };
  }

  // The promotion menu, each with its per-order economics and what evidence says about repeat buying.
  function promoMenu() {
    const cost = 700, base = 1200;
    const items = [
      { name: "Neighbourhood group deal", why: "Lower effective delivery cost", guard: "Consolidated drop-offs", price: base, mode: "pickup", repeat: 0.63, src: "C-104 group-buy cohort" },
      { name: "Weekly harvest bundle", why: "Easier to buy several vegetables", guard: "Bigger basket, planned packing", price: 1800, costOverride: 1050, mode: "pickup", repeat: 0.45, src: "Recipe-led cohorts" },
      { name: "First-order voucher (S$3 off, once)", why: "Lowers the risk of trying", guard: "One-time, capped", price: base - 300, mode: "pickup", repeat: 0.17, src: "C-102 discount cohort" },
      { name: "Loyalty rewards (5% back)", why: "Makes repeat buying worthwhile", guard: "Reward sized to margin", price: Math.round(base * 0.95), mode: "pickup", repeat: 0.5, src: "Assumed — no MEOD data yet" },
      { name: "Refer-a-neighbour (S$3 each)", why: "Neighbours recruit neighbours", guard: "Paid only after a qualifying purchase", price: base - 300, mode: "pickup", repeat: 0.55, src: "Leader-led cohorts" },
      { name: "Harvest pre-order", why: "First access to fresh harvest", guard: "Demand confirmed before harvest", price: base, mode: "pickup", repeat: 0.45, src: "Pre-order buyers" },
      { name: "Surprise Harvest Bag", why: "Value and discovery", guard: "Only approved saleable surplus", price: 1000, costOverride: 450, mode: "pickup", repeat: 0.35, src: "Assumed — no MEOD data yet" },
      { name: "Free home delivery on S$20+", why: "Shopee-style convenience", guard: "None: MEOD absorbs the courier", price: 2000, costOverride: 1170, mode: "home-free", repeat: 0.3, src: "Assumed — no MEOD data yet" }
    ];
    return items.map((it) => {
      const c = it.costOverride || cost;
      let e;
      if (it.mode === "home-free") { const contribution = it.price - c - DELIVERY.packCost - DELIVERY.homeCost; e = { contribution, margin: contribution / it.price }; }
      else e = orderEconomics(it.price, c, it.mode);
      // Value over 6 months: this order plus expected repeat orders at the normal margin.
      const sixMonth = e.contribution + it.repeat * 6 * Math.max(0, orderEconomics(base, cost, "pickup").contribution);
      return { ...it, e, ok: e.margin >= M.rules().minMargin, sixMonth: Math.round(sixMonth) };
    }).sort((a, b) => (b.ok - a.ok) || (b.sixMonth - a.sixMonth));
  }

  /* ---------- 3. basket builder ---------- */

  function basket({ size, liked, mode }) {
    const promotable = M.featuredCrops();
    const perKg = { 2: 0.6, 4: 1.1, 6: 1.6 }[size] || 1.1; // kg of greens a week for the household
    const picks = [];
    liked.map(M.crop).filter((c) => c && promotable.includes(c)).forEach((c) => picks.push(c));
    M.recommendFor(liked).forEach((r) => { if (picks.length < 3 && !picks.includes(r.c)) picks.push(r.c); });
    promotable.forEach((c) => { if (picks.length < 3 && !picks.includes(c)) picks.push(c); });
    const share = perKg / picks.length;
    const lines = picks.map((c) => {
      const grams = Math.max(250, Math.round((share * 1000) / 250) * 250);
      return { c, grams, cents: Math.round((c.price * grams) / 1000), cost: Math.round((c.cost * grams) / 1000), recipe: M.RECIPES.find((r) => r.crop === c.id) };
    });
    const subtotal = M.sum(lines.map((l) => l.cents)), cost = M.sum(lines.map((l) => l.cost));
    const e = orderEconomics(subtotal, cost, mode);
    const gap = mode === "home" && subtotal < DELIVERY.freeFrom ? DELIVERY.freeFrom - subtotal : 0;
    return { lines, subtotal, e, gap };
  }

  // Farm-approved bundles: two to three promotable crops, priced 10% under buying separately,
  // shown only if the bundle still passes Margin Guard with pickup.
  function bundles() {
    const list = M.featuredCrops();
    const out = [];
    for (let i = 0; i < list.length && out.length < 2; i++) {
      const a = list[i], b = list[(i + 1) % list.length];
      if (a === b) continue;
      const items = [a, b].map((c) => ({ c, grams: 500 }));
      const full = M.sum(items.map((x) => Math.round(x.c.price / 2)));
      const price = Math.round((full * 0.9) / 10) * 10;
      const cost = M.sum(items.map((x) => Math.round(x.c.cost / 2)));
      const e = orderEconomics(price, cost, "pickup");
      if (e.margin >= M.rules().minMargin) out.push({ name: `${a.name} + ${b.name} bundle`, items, full, price, e });
    }
    return out;
  }

  /* ---------- 4. replenishment ---------- */

  const DAYS = ["Tue", "Thu", "Sat"];
  function usualDay(cu) { return DAYS[Number(cu.id.slice(3)) % 3]; }
  // Their usual crop if it's promotable this week, otherwise the closest promotable alternative.
  function pickFor(id) {
    const c = M.crop(id), promo = M.featuredCrops();
    return promo.includes(c) ? c : ((M.recommendFor([id])[0] || {}).c || promo[0]);
  }
  function replenishment() {
    return M.CUSTOMERS.map((cu) => {
      const due = cu.interval - cu.lastDays;
      return { cu, due, day: usualDay(cu) };
    }).filter((x) => x.cu.orders >= 3 && x.due >= -1 && x.due <= 3)
      .sort((a, b) => a.due - b.due)
      .map((x) => ({ ...x,
        when: `${x.day === "Tue" ? "Sun" : x.day === "Thu" ? "Tue" : "Thu"} evening, before the 10pm cutoff for ${x.day}`,
        action: x.cu.consent ? `Reminder with this week's ${pickFor(x.cu.crop).name} and their usual ${x.cu.point ? "pickup" : "delivery"} day.` : "No consent: no reminder. Their leader's normal group post covers it." }));
  }

  /* ---------- 5. feedback intelligence ---------- */

  function sentiment(text, rating) {
    const p = (text.match(new RegExp(POS.source, "gi")) || []).length;
    const n = (text.match(new RegExp(NEG.source, "gi")) || []).length;
    const lex = p - n;
    const r = rating ? (rating - 3) / 2 : 0;
    const s = Math.max(-1, Math.min(1, lex * 0.4 + r * 0.6));
    return s > 0.2 ? "Positive" : s < -0.2 ? "Negative" : "Mixed";
  }

  function feedback(extra) {
    const items = FEEDBACK.concat(extra || []).map((f) => ({ ...f, sentiment: sentiment(f.text, f.rating) }));
    const themes = THEMES.map((t) => {
      const hits = items.filter((f) => t.re.test(f.text));
      const neg = hits.filter((f) => f.sentiment === "Negative").length;
      const pos = hits.filter((f) => f.sentiment === "Positive").length;
      return { ...t, hits, neg, pos, count: hits.length };
    }).filter((t) => t.count).sort((a, b) => (b.barrier && b.neg) - (a.barrier && a.neg) || b.neg - a.neg || b.count - a.count);
    const topBarrier = themes.find((t) => t.barrier && t.neg >= 2);
    const summary = topBarrier
      ? `${topBarrier.label} comes up in ${topBarrier.count} of ${items.length} pieces of feedback, ${topBarrier.neg} of them negative. ${topBarrier.action}`
      : "No single barrier stands out yet.";
    return { items, themes, summary };
  }

  /* ---------- 6. new crop demand tester ---------- */

  function newCropRead(nc, extraInterest, extraReserved) {
    const interest = nc.interest + (extraInterest || 0), reserved = nc.reserved + (extraReserved || 0);
    const conv = interest ? reserved / interest : 0;
    const kg = Math.round(reserved * nc.kgPerHH * 10) / 10;
    const minKg = 6;
    const m = (nc.price - nc.cost) / nc.price;
    let verdict;
    if (m < M.rules().minMargin) verdict = { tone: "bad", label: "Margin too thin", text: "Even full reservations wouldn't meet Margin Guard at this price." };
    else if (conv < 0.2) verdict = { tone: "warn", label: "Interest isn't converting", text: `Only ${M.pct(conv)} of interested households reserved. Find out why (price, familiarity) before planting.` };
    else if (kg >= minKg) verdict = { tone: "good", label: "Run a small trial", text: `${reserved} households have reserved about ${kg} kg/week. That's enough for one small trial bed (${nc.weeksToHarvest} weeks to harvest), sized to reservations, not interest.` };
    else verdict = { tone: "neutral", label: "Promising — keep taking reservations", text: `${M.pct(conv)} of interested households reserved, but ${kg} kg/week is under the ${minKg} kg minimum for a trial bed.` };
    return { interest, reserved, conv, kg, margin: m, verdict };
  }

  /* ---------- 7. subscription & retention designer ---------- */

  function subscriptions() {
    const steady = M.CUSTOMERS.filter((cu) => cu.orders >= 6 && cu.interval <= 14 && cu.lastDays / cu.interval < 1.5);
    const weekly = steady.filter((cu) => cu.interval <= 10), fortnightly = steady.filter((cu) => cu.interval > 10);
    const crops = M.featuredCrops().slice(0, 3);
    const box = (name, grams, freq) => {
      const each = Math.round(grams / crops.length / 50) * 50;
      const full = M.sum(crops.map((c) => Math.round((c.price * each) / 1000)));
      const price = Math.round((full * 0.95) / 50) * 50;
      const cost = M.sum(crops.map((c) => Math.round((c.cost * each) / 1000)));
      const e = orderEconomics(price, cost, "pickup");
      return { name, freq, grams, each, contents: crops.map((c) => c.name), full, price, e, ok: e.margin >= M.rules().minMargin };
    };
    const boxes = [box("Small weekly box", 750, "Weekly"), box("Family weekly box", 1500, "Weekly"), box("Fortnightly box", 1500, "Every 2 weeks")];
    const kg = (n, g) => Math.round((n * g) / 100) / 10;
    return {
      steady, weekly, fortnightly, boxes,
      demand: {
        low: kg(Math.round(weekly.length * 0.25), 750) + kg(Math.round(fortnightly.length * 0.25), 750),
        high: kg(Math.round(weekly.length * 0.4), 1500) + kg(Math.round(fortnightly.length * 0.4), 750)
      }
    };
  }

  /* ---------- 8. seasonal trend radar ---------- */

  function trends() {
    return TRENDS.map((t) => {
      const g = (a) => M.avg(a.slice(-4)) / Math.max(1, M.avg(a.slice(0, 4))) - 1;
      const search = g(t.idx), buys = t.buys.some((x) => x > 0) ? g(t.buys) : 0;
      let status;
      if (search > 0.2 && buys > 0.15) status = { tone: "good", label: "Supported by purchases", next: "Make it a campaign theme now." };
      else if (search > 0.2) status = { tone: "warn", label: "Candidate", next: "Test one small post or recipe; don't build a campaign on search alone." };
      else if (search < -0.15) status = { tone: "neutral", label: "Fading", next: "Ease off this theme." };
      else status = { tone: "neutral", label: "Steady", next: "Keep as an evergreen theme." };
      return { ...t, search, buysGrowth: buys, status };
    }).sort((a, b) => b.search - a.search);
  }

  /* ---------- 9. creator & community matcher ---------- */

  function partners() {
    const tr = trends();
    const rising = tr.filter((t) => t.search > 0.2).map((t) => t.topic);
    const room = M.POINTS.filter((p) => M.pointStatus(p).util < 0.75).map((p) => p.id);
    return PARTNERS.map((p) => {
      const topicFit = p.topics.filter((t) => rising.includes(t)).length ? 40 : p.topics.some((t) => tr.find((x) => x.topic === t)) ? 20 : 10;
      const areaFit = p.areas.filter((a) => room.includes(a)).length ? 30 : 10;
      const evidence = p.past ? Math.round(30 * Math.min(1, p.past.repeat / 0.6)) : 0;
      return { ...p, topicFit, areaFit, evidence, score: topicFit + areaFit + evidence,
        why: [`Topic fit ${topicFit}/40: ${p.topics.join(", ")}${p.topics.some((t) => rising.includes(t)) ? " (rising)" : ""}`,
          `Area fit ${areaFit}/30: ${p.areas.join(", ")}${p.areas.some((a) => room.includes(a)) ? " (pickup has room)" : " (pickups near capacity)"}`,
          p.past ? `Evidence ${evidence}/30: ${p.past.campaign} brought ${p.past.newBuyers} new buyers, ${M.pct(p.past.repeat)} came back` : "Evidence 0/30: no past results with MEOD yet, so start with a small paid test"] };
    }).sort((a, b) => b.score - a.score);
  }

  /* ---------- 12. lifetime value ---------- */

  function clv() {
    const cac = {};
    M.CAMPAIGNS.forEach((k) => { (cac[channelOf(k)] = cac[channelOf(k)] || []).push(acqCost(k) / Math.max(1, k.firstBuyers)); });
    return Object.entries(COHORTS).map(([ch, c]) => {
      const value = Math.round(M.sum(c.retention.map((r) => r * c.ordersPerMonth * AVG_ORDER * ORDER_MARGIN)));
      const acq = cac[ch] ? Math.round(M.avg(cac[ch])) : null;
      return { ch, ...c, value, cac: acq, ratio: acq ? value / acq : null, m6: c.retention[5] };
    }).sort((a, b) => b.value - a.value);
  }

  /* ---------- 10. marketing budget allocator ---------- */

  function allocate(budget) {
    const values = Object.fromEntries(clv().map((x) => [x.ch, x.value]));
    const ch = {};
    M.CAMPAIGNS.forEach((k) => {
      const key = channelOf(k);
      const x = ch[key] || (ch[key] = { ch: key, spend: 0, buyers: 0 });
      x.spend += acqCost(k); x.buyers += k.firstBuyers;
    });
    const list = Object.values(ch).map((x) => {
      const cpa = x.spend / Math.max(1, x.buyers);
      const value = values[x.ch] || 0;
      const proven = x.buyers >= 30;
      // Each extra dollar buys fewer customers as a channel saturates: cap at 3× past spend.
      return { ...x, cpa, value, proven, cap: x.spend * 3, roi: (value - cpa) / cpa, alloc: 0 };
    });
    const testCap = budget * 0.15, step = 500;
    let left = budget;
    while (left >= step) {
      const best = list.filter((x) => x.roi > 0 && x.alloc + step <= (x.proven ? x.cap : Math.min(x.cap, testCap)))
        .map((x) => ({ x, marginal: x.roi * Math.sqrt(1 - x.alloc / x.cap) }))
        .sort((a, b) => b.marginal - a.marginal)[0];
      if (!best) break;
      best.x.alloc += step; left -= step;
    }
    return { list: list.map((x) => {
      const buyers = x.alloc / x.cpa;
      const rel = 1.28 / Math.sqrt(Math.max(1, x.buyers));
      return { ...x, buyers: Math.round(buyers), lo: Math.max(0, Math.round(buyers * (1 - rel))), hi: Math.round(buyers * (1 + rel)) };
    }).sort((a, b) => b.alloc - a.alloc), unallocated: left };
  }

  /* ---------- 11. planting scenario simulator ---------- */

  function gauss(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Weekly outcome of growing `pct` more of a crop: 2,000 simulated weeks with demand and yield uncertainty.
  // Unsold kg is treated as lost (worst case); in practice some could go to Surprise Bags or clearance.
  function simulate(c, pct, runs) {
    const f = M.forecastRead(c);
    const latest = c.paid[c.paid.length - 1];
    const mid = f.fc ? f.mid : latest, sd = f.fc ? Math.max(1, (f.hi - f.lo) / 2.563) : latest * 0.2;
    const r = rng(1234 + Math.round(pct * 100));
    const N = runs || 2000, res = [];
    for (let i = 0; i < N; i++) {
      const demand = Math.max(0, mid + sd * gauss(r));
      const yieldF = Math.max(0.6, 1 + 0.1 * gauss(r));
      const grown = c.expected * (1 + pct) * yieldF;
      const available = Math.max(0, grown - M.committedKg(c));
      const sold = Math.min(demand, available), unsold = available - sold;
      const contribution = sold * (c.price - c.cost) - unsold * c.cost; // grown-but-unsold costs its growing cost
      res.push({ sold, unsold, contribution }); // kg × cents/kg = cents
    }
    const q = (k, p) => { const a = res.map((x) => x[k]).sort((x, y) => x - y); return a[Math.floor(p * (a.length - 1))]; };
    const mean = (k) => M.avg(res.map((x) => x[k]));
    return {
      pct, extraKg: Math.round(c.expected * pct),
      sold: mean("sold"), unsold: mean("unsold"),
      pWaste: res.filter((x) => x.unsold > c.expected * 0.1).length / N,
      contribution: Math.round(mean("contribution")), p10: Math.round(q("contribution", 0.1)), p90: Math.round(q("contribution", 0.9))
    };
  }

  function scenarios(c) {
    const base = simulate(c, 0);
    return [0, 0.1, 0.2, 0.3, 0.5].map((p) => {
      const s = p === 0 ? base : simulate(c, p);
      return { ...s, extraContribution: s.contribution - base.contribution, extraUnsold: s.unsold - base.unsold };
    });
  }

  Object.assign(M, {
    DELIVERY, JOURNEY, FEEDBACK, THEMES, NEW_CROPS, TRENDS, PARTNERS, COHORTS, AREA_VISITS,
    CONTENT_COST, journey, opportunities, orderEconomics, promoCheck, promoMenu, basket, bundles, replenishment,
    feedback, sentiment, newCropRead, subscriptions, trends, partners, clv, allocate, simulate, scenarios
  });
})();
