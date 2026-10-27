/* Small DOM helpers shared by both pages. Data always goes in through textContent, never innerHTML. */
(function () {
  "use strict";

  // h("div", { class: "card", onclick: fn }, "text", childNode, [more, children])
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
      else if (k === "class") el.className = v;
      else if (k === "dataset") Object.assign(el.dataset, v);
      else if (v === true) el.setAttribute(k, "");
      else el.setAttribute(k, v);
    }
    append(el, kids);
    return el;
  }

  function append(el, kids) {
    for (const kid of kids.flat(Infinity)) {
      if (kid === null || kid === undefined || kid === false) continue;
      el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }

  const NS = "http://www.w3.org/2000/svg";
  function s(tag, attrs, ...kids) {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) if (v !== null && v !== undefined) el.setAttribute(k, v);
    for (const kid of kids.flat(Infinity)) {
      if (kid === null || kid === undefined || kid === false) continue;
      el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }

  // Fixed leaf illustration for crops without a photo (code-authored, no data inside).
  function leafArt() {
    return s("svg", { viewBox: "0 0 64 64", class: "leaf-art", "aria-hidden": "true" },
      s("path", { d: "M32 58C32 40 32 26 32 10", stroke: "currentColor", "stroke-width": "3", fill: "none", "stroke-linecap": "round" }),
      s("path", { d: "M32 40C18 38 10 26 12 12c14 2 22 12 20 28z", fill: "currentColor", opacity: ".85" }),
      s("path", { d: "M32 32c12-2 20-12 20-24-12 0-20 10-20 24z", fill: "currentColor", opacity: ".6" }));
  }

  function aiPill() {
    return h("span", { class: "ai-pill", title: "Rule-based in this prototype. A person approves every action." }, "AI-assisted");
  }

  function toast(msg) {
    let t = document.querySelector(".toast");
    if (!t) { t = h("div", { class: "toast", role: "status", "aria-live": "polite" }); document.body.append(t); }
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove("show"), 2600);
  }

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); toast("Copied"); }
    catch (e) { toast("Couldn't copy. Select the text and copy it instead."); }
  }

  window.UI = { h, s, append, leafArt, aiPill, toast, copy };
})();
