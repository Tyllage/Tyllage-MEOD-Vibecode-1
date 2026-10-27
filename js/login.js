/* Mock log-in for shoppers and team members. Any well-formed details work. Only a display name and
   a role are saved (via TyAccount); the email, mobile number and password are never stored or sent. */
(function () {
  "use strict";
  const { h, toast } = window.UI, A = window.TyAccount;
  const params = new URLSearchParams(location.search);
  // Only ever return to one of our own pages, never to a URL taken from the query string.
  const safeNext = (v) => (/^(index|growth)\.html(#[\w\/-]*)?$/.test(v || "") ? v : "");
  const DEMO = {
    shopper: { id: "mei.tan@example.com", name: "Mei Tan" },
    team: { id: "team@example.com", name: "Alex Lim" }
  };
  const ui = { role: params.get("role") === "team" ? "team" : "shopper", mode: "login" };
  const card = document.getElementById("login-card");

  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  const mobile = (v) => v.replace(/[\s-]/g, "").replace(/^\+?65/, "");
  const isMobile = (v) => /^[89]\d{7}$/.test(mobile(v));
  const nameFrom = (id) => {
    const demo = Object.values(DEMO).find((d) => d.id === id.toLowerCase());
    if (demo) return demo.name;
    if (!isEmail(id)) return "Shopper";
    const first = id.split("@")[0].split(/[._-]/)[0];
    return first ? first[0].toUpperCase() + first.slice(1).toLowerCase() : "Shopper";
  };
  const destination = () => safeNext(params.get("next")) || (ui.role === "team" ? "growth.html" : "index.html");

  function field(label, input, hint) {
    const err = h("span", { class: "form-error", id: input.id + "-err", role: "alert" });
    input.setAttribute("aria-describedby", input.id + "-err");
    return h("label", { class: "field", for: input.id }, h("span", null, label, hint ? h("span", { class: "hint" }, " " + hint) : null), input, err);
  }

  function passwordField(id, label, autocomplete) {
    const input = h("input", { id, name: "password", type: "password", autocomplete, required: true, minlength: 8 });
    const btn = h("button", { type: "button", class: "pw-toggle", "aria-controls": id, "aria-pressed": "false", onclick: () => {
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.textContent = show ? "Hide" : "Show";
      btn.setAttribute("aria-pressed", String(show));
    } }, "Show");
    const err = h("span", { class: "form-error", id: id + "-err", role: "alert" });
    input.setAttribute("aria-describedby", id + "-err");
    return h("label", { class: "field", for: id }, h("span", null, label, h("span", { class: "hint" }, " at least 8 characters")), h("div", { class: "pw-wrap" }, input, btn), err);
  }

  function setError(form, name, msg) {
    const input = form.elements[name];
    input.setAttribute("aria-invalid", msg ? "true" : "false");
    document.getElementById(input.id + "-err").textContent = msg || "";
    return !msg;
  }

  function submit(e) {
    e.preventDefault();
    const f = e.currentTarget;
    const id = f.elements.id.value.trim();
    const pw = f.elements.password.value;
    const name = f.elements.fullname ? f.elements.fullname.value.trim() : "";
    const ok = [
      f.elements.fullname ? setError(f, "fullname", name.length < 2 ? "Please enter your name." : "") : true,
      setError(f, "id", !id ? (ui.role === "team" ? "Please enter your work email." : "Please enter your email or mobile number.")
        : ui.role === "team" ? (isEmail(id) ? "" : "Team members log in with an email address.")
        : isEmail(id) || isMobile(id) ? "" : "That doesn't look like an email or a Singapore mobile number (8 digits, starting with 8 or 9)."),
      setError(f, "password", pw.length < 8 ? "Your password needs at least 8 characters." : "")
    ].every(Boolean);
    if (!ok) { f.querySelector("[aria-invalid=true]").focus(); return; }
    A.signIn(name || nameFrom(id), ui.role === "team" ? "team" : "shopper");
    f.querySelector("button[type=submit]").textContent = "Logging you in…";
    setTimeout(() => { location.href = destination(); }, 400);
  }

  function render() {
    const me = A.session();
    document.getElementById("art-title").textContent = ui.role === "team" ? "Welcome to the team view." : "Fresh greens, fair prices.";
    if (me) {
      card.replaceChildren(h("div", { class: "signed-in" },
        h("h2", null, "Hi, " + me.name),
        h("p", null, "You're logged in as a ", h("strong", null, me.role === "team" ? "team member" : "shopper"), "."),
        h("div", { class: "crop-actions" },
          h("a", { class: "btn btn-forest", href: safeNext(params.get("next")) || (me.role === "team" ? "growth.html" : "index.html") }, "Continue"),
          h("button", { class: "btn btn-outline", type: "button", onclick: () => { A.signOut(); toast("You're logged out."); render(); } }, "Log out"))));
      return;
    }
    const signup = ui.mode === "signup" && ui.role === "shopper";
    const form = h("form", { novalidate: true, onsubmit: submit },
      signup ? field("Your name", h("input", { id: "fullname", name: "fullname", autocomplete: "name", required: true })) : null,
      field(ui.role === "team" ? "Work email" : "Email or mobile number",
        h("input", { id: "id", name: "id", type: ui.role === "team" ? "email" : "text", inputmode: ui.role === "team" ? "email" : null, autocomplete: "username", required: true, placeholder: ui.role === "team" ? "you@example.com" : "e.g. 9123 4567" })),
      passwordField("password", "Password", signup ? "new-password" : "current-password"),
      signup ? null : h("div", { class: "login-row" },
        h("label", { class: "check" }, h("input", { type: "checkbox", name: "remember", checked: true }), h("span", null, "Keep me logged in")),
        h("button", { type: "button", class: "link-btn", onclick: () => toast("In the real app we'd send you a reset link. Nothing was sent.") }, "Forgot password?")),
      h("button", { class: "btn btn-forest btn-block", type: "submit" }, signup ? "Create my account" : "Log in"));

    card.replaceChildren(...[
      h("h2", null, signup ? "Create your account" : ui.role === "team" ? "Team log in" : "Welcome back"),
      h("p", { class: "muted" }, signup ? "Save your basket, reorder in one tap and earn rewards." : ui.role === "team" ? "For Tyllage staff: prices, offers, customers and planting." : "Log in to see your basket, rewards and past orders."),
      h("div", { class: "segmented", role: "group", "aria-label": "Who's logging in?" },
        [["shopper", "I'm shopping"], ["team", "Tyllage team"]].map(([id, label]) => h("button", { type: "button", "aria-pressed": String(ui.role === id), onclick: () => { ui.role = id; ui.mode = "login"; render(); } }, label))),
      form,
      ui.role === "shopper" ? [
        h("div", { class: "or" }, "or"),
        h("a", { class: "btn btn-outline btn-block", href: safeNext(params.get("next")) || "index.html" }, "Continue as a guest"),
        h("p", { class: "muted", style: "text-align:center;margin-top:14px" },
          signup ? "Already have an account? " : "New to Tyllage? ",
          h("button", { type: "button", class: "link-btn", onclick: () => { ui.mode = signup ? "login" : "signup"; render(); } }, signup ? "Log in" : "Create an account"))
      ] : null,
      signup ? null : h("div", { class: "demo-box" },
        h("p", null, h("strong", null, "Demo account. "), "Any email and an 8+ character password work. Or fill in the demo details:"),
        h("button", { type: "button", class: "btn btn-sm btn-outline", onclick: () => {
          form.elements.id.value = DEMO[ui.role].id;
          form.elements.password.value = "demo-password";
          form.elements.id.focus();
        } }, "Fill in " + (ui.role === "team" ? "team" : "shopper") + " demo"))
    ].flat().filter(Boolean));
  }

  render();
})();
