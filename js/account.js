/* Text size and mock sign-in, shared by every page. Loaded in <head> so the saved text size applies
   before first paint and the team view can send signed-out visitors to the login page.
   MOCK ONLY: the "session" is a name and a role in localStorage. No password is stored or checked
   against anything, and anyone can edit localStorage, so this protects nothing. */
(function () {
  "use strict";
  const SESSION_KEY = "tyllage-session-v1";
  const SIZE_KEY = "tyllage-text-size";
  const SIZES = [{ id: "1", label: "A", name: "Standard text" }, { id: "1.15", label: "A+", name: "Larger text" }, { id: "1.3", label: "A++", name: "Largest text" }];
  const root = document.documentElement;

  const read = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const write = (k, v) => { try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) { /* storage blocked */ } };

  function textSize() { return SIZES.some((s) => s.id === read(SIZE_KEY)) ? read(SIZE_KEY) : "1"; }
  function setTextSize(id) {
    write(SIZE_KEY, id);
    root.style.setProperty("--text-scale", id);
    document.querySelectorAll(".text-size button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.size === id)));
  }
  root.style.setProperty("--text-scale", textSize());

  function session() {
    try { const s = JSON.parse(read(SESSION_KEY)); return s && s.name && s.role ? s : null; } catch (e) { return null; }
  }
  // Only a display name and a role are kept: never the password, email or phone number.
  function signIn(name, role) { write(SESSION_KEY, JSON.stringify({ name: String(name).slice(0, 40), role, at: new Date().toISOString() })); }
  function signOut() { write(SESSION_KEY, null); }
  // "Mdm Lim Ah Hua" -> "Mdm Lim", "Mei Tan" -> "Mei": a friendly greeting without dropping a title.
  function shortName(name) {
    const w = String(name).trim().split(/\s+/);
    return /^(mr|mrs|ms|mdm|miss|dr|uncle|aunty|auntie)\.?$/i.test(w[0]) && w[1] ? w[0] + " " + w[1] : w[0];
  }

  // <html data-require="team"> pages bounce to the login page unless signed in as team.
  if (root.dataset.require === "team" && (!session() || session().role !== "team")) {
    location.replace("login.html?role=team&next=" + encodeURIComponent(location.pathname.split("/").pop() + location.hash));
  }

  function el(tag, attrs, text) {
    const n = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => n.setAttribute(k, v));
    if (text) n.textContent = text;
    return n;
  }

  function mountTextSize(host) {
    const group = el("div", { class: "text-size", role: "group", "aria-label": "Text size" });
    SIZES.forEach((s) => {
      const b = el("button", { type: "button", "data-size": s.id, "aria-pressed": String(textSize() === s.id), "aria-label": s.name, title: s.name }, s.label);
      b.addEventListener("click", () => setTextSize(s.id));
      group.append(b);
    });
    host.replaceChildren(group);
  }

  function mountAccount(host) {
    const s = session();
    const light = host.dataset.tone === "light";
    if (!s) {
      const next = location.pathname.split("/").pop() || "index.html";
      host.replaceChildren(el("a", { class: "btn btn-sm " + (light ? "btn-outline-light" : "btn-outline"), href: "login.html?next=" + encodeURIComponent(next) }, "Log in"));
      return;
    }
    const wrap = el("div", { class: "account" });
    const hi = el("span", { class: "account-name" }, "Hi, " + shortName(s.name));
    const out = el("button", { type: "button", class: "btn btn-sm " + (light ? "btn-outline-light" : "btn-outline") }, "Log out");
    out.addEventListener("click", () => { signOut(); location.href = root.dataset.require ? "login.html" : location.pathname.split("/").pop() || "index.html"; });
    wrap.append(hi, out);
    host.replaceChildren(wrap);
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll("[data-mount=text-size]").forEach(mountTextSize);
    document.querySelectorAll("[data-mount=account]").forEach(mountAccount);
  });

  window.TyAccount = { session, signIn, signOut, shortName, textSize, setTextSize };
})();
