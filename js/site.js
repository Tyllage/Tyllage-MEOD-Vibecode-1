/* Consumer page: Tyllage weekly savings + this week's harvest. Every interaction is logged locally with TY.track()
   so the farm view (growth.html) can show what this browser did. Nothing leaves the browser. */
(function () {
  "use strict";
  const M = window.TY, UI = window.UI, { h, leafArt, toast } = UI;

  /* ---------- header ---------- */
  const header = document.querySelector(".site-header");
  const onScroll = () => header.classList.toggle("solid", window.scrollY > 40);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const toggle = document.querySelector(".menu-toggle");
  const links = document.getElementById("nav-links");
  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(open));
    header.classList.toggle("menu-open", open);
  });
  links.addEventListener("click", (e) => {
    if (e.target.closest("a")) { links.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); header.classList.remove("menu-open"); }
  });

  /* ---------- bottom bar (phones): current section + account ---------- */
  const tabs = [...document.querySelectorAll(".tabbar a[data-tab]")];
  const watched = ["savings", "cook", "collect"].map((id) => document.getElementById(id));
  const markTab = () => {
    const y = window.scrollY + window.innerHeight * 0.4;
    const cur = watched.filter((sec) => sec.offsetTop <= y && sec.offsetTop + sec.offsetHeight > y)[0];
    const id = cur ? cur.id : window.scrollY < 300 ? "top" : "";
    tabs.forEach((t) => { const on = t.dataset.tab === id; t.classList.toggle("on", on); on ? t.setAttribute("aria-current", "location") : t.removeAttribute("aria-current"); });
  };
  window.addEventListener("scroll", markTab, { passive: true });
  markTab();
  const me = window.TyAccount && window.TyAccount.session();
  if (me) {
    const acc = document.getElementById("tab-account");
    acc.href = "login.html";
    acc.querySelector("span").textContent = "Account";
    acc.setAttribute("aria-label", "Account: " + me.name);
  }

  /* ---------- back to top + gentle reveal ---------- */
  const toTop = document.querySelector(".to-top");
  const onTop = () => toTop.classList.toggle("show", window.scrollY > 900);
  window.addEventListener("scroll", onTop, { passive: true });
  onTop();
  if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
    }), { rootMargin: "0px 0px -8% 0px" });
    document.querySelectorAll(".how-card, .promise, .steps li, .story-photo, .section-title, .crop-grid, .bundle-grid").forEach((el) => {
      el.classList.add("reveal");
      io.observe(el);
    });
  }

  const week = M.weekLabels(1)[0];
  document.getElementById("hero-week").textContent = "week of " + week;

  // Every store link carries UTM tags so Tyllage analytics can attribute the visit.
  document.querySelectorAll("[data-store]").forEach((a) => {
    a.href = M.utm("tyllage", "landing-page", "this-week-at-tyllage", a.dataset.store);
    a.addEventListener("click", () => M.track("store_click", a.dataset.store));
  });

  if (!sessionStorage.getItem("tg-visit")) {
    try { sessionStorage.setItem("tg-visit", "1"); } catch (e) { /* ignore */ }
    M.track("page_visit", "index");
  }

  /* ---------- this week's harvest ---------- */
  function renderHarvest() {
    const grid = document.getElementById("crop-grid");
    const list = M.featuredCrops();
    grid.replaceChildren(...list.map((c) => {
      const left = M.uncommittedKg(c);
      return h("article", { class: "crop-card card" },
        h("div", { class: "crop-media" },
          c.img ? h("img", { src: c.img, alt: c.name, width: 300, height: 300, loading: "lazy" }) : leafArt(),
          h("span", { class: "tag" }, "Harvest " + c.harvestDay)),
        h("div", { class: "crop-body" },
          h("h3", null, c.name, " ", h("span", { class: "zh", lang: "zh" }, c.zh)),
          h("p", null, c.story),
          h("p", { class: "avail" }, h("strong", null, left + " kg"), " still available this week"),
          h("div", { class: "crop-actions" },
            h("button", { class: "btn btn-sm btn-gold", type: "button",
              onclick: () => { M.track("product_click", c.id); addToBasket(c.id, 1); } }, "Add to basket · " + M.money(M.ourPack(c).cents)),
            h("a", { class: "btn btn-sm btn-outline", href: "#cook", onclick: () => { pickCrop = c.id; renderRecipes(); } }, "Recipes"))));
    }));
  }

  /* ---------- what should I cook? ---------- */
  let pickCrop = null;
  const cookForm = document.getElementById("cook-form");

  function renderRecipes() {
    const fd = new FormData(cookForm);
    const size = Number(fd.get("size"));
    const mins = Number(fd.get("mins"));
    const prefs = fd.getAll("pref");
    const available = new Set(M.featuredCrops().map((c) => c.id));

    const ranked = M.RECIPES
      .filter((r) => available.has(r.crop)) // never suggest something we can't sell this week
      .filter((r) => r.mins <= mins)
      .filter((r) => !(prefs.includes("no-spicy") && r.spicy))
      .filter((r) => prefs.filter((p) => p !== "no-spicy").every((p) => r.tags.includes(p)))
      .map((r) => {
        const c = M.crop(r.crop);
        // Rank: chosen crop first, then crops with more spare harvest, then quicker recipes.
        const score = (r.crop === pickCrop ? 100 : 0) + (M.uncommittedKg(c) / c.expected) * 50 - r.mins / 10;
        return { r, c, score };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);

    const list = document.getElementById("recipe-list");
    if (!ranked.length) {
      list.replaceChildren(h("div", { class: "card empty" },
        h("p", null, "No recipes match all of that with this week's harvest. Try allowing more time or fewer preferences.")));
      return;
    }
    list.replaceChildren(...ranked.map(({ r, c }) => {
      const grams = Math.ceil((r.gramsPerServing * size) / 50) * 50;
      return h("article", { class: "recipe card" },
        h("div", { class: "recipe-top" },
          h("h3", null, r.title),
          h("span", { class: "muted" }, r.mins + " min")),
        h("p", null, "You'll need about ", h("strong", null, grams + " g " + c.name), " for " + (size === 6 ? "5+" : size === 4 ? "3–4" : "1–2") + " people."),
        h("div", { class: "tags" }, r.tags.map((t) => h("span", { class: "mini-tag" }, t)), r.spicy ? h("span", { class: "mini-tag" }, "spicy") : null),
        h("button", { class: "btn btn-sm btn-forest", type: "button",
          onclick: () => { M.track("recipe_click", r.id); addToBasket(c.id, Math.max(1, Math.round(grams / M.PACK_G))); } }, "Add " + c.name + " to basket"));
    }));
  }
  cookForm.addEventListener("change", () => { pickCrop = null; renderRecipes(); });

  /* ---------- collection points ---------- */
  const postalForm = document.getElementById("postal-form");
  postalForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const code = postalForm.postal.value.trim();
    const err = document.getElementById("postal-error");
    const out = document.getElementById("point-list");
    const near = M.nearestPoints(code, 3);
    if (!near) {
      err.textContent = /^\d{6}$/.test(code) ? "We couldn't place that postal code. Check it and try again." : "Enter a 6-digit Singapore postal code.";
      out.replaceChildren();
      return;
    }
    err.textContent = "";
    M.track("postal_search", code.slice(0, 2));
    const R = M.rules();
    const close = near.filter((p) => p.km <= R.nearPointKm);
    const cards = near.map((p) => {
      const full = M.pointStatus(p).util > 0.95;
      return h("article", { class: "point card" + (p.km > R.nearPointKm ? " far" : "") },
        h("div", { class: "point-top" },
          h("h3", null, p.area),
          h("span", { class: "km" }, "~" + p.km.toFixed(1) + " km")),
        h("p", null, "Pickup ", h("strong", null, p.day + ", " + p.window)),
        h("p", { class: "muted" }, "Order by " + M.OFFERS.orderCutoff + ". Leader " + p.id + "."),
        full ? h("p", { class: "mini-tag warn" }, "Nearly full this week") : null,
        h("button", { class: "btn btn-sm btn-outline", type: "button", onclick: () => {
          M.track("join_interest", p.id);
          toast("In the real version, " + p.id + "'s leader would get your request. Nothing was sent.");
        } }, "Ask to join"));
    });
    const note = close.length ? null : h("div", { class: "card notice" },
      h("p", null, h("strong", null, "No pickup within " + R.nearPointKm + " km yet."), " Tell the farm what you'd buy below, so Tyllage knows there's demand in your area. Or ask Tyllage about becoming a group-buy leader."),
      h("a", { class: "btn btn-sm btn-forest", href: "#shape" }, "Tell the farm"));
    out.replaceChildren(...(note ? [note] : []), ...cards);
  });

  /* ---------- help shape our next harvest ---------- */
  const interestForm = document.getElementById("interest-form");
  const cropChips = document.getElementById("interest-crops");
  cropChips.replaceChildren(...M.CROPS.map((c) =>
    h("label", { class: "chip" }, h("input", { type: "checkbox", name: "crop", value: c.id }), " " + c.name)));

  function renderInterestSummary() {
    const box = document.getElementById("interest-summary");
    const mine = M.state.interests;
    // Base counts are synthetic (households), plus anything registered in this browser.
    const base = { "nai-bai": 38, "kai-lan": 14, "tuscan-kale": 22, "choy-sum": 17, "xiao-bai-cai": 10, mesclun: 12 };
    mine.forEach((i) => i.crops.forEach((id) => { base[id] = (base[id] || 0) + 1; }));
    const max = Math.max(...Object.values(base));
    box.replaceChildren(
      h("h3", null, "What neighbours have asked for"),
      h("ul", { class: "bars" }, M.CROPS.map((c) =>
        h("li", null,
          h("span", { class: "bar-label" }, c.name),
          h("span", { class: "bar-track" }, h("span", { class: "bar-fill", style: "width:" + Math.round((base[c.id] / max) * 100) + "%" })),
          h("span", { class: "bar-val" }, String(base[c.id]))))),
      h("p", { class: "form-note" }, "Households (demo numbers)" + (mine.length ? ", including your " + mine.length + " answer" + (mine.length > 1 ? "s" : "") : "") + "."));
  }

  interestForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(interestForm);
    const crops = fd.getAll("crop");
    const postal = String(fd.get("postal") || "").trim();
    const err = document.getElementById("interest-error");
    if (!crops.length) { err.textContent = "Pick at least one vegetable."; return; }
    if (postal && !M.locatePostal(postal)) { err.textContent = "That postal code doesn't look right. Leave it blank or enter 6 digits."; return; }
    if (!fd.get("consent")) { err.textContent = "Please tick the box so Tyllage can count your answer."; return; }
    err.textContent = "";
    // Only the postal sector is kept, never the full code.
    M.state.interests.push({ crops, freq: fd.get("freq"), via: fd.get("via"), sector: postal ? postal.slice(0, 2) : "", at: new Date().toISOString() });
    M.save();
    M.track("interest", crops.join(","));
    interestForm.reset();
    renderInterestSummary();
    toast("Thanks! The farm will count this. It's not an order.");
  });

  /* ---------- try something new (content-based recommendations) ---------- */
  const usual = document.getElementById("usual-crops");
  usual.replaceChildren(...M.CROPS.map((c) =>
    h("label", { class: "chip" }, h("input", { type: "checkbox", name: "usual", value: c.id }), " " + c.name)));

  function renderForYou() {
    const liked = [...usual.querySelectorAll("input:checked")].map((i) => i.value);
    const out = document.getElementById("foryou-out");
    if (!liked.length) { out.replaceChildren(h("p", { class: "muted" }, "Pick one or more to see a suggestion.")); return; }
    const prefs = new FormData(cookForm).getAll("pref");
    const top = M.recommendFor(liked, prefs).slice(0, 2);
    if (!top.length) { out.replaceChildren(h("p", { class: "muted" }, "You already buy everything we have this week!")); return; }
    out.replaceChildren(...top.map((r) => h("article", { class: "rec" },
      h("h4", null, r.c.name, " ", h("span", { class: "zh", lang: "zh" }, r.c.zh)),
      h("p", null, r.reason),
      r.recipe ? h("p", { class: "muted" }, "Try: " + r.recipe.title + " (" + r.recipe.mins + " min)") : null,
      h("button", { class: "btn btn-sm btn-gold", type: "button",
        onclick: () => { M.track("rec_click", r.c.id); addToBasket(r.c.id, 1); } }, "Add " + r.c.name + " to basket"))));
  }
  usual.addEventListener("change", renderForYou);
  cookForm.addEventListener("change", renderForYou);

  /* ---------- Ask Tyllage assistant ---------- */
  const chat = document.getElementById("chat");
  const chatLog = document.getElementById("chat-log");
  const chatOpen = document.getElementById("chat-open");
  const chatInput = document.getElementById("chat-input");
  const SUGGEST = ["What's fresh this week?", "Pickup near 820123", "How do I cook Kai Lan?", "Do you use pesticides?", "My order was missing items"];

  function bubble(who, ...kids) {
    chatLog.append(h("div", { class: "msg " + who }, kids));
    chatLog.scrollTop = chatLog.scrollHeight;
  }
  function ask(q) {
    if (!q.trim()) return;
    bubble("me", q);
    const a = M.answer(q);
    const safe = M.redact(q).slice(0, 300);
    if (a.escalate) M.state.inbox.push({ kind: "ticket", text: safe, at: new Date().toISOString(), status: "Open" });
    if (a.intent) M.state.inbox.push({ kind: "intent", text: safe, crop: a.intent.crop, qty: a.intent.qty, at: new Date().toISOString() });
    if (!a.escalate && !a.intent) M.state.inbox.push({ kind: "question", text: safe, answered: a.sources.length > 0, at: new Date().toISOString() });
    if (M.state.inbox.length > 300) M.state.inbox = M.state.inbox.slice(-300);
    M.save();
    M.track("assistant", a.escalate ? "escalated" : a.sources.length ? "answered" : "unanswered");
    bubble("bot",
      a.parts.map((p) => h("p", null, p)),
      a.links.map((l) => h("a", { class: "btn btn-sm btn-gold", href: "#savings", onclick: () => {
        const id = new URL(l.href).searchParams.get("utm_content") || "";
        if (id.startsWith("crop-")) addToBasket(id.slice(5), 1, true);
        setChat(false);
      } }, l.label)),
      a.sources.length ? h("p", { class: "src" }, "Source: " + a.sources.join(" · ")) : null);
  }
  function setChat(open) {
    chat.hidden = !open;
    chatOpen.setAttribute("aria-expanded", String(open));
    chatOpen.hidden = open;
    if (open) {
      if (!chatLog.children.length) bubble("bot", h("p", null, "Hi! I'm Tyllage's assistant. I can tell you what's being harvested, find a group-buy pickup and suggest recipes."));
      chatInput.focus();
    } else chatOpen.focus();
  }
  chatOpen.addEventListener("click", () => setChat(true));
  document.getElementById("chat-close").addEventListener("click", () => setChat(false));
  chat.addEventListener("keydown", (e) => { if (e.key === "Escape") setChat(false); });
  document.getElementById("chat-suggest").replaceChildren(...SUGGEST.map((s) =>
    h("button", { type: "button", class: "chip", onclick: () => ask(s) }, s)));
  document.getElementById("chat-form").addEventListener("submit", (e) => {
    e.preventDefault();
    ask(chatInput.value);
    chatInput.value = "";
  });

  /* ---------- your weekly veggie savings (Smart Value) ---------- */
  const savingsForm = document.getElementById("savings-form");
  const qty = { "nai-bai": 2, "xiao-bai-cai": 2 }; // starts as the small basket a S$10 delivery fee hurts most
  const basketBtn = document.querySelector('.nav-actions a[href="#savings"]');
  const offer = M.arm();
  let lastOrder = null;

  // Arriving through a campaign link (e.g. the Nai Bai scenario): basket and offer ready.
  const S = M.SCENARIO;
  const fromLink = new URLSearchParams(location.search).get("c");
  if (fromLink === S.CODE) {
    try { sessionStorage.setItem("ty-campaign", S.CODE); } catch (e) { /* ignore */ }
    Object.keys(qty).forEach((k) => delete qty[k]);
    Object.assign(qty, S.BASKET);
    if (!sessionStorage.getItem("ty-campaign-seen")) {
      try { sessionStorage.setItem("ty-campaign-seen", "1"); } catch (e) { /* ignore */ }
      M.track("campaign_visit", S.CODE);
    }
  }
  const campaign = (() => { try { return sessionStorage.getItem("ty-campaign") === S.CODE ? S.CODE : ""; } catch (e) { return ""; } })();
  // The offer applies to the first campaign order only; repeat orders are at the normal price.
  const campaignPromo = () => {
    if (!campaign || M.st().orders.some((o) => o.campaign === campaign)) return null;
    const o = S.plan().chosen;
    return o.discount ? { cents: o.discount, label: o.name, pickupOnly: true } : null;
  };

  function addToBasket(id, packs, quiet) {
    qty[id] = Math.min(12, (qty[id] || 0) + (packs || 1));
    renderSavings();
    if (!quiet) toast(M.crop(id).name + " added. Your total is under Savings.");
  }

  const QUICK = [
    { label: "Small top-up", qty: { "nai-bai": 2, "xiao-bai-cai": 2 } },
    { label: "1–2 people", size: 2 }, { label: "3–4 people", size: 4 }, { label: "5+ people", size: 6 }
  ];
  document.getElementById("quick-fill").replaceChildren(...QUICK.map((q) => h("button", { type: "button", class: "chip", onclick: () => {
    Object.keys(qty).forEach((k) => delete qty[k]);
    if (q.qty) Object.assign(qty, q.qty);
    else M.basket({ size: q.size, liked: [], mode: "pickup" }).lines.forEach((l) => { qty[l.c.id] = Math.max(1, Math.round(l.grams / M.PACK_G)); });
    M.track("quick_fill", q.label);
    renderSavings();
  } }, q.label)));

  function qtyRow(c) {
    const n = qty[c.id] || 0, p = M.ourPack(c);
    const step = (d) => () => { qty[c.id] = Math.max(0, Math.min(12, n + d)); renderSavings(); };
    return h("li", { class: n ? "on" : null },
      h("span", { class: "qty-name" }, h("strong", null, c.name), h("span", { class: "muted small" }, M.money(p.cents) + " · " + M.money(Math.round((p.cents * 100) / p.pack)) + "/100 g")),
      h("span", { class: "stepper" },
        h("button", { type: "button", "aria-label": "One less " + c.name, disabled: !n, onclick: step(-1) }, "−"),
        h("output", { "aria-label": c.name + " packs" }, String(n)),
        h("button", { type: "button", "aria-label": "One more " + c.name, onclick: step(1) }, "+")));
  }

  function renderSavings() {
    const fd = new FormData(savingsForm);
    const mode = fd.get("mode"), voucher = Number(fd.get("voucher"));
    const postal = String(fd.get("postal") || "").trim();
    const promo = campaignPromo();
    const co = M.checkout({ qty, mode, voucher, promo });
    const fu = M.fulfilment({ qty, postal: /^\d{6}$/.test(postal) ? postal : "", voucher, promo });
    const other = mode === "home" ? fu.pick : fu.home;
    const featured = M.featuredCrops();
    document.getElementById("qty-list").replaceChildren(...featured.concat(M.CROPS.filter((c) => qty[c.id] && !featured.includes(c))).map(qtyRow));
    basketBtn.textContent = co.goods ? "My basket · " + M.money(co.total) : "Check my savings";
    const packs = M.sum(Object.values(qty));
    const badge = document.getElementById("tab-count");
    badge.hidden = !packs;
    badge.textContent = String(packs);

    // The full checkout total: vegetables, bundle saving, fulfilment and any voucher.
    const voucherLine = voucher ? (co.voucherOk ? M.money(-co.voucherOff) : "Needs a " + M.money(M.VOUCHER_MIN) + " basket") : "None";
    document.getElementById("checkout").replaceChildren(...[
      h("span", { class: "eyebrow dark" }, "Estimated checkout total"),
      h("strong", { class: "big-total" }, M.money(co.total)),
      co.goods ? h("dl", { class: "basket-sum" },
        h("dt", null, "Vegetables"), h("dd", null, M.money(co.subtotal)),
        co.bundleOff ? [h("dt", null, "Bundle saving"), h("dd", { class: "save" }, M.money(-co.bundleOff))] : null,
        h("dt", null, mode === "home" ? "Home delivery" : "Group-buy pickup"), h("dd", null, co.fee ? M.money(co.fee) : "S$0.00"),
        h("dt", null, "Voucher"), h("dd", { class: co.voucherOk ? "save" : null }, voucherLine),
        promo ? [h("dt", null, "Campaign offer"), h("dd", { class: co.promoOff ? "save" : null }, co.promoOff ? M.money(-co.promoOff) : "Pickup only")] : null,
        h("dt", { class: "total" }, "You pay"), h("dd", { class: "total" }, M.money(co.total))) : h("p", { class: "muted" }, "Your basket is empty. Pick a starting point or add some greens."),
      co.goods && other.total !== co.total ? h("p", { class: "nudge" + (other.total > co.total ? " good" : "") },
        other.total > co.total ? `${mode === "home" ? "Pickup" : "Home delivery"} would cost ${M.money(other.total)}. You're saving ${M.money(other.total - co.total)}.`
          : `Pickup would cost ${M.money(other.total)}, ${M.money(co.total - other.total)} less.`) : null,
      co.goods ? rewardNote(voucher) : null,
      !co.pickupOk ? h("p", { class: "form-error" }, `Group-buy leaders pack baskets from ${M.money(M.PICKUP_MIN)}. Add a little more or choose delivery.`) : null,
      h("button", { class: "btn btn-forest", type: "button", disabled: !co.goods || !co.pickupOk, onclick: () => {
        lastOrder = M.placeOrder({ qty, mode, voucher, campaign, promo });
        if (lastOrder) { renderSavings(); renderOffer(); renderAfterOrder(); document.getElementById("after-order").scrollIntoView({ block: "nearest" }); toast("Demo order placed. Nothing was charged."); }
      } }, "Place demo order"),
      h("p", { class: "form-note" }, voucher ? "The voucher is hypothetical and not an active offer. " : "", "Assumes no extra group-buy collection charge.")].filter(Boolean));

    // Smart fulfilment: the cheapest practical option for this basket and postal code.
    document.getElementById("fulfil").replaceChildren(...[
      h("h3", null, "Cheapest practical way to get it ", UI.aiPill()),
      h("ul", { class: "fulfil-list" }, fu.options.map((o) => h("li", { class: (o.id === fu.best ? "best" : "") + (o.ok ? "" : " off") },
        h("span", null, h("strong", null, o.label), h("span", { class: "muted small block" }, o.detail)),
        h("strong", null, co.goods ? M.money(o.total) : "—")))),
      co.goods ? h("p", { class: "nudge good" }, fu.why) : null,
      fu.point && M.momentum(fu.point).gap > 0 ? h("p", { class: "small" }, h("strong", null, "Invite a neighbour: "),
        `${M.momentum(fu.point).gap} more households collecting at ${fu.point.area} would make this pickup cheaper to run, which helps keep prices fair.`) : null,
      co.goods && fu.best !== mode ? h("button", { class: "btn btn-sm btn-outline", type: "button", onclick: () => {
        savingsForm.querySelector(`input[name=mode][value=${fu.best}]`).checked = true;
        M.track("fulfil_switch", fu.best);
        renderSavings();
      } }, "Switch to " + (fu.best === "pickup" ? "pickup" : "home delivery")) : null].filter(Boolean));

    renderCompare(co, voucher, promo);
  }

  // A reward that fits this shopper: first-timers, occasional shoppers and loyal households differ.
  function rewardNote(voucher) {
    const r = M.rewardFor();
    return h("div", { class: "reward-note" },
      h("span", { class: "pill good" }, "For you · " + r.type),
      h("p", null, h("strong", null, r.name), " ", h("span", { class: "muted small" }, r.detail + " Illustrative.")),
      r.cents && voucher !== r.cents ? h("button", { class: "btn btn-sm btn-outline", type: "button", onclick: () => {
        const radio = savingsForm.querySelector(`input[name=voucher][value="${r.cents}"]`);
        if (radio) { radio.checked = true; M.track("reward_apply", r.type); renderSavings(); }
      } }, "Use it") : null);
  }

  function renderCompare(co, voucher, promo) {
    const box = document.getElementById("compare");
    if (!co.lines.length) { box.replaceChildren(h("h3", null, "Price check"), h("p", { class: "muted" }, "Add vegetables to compare prices.")); return; }
    const cmp = co.lines.map((l) => M.compareCrop(l.c));
    const bc = M.basketCompare(co.lines);
    const cell = (x, r) => {
      const hit = x.rows.filter((row) => row.retailer === r.id).sort((a, b) => (b.like - a.like) || (a.per100 - b.per100))[0];
      if (!hit) return h("span", { class: "muted" }, "Not stocked");
      return h("span", null, M.money(Math.round(hit.per100)), h("span", { class: "muted small block" }, (hit.like ? "Local" : "Imported, not like-for-like") + (hit.verified ? " · checked " + hit.checked : " · not checked yet")));
    };
    box.replaceChildren(
      h("h3", null, "Price check: per 100 g, like for like"),
      h("div", { class: "table-wrap" }, h("table", { class: "data-table compact" },
        h("thead", null, h("tr", null, h("th", { scope: "col" }, "Vegetable"), h("th", { scope: "col", class: "num" }, "Tyllage"), M.RETAILERS.map((r) => h("th", { scope: "col", class: "num" }, r.name)), h("th", { scope: "col" }, "Verdict"))),
        h("tbody", null, cmp.map((x) => h("tr", null,
          h("td", { "data-label": "Vegetable" }, x.c.name),
          h("td", { class: "num", "data-label": "Tyllage" }, M.money(Math.round(x.mine)), h("span", { class: "muted small block" }, "Local · picked on delivery day")),
          M.RETAILERS.map((r) => h("td", { class: "num", "data-label": r.name }, cell(x, r))),
          h("td", { "data-label": "Verdict" }, h("span", { class: "pill " + x.verdict.tone, title: x.verdict.text }, x.verdict.label))))))),
      h("p", { class: "compare-sum" }, h("strong", null, "Same grams of local veg: "),
        bc.map((b, i) => [i ? " · " : "", b.r.name + " " + (b.complete ? M.money(b.cents) : b.missing === co.lines.length ? "no local match" : M.money(b.cents) + " (no local match for " + b.missing + ")")]),
        " · ", h("strong", null, "Tyllage " + M.money(co.subtotal)), " before fulfilment."),
      ...fullCompareTable(voucher, promo),
      h("p", { class: "form-note" }, "Imported vegetables are often cheaper, so we only call a price 'cheaper' against Singapore-grown produce in a similar pack size. Supermarket and wet-market prices and online fees here are placeholders, not checked."));
  }

  // The whole basket, every way to buy it: vegetables, delivery or collection, vouchers and promos, and when prices were checked.
  function fullCompareTable(voucher, promo) {
    const fc = M.fullCompare({ qty, voucher, promo });
    return [
      h("h3", { class: "compare-title" }, "Your whole basket, every way to buy it"),
      h("div", { class: "table-wrap" }, h("table", { class: "data-table compact" },
        h("thead", null, h("tr", null, ["Where", "Vegetables", "Delivery or collection", "Vouchers & promos", "Total", "Price checked"].map((t, i) => h("th", { scope: "col", class: i && i < 5 ? "num" : null }, t)))),
        h("tbody", null, fc.rows.map((x) => h("tr", { class: x.ours ? "ours" : null },
          h("td", { "data-label": "Where" }, h("strong", null, x.who), h("span", { class: "muted small block" }, x.way + " · " + x.note)),
          h("td", { class: "num", "data-label": "Vegetables" }, x.complete ? M.money(x.veg) : x.missing + " not stocked locally"),
          h("td", { class: "num", "data-label": "Delivery or collection" }, x.fee ? M.money(x.fee) : "S$0.00"),
          h("td", { class: "num", "data-label": "Vouchers & promos" }, x.savings ? M.money(-x.savings) : x.savingsNote),
          h("td", { class: "num", "data-label": "Total" }, x.complete ? h("strong", null, M.money(x.total)) : "—"),
          h("td", { "data-label": "Price checked" }, x.checked)))))),
      fc.cheapest ? h("p", { class: "compare-sum" }, h("strong", null, "Cheapest complete basket: "), fc.cheapest.who + " (" + fc.cheapest.way.toLowerCase() + "), " + M.money(fc.cheapest.total) + ".") : null
    ].filter(Boolean);
  }

  // After a purchase: the retention offer and a one-tap repeat order.
  function renderAfterOrder() {
    const box = document.getElementById("after-order");
    const L = M.loyalty();
    const crop = M.crop(Object.keys(lastOrder.qty).find((k) => lastOrder.qty[k] > 0));
    const recipe = crop && M.RECIPES.find((r) => r.crop === crop.id);
    const done = L.qualifying % L.r.every;
    box.hidden = false;
    box.replaceChildren(...[
      h("h3", null, "Order " + lastOrder.id + " placed ", h("span", { class: "muted small" }, "(demo, nothing charged)")),
      h("p", null, `You paid ${M.money(lastOrder.total)} with ${lastOrder.mode === "home" ? "home delivery" : "group-buy pickup"}.`),
      h("div", { class: "loyalty-track", role: "img", "aria-label": `${done} of ${L.r.every} qualifying orders` },
        Array.from({ length: L.r.every }, (_, i) => h("span", { class: i < done ? "on" : null }))),
      h("p", null, L.rewardNow ? h("strong", null, `Your next qualifying order is ${M.money(L.r.amount)} off.`)
        : (lastOrder.goods < L.r.min ? `This order was under ${M.money(L.r.min)}, so it doesn't count yet. ` : "") + `${L.toNext} more qualifying order${L.toNext === 1 ? "" : "s"} (${M.money(L.r.min)}+) and the last one is ${M.money(L.r.amount)} off.`,
        h("span", { class: "muted small block" }, "Illustrative reward, sized so it still pays for itself.")),
      recipe ? h("p", { class: "muted" }, "Use it up: " + recipe.title + " (" + recipe.mins + " min).") : null,
      h("div", { class: "crop-actions" },
        h("button", { class: "btn btn-sm btn-forest", type: "button", onclick: () => {
          lastOrder = M.placeOrder({ qty: lastOrder.qty, mode: lastOrder.mode, voucher: 0, repeat: true, campaign: lastOrder.campaign });
          renderAfterOrder();
          toast("Next week's order placed (demo).");
        } }, "Order the same next week"),
        h("button", { class: "btn btn-sm btn-outline", type: "button", onclick: () => {
          M.track("reminder_optin", lastOrder.mode);
          toast("We'd remind you the day before the cutoff. Nothing was set up in this prototype.");
        } }, "Remind me before the cutoff"))].filter(Boolean));
  }

  // Offer test: this browser always sees the same one of three offers.
  function renderOffer() {
    if (campaign) {
      const o = S.plan().chosen, promo = campaignPromo();
      document.getElementById("offer-banner").replaceChildren(
        h("span", { class: "pill good" }, "Nai Bai week"),
        h("p", null, `Nai Bai + Xiao Bai Cai bundle, picked Thursday. ${promo ? o.name + " on your first order." : "Your bundle is ready to reorder."}`),
        h("a", { class: "btn btn-sm btn-gold", href: "#savings" }, "See my total"));
      return;
    }
    if (!sessionStorage.getItem("tg-offer")) {
      try { sessionStorage.setItem("tg-offer", "1"); } catch (e) { /* ignore */ }
      M.track("offer_view", offer.id);
    }
    const pickup = () => { savingsForm.querySelector("input[name=mode][value=pickup]").checked = true; };
    const act = {
      A: { cta: "Add the bundle", run: () => { const b = M.bundles()[0]; if (b) b.items.forEach((x) => addToBasket(x.c.id, Math.round(x.grams / M.PACK_G), true)); pickup(); renderSavings(); } },
      B: { cta: "Find my pickup", run: () => { pickup(); renderSavings(); savingsForm.postal.focus(); } },
      C: { cta: "How it works", run: () => { const r = M.loyalty().r; toast(`Every ${r.every}th order of ${M.money(r.min)}+ is ${M.money(r.amount)} off. Illustrative.`); } }
    }[offer.id];
    document.getElementById("offer-banner").replaceChildren(
      h("span", { class: "pill good" }, offer.name),
      h("p", null, offer.pitch),
      h("button", { class: "btn btn-sm btn-gold", type: "button", onclick: () => { M.track("offer_click", offer.id); act.run(); } }, act.cta));
  }
  savingsForm.addEventListener("change", renderSavings);
  savingsForm.addEventListener("submit", (e) => e.preventDefault());
  savingsForm.postal.addEventListener("input", () => {
    const v = savingsForm.postal.value.trim();
    if (!v || /^\d{6}$/.test(v)) renderSavings();
  });

  /* ---------- fresh deals: bundles, survey ---------- */
  document.getElementById("bundle-grid").replaceChildren(...M.bundles().map((bd) => h("article", { class: "card bundle" },
    h("h4", null, bd.name),
    h("p", null, bd.items.map((x) => x.grams + " g " + x.c.name).join(" + ")),
    h("p", null, h("strong", { class: "price" }, M.money(bd.price)), " ", h("s", { class: "muted" }, M.money(bd.full))),
    h("a", { class: "btn btn-sm btn-gold", href: "#savings", onclick: () => {
      M.track("bundle_click", bd.name);
      bd.items.forEach((x) => addToBasket(x.c.id, Math.round(x.grams / M.PACK_G), true));
      toast("Bundle added. The saving shows in your total.");
    } }, "Add the bundle"))));

  const survey = document.getElementById("survey");
  survey.addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(survey);
    const ans = { q1: fd.get("q1"), q2: fd.get("q2"), q3: fd.get("q3") };
    if (!ans.q1 || !ans.q2 || !ans.q3) { document.getElementById("survey-error").textContent = "Please answer all three."; return; }
    document.getElementById("survey-error").textContent = "";
    M.state.survey.push({ ...ans, at: new Date().toISOString() });
    M.save(); M.track("survey", "");
    survey.reset();
    toast("Thanks! That helps Tyllage decide between cheaper pickup and delivery.");
  });

  /* ---------- coming next: new crop demand test ---------- */
  function renderNewCrops() {
    const mine = (id, type) => M.state.newcrop.filter((x) => x.id === id && x.type === type).length;
    document.getElementById("newcrop-grid").replaceChildren(...M.NEW_CROPS.map((nc) => {
      const r = M.newCropRead(nc, mine(nc.id, "interest"), mine(nc.id, "reserve"));
      const reserved = mine(nc.id, "reserve") > 0;
      return h("article", { class: "card newcrop" },
        h("div", { class: "crop-media small" }, leafArt()),
        h("div", { class: "crop-body" },
          h("h3", null, nc.name, " ", h("span", { class: "zh", lang: "zh" }, nc.zh)),
          h("p", null, `About ${nc.weeksToHarvest} weeks from sowing. Around ${M.money(nc.price)}/kg.`),
          h("p", { class: "muted small" }, `${r.interest} interested · ${r.reserved} reserved`),
          h("div", { class: "crop-actions" },
            h("button", { class: "btn btn-sm btn-outline", type: "button", onclick: () => { M.state.newcrop.push({ id: nc.id, type: "interest", at: new Date().toISOString() }); M.save(); M.track("newcrop_interest", nc.id); renderNewCrops(); toast("Counted as interest."); } }, "I'm interested"),
            h("button", { class: "btn btn-sm btn-forest", type: "button", disabled: reserved, onclick: () => { M.state.newcrop.push({ id: nc.id, type: "reserve", at: new Date().toISOString() }); M.save(); M.track("newcrop_reserve", nc.id); renderNewCrops(); toast("Reserved a share of the first harvest. Nothing charged in this prototype."); } }, reserved ? "Reserved ✓" : "Reserve first harvest"))));
    }));
  }

  renderHarvest();
  renderRecipes();
  renderForYou();
  renderSavings();
  renderOffer();
  renderNewCrops();
  renderInterestSummary();
})();
