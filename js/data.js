/* Tyllage Growth Intelligence for MEOD — demo data, business rules and decision logic.
   Everything here is synthetic. Shared by index.html (consumer page) and growth.html (farm hub). */
(function () {
  "use strict";

  const STORE_URL = "https://meodfresh.com/";
  const STORAGE_KEY = "tyllage-growth-demo-v1";

  // Illustrative thresholds. MEOD to confirm. Admin-editable copies live in state.rules.
  const RULES = {
    minWeeks: 4,             // weeks of paid-order history before any planting call
    repeatShareMin: 0.4,     // share of demand from returning buyers that counts as dependable
    repeatShareWeak: 0.3,    // below this, focus on retention before anything else
    weeksOverSupply: 3,      // of the last 4 weeks, paid demand above consumer supply
    minMargin: 0.15,         // contribution margin floor (Margin Guard)
    maxTrialIncrease: 0.2,   // a trial increase is never more than 20% of expected harvest
    noPromoUncommitted: 0.15,// at or below this share uncommitted, no promotion needed
    discountUncommitted: 0.5,// above this share uncommitted, a small offer may be considered
    bundleDiscount: 0.1,     // 10% off a bundle, only if it passes Margin Guard
    interestToPaidLow: 0.35, // paid kg / interest kg below this = interest isn't converting
    nearPointKm: 3,          // a collection point further than this isn't "near you"
    underusedUtil: 0.6,      // active households / capacity below this = room to grow
    retentionRisk: 0.4,      // returning share below this = retention problem
    growingTrend: 0.1        // +10% over 4 weeks = growing
  };

  // Crops. Money is integer cents per kg. Quantities are kg per week.
  // committed = trade (supermarkets, restaurants) + group-buy standing orders + pre-orders.
  const CROPS = [
    { id: "nai-bai", name: "Nai Bai", zh: "奶白", img: "assets/img/veg-xiao-bai-cai.webp", harvestDay: "Thu",
      price: 1200, cost: 700, expected: 100, committed: { trade: 30, groupBuy: 20, preorder: 13 },
      paid: [20, 30, 34, 38, 41, 43], repeat: [0.30, 0.38, 0.45, 0.50, 0.52, 0.55], interestKg: 52,
      story: "Mild, juicy stems that stay crunchy in a quick stir-fry." },
    { id: "kai-lan", name: "Kai Lan", zh: "芥兰", img: "", harvestDay: "Tue",
      price: 1400, cost: 800, expected: 80, committed: { trade: 35, groupBuy: 12, preorder: 3 },
      paid: [12, 25, 14, 11, 13, 12], repeat: [0.20, 0.12, 0.18, 0.22, 0.20, 0.21], interestKg: 20,
      story: "Our crunchiest green. Blanch, then finish with oyster sauce." },
    { id: "tuscan-kale", name: "Tuscan Kale", zh: "托斯卡纳羽衣甘蓝", img: "assets/img/veg-tuscan-kale.webp", harvestDay: "Sat",
      price: 2200, cost: 1300, expected: 40, committed: { trade: 18, groupBuy: 4, preorder: 2 },
      paid: [6, 5, 7, 6, 6, 7], repeat: [0.50, 0.40, 0.43, 0.50, 0.50, 0.43], interestKg: 30,
      story: "Deep green, nutty leaves. Great in soups, salads and chips." },
    { id: "choy-sum", name: "Choy Sum", zh: "菜心", img: "", harvestDay: "Thu",
      price: 1100, cost: 650, expected: 90, committed: { trade: 52, groupBuy: 21, preorder: 5 },
      paid: [18, 22], repeat: [0.25, 0.32], interestKg: 24,
      story: "Tender stalks with little yellow flowers. A weeknight staple." },
    { id: "xiao-bai-cai", name: "Xiao Bai Cai", zh: "小白菜", img: "assets/img/veg-xiao-bai-cai.webp", harvestDay: "Tue",
      price: 1100, cost: 600, expected: 70, committed: { trade: 25, groupBuy: 15, preorder: 5 },
      paid: [16, 17, 15, 18, 17, 16], repeat: [0.55, 0.58, 0.60, 0.61, 0.60, 0.62], interestKg: 14,
      story: "Small, sweet and quick to cook. Kids usually like this one." },
    { id: "mesclun", name: "Mesclun Mix", zh: "综合沙拉菜", img: "assets/img/veg-mesclun.webp", harvestDay: "Sat",
      price: 2400, cost: 2150, expected: 30, committed: { trade: 15, groupBuy: 3, preorder: 2 },
      paid: [10, 12, 13, 14, 15, 15], repeat: [0.45, 0.48, 0.50, 0.52, 0.55, 0.56], interestKg: 18,
      story: "A hand-picked mix of baby leaves, washed and ready for salad." }
  ];

  // Recipes. `uses` are crop ids; grams per serving of the main crop.
  const RECIPES = [
    { id: "r1", title: "Garlic Nai Bai stir-fry", crop: "nai-bai", mins: 10, gramsPerServing: 120, tags: ["vegetarian", "kid-friendly"], spicy: false },
    { id: "r2", title: "Nai Bai and tofu soup", crop: "nai-bai", mins: 25, gramsPerServing: 100, tags: ["vegetarian", "kid-friendly"], spicy: false },
    { id: "r3", title: "Sambal Nai Bai", crop: "nai-bai", mins: 15, gramsPerServing: 120, tags: [], spicy: true },
    { id: "r4", title: "Kai Lan with oyster sauce", crop: "kai-lan", mins: 15, gramsPerServing: 120, tags: [], spicy: false },
    { id: "r5", title: "Ginger Kai Lan with beef", crop: "kai-lan", mins: 25, gramsPerServing: 100, tags: [], spicy: false },
    { id: "r6", title: "Crispy kale chips", crop: "tuscan-kale", mins: 30, gramsPerServing: 50, tags: ["vegetarian", "kid-friendly"], spicy: false },
    { id: "r7", title: "Kale and white bean soup", crop: "tuscan-kale", mins: 40, gramsPerServing: 70, tags: ["vegetarian"], spicy: false },
    { id: "r8", title: "Choy Sum with mushrooms", crop: "choy-sum", mins: 15, gramsPerServing: 120, tags: ["vegetarian"], spicy: false },
    { id: "r9", title: "Xiao Bai Cai egg drop soup", crop: "xiao-bai-cai", mins: 15, gramsPerServing: 100, tags: ["vegetarian", "kid-friendly"], spicy: false },
    { id: "r10", title: "Chilli garlic Xiao Bai Cai", crop: "xiao-bai-cai", mins: 10, gramsPerServing: 120, tags: ["vegetarian"], spicy: true },
    { id: "r11", title: "Mesclun salad with sesame dressing", crop: "mesclun", mins: 10, gramsPerServing: 60, tags: ["vegetarian", "kid-friendly"], spicy: false },
    { id: "r12", title: "Nai Bai fried rice", crop: "nai-bai", mins: 20, gramsPerServing: 80, tags: ["kid-friendly"], spicy: false }
  ];

  // Group-buy collection points. Leaders are pseudonymous. Coordinates are approximate.
  // active = households collecting per week, last 8 weeks (oldest first).
  const POINTS = [
    { id: "PG-01", area: "Punggol Waterway", lat: 1.405, lng: 103.902, day: "Sat", window: "10am–1pm", capacity: 40, active: [22, 24, 25, 27, 29, 31, 33, 34], returning: 0.62, topCrops: ["nai-bai", "xiao-bai-cai"] },
    { id: "SK-01", area: "Sengkang Compassvale", lat: 1.393, lng: 103.895, day: "Sat", window: "11am–2pm", capacity: 35, active: [18, 18, 17, 19, 18, 18, 19, 18], returning: 0.58, topCrops: ["choy-sum", "nai-bai"] },
    { id: "TM-01", area: "Tampines Central", lat: 1.353, lng: 103.944, day: "Thu", window: "6pm–9pm", capacity: 45, active: [30, 29, 27, 26, 25, 24, 22, 21], returning: 0.34, topCrops: ["kai-lan", "nai-bai"] },
    { id: "BD-01", area: "Bedok North", lat: 1.333, lng: 103.927, day: "Thu", window: "6pm–8pm", capacity: 30, active: [12, 13, 12, 14, 13, 14, 13, 14], returning: 0.55, topCrops: ["xiao-bai-cai"] },
    { id: "TP-01", area: "Toa Payoh Lor 1", lat: 1.336, lng: 103.848, day: "Tue", window: "6pm–9pm", capacity: 30, active: [24, 25, 26, 26, 27, 28, 27, 28], returning: 0.66, topCrops: ["kai-lan", "choy-sum"] },
    { id: "AM-01", area: "Ang Mo Kio Ave 3", lat: 1.370, lng: 103.846, day: "Tue", window: "7pm–9pm", capacity: 35, active: [10, 11, 13, 14, 16, 17, 18, 20], returning: 0.45, topCrops: ["nai-bai", "mesclun"] },
    { id: "JW-01", area: "Jurong West St 52", lat: 1.350, lng: 103.718, day: "Sat", window: "9am–12pm", capacity: 40, active: [15, 14, 15, 16, 15, 14, 15, 15], returning: 0.38, topCrops: ["choy-sum"] },
    { id: "BP-01", area: "Bukit Panjang Ring Rd", lat: 1.379, lng: 103.765, day: "Sat", window: "10am–12pm", capacity: 30, active: [20, 21, 22, 22, 23, 24, 25, 26], returning: 0.6, topCrops: ["nai-bai", "tuscan-kale"] },
    { id: "WL-01", area: "Woodlands Dr 14", lat: 1.434, lng: 103.794, day: "Sat", window: "10am–1pm", capacity: 35, active: [9, 10, 9, 11, 10, 10, 11, 10], returning: 0.5, topCrops: ["xiao-bai-cai", "kai-lan"] },
    { id: "QT-01", area: "Queenstown Mei Ling", lat: 1.292, lng: 103.803, day: "Thu", window: "6pm–9pm", capacity: 30, active: [16, 17, 18, 18, 19, 20, 21, 22], returning: 0.52, topCrops: ["mesclun", "tuscan-kale"] }
  ];

  // Postal district centres, keyed by the first two digits of a Singapore postal code.
  // Approximate, for "nearest collection point" only. No address is ever sent anywhere.
  const DISTRICTS = [
    [["01","02","03","04","05","06"], 1.284, 103.851], [["07","08"], 1.276, 103.845],
    [["14","15","16"], 1.291, 103.806], [["09","10"], 1.270, 103.820], [["11","12","13"], 1.300, 103.770],
    [["17"], 1.293, 103.854], [["18","19"], 1.300, 103.859], [["20","21"], 1.309, 103.852],
    [["22","23"], 1.304, 103.832], [["24","25","26","27"], 1.318, 103.807], [["28","29","30"], 1.324, 103.840],
    [["31","32","33"], 1.333, 103.850], [["34","35","36","37"], 1.330, 103.878], [["38","39","40","41"], 1.318, 103.893],
    [["42","43","44","45"], 1.306, 103.905], [["46","47","48"], 1.324, 103.930], [["49","50","81"], 1.365, 103.966],
    [["51","52"], 1.353, 103.945], [["53","54","55","82"], 1.385, 103.893], [["56","57"], 1.365, 103.845],
    [["58","59"], 1.340, 103.776], [["60","61","62","63","64"], 1.340, 103.707], [["65","66","67","68"], 1.378, 103.762],
    [["69","70","71"], 1.410, 103.715], [["72","73"], 1.436, 103.786], [["77","78"], 1.395, 103.818],
    [["75","76"], 1.430, 103.835], [["79","80"], 1.402, 103.870]
  ];

  // Past campaigns (synthetic). Money in cents. firstBuyers = first-ever order from the campaign link or code;
  // repeatBuyers = those first buyers who ordered again within 28 days.
  const CAMPAIGNS = [
    { id: "C-101", name: "3 easy Nai Bai dinners", channel: "Instagram", theme: "Recipe", crop: "nai-bai", weeks: "2 weeks",
      spend: 12000, visits: 1200, firstBuyers: 45, repeatBuyers: 18, orders: 74, revenue: 207200, discount: 0 },
    { id: "C-102", name: "10% off Nai Bai this week", channel: "Instagram", theme: "Discount", crop: "nai-bai", weeks: "2 weeks",
      spend: 12000, visits: 1500, firstBuyers: 52, repeatBuyers: 9, orders: 66, revenue: 171600, discount: 17160 },
    { id: "C-103", name: "Morning harvest at MEOD", channel: "TikTok", theme: "Farm story", crop: "kai-lan", weeks: "2 weeks",
      spend: 8000, visits: 2600, firstBuyers: 21, repeatBuyers: 4, orders: 27, revenue: 75600, discount: 0 },
    { id: "C-104", name: "Punggol Harvest Club", channel: "WhatsApp (leader)", theme: "Group buy", crop: "nai-bai", weeks: "4 weeks",
      spend: 3000, visits: 340, firstBuyers: 38, repeatBuyers: 24, orders: 112, revenue: 268800, discount: 0 },
    { id: "C-105", name: "Nai Bai recipes page", channel: "Search (SEO)", theme: "Recipe", crop: "nai-bai", weeks: "4 weeks",
      spend: 2500, visits: 610, firstBuyers: 14, repeatBuyers: 7, orders: 23, revenue: 55200, discount: 0 },
    { id: "C-106", name: "After-visit thank-you", channel: "Farm visit", theme: "Farm story", crop: "tuscan-kale", weeks: "4 weeks",
      spend: 4000, visits: 180, firstBuyers: 22, repeatBuyers: 11, orders: 35, revenue: 92400, discount: 7000 }
  ];

  // Search topics. Volumes are NOT verified — validate in Google Search Console or a keyword tool first.
  const SEO_TOPICS = [
    { query: "locally grown vegetables singapore", intent: "Buy", page: "This Week at MEOD", status: "weak", idea: "Say 'grown in Kranji, Singapore' in the page title and first paragraph; list this week's crops in plain text, not only images." },
    { query: "fresh vegetables delivery singapore", intent: "Buy", page: "MEOD Fresh home", status: "exists", idea: "Make delivery days (Tue / Thu / Sat) and the S$60 free-delivery threshold visible without scrolling." },
    { query: "nai bai recipe", intent: "Learn → buy", page: "Nai Bai recipes", status: "exists", idea: "Already bringing first-time buyers (C-105). Add a 'Get the Nai Bai' link to each recipe and a FAQ on storage." },
    { query: "kai lan recipe easy", intent: "Learn → buy", page: "—", status: "gap", idea: "No page yet. A short recipe page linked to Kai Lan on MEOD Fresh could help, since Kai Lan buyers rarely return." },
    { query: "vegetable group buy near me", intent: "Join", page: "Find your collection point", status: "gap", idea: "Publish one page per collection area (e.g. 'Punggol vegetable group buy') with pickup day, window and how to join." },
    { query: "singapore farm tour for kids", intent: "Visit", page: "MEOD Experiences", status: "exists", idea: "Link from the tour page to the after-visit offer so visits turn into purchases." },
    { query: "pesticide free vegetables singapore", intent: "Buy", page: "Meet your farmers", status: "weak", idea: "Explain how MEOD grows without pesticides in MEOD's own words; avoid claims MEOD hasn't approved." },
    { query: "what to cook with tuscan kale", intent: "Learn → buy", page: "—", status: "gap", idea: "Interest in kale is high but purchases are low. Recipe content may help people who don't know how to cook it." }
  ];

  // Customer base (synthetic counts for the consumer channels).
  const SEGMENTS = [
    { id: "new", label: "New", rule: "First order in the last 30 days", count: 96 },
    { id: "returning", label: "Returning", rule: "2+ orders, latest in the last 30 days", count: 214 },
    { id: "at-risk", label: "At risk", rule: "Last order 31–60 days ago", count: 71 },
    { id: "inactive", label: "Inactive", rule: "No order for 60+ days", count: 158 }
  ];

  // Public-facing approved incentive (illustrative; MEOD to confirm).
  const OFFERS = { freeDeliveryFrom: 6000, deliveryDays: "Tue, Thu and Sat", orderCutoff: "10pm the night before" };

  /* ---------- helpers ---------- */

  const money = (cents) => "S$" + (cents / 100).toLocaleString("en-SG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pct = (x) => Math.round(x * 100) + "%";
  const sum = (a) => a.reduce((s, x) => s + x, 0);
  const avg = (a) => (a.length ? sum(a) / a.length : 0);
  const crop = (id) => CROPS.find((c) => c.id === id);
  const committedKg = (c) => c.committed.trade + c.committed.groupBuy + c.committed.preorder;
  const uncommittedKg = (c) => Math.max(0, c.expected - committedKg(c));
  const margin = (c) => (c.price - c.cost) / c.price;

  function weekLabels(n) {
    const out = [];
    const d = new Date();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // this Monday
    for (let i = n - 1; i >= 0; i--) {
      const w = new Date(d);
      w.setDate(d.getDate() - 7 * i);
      out.push(w.toLocaleDateString("en-SG", { day: "numeric", month: "short" }));
    }
    return out;
  }

  function utm(source, medium, campaign, content) {
    const u = new URL(STORE_URL);
    u.searchParams.set("utm_source", source);
    u.searchParams.set("utm_medium", medium);
    u.searchParams.set("utm_campaign", campaign);
    if (content) u.searchParams.set("utm_content", content);
    return u.toString();
  }

  function km(aLat, aLng, bLat, bLng) {
    const r = Math.PI / 180;
    const dLat = (bLat - aLat) * r, dLng = (bLng - aLng) * r;
    const x = Math.sin(dLat / 2) ** 2 + Math.cos(aLat * r) * Math.cos(bLat * r) * Math.sin(dLng / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.sqrt(x));
  }

  function locatePostal(code) {
    if (!/^\d{6}$/.test(code)) return null;
    const sector = code.slice(0, 2);
    const hit = DISTRICTS.find(([sectors]) => sectors.includes(sector));
    return hit ? { lat: hit[1], lng: hit[2], sector } : null;
  }

  function nearestPoints(code, n) {
    const loc = locatePostal(code);
    if (!loc) return null;
    return POINTS.map((p) => ({ ...p, km: km(loc.lat, loc.lng, p.lat, p.lng) }))
      .sort((a, b) => a.km - b.km)
      .slice(0, n || 3);
  }

  /* ---------- state (localStorage) ---------- */

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) { /* storage blocked: fall through to defaults */ }
    return { rules: {}, interests: [], events: [], drafts: [] };
  }
  let state = load();
  state.rules = state.rules || {};
  state.interests = state.interests || [];
  state.events = state.events || [];
  state.drafts = state.drafts || [];

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
  }

  const rules = () => ({ ...RULES, ...state.rules });

  function track(type, detail) {
    state.events.push({ type, detail: detail || "", at: new Date().toISOString() });
    if (state.events.length > 500) state.events = state.events.slice(-500);
    save();
  }

  function reset() {
    state = { rules: {}, interests: [], events: [], drafts: [] };
    save();
  }

  /* ---------- intelligence (rule-based, explainable) ---------- */

  // Which crops the consumer page should feature: ones with enough uncommitted harvest to sell.
  function featuredCrops() {
    const R = rules();
    return CROPS.filter((c) => uncommittedKg(c) / c.expected > R.noPromoUncommitted)
      .sort((a, b) => uncommittedKg(b) / b.expected - uncommittedKg(a) / a.expected);
  }

  // Demand-to-Planting Advisor. Returns a verdict plus every step it used.
  function plantingVerdict(c) {
    const R = rules();
    const supply = uncommittedKg(c);
    const recent = c.paid.slice(-4);
    const repeatNow = c.repeat[c.repeat.length - 1] || 0;
    const m = margin(c);
    const over = recent.filter((kg) => kg > supply).length;
    const latest = c.paid[c.paid.length - 1] || 0;
    const steps = [
      `${c.paid.length} week${c.paid.length === 1 ? "" : "s"} of paid-order data (needs ${R.minWeeks}).`,
      `Consumer supply: ${c.expected} kg expected − ${committedKg(c)} kg committed = ${supply} kg a week.`,
      `Paid demand last 4 weeks: ${recent.join(", ")} kg. Above supply in ${over} of ${recent.length} weeks (needs ${R.weeksOverSupply}).`,
      `Returning buyers' share of demand: ${pct(repeatNow)} (dependable at ${pct(R.repeatShareMin)}+).`,
      `Contribution margin: ${pct(m)} (Margin Guard floor ${pct(R.minMargin)}).`,
      `Interest registered: ${c.interestKg} kg/week vs ${latest} kg actually paid for.`
    ];

    let v;
    if (c.paid.length < R.minWeeks) {
      v = { key: "collect", label: "Keep collecting", tone: "neutral",
        why: `Only ${c.paid.length} weeks of paid orders. Too early to judge.`,
        next: "Keep running normal campaigns and check again after week " + R.minWeeks + "." };
    } else if (m < R.minMargin) {
      v = { key: "margin", label: "Fix margin first", tone: "bad",
        why: `Demand is there, but each kg earns only ${pct(m)}, under the ${pct(R.minMargin)} floor. Growing more would grow the loss.`,
        next: "Review price, pack size or growing cost before adding production." };
    } else if (repeatNow < R.repeatShareWeak) {
      v = { key: "grow-demand", label: "Grow repeat demand", tone: "warn",
        why: `Most buyers don't come back (${pct(repeatNow)} returning). Spikes come from one-off campaigns.`,
        next: "Run recipe and reactivation campaigns for past buyers before planting more." };
    } else if (over >= R.weeksOverSupply && repeatNow >= R.repeatShareMin) {
      const excess = avg(recent.filter((kg) => kg > supply).map((kg) => kg - supply));
      const trial = Math.max(1, Math.round(Math.min(excess, c.expected * R.maxTrialIncrease)));
      v = { key: "test-more", label: "Test more production", tone: "good", trialKg: trial,
        why: `Paid, mostly repeat demand has beaten supply in ${over} of the last 4 weeks, with a healthy margin.`,
        next: `Consider a trial of about +${trial} kg/week for one growing cycle, for the farm manager to approve. Keep pre-orders capped at what's available.` };
    } else if (c.interestKg > 0 && latest / c.interestKg < R.interestToPaidLow) {
      v = { key: "maintain-interest", label: "Maintain — interest isn't converting", tone: "warn",
        why: `People say they want about ${c.interestKg} kg a week, but only ${latest} kg is paid for.`,
        next: "Find out why (price, familiarity, recipes) with a small paid trial before changing production." };
    } else {
      v = { key: "maintain", label: "Maintain capacity", tone: "neutral",
        why: `Current supply covers paid demand (${latest} kg vs ${supply} kg available).`,
        next: "No change to planting. Use spare harvest in campaigns where it fits." };
    }
    return { ...v, steps, supply, over, repeatNow, margin: m, latest };
  }

  function pointStatus(p) {
    const R = rules();
    const now = p.active[p.active.length - 1];
    const before = p.active[p.active.length - 5];
    const trend = (now - before) / before;
    const util = now / p.capacity;
    let s;
    if (p.returning < R.retentionRisk) s = { key: "retention", label: "Retention risk", tone: "bad", action: "Households are leaving. Ask the leader why, and run a returning-buyer recipe campaign for this point only." };
    else if (trend >= R.growingTrend && util > 0.85) s = { key: "near-full", label: "Near capacity", tone: "good", action: "Growing fast and nearly full. Talk to the leader about a second pickup slot or recruiting a nearby leader." };
    else if (trend >= R.growingTrend) s = { key: "growing", label: "Growing", tone: "good", action: "Keep going. Share what's working here with other leaders." };
    else if (util < R.underusedUtil) s = { key: "underused", label: "Room to grow", tone: "warn", action: "Pickup has spare capacity. Good place for a neighbourhood campaign with spare harvest." };
    else s = { key: "steady", label: "Steady", tone: "neutral", action: "No action needed." };
    return { ...s, now, trend, util };
  }

  function campaignStats(k) {
    const costRatio = 0.55; // produce + packing as a share of revenue (illustrative)
    const contribution = Math.round(k.revenue * (1 - costRatio) - k.discount - k.spend);
    return {
      cpa: k.firstBuyers ? Math.round(k.spend / k.firstBuyers) : 0,
      repeatRate: k.firstBuyers ? k.repeatBuyers / k.firstBuyers : 0,
      conv: k.visits ? k.firstBuyers / k.visits : 0,
      contribution,
      contributionPerBuyer: k.firstBuyers ? Math.round(contribution / k.firstBuyers) : 0
    };
  }

  // Campaign Advisor: what to promote, to whom, where, how — or say no promotion is needed.
  function recommendCampaign(c) {
    const R = rules();
    const unc = uncommittedKg(c);
    const share = unc / c.expected;
    const verdict = plantingVerdict(c);
    const steps = [
      `${c.name}: ${unc} kg of ${c.expected} kg this week isn't committed yet (${pct(share)}).`
    ];

    if (share <= R.noPromoUncommitted) {
      steps.push(`At or under ${pct(R.noPromoUncommitted)} uncommitted, so there isn't spare harvest to promote.`);
      return { none: true, title: "No promotion needed", why: "Almost all of this harvest is already committed. Keep the normal price.", steps };
    }

    // Best channel by contribution per first-time buyer among channels where buyers come back.
    const ranked = CAMPAIGNS.map((k) => ({ k, s: campaignStats(k) }))
      .filter((x) => x.s.repeatRate >= 0.25)
      .sort((a, b) => b.s.contributionPerBuyer - a.s.contributionPerBuyer);
    const best = ranked[0];
    steps.push(`Past campaigns where at least 25% of new buyers came back, ranked by contribution per new buyer: ${ranked.map((x) => x.k.channel + " " + money(x.s.contributionPerBuyer)).join(", ")}.`);

    // Recipe vs discount, from the recorded experiment.
    const recipe = campaignStats(CAMPAIGNS[0]), disc = campaignStats(CAMPAIGNS[1]);
    const theme = recipe.contribution >= disc.contribution ? "Recipe" : "Discount";
    steps.push(`Recipe vs discount test (C-101 vs C-102): contribution ${money(recipe.contribution)} vs ${money(disc.contribution)}, repeat rate ${pct(recipe.repeatRate)} vs ${pct(disc.repeatRate)}. Lead with: ${theme.toLowerCase()}.`);

    // Where: a collection point with room to grow that already likes this crop, else any with room.
    const pts = POINTS.map((p) => ({ p, s: pointStatus(p) }));
    const where = pts.find((x) => (x.s.key === "underused" || x.s.key === "retention") && x.p.topCrops.includes(c.id))
      || pts.find((x) => x.s.key === "underused");
    if (where) steps.push(`${where.p.area} (${where.p.id}) has room: ${where.s.now} of ${where.p.capacity} households, ${where.s.label.toLowerCase()}.`);

    // Offer: normal price unless lots is uncommitted; any discount must pass Margin Guard.
    let offer = "Normal price";
    if (share > R.discountUncommitted) {
      const discounted = Math.round(c.price * (1 - R.bundleDiscount));
      const floor = Math.round(c.cost * (1 + R.minMargin));
      if (discounted >= floor) { offer = `Bundle: ${pct(R.bundleDiscount)} off when bought with another green`; steps.push(`Over ${pct(R.discountUncommitted)} uncommitted. Bundle price ${money(discounted)}/kg passes Margin Guard (floor ${money(floor)}/kg).`); }
      else steps.push(`Over ${pct(R.discountUncommitted)} uncommitted, but a discount would break Margin Guard (floor ${money(floor)}/kg). Keep normal price.`);
    } else {
      steps.push(`Under ${pct(R.discountUncommitted)} uncommitted, so no discount: keep normal price.`);
    }

    const objective = verdict.key === "grow-demand" ? "Win back past buyers" : "Find first-time buyers";
    const audience = objective === "Win back past buyers"
      ? `Opted-in past buyers of ${c.name} with no order in 30+ days`
      : where ? `Households near ${where.p.area}, via leader ${where.p.id}` : "Followers in Singapore interested in home cooking";
    const channel = objective === "Win back past buyers" ? "WhatsApp (opted-in) + Instagram" : best ? best.k.channel : "Instagram";
    const tag = c.id.replace(/-/g, "") + "-" + theme.toLowerCase();

    return {
      none: false,
      title: `${theme}-led ${c.name} campaign`,
      objective, audience, channel, theme, offer,
      where: where ? where.p : null,
      capKg: unc,
      window: `Post ${c.harvestDay === "Sat" ? "Wed" : c.harvestDay === "Tue" ? "Sat" : "Mon"} 7–9pm, before the ${OFFERS.orderCutoff} cutoff for ${c.harvestDay} harvest`,
      link: utm(channel.toLowerCase().includes("whatsapp") ? "whatsapp" : channel.toLowerCase().split(" ")[0], channel.includes("Search") ? "organic" : "social", tag),
      measure: "Visits, first-time buyers, repeat buyers within 28 days, and contribution — not likes.",
      steps
    };
  }

  function drafts(c, rec) {
    const link = rec.link;
    const recipe = RECIPES.find((r) => r.crop === c.id);
    const dish = recipe ? recipe.title : c.name;
    return [
      { channel: "Instagram", text: `Harvesting ${c.name} (${c.zh}) on ${c.harvestDay} 🌱 Grown at MEOD in Kranji, Singapore.\n\nThis week try: ${dish} — ready in ${recipe ? recipe.mins : 15} minutes.\n\nOrder on MEOD Fresh (link in bio). Delivery ${OFFERS.deliveryDays}.` },
      { channel: "TikTok", text: `Hook (0–2s): "This was in the ground yesterday."\nShot 1: picking ${c.name} at sunrise.\nShot 2: wok, garlic, 60 seconds.\nShot 3: plated ${dish}.\nCaption: Singapore-grown ${c.name}. Order link in bio.` },
      { channel: "WhatsApp (leader)", text: `Hi neighbours! MEOD is harvesting fresh ${c.name} this ${c.harvestDay}${rec.where ? ` for our ${rec.where.area} pickup (${rec.where.day} ${rec.where.window})` : ""}. Easy idea: ${dish}. Order here: ${link}\nReply STOP to opt out.` }
    ];
  }

  function captionChecks(text, link) {
    return [
      { ok: text.length <= 2200, label: "Within Instagram's 2,200-character limit" },
      { ok: /singapore|kranji|meod/i.test(text), label: "Says it's grown by MEOD in Singapore" },
      { ok: !/\b\d+%\s*off|\$\s?\d/i.test(text) || /bundle/i.test(text), label: "No price or discount claim (needs MEOD approval)" },
      { ok: !/organic|cure|guarantee/i.test(text), label: "No 'organic', health or guarantee claims" },
      { ok: !link || text.includes(link) || /link in bio/i.test(text), label: "Has a trackable link (or 'link in bio')" }
    ];
  }

  window.MEOD = {
    STORE_URL, RULES, CROPS, RECIPES, POINTS, CAMPAIGNS, SEO_TOPICS, SEGMENTS, OFFERS,
    money, pct, sum, avg, crop, committedKg, uncommittedKg, margin, weekLabels, utm,
    locatePostal, nearestPoints, featuredCrops, plantingVerdict, pointStatus, campaignStats,
    recommendCampaign, drafts, captionChecks,
    get state() { return state; }, save, rules, track, reset
  };
})();
