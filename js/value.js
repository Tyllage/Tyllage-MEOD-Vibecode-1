/* Tyllage Smart Value & Demand Engine. Answers "why would someone buy from us instead of the supermarket
   downstairs?" with numbers: like-for-like price checks, the real checkout total including fulfilment,
   offers that keep a contribution floor, rewards that must pay for themselves, and whether the savings
   strategy creates recurring demand worth growing for. Deterministic; prices and costs are placeholders
   until someone checks them. Loads after insights.js and extends window.TY. */
(function () {
  "use strict";
  const M = window.TY;
  const D = M.DELIVERY;

  /* ---------- demo data (placeholders until verified) ---------- */

  // Supermarket A/B stand in for the chains we check by hand (e.g. FairPrice, Sheng Siong).
  // No retailer price here has been checked: each needs a source and a date before it's shown as verified.
  const RETAILERS = [
    { id: "smA", name: "Supermarket A", kind: "Supermarket" },
    { id: "smB", name: "Supermarket B", kind: "Supermarket" },
    { id: "wet", name: "Wet market", kind: "Wet market stall" }
  ];
  // origin: "local" (Singapore-grown) or "imported". Only local listings are like-for-like with ours.
  const PRICE_BOOK = [
    { crop: "nai-bai", retailer: "smA", pack: 200, cents: 250, origin: "local", grade: "Hydroponic, bagged", promo: "" },
    { crop: "nai-bai", retailer: "smB", pack: 300, cents: 195, origin: "imported", grade: "Malaysia, bagged", promo: "2 for S$3.50" },
    { crop: "nai-bai", retailer: "wet", pack: 500, cents: 200, origin: "imported", grade: "Malaysia, loose", promo: "" },
    { crop: "kai-lan", retailer: "smA", pack: 200, cents: 295, origin: "local", grade: "Hydroponic, bagged", promo: "" },
    { crop: "kai-lan", retailer: "smB", pack: 300, cents: 220, origin: "imported", grade: "Malaysia, bagged", promo: "" },
    { crop: "kai-lan", retailer: "wet", pack: 500, cents: 250, origin: "imported", grade: "Malaysia, loose", promo: "" },
    { crop: "tuscan-kale", retailer: "smA", pack: 200, cents: 650, origin: "imported", grade: "Australia, bagged", promo: "" },
    { crop: "tuscan-kale", retailer: "smB", pack: 150, cents: 450, origin: "local", grade: "Vertical farm, bagged", promo: "" },
    { crop: "choy-sum", retailer: "smA", pack: 200, cents: 230, origin: "local", grade: "Hydroponic, bagged", promo: "" },
    { crop: "choy-sum", retailer: "smB", pack: 300, cents: 180, origin: "imported", grade: "Malaysia, bagged", promo: "" },
    { crop: "choy-sum", retailer: "wet", pack: 500, cents: 180, origin: "imported", grade: "Malaysia, loose", promo: "" },
    { crop: "xiao-bai-cai", retailer: "smA", pack: 200, cents: 195, origin: "local", grade: "Hydroponic, bagged", promo: "" },
    { crop: "xiao-bai-cai", retailer: "smB", pack: 250, cents: 260, origin: "local", grade: "Soil-grown, bagged", promo: "" },
    { crop: "xiao-bai-cai", retailer: "wet", pack: 500, cents: 160, origin: "imported", grade: "Malaysia, loose", promo: "" },
    { crop: "mesclun", retailer: "smA", pack: 100, cents: 350, origin: "local", grade: "Washed, boxed", promo: "" },
    { crop: "mesclun", retailer: "smB", pack: 125, cents: 420, origin: "imported", grade: "Australia, boxed", promo: "" }
  ];

  // How shoppers get their veg elsewhere. Online fees are placeholders until checked on each store's site.
  const RETAIL_WAYS = [
    { retailer: "smA", way: "In store", fee: 0, freeFrom: 0, note: "You travel and carry it home" },
    { retailer: "smA", way: "Online delivery", fee: 499, freeFrom: 7900, note: "Placeholder fee: check before use" },
    { retailer: "smB", way: "In store", fee: 0, freeFrom: 0, note: "You travel and carry it home" },
    { retailer: "smB", way: "Online delivery", fee: 600, freeFrom: 8000, note: "Placeholder fee: check before use" },
    { retailer: "wet", way: "In person", fee: 0, freeFrom: 0, note: "Early mornings; loose, weigh-your-own" }
  ];

  const PACK_G = 250;          // we sell greens in 250 g packs
  const PICKUP_MIN = 800;      // smallest basket a group-buy leader will pack (illustrative)
  const VOUCHER_MIN = 1000;    // hypothetical vouchers need a S$10 basket
  const VOUCHERS = [0, 200, 500];

  // Offer test: three propositions shown to similar audiences for 8 weeks (synthetic).
  // offerCost is what the offer itself cost us; adSpend is the media behind it. Cents.
  const ARMS = [
    { id: "A", name: "Cheaper basket", pitch: "S$1.50 off an approved weekly bundle when you collect from a group buy.", shown: 1200, clicks: 156, firstOrders: 42, repeaters: 15, adSpend: 18000, offerCost: 6300 },
    { id: "B", name: "Convenience", pitch: "Same basket every week, one tap to reorder, collect on your way home.", shown: 1200, clicks: 120, firstOrders: 30, repeaters: 16, adSpend: 18000, offerCost: 0 },
    { id: "C", name: "Loyalty", pitch: "Your 4th qualifying order is S$3 off. Every month.", shown: 1200, clicks: 108, firstOrders: 27, repeaters: 15, adSpend: 18000, offerCost: 4500 }
  ];

  // Orders that came through the savings checker, 6 weeks (synthetic). New = first-ever order.
  const SMART_WEEKS = { newOrders: [18, 22, 25, 27, 30, 32], repeatOrders: [6, 10, 15, 19, 24, 29], kgPerOrder: 1.1 };
  const CROP_MIX = { "nai-bai": 0.30, "kai-lan": 0.10, "tuscan-kale": 0.08, "choy-sum": 0.20, "xiao-bai-cai": 0.20, mesclun: 0.12 };

  // Reward test: customers offered the loyalty reward vs a holdout who weren't (synthetic, 8 weeks).
  const REWARD_TEST = { rewarded: { customers: 300, ordersPer: 3.4 }, holdout: { customers: 100, ordersPer: 2.7 }, avgOrder: 1800 };

  /* ---------- state ---------- */

  // Read state through st(): TY.reset() swaps the state object.
  function st() {
    const s = M.state;
    s.prices = s.prices || {};     // "crop|retailer" -> { cents, pack, checked, source }
    s.figures = s.figures || {};   // crop id -> { cost, price, gbPrice } in cents/kg
    s.orders = s.orders || [];     // demo orders placed on the consumer page
    s.reward = s.reward || { amount: 300, every: 4, min: 1500 };
    return s;
  }

  // Which offer this browser sees. Assigned once, kept so the test stays clean.
  function arm() {
    if (!st().arm) { st().arm = ARMS[Math.floor(Math.random() * ARMS.length)].id; M.save(); }
    return ARMS.find((a) => a.id === st().arm);
  }

  /* ---------- A. like-for-like price comparison ---------- */

  const per100 = (cents, grams) => (cents * 100) / grams;
  // Our pack price, rounded to 5 cents, from our own price per kg (or the figure entered in the hub).
  function ourPack(c) {
    const kg = (st().figures[c.id] && st().figures[c.id].price) || c.price;
    return { pack: PACK_G, cents: Math.round((kg * PACK_G) / 1000 / 5) * 5 };
  }

  function listings(cropId) {
    return PRICE_BOOK.filter((l) => !cropId || l.crop === cropId).map((l) => {
      const o = st().prices[l.crop + "|" + l.retailer];
      const x = o ? { ...l, ...o, verified: Boolean(o.checked && o.source) } : { ...l, checked: "", source: "", verified: false };
      return { ...x, per100: per100(x.cents, x.pack), retailerName: RETAILERS.find((r) => r.id === l.retailer).name };
    });
  }

  function compareCrop(c) {
    const ours = ourPack(c);
    const mine = per100(ours.cents, ours.pack);
    const rows = listings(c.id).map((l) => ({ ...l, like: l.origin === "local" && l.pack >= ours.pack * 0.4 && l.pack <= ours.pack * 2.5, diff: (mine - l.per100) / l.per100 }));
    const like = rows.filter((r) => r.like).sort((a, b) => a.per100 - b.per100)[0];
    const cheapest = rows.slice().sort((a, b) => a.per100 - b.per100)[0];
    let verdict;
    if (!like) verdict = { tone: "neutral", label: "No local match", text: `No Singapore-grown ${c.name} found to compare. Cheaper imported options exist.` };
    else if (like.diff <= -0.03) verdict = { tone: "good", label: "Cheaper", text: `${M.pct(-like.diff)} cheaper per 100 g than local ${c.name} at ${like.retailerName}.` };
    else if (like.diff < 0.03) verdict = { tone: "neutral", label: "About the same", text: `Within 3% of local ${c.name} at ${like.retailerName}.` };
    else verdict = { tone: "warn", label: "Pricier", text: `${M.pct(like.diff)} more per 100 g than local ${c.name} at ${like.retailerName}. Lead with a bundle or freshness, not price.` };
    return { c, ours, mine, rows, like, cheapest, verdict };
  }

  // Same grams of the same crops, priced at each retailer. Like-for-like (local) only; gaps are counted, not guessed.
  function basketCompare(lines) {
    const out = RETAILERS.map((r) => {
      let cents = 0, missing = 0, unverified = 0;
      lines.forEach((l) => {
        const hit = compareCrop(l.c).rows.filter((x) => x.retailer === r.id && x.like).sort((a, b) => a.per100 - b.per100)[0];
        if (!hit) { missing++; return; }
        if (!hit.verified) unverified++;
        cents += Math.round((hit.per100 * l.grams) / 100);
      });
      return { r, cents, missing, unverified, complete: missing === 0 };
    });
    return out;
  }

  // The whole basket, every way to buy it: same grams, like-for-like (local) only, with fees,
  // our voucher and bundle saving, any listed promotion, and when each price was checked.
  function fullCompare({ qty, voucher, promo }) {
    const lines = basketLines(qty);
    if (!lines.length) return { rows: [], lines };
    const ours = ["pickup", "home"].map((mode) => {
      const co = checkout({ qty, mode, voucher, promo });
      return { who: "Tyllage", way: mode === "pickup" ? "Group-buy pickup" : "Home delivery", veg: co.subtotal, savings: co.bundleOff + co.voucherOff + co.promoOff,
        savingsNote: [co.bundleOff ? "bundle" : "", co.voucherOff ? "voucher (hypothetical)" : "", co.promoOff ? "campaign offer" : ""].filter(Boolean).join(" + ") || "None",
        fee: co.fee, total: co.total, complete: true, checked: "Today", ours: true, note: mode === "pickup" ? "Collect from your leader" : M.OFFERS.deliveryDays };
    });
    const theirs = RETAIL_WAYS.map((w) => {
      let veg = 0, missing = 0, unverified = 0;
      const dates = [], promos = [];
      lines.forEach((l) => {
        const hit = listings(l.c.id).filter((x) => x.retailer === w.retailer && x.origin === "local").sort((a, b) => a.per100 - b.per100)[0];
        if (!hit) { missing++; return; }
        veg += Math.round((hit.per100 * l.grams) / 100);
        if (hit.verified) dates.push(hit.checked); else unverified++;
        if (hit.promo) promos.push(hit.promo);
      });
      const fee = w.fee && veg < w.freeFrom ? w.fee : 0;
      return { who: RETAILERS.find((r) => r.id === w.retailer).name, way: w.way, veg, savings: 0, savingsNote: promos.join(", ") || "None listed", fee,
        total: veg + fee, complete: missing === 0, missing, checked: unverified ? "Not checked" : dates.sort()[0] || "Not checked", note: w.note };
    });
    const rows = ours.concat(theirs).sort((a, b) => (b.complete - a.complete) || (a.total - b.total));
    return { rows, lines, cheapest: rows.find((r) => r.complete) };
  }

  /* ---------- the real checkout total ---------- */

  function basketLines(qty) {
    return Object.entries(qty).filter(([, n]) => n > 0).map(([id, n]) => {
      const c = M.crop(id), p = ourPack(c);
      const kgCost = (st().figures[id] && st().figures[id].cost) || c.cost;
      return { c, packs: n, grams: n * PACK_G, cents: n * p.cents, cost: Math.round((kgCost * n * PACK_G) / 1000) };
    });
  }

  // Bundle saving applies when the basket holds both crops of an approved bundle (2 packs each).
  function bundleSaving(qty) {
    return M.bundles().filter((b) => b.items.every((x) => (qty[x.c.id] || 0) >= x.grams / PACK_G))
      .map((b) => ({ name: b.name, cents: b.full - b.price }));
  }

  // promo: a campaign offer { cents, label, pickupOnly } on top of any voucher.
  function checkout({ qty, mode, voucher, promo }) {
    const lines = basketLines(qty);
    const subtotal = M.sum(lines.map((l) => l.cents));
    const bundles = bundleSaving(qty);
    const bundleOff = M.sum(bundles.map((b) => b.cents));
    const goods = subtotal - bundleOff;
    const fee = mode === "home" && goods > 0 && goods < D.freeFrom ? D.homeFee : 0;
    const voucherOk = voucher > 0 && goods >= VOUCHER_MIN;
    const voucherOff = voucherOk ? Math.min(voucher, goods) : 0;
    const pickupOk = mode !== "pickup" || goods >= PICKUP_MIN;
    const promoOff = promo && promo.cents && (!promo.pickupOnly || mode === "pickup") ? Math.min(promo.cents, goods - voucherOff) : 0;
    const total = Math.max(0, goods + fee - voucherOff - promoOff);
    const e = M.orderEconomics(goods - voucherOff - promoOff, M.sum(lines.map((l) => l.cost)), mode === "home" ? "home" : "pickup");
    return { lines, subtotal, bundles, bundleOff, goods, fee, voucher, voucherOk, voucherOff, promo, promoOff, pickupOk, total, e,
      gap: mode === "home" && goods < D.freeFrom ? D.freeFrom - goods : 0 };
  }

  /* ---------- C. smart fulfilment ---------- */

  function fulfilment({ qty, postal, voucher, promo }) {
    const pick = checkout({ qty, mode: "pickup", voucher, promo });
    const home = checkout({ qty, mode: "home", voucher, promo });
    const near = postal ? M.nearestPoints(postal, 3) : null;
    const R = M.rules();
    const point = near ? near.find((p) => p.km <= R.nearPointKm && M.pointStatus(p).util <= 0.95) : null;
    const options = [
      { id: "pickup", label: "Group-buy pickup", total: pick.total,
        ok: pick.pickupOk && (!near || Boolean(point)),
        detail: !pick.pickupOk ? `Leaders pack baskets from ${M.money(PICKUP_MIN)}.` : point ? `${point.area}, ${point.day} ${point.window} (~${point.km.toFixed(1)} km)` : near ? `No pickup with space within ${R.nearPointKm} km yet.` : "Enter a postal code to find your nearest pickup." },
      { id: "home", label: "Home delivery", total: home.total, ok: home.goods > 0,
        detail: home.fee ? `${M.money(home.fee)} delivery below ${M.money(D.freeFrom)}, ${M.OFFERS.deliveryDays}.` : `Free delivery, ${M.OFFERS.deliveryDays}.` }
    ];
    let best, why;
    if (options[0].ok) { best = "pickup"; why = home.fee ? `Pickup saves you ${M.money(home.total - pick.total)} on this basket.` : "Both are free for this basket; pickup is greener and helps your neighbourhood group grow."; }
    else if (home.gap && home.gap <= 800) { best = "home"; why = `You're ${M.money(home.gap)} from free delivery. Only top up with greens you'll actually use this week.`; }
    else { best = "home"; why = home.fee ? `The ${M.money(home.fee)} delivery fee is a big share of a small basket. A nearby pickup would remove it.` : "Free delivery applies."; }
    return { options, best, why, point, near, pick, home };
  }

  /* ---------- B. offer & bundle optimiser (all deterministic) ---------- */

  // Waterfall for one order. price/cost/discount in cents.
  function unitEconomics({ price, cost, mode, discount }) {
    const pay = price - (discount || 0);
    const e = M.orderEconomics(pay, cost, mode);
    const fulfil = mode === "home" ? e.deliveryCost - e.fee : e.deliveryCost + e.leader;
    return {
      rows: [
        { label: "Retail price", cents: price },
        { label: "Production and packing", cents: -(cost + D.packCost) },
        { label: mode === "home" ? "Home delivery (net of fee)" : "Group-buy drop + leader commission", cents: -fulfil },
        { label: "Promotional discount", cents: -(discount || 0) },
        { label: "Remaining contribution", cents: e.contribution, total: true }
      ],
      contribution: e.contribution, margin: pay ? e.contribution / pay : 0, pay
    };
  }

  // Lowest price that still keeps the contribution floor. Closed form, no guessing.
  function priceFloor(cost, mode) {
    const m = M.rules().minMargin;
    if (mode === "home") return Math.ceil((cost + D.packCost + D.homeCost - D.homeFee) / (1 - m));
    return Math.ceil((cost + D.packCost + Math.round(D.dropCost / D.dropHouseholds)) / (1 - D.leaderRate - m));
  }

  // Candidate offers for one bundle. repeat = share of buyers who came back (evidence or stated assumption).
  function offerOptions({ price, cost }) {
    const R = M.rules();
    const normal = M.orderEconomics(price, cost, "pickup").contribution;
    const list = [
      { id: "none", name: "No offer, pickup at normal price", discount: 0, perOrderCost: 0, repeat: 0.45, src: "Recipe-led cohorts", cap: "—" },
      { id: "first2", name: "First order S$2 off (once)", discount: 200, repeat: 0.30, src: "Assumed between C-102 and recipe cohorts", cap: "Once per household, 100 a month" },
      { id: "first5", name: "First order S$5 off (once)", discount: 500, repeat: 0.17, src: "C-102 discount cohort", cap: "Once per household, 50 a month" },
      { id: "bundle", name: "Approved bundle, 10% off", discount: Math.round(price * 0.1), repeat: 0.45, src: "Recipe-led cohorts", cap: "Spare harvest only" },
      { id: "collect", name: "S$1 off at a collection point", discount: 100, repeat: 0.55, src: "Leader-led cohorts", cap: "Pickups with spare capacity" },
      { id: "loyalty", name: "Loyalty: S$3 off every 4th order", discount: 75, repeat: 0.56, src: "Offer test arm C", cap: "Qualifying orders S$15+" }
    ];
    return list.map((o) => {
      const e = M.orderEconomics(price - o.discount, cost, "pickup");
      const ok = (price - o.discount) > 0 && e.contribution / (price - o.discount) >= R.minMargin;
      // First-order offers cost once; repeat orders are at the normal price. Loyalty is spread over every order.
      const repeatValue = o.repeat * 6 * (o.id === "loyalty" ? M.orderEconomics(price - o.discount, cost, "pickup").contribution : normal);
      return { ...o, pay: price - o.discount, e, ok, sixMonth: Math.round(e.contribution + repeatValue) };
    }).sort((a, b) => (b.ok - a.ok) || (b.sixMonth - a.sixMonth));
  }

  // The figures we need for the top five vegetables. Hub entries override the demo values.
  function figures() {
    return M.CROPS.slice(0, 6).map((c) => {
      const f = st().figures[c.id] || {};
      const cost = f.cost || c.cost, price = f.price || c.price, gbPrice = f.gbPrice || Math.round(c.price * 0.95);
      const floorKg = priceFloor(cost, "pickup");
      return { c, cost, price, gbPrice, entered: Boolean(st().figures[c.id]), floorKg,
        pickupMargin: M.orderEconomics(gbPrice, cost, "pickup").contribution / gbPrice };
    });
  }

  /* ---------- offer test (A / B / C) ---------- */

  function experiment() {
    const ev = M.state.events;
    const firstOrderContribution = M.orderEconomics(REWARD_TEST.avgOrder, Math.round(REWARD_TEST.avgOrder * 0.55), "pickup").contribution;
    const rows = ARMS.map((a) => {
      const views = ev.filter((e) => e.type === "offer_view" && e.detail === a.id).length;
      const clicks = ev.filter((e) => e.type === "offer_click" && e.detail === a.id).length;
      const mine = st().orders.filter((o) => o.arm === a.id);
      const firstOrders = a.firstOrders + (mine.length ? 1 : 0);
      const repeaters = a.repeaters + (mine.length > 1 ? 1 : 0);
      const cac = Math.round((a.adSpend + a.offerCost) / firstOrders);
      const repeatRate = repeaters / firstOrders;
      // 8-week value per acquired customer: first order + about 3 repeat orders for those who came back.
      const value = Math.round(firstOrderContribution + repeatRate * 3 * firstOrderContribution - a.offerCost / firstOrders);
      return { ...a, shown: a.shown + views, clicks: a.clicks + clicks, firstOrders, repeaters, ctr: (a.clicks + clicks) / (a.shown + views), conv: firstOrders / (a.clicks + clicks), repeatRate, cac, value, net: value - Math.round(a.adSpend / firstOrders) };
    });
    const best = rows.slice().sort((a, b) => b.net - a.net)[0];
    const cheap = rows.find((r) => r.id === "A");
    const test = M.compare(best.repeaters, best.firstOrders, cheap.repeaters, cheap.firstOrders);
    return { rows, best, test };
  }

  /* ---------- D. habits & rewards ---------- */

  function rewardCheck(reward) {
    const r = reward || st().reward;
    const T = REWARD_TEST;
    const contrib = M.orderEconomics(T.avgOrder, Math.round(T.avgOrder * 0.55), "pickup").contribution;
    const extraOrders = (T.rewarded.ordersPer - T.holdout.ordersPer) * T.rewarded.customers;
    // On average one reward per `every` orders placed by rewarded customers.
    const rewardsPaid = Math.round((T.rewarded.ordersPer / r.every) * T.rewarded.customers);
    const rewardCost = rewardsPaid * r.amount;
    const net = Math.round(extraOrders * contrib - rewardCost);
    const perOrder = r.amount / r.every;
    const breakEven = Math.ceil(rewardCost / contrib);
    return { r, contrib, extraOrders: Math.round(extraOrders), rewardsPaid, rewardCost, net, perOrder, breakEven,
      verdict: net > 0 ? { tone: "good", text: `Profitable: the reward brought about ${Math.round(extraOrders)} extra orders, worth ${M.money(Math.round(extraOrders * contrib))} in contribution, for ${M.money(rewardCost)} in rewards.` }
        : { tone: "bad", text: `Not paying for itself: rewards cost ${M.money(rewardCost)} but extra orders only added ${M.money(Math.round(extraOrders * contrib))}. Make it smaller or rarer.` } };
  }

  // Loyalty progress for this browser's demo orders.
  function loyalty() {
    const r = st().reward;
    const qualifying = st().orders.filter((o) => o.goods >= r.min).length;
    const toNext = r.every - (qualifying % r.every); // orders until the rewarded one, inclusive
    return { qualifying, toNext, rewardNow: toNext === 1, r };
  }

  /* ---------- E. demand-backed production ---------- */

  function smartDemand() {
    const W = SMART_WEEKS;
    const mineNew = st().orders.filter((o) => !o.repeat).length, mineRep = st().orders.filter((o) => o.repeat).length;
    const newO = W.newOrders.slice(), rep = W.repeatOrders.slice();
    newO[newO.length - 1] += mineNew; rep[rep.length - 1] += mineRep;
    const total = newO.map((n, i) => n + rep[i]);
    const crops = M.CROPS.map((c) => {
      const recurring = rep.map((n) => +(n * W.kgPerOrder * CROP_MIX[c.id]).toFixed(1));
      const all = total.map((n) => +(n * W.kgPerOrder * CROP_MIX[c.id]).toFixed(1));
      const rises = recurring.slice(-4).filter((kg, i, a) => i === 0 || kg > a[i - 1]).length - 1;
      const growth = recurring[recurring.length - 1] - recurring[recurring.length - 5];
      const supply = M.uncommittedKg(c);
      const latestPaid = c.paid[c.paid.length - 1] || 0;
      const headroom = supply - latestPaid;
      const next4 = +(growth).toFixed(1); // same growth again over the next 4 weeks
      let signal;
      if (M.margin(c) < M.rules().minMargin) signal = { tone: "bad", label: "Fix margin first", text: `Each kg earns ${M.pct(M.margin(c))}, under the ${M.pct(M.rules().minMargin)} floor. More orders would grow the loss.` };
      else if (rises >= 3 && next4 > headroom) signal = { tone: "good", label: "Investigate growing more", text: headroom > 0
        ? `Recurring orders rose ${rises} weeks running. Another +${next4} kg in 4 weeks would pass the ${headroom} kg of spare supply.`
        : `Recurring orders rose ${rises} weeks running and paid demand already uses all spare supply.` };
      else if (rises >= 3) signal = { tone: "neutral", label: "Growing, supply OK", text: `Recurring demand is rising but ${headroom} kg of spare supply covers it for now.` };
      else signal = { tone: "neutral", label: "Watch", text: "Not a steady rise in repeat orders yet." };
      return { c, recurring, all, rises, growth, headroom, signal };
    });
    const repShare = rep[rep.length - 1] / total[total.length - 1];
    return { newO, rep, total, repShare, crops };
  }

  function placeOrder({ qty, mode, voucher, repeat, campaign, promo }) {
    const co = checkout({ qty, mode, voucher, promo });
    if (!co.goods) return null;
    const order = { id: "DEMO-" + String(st().orders.length + 1).padStart(3, "0"), qty: { ...qty }, mode, voucher: co.voucherOff + co.promoOff, goods: co.goods, total: co.total, repeat: Boolean(repeat), arm: arm().id, campaign: campaign || "", at: new Date().toISOString() };
    st().orders.push(order);
    M.save();
    M.track(repeat ? "order_repeat" : "order", order.id);
    return order;
  }

  Object.assign(M, {
    RETAILERS, RETAIL_WAYS, PRICE_BOOK, fullCompare, PACK_G, PICKUP_MIN, VOUCHER_MIN, VOUCHERS, ARMS, SMART_WEEKS, REWARD_TEST,
    arm, ourPack, listings, compareCrop, basketCompare, basketLines, checkout, fulfilment, unitEconomics, priceFloor,
    st, offerOptions, figures, experiment, rewardCheck, loyalty, smartDemand, placeOrder
  });
})();
