/* Consumer page: This Week at MEOD. Every interaction is logged locally with MEOD.track()
   so the farm view (growth.html) can show what this browser did. Nothing leaves the browser. */
(function () {
  "use strict";
  const M = window.MEOD, { h, leafArt, toast } = window.UI;

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

  const week = M.weekLabels(1)[0];
  document.getElementById("hero-week").textContent = "week of " + week;

  // Every store link carries UTM tags so MEOD Fresh analytics can attribute the visit.
  document.querySelectorAll("[data-store]").forEach((a) => {
    a.href = M.utm("tyllage", "landing-page", "this-week-at-meod", a.dataset.store);
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
      const link = M.utm("tyllage", "landing-page", "this-week-at-meod", "crop-" + c.id);
      return h("article", { class: "crop-card card" },
        h("div", { class: "crop-media" },
          c.img ? h("img", { src: c.img, alt: c.name, width: 300, height: 300, loading: "lazy" }) : leafArt(),
          h("span", { class: "tag" }, "Harvest " + c.harvestDay)),
        h("div", { class: "crop-body" },
          h("h3", null, c.name, " ", h("span", { class: "zh", lang: "zh" }, c.zh)),
          h("p", null, c.story),
          h("p", { class: "avail" }, h("strong", null, left + " kg"), " still available this week"),
          h("div", { class: "crop-actions" },
            h("a", { class: "btn btn-sm btn-gold", href: link, target: "_blank", rel: "noopener",
              onclick: () => M.track("product_click", c.id) }, "Buy on MEOD Fresh ↗"),
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
        h("a", { class: "btn btn-sm btn-forest", target: "_blank", rel: "noopener",
          href: M.utm("tyllage", "landing-page", "this-week-at-meod", "recipe-" + r.id),
          onclick: () => M.track("recipe_click", r.id) }, "Get the " + c.name + " ↗"));
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
      h("p", null, h("strong", null, "No pickup within " + R.nearPointKm + " km yet."), " Tell the farm what you'd buy below, so MEOD knows there's demand in your area. Or ask MEOD about becoming a group-buy leader."),
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
    if (!fd.get("consent")) { err.textContent = "Please tick the box so MEOD can count your answer."; return; }
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
      h("a", { class: "btn btn-sm btn-gold", target: "_blank", rel: "noopener",
        href: M.utm("tyllage", "landing-page", "this-week-at-meod", "foryou-" + r.c.id),
        onclick: () => M.track("rec_click", r.c.id) }, "Add " + r.c.name + " ↗"))));
  }
  usual.addEventListener("change", renderForYou);
  cookForm.addEventListener("change", renderForYou);

  /* ---------- Ask MEOD assistant ---------- */
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
      a.links.map((l) => h("a", { class: "btn btn-sm btn-gold", href: l.href, target: "_blank", rel: "noopener" }, l.label)),
      a.sources.length ? h("p", { class: "src" }, "Source: " + a.sources.join(" · ")) : null);
  }
  function setChat(open) {
    chat.hidden = !open;
    chatOpen.setAttribute("aria-expanded", String(open));
    chatOpen.hidden = open;
    if (open) {
      if (!chatLog.children.length) bubble("bot", h("p", null, "Hi! I'm MEOD's assistant. I can tell you what's being harvested, find a group-buy pickup and suggest recipes."));
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

  /* ---------- fresh deals: basket builder, bundles, survey ---------- */
  const basketForm = document.getElementById("basket-form");
  document.getElementById("basket-likes").replaceChildren(...M.featuredCrops().map((c) =>
    h("label", { class: "chip" }, h("input", { type: "checkbox", name: "like", value: c.id }), " " + c.name)));

  function renderBasket() {
    const fd = new FormData(basketForm);
    const mode = fd.get("mode"), size = Number(fd.get("hh"));
    const b = M.basket({ size, liked: fd.getAll("like"), mode });
    const D = M.DELIVERY;
    const other = M.basket({ size, liked: fd.getAll("like"), mode: mode === "home" ? "pickup" : "home" });
    // replaceChildren() would print a null as "null", so build the list and drop empty items.
    document.getElementById("basket").replaceChildren(...[
      h("h3", null, "Your week of greens"),
      h("ul", { class: "basket-lines" }, b.lines.map((l) => h("li", null,
        h("span", null, h("strong", null, l.c.name), " · " + l.grams + " g", l.recipe ? h("span", { class: "muted small" }, " — try " + l.recipe.title) : null),
        h("span", null, M.money(l.cents))))),
      h("dl", { class: "basket-sum" },
        h("dt", null, "Vegetables"), h("dd", null, M.money(b.subtotal)),
        h("dt", null, mode === "home" ? "Home delivery" : "Group-buy pickup"), h("dd", null, b.e.fee ? M.money(b.e.fee) : "No delivery fee"),
        h("dt", { class: "total" }, "You pay"), h("dd", { class: "total" }, M.money(b.e.customerPays))),
      mode === "home" && b.gap ? h("p", { class: "nudge" }, `Add ${M.money(b.gap)} more for free delivery, or choose group-buy pickup and pay ${M.money(other.e.customerPays)}.`) : null,
      mode === "pickup" ? h("p", { class: "nudge good" }, `Home delivery for this basket would be ${M.money(other.e.customerPays)}.`) : null,
      h("div", { class: "crop-actions" },
        h("a", { class: "btn btn-sm btn-gold", target: "_blank", rel: "noopener", href: M.utm("tyllage", "landing-page", "fresh-deals", "basket-" + mode), onclick: () => M.track("basket_click", mode) }, "Shop this on MEOD Fresh ↗"),
        mode === "pickup" ? h("a", { class: "btn btn-sm btn-outline", href: "#collect" }, "Find my pickup") : null,
        h("button", { class: "btn btn-sm btn-outline", type: "button", onclick: () => {
          M.state.subs.push({ size, mode, crops: b.lines.map((l) => l.c.id), at: new Date().toISOString() });
          M.save(); M.track("sub_interest", String(size));
          toast("Noted! MEOD will count you as interested in a weekly box. No sign-up or payment.");
        } }, "I'd like this weekly")),
      h("p", { class: "form-note" }, `Quantities are a guide for ${size === 6 ? "5+" : size === 4 ? "3–4" : "1–2"} people. Prices are demo prices.`)].filter(Boolean));
  }
  basketForm.addEventListener("change", renderBasket);

  document.getElementById("bundle-grid").replaceChildren(...M.bundles().map((bd) => h("article", { class: "card bundle" },
    h("h4", null, bd.name),
    h("p", null, bd.items.map((x) => x.grams + " g " + x.c.name).join(" + ")),
    h("p", null, h("strong", { class: "price" }, M.money(bd.price)), " ", h("s", { class: "muted" }, M.money(bd.full))),
    h("a", { class: "btn btn-sm btn-gold", target: "_blank", rel: "noopener", href: M.utm("tyllage", "landing-page", "fresh-deals", "bundle"), onclick: () => M.track("bundle_click", bd.name) }, "Get the bundle ↗"))));

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
    toast("Thanks! That helps MEOD decide between cheaper pickup and delivery.");
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
  renderBasket();
  renderNewCrops();
  renderInterestSummary();
})();
