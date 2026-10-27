/* The one scenario that has to work end to end: "we want more customers for Nai Bai".
   Pick the crop → choose a segment and an offer → customers find the campaign and buy →
   measure orders, repeats and profit → decide whether demand justifies growing more.
   Campaign results are a synthetic baseline plus every demo order this browser places through
   the campaign link, so the numbers move when you try it. Loads after loop.js; extends window.TY. */
(function () {
  "use strict";
  const M = window.TY;

  const CODE = "NAIBAI-WEEK";
  const CROP = "nai-bai";
  const BASKET = { "nai-bai": 2, "xiao-bai-cai": 2 };   // 500 g Nai Bai + 500 g Xiao Bai Cai
  // Two weeks of a past run of this campaign (synthetic): who saw it and what they did.
  const BASELINE = { reached: 640, visits: 410, firstOrders: 34, returningOrders: 24, repeaters: 19, adSpend: 6000 };

  function sc() {
    const s = M.st();
    s.scenario = s.scenario || { launched: false, offer: "", decision: "" };
    return s.scenario;
  }

  // Step 1: why Nai Bai.
  function goal() {
    const c = M.crop(CROP);
    const spare = M.uncommittedKg(c);
    const latest = c.paid[c.paid.length - 1];
    return { c, spare, latest, margin: M.margin(c), repeatNow: c.repeat[c.repeat.length - 1],
      why: `${spare} kg a week isn't committed to trade or group buys yet, the margin is ${M.pct(M.margin(c))}, and ${M.pct(c.repeat[c.repeat.length - 1])} of Nai Bai demand already comes from returning buyers.` };
  }

  // Step 2: who to target and what to offer them.
  function plan() {
    const c = M.crop(CROP);
    const lapsed = M.CUSTOMERS.filter((cu) => cu.crop === CROP && cu.consent && M.rfm(cu).risk === "Likely lapsing");
    const occasional = M.CUSTOMERS.filter((cu) => cu.crop === CROP && cu.consent && cu.orders <= 3);
    const pts = M.POINTS.filter((p) => p.topCrops.includes(CROP)).map(M.momentum).sort((a, b) => b.gap - a.gap);
    const co = M.checkout({ qty: BASKET, mode: "pickup", voucher: 0 });
    const cost = M.sum(co.lines.map((l) => l.cost));
    const options = M.offerOptions({ price: co.subtotal, cost }).filter((o) => o.id !== "loyalty");
    const best = options.find((o) => o.ok && o.id !== "none") || options[0];
    const chosen = options.find((o) => o.id === sc().offer) || best;
    const fc = M.fullCompare({ qty: BASKET, voucher: 0 });
    const local = fc.rows.filter((r) => !r.ours && r.complete).sort((a, b) => a.total - b.total)[0];
    // Can we sustainably match the cheapest complete like-for-like basket elsewhere?
    const matchPrice = local ? Math.min(co.subtotal, local.total) : co.subtotal;
    const atMatch = M.orderEconomics(matchPrice, cost, "pickup");
    const sustain = {
      local, matchPrice, contribution: atMatch.contribution, margin: atMatch.margin,
      ok: atMatch.margin >= M.rules().minMargin,
      floor: Math.ceil((cost + M.DELIVERY.packCost + Math.round(M.DELIVERY.dropCost / M.DELIVERY.dropHouseholds)) / (1 - M.DELIVERY.leaderRate - M.rules().minMargin))
    };
    return {
      c, basket: BASKET, co, cost, options, best, chosen, sustain, fc,
      segments: [
        { name: "Lapsed Nai Bai buyers (opted in)", n: lapsed.length, how: "WhatsApp from Tyllage, once", why: "They already like Nai Bai; bring them back before finding strangers." },
        { name: "Occasional Nai Bai buyers (1–3 orders, opted in)", n: occasional.length, how: "WhatsApp + reorder reminder", why: "Closest to becoming weekly households." },
        ...pts.slice(0, 2).map((m) => ({ name: `Neighbours at ${m.p.area} (${m.p.id})`, n: Math.max(0, m.p.capacity - m.n), how: "Through the group-buy leader", why: m.gap ? m.message : "Pickup with room and Nai Bai fans." }))
      ],
      link: M.utm("whatsapp", "leader", CODE.toLowerCase()).replace(/\?/, "?c=" + CODE + "&")
    };
  }

  function launch(offerId) {
    const s = sc();
    s.launched = true; s.offer = offerId; s.launchedAt = new Date().toISOString();
    M.save();
    M.track("campaign_launch", CODE);
  }

  // Step 4: what happened. Synthetic baseline + this browser's campaign activity.
  function results() {
    const p = plan();
    const ev = M.state.events;
    const mine = M.st().orders.filter((o) => o.campaign === CODE);
    const visits = BASELINE.visits + ev.filter((e) => e.type === "campaign_visit" && e.detail === CODE).length;
    const firstOrders = BASELINE.firstOrders + mine.filter((o) => !o.repeat).length;
    const repeatOrders = BASELINE.returningOrders + mine.filter((o) => o.repeat).length;
    const orders = firstOrders + repeatOrders;
    const repeaters = BASELINE.repeaters + (mine.some((o) => o.repeat) ? 1 : 0);
    const perOrder = M.orderEconomics(p.chosen.pay, p.cost, "pickup");
    const fullPrice = M.orderEconomics(p.co.subtotal, p.cost, "pickup");
    // The offer applies to first orders only; repeat orders are at the normal bundle price.
    const revenue = firstOrders * p.chosen.pay + repeatOrders * p.co.subtotal;
    const offerCost = firstOrders * p.chosen.discount;
    const contribution = firstOrders * perOrder.contribution + repeatOrders * fullPrice.contribution - BASELINE.adSpend;
    const naiBaiKg = (orders * p.basket[CROP] * M.PACK_G) / 1000 / 2;      // two weeks → per week
    const recurringKg = (repeatOrders * p.basket[CROP] * M.PACK_G) / 1000 / 2;
    return {
      reached: BASELINE.reached, visits, orders, firstOrders, repeatOrders, repeaters,
      repeatRate: repeaters / firstOrders, conv: firstOrders / visits, revenue, offerCost, adSpend: BASELINE.adSpend,
      contribution, cac: Math.round((BASELINE.adSpend + offerCost) / firstOrders), naiBaiKg, recurringKg,
      mine: mine.length, mineVisits: visits - BASELINE.visits
    };
  }

  // Step 5: does the demand justify growing more?
  function decision() {
    const c = M.crop(CROP);
    const e = M.evidence(c);
    const r = results();
    const v = M.plantingVerdict(c);
    const headroom = v.supply - v.latest;
    const checks = e.checks.concat([
      { ok: r.repeatRate >= M.rules().repeatShareMin, label: `${M.pct(r.repeatRate)} of campaign buyers ordered again (needs ${M.pct(M.rules().repeatShareMin)})` },
      { ok: r.contribution > 0, label: `Campaign earned ${M.money(r.contribution)} after offer and ad costs` }
    ]);
    const ok = checks.every((x) => x.ok);
    return { c, checks, ok, r, headroom, trialKg: v.trialKg || M.forecastRead(c).trialKg,
      verdict: ok ? { tone: "good", label: "Demand supports a small production trial", text: `Paid, repeat demand beats spare supply and the campaign made money. Consider about +${v.trialKg || M.forecastRead(c).trialKg} kg/week of Nai Bai for one growing cycle; the farm manager decides.` }
        : { tone: "warn", label: "Not enough evidence yet", text: "Keep the campaign running and fix the failing checks before planting more." } };
  }

  function decide(status) {
    sc().decision = status;
    M.state.decisions.push({ kind: "scenario", crop: CROP, title: "Nai Bai production trial", status, at: new Date().toISOString() });
    M.save();
  }

  function reset() {
    M.st().scenario = { launched: false, offer: "", decision: "" };
    M.st().orders = M.st().orders.filter((o) => o.campaign !== CODE);
    M.state.events = M.state.events.filter((e) => !(e.detail === CODE));
    M.save();
  }

  M.SCENARIO = { CODE, CROP, BASKET, BASELINE, state: sc, goal, plan, launch, results, decision, decide, reset };
})();
