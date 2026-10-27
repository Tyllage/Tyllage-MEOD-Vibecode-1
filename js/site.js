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

  renderHarvest();
  renderRecipes();
  renderInterestSummary();
})();
