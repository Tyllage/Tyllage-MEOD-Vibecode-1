/* Tyllage Demand Growth Loop: Discover → Convert → Retain → Validate → Plan farm growth.
   The logic behind the Growth dashboard, the Growth Advisor and the consumer rewards. Rules decide
   every number, stock limit, price floor and discount budget; a language model could later write the
   explanations from the same evidence, but never sets them. Loads after value.js; extends window.TY. */
(function () {
  "use strict";
  const M = window.TY;
  const D = M.DELIVERY;

  /* ---------- demo assumptions (illustrative) ---------- */

  const BASKET = 1800;              // typical pickup basket, cents
  const BASKET_KG = 1.1;
  const DISCOUNT_BUDGET = 30000;    // monthly cap on discounts and rewards, cents
  const STANDARD_MAX = 25;                              // households one standard drop can carry
  const LARGER_DROP = { households: 40, cost: 2600 };  // a bigger van slot, vs the standard drop in DELIVERY
  // Public holidays to plan around. Confirm dates against MOM's published list before use.
  const HOLIDAYS = [
    { date: "2026-11-08", name: "Deepavali (confirm date)" },
    { date: "2026-12-25", name: "Christmas Day" }
  ];

  const basketContribution = () => M.orderEconomics(BASKET, Math.round(BASKET * 0.55), "pickup").contribution;

  /* ---------- the business question: 200 one-time customers or 50 weekly households? ---------- */

  function priority() { return M.st().priority || "repeat"; }
  function setPriority(p) { M.st().priority = p; M.save(); }

  function priorityCompare() {
    const c = basketContribution();
    const ex = M.experiment();
    const cheap = ex.rows.find((r) => r.id === "A"), conv = ex.rows.find((r) => r.id === "B");
    // 200 one-time buyers: one order each, a few come back (cheaper-basket evidence), each cost to acquire.
    const oneTimeRepeat = cheap.repeatRate * 3;
    const oneTime = { households: 200, orders: Math.round(200 * (1 + oneTimeRepeat)), cac: cheap.cac };
    oneTime.contribution = oneTime.orders * c - oneTime.households * oneTime.cac;
    oneTime.kgPerWeek = +(oneTime.orders * BASKET_KG / 26).toFixed(0);
    // 50 weekly households: 26 orders each over 6 months, with 3% leaving each week.
    const weeksKept = M.sum(Array.from({ length: 26 }, (_, i) => 0.97 ** i));
    const weekly = { households: 50, orders: Math.round(50 * weeksKept), cac: conv.cac };
    weekly.contribution = weekly.orders * c - weekly.households * weekly.cac;
    weekly.kgPerWeek = +(50 * BASKET_KG * 0.85).toFixed(0);
    return { oneTime, weekly, perOrder: c, weeksKept: +weeksKept.toFixed(1) };
  }

  /* ---------- group-buy momentum ---------- */

  // How many more households would make the next delivery step worth testing at this pickup.
  // Under 20: the standard drop costs more than S$1 a household. 20–25: the van is nearly full,
  // so a larger delivery needs at least 26 to stay at about S$1 a household.
  function momentum(p) {
    const st = M.pointStatus(p);
    const n = st.now;
    const larger = n > STANDARD_MAX;
    const perNow = Math.round((larger ? LARGER_DROP.cost : D.dropCost) / n);
    const campaign = p.returning >= 0.5 ? "Refer-a-neighbour through the leader (reward after their first order)" : "Fix retention first: ask the leader why households drop off";
    let target, perAt, message;
    if (n < D.dropHouseholds) {
      target = D.dropHouseholds; perAt = Math.round(D.dropCost / target);
      message = `${target - n} more household${target - n === 1 ? "" : "s"} would bring the drop cost down from ${M.money(perNow)} to ${M.money(perAt)} each.`;
    } else if (!larger && p.capacity > STANDARD_MAX) {
      target = STANDARD_MAX + 1; perAt = Math.round(LARGER_DROP.cost / target);
      message = `The standard drop is nearly full (${n} of ${STANDARD_MAX}). ${target - n} more household${target - n === 1 ? "" : "s"} could justify testing a larger delivery next week, at about ${M.money(perAt)} each.`;
    } else {
      return { p, st, n, gap: 0, perNow, perAt: perNow, message: `${n} households collect here at ${M.money(perNow)} each. The drop is efficient; keep them coming back.`, campaign: st.key === "retention" ? "Ask the leader why households are leaving" : "No push needed" };
    }
    return { p, st, n, gap: target - n, target, perNow, perAt, message, campaign };
  }

  /* ---------- personalised rewards (consumer) ---------- */

  function rewardFor() {
    const orders = M.st().orders.length;
    const r = M.st().reward;
    if (!orders) return { type: "First-time buyer", name: "S$2 off your first pickup order", detail: "Once per household, on baskets of S$10+. Capped each month.", cents: 200, eligibleMin: 1000 };
    if (orders < 4) return { type: "Occasional shopper", name: "Same basket, one tap", detail: "Save this basket and we'll remind you the day before the cutoff. No discount needed.", cents: 0 };
    return { type: "Loyal household", name: `${M.money(r.amount)} off every ${r.every}th order`, detail: `On orders of ${M.money(r.min)}+. Thanks for buying every week.`, cents: 0 };
  }

  // Which reward works for which shopper, judged on extra contribution after the reward's cost.
  function rewardSegments() {
    const c = basketContribution();
    return [
      { seg: "First-time buyers", reward: "S$2 off first pickup order", extraOrders: 0.35, cost: 200, src: "Assumed from offer test arm A" },
      { seg: "First-time buyers", reward: "S$5 off first order", extraOrders: 0.40, cost: 500, src: "C-102 discount cohort" },
      { seg: "Occasional shoppers", reward: "One-tap repeat + reminder", extraOrders: 0.6, cost: 20, src: "Offer test arm B" },
      { seg: "Occasional shoppers", reward: "10% off a bundle", extraOrders: 0.5, cost: 180, src: "Recipe-led cohorts" },
      { seg: "Loyal households", reward: "S$3 off every 4th order", extraOrders: 0.7, cost: 75 * 4, src: "Reward holdout test" },
      { seg: "Loyal households", reward: "Free delivery on any order", extraOrders: 0.5, cost: D.homeCost, src: "Assumed" }
    ].map((x) => ({ ...x, net: Math.round(x.extraOrders * c - x.cost) }));
  }

  /* ---------- harvest-aware marketing calendar ---------- */

  function calendar(weeks) {
    const out = [];
    const d = new Date();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 7); // next Monday
    for (let w = 0; w < (weeks || 4); w++) {
      const start = new Date(d); start.setDate(d.getDate() + 7 * w);
      const end = new Date(start); end.setDate(start.getDate() + 6);
      const iso = (x) => x.getFullYear() + "-" + String(x.getMonth() + 1).padStart(2, "0") + "-" + String(x.getDate()).padStart(2, "0");
      const hol = HOLIDAYS.filter((x) => x.date >= iso(start) && x.date <= iso(end));
      const slots = M.featuredCrops().slice(0, 3).map((c) => {
        const f = M.forecastRead(c);
        const share = M.uncommittedKg(c) / c.expected;
        const risky = f.confidence === "Not enough history" || share > 0.5;
        return { c, kg: M.uncommittedKg(c), day: c.harvestDay, risky,
          flag: risky ? (share > 0.5 ? "Lots unsold: check the harvest is real before promising it" : "Too little sales history: review before it goes live") : "" };
      });
      out.push({ start, end, label: start.toLocaleDateString("en-SG", { day: "numeric", month: "short" }) + " – " + end.toLocaleDateString("en-SG", { day: "numeric", month: "short" }), hol, slots });
    }
    return out;
  }

  /* ---------- demand experiment designer ---------- */

  function experimentPlan(c) {
    // Two similar pickups: closest in household count and returning share.
    const pts = M.POINTS.map((p) => ({ p, n: M.pointStatus(p).now }));
    let best = null;
    pts.forEach((a, i) => pts.slice(i + 1).forEach((b) => {
      const gap = Math.abs(a.n - b.n) / Math.max(a.n, b.n) + Math.abs(a.p.returning - b.p.returning);
      if (!best || gap < best.gap) best = { a, b, gap };
    }));
    const base = 0.36, target = 0.5;
    const perArm = M.sampleSize(base, target);
    const perWeek = Math.max(4, Math.round((best.a.n + best.b.n) / 2 * 0.25));
    return {
      c, a: best.a.p, b: best.b.p,
      arms: [`Introductory ${c.name} bundle (approved price, pickup only)`, `Recipe-led ${c.name} offer at normal price`],
      perArm, weeks: Math.ceil(perArm / perWeek), perWeek,
      measure: ["Paid orders", "Repeat orders within 28 days", "Cost per new customer", "Extra contribution after offer cost"],
      stop: "Stop early only if an arm breaks the price floor or the harvest falls short."
    };
  }

  /* ---------- evidence to grow ---------- */

  function evidence(c) {
    const R = M.rules();
    const v = M.plantingVerdict(c);
    const sd = M.smartDemand().crops.find((x) => x.c.id === c.id);
    const checks = [
      { ok: c.paid.length >= R.minWeeks, label: `${c.paid.length} weeks of paid orders (needs ${R.minWeeks})` },
      { ok: v.repeatNow >= R.repeatShareMin, label: `${M.pct(v.repeatNow)} of demand from returning buyers (needs ${M.pct(R.repeatShareMin)})` },
      { ok: v.over >= R.weeksOverSupply, label: `Paid demand above spare supply in ${v.over} of 4 weeks (needs ${R.weeksOverSupply})` },
      { ok: v.margin >= R.minMargin, label: `${M.pct(v.margin)} margin (floor ${M.pct(R.minMargin)})` },
      { ok: sd.rises >= 3, label: `Recurring orders rose ${Math.max(0, sd.rises)} weeks running (needs 3)` }
    ];
    const passed = checks.filter((x) => x.ok).length;
    const firstGap = checks.find((x) => !x.ok);
    const verdict = passed === checks.length
      ? { tone: "good", label: "Enough evidence to consider a trial", next: v.next }
      : !checks[3].ok ? { tone: "bad", label: "Fix margin first", next: "Review price, pack size or growing cost before anything else." }
      : passed >= 3 ? { tone: "warn", label: "Almost: run a demand test", next: "Run the demand experiment below to close the gap: " + firstGap.label.toLowerCase() + "." }
      : { tone: "neutral", label: "Not yet", next: "Keep building repeat demand. Gap: " + firstGap.label.toLowerCase() + "." };
    return { c, checks, passed, verdict };
  }

  /* ---------- the next move ---------- */

  function nextMove() {
    const pr = priority();
    const moms = M.POINTS.map(momentum).filter((m) => m.gap > 0 && m.p.returning >= 0.5).sort((a, b) => a.gap - b.gap);
    const fb = M.feedback();
    const barrier = fb.themes.find((t) => t.barrier && t.neg >= 2);
    const anomaly = M.journey().anomalies[0];
    const m0 = pr === "repeat" ? moms[0] : null;
    const crop = (m0 && M.featuredCrops().find((c) => m0.p.topCrops.includes(c.id))) || M.featuredCrops()[0] || M.CROPS[0];
    const floorKg = M.priceFloor(crop.cost, "pickup");
    const fixFirst = [
      anomaly ? { title: "Smart cart recovery", text: `Carts under S$60 are dropping at "${anomaly.step}" (about ${anomaly.lostOrders} orders a week). Offer neighbourhood pickup on the cart page instead of a bigger discount.` } : null,
      barrier ? { title: "Voice of the customer: " + barrier.label, text: barrier.action } : null
    ].filter(Boolean);

    let move;
    if (pr === "repeat") {
      const m = m0;
      move = {
        title: m ? `Grow weekly households at ${m.p.area}` : "Convert occasional shoppers to a weekly basket",
        why: [
          "Priority is predictable repeat demand (50 weekly households beat 200 one-time customers on 6-month contribution).",
          m ? m.message : "Every pickup already has an efficient drop.",
          `In the offer test, "Convenience" buyers came back most (${M.pct(M.experiment().rows.find((r) => r.id === "B").repeatRate)}).`
        ],
        offer: m ? m.campaign : "One-tap repeat order and a reminder before the cutoff",
        audience: m ? `Households near ${m.p.area} (${m.p.id}), via the leader` : "Customers with 1–3 orders",
        point: m ? m.p : null
      };
    } else {
      const arm = M.experiment().rows.find((r) => r.id === "A");
      move = {
        title: `Introductory ${crop.name} bundle for first-time buyers`,
        why: [
          "Priority is reaching new customers.",
          `"Cheaper basket" brought the most first orders in the offer test (${arm.firstOrders}), at ${M.money(arm.cac)} each.`,
          `${crop.name} has the most spare harvest this week (${M.uncommittedKg(crop)} kg uncommitted).`
        ],
        offer: "S$2 off a first pickup order, capped",
        audience: "New households near pickups with spare places",
        point: null
      };
    }
    move.guardrails = [
      `Stock limit: promote at most ${M.uncommittedKg(crop)} kg of ${crop.name}, the uncommitted harvest.`,
      `Price floor: never below ${M.money(floorKg)}/kg for ${crop.name} with pickup.`,
      `Discount budget: ${M.money(DISCOUNT_BUDGET)} a month for all vouchers and rewards.`
    ];
    move.measure = "Paid orders, repeat orders within 28 days, cost per customer and extra contribution. Not likes.";
    return { pr, move, fixFirst, moms };
  }

  Object.assign(M, {
    DISCOUNT_BUDGET, STANDARD_MAX, LARGER_DROP, HOLIDAYS,
    priority, setPriority, priorityCompare, momentum, rewardFor, rewardSegments, calendar, experimentPlan, evidence, nextMove
  });
})();
