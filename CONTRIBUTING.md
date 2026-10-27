# Contributing

> **Tyllage does not accept outside contributions.**
> This repository is proprietary and is maintained only by the Tyllage team. Pull requests, patches, issues and feature work from anyone outside the team will be closed without review. Forking or copying this repository does not give you any right to use, run, modify or redistribute the code. See [LICENSE](LICENSE).

If you are not a member of the Tyllage team:

- **Found a security problem?** Report it privately as described in [SECURITY.md](SECURITY.md). Do not open a public issue.
- **Interested in licensing, a pilot or a partnership?** Contact the team through the [Tyllage GitHub organisation](https://github.com/Tyllage).

The rest of this guide is for **Tyllage team members** only, working on the Tyllage Growth Intelligence prototype. This is a vibecoding project: move fast, but keep it tidy and keep it safe.

## Ownership of your work

All work you do on this repository belongs to Tyllage LLP and is covered by the [Tyllage Proprietary License](LICENSE). Don't commit code, images or text you don't have the right to give to Tyllage, and don't copy code from other projects unless its licence allows it and the team has agreed. Note any third-party code and its licence in the pull request.

Do not copy Tyllage code into personal projects, other repositories or public places (gists, forums, AI chat tools that keep your data) without approval.

## Getting started

```bash
git clone https://github.com/Tyllage/Tyllage-Tyllage-Vibecode-1.git
cd Tyllage-Tyllage-Vibecode-1
py -m http.server 5173
```

Then open http://localhost:5173 (consumer page) and http://localhost:5173/growth.html (farm view). There's no build step and no `npm install`. If a change doesn't show up, hard refresh (**Ctrl + Shift + R**), because browsers cache the JS and CSS.

To start with fresh data, use **Farm view → Settings → Reset demo data**, or clear the site's storage.

## Branches and commits

- Branch from `main`: `feat/leader-recruitment`, `fix/recipe-scaling`, `docs/readme`.
- Keep commits small, with an imperative subject: `Add pickup capacity alert`.
- Open a pull request into `main`. At least one teammate reviews it before merge.

## Code conventions

- **Plain HTML, CSS and JavaScript.** No frameworks or bundlers unless the team agrees.
- JS files are self-contained IIFEs. `data.js` exposes `window.TY` (data, rules, core decision logic, state); `intel.js`, `insights.js` and `value.js` (Smart Value & Demand Engine) add the intelligence engine to `window.TY`; `ui.js` exposes `window.UI` (DOM helpers). Load order: `data.js → intel.js → insights.js → value.js → ui.js → site.js` or `… → value.js → ui.js → growth.js`.
- **Never put data into `innerHTML`.** Build DOM with `UI.h()` (and `UI.s()` for SVG), which only ever sets `textContent`.
- **Never pass `null` to `replaceChildren()`**: it prints "null". Build the list and `.filter(Boolean)` first.
- **Prices and promotions are deterministic.** Any offer, bundle or box goes through `orderEconomics()` and Margin Guard; AI ranks and explains, it never sets a price.
- **Decision logic lives in `js/data.js`, `js/intel.js` and `js/insights.js`**, not in the views. Views call `plantingVerdict()`, `forecastRead()`, `strategy()`, `rfm()`, `answer()` and so on, so the logic can move to a server later.
- **Every AI-assisted screen gets a `howNote(now, later)`** saying what it does today and what changes with real data or an LLM. An LLM may only rephrase or draft from facts Tyllage already has; it never adds figures.
- Money is **integer cents**. Format it only with `TY.money()`.
- Business rules (thresholds, rates, distances) live in `RULES` in `js/data.js`. Don't hard-code them elsewhere. If staff should be able to tune one, add it to `FIELDS` in the Settings view.
- **AI features:** mark them with `aiPill()` / `aiTitle()` so every one carries the same *AI-assisted* pill. Show how a suggestion was worked out (a **Why?** panel built with `why(steps)`), say so when the data can't answer, and never let a suggestion post, message or change anything on its own.
- **Demand evidence has a ranking:** paid repeat orders > paid first orders > registered interest > visits > likes. Don't build a feature that treats interest or reach as demand.
- **Charts:** one hue (`--forest`), one y-axis, a recessive grid, a dashed reference line where useful, and a hover/focus tooltip on every mark (`hover()` in `growth.js`). Status colours (good / warn / bad) are only for pills, and pills always carry a symbol and a word.
- In CSS grids, use `minmax(0, 1fr)` (not `1fr`) for columns that hold tables or long text so nothing pushes the page wider than the screen.
- Use the CSS tokens in `:root` (`--forest`, `--gold`, `--berry`, `--stony`). Don't add new colours.
- New hub pages go in `TABS` in `js/growth.js` with a `group` (`home`, `win`, `keep`, `grow`, `admin`). Deep links use `#tab/param` (e.g. `#demand/nai-bai`).

## Data rules

- **Synthetic data only.** Pseudonymous leader IDs (`PG-01`), made-up quantities and prices.
- Never paste real Tyllage customer, order, sales, WhatsApp or analytics data into the repo, issues, screenshots or AI tools.
- Store the least possible: the consumer page keeps only the postal **sector**, never a full postal code or contact details.

## Before you open a PR

- [ ] Pages load with no console errors
- [ ] Checked at 375 px wide (no horizontal scroll), tablet (768 px) and desktop
- [ ] Tried every hub tab, and the consumer page → farm view loop
- [ ] New AI features carry the AI-assisted pill and show how they reached their answer
- [ ] Keyboard works: Tab through forms, chips, chart bars and tabs
- [ ] Hard-refreshed so you are testing the latest JS and CSS
- [ ] Updated `README.md` / `audit.md` if behaviour or scope changed

## Reporting bugs and ideas

Team members: open an issue with steps to reproduce, the expected vs actual result, browser, and a screenshot. For security issues, follow [SECURITY.md](SECURITY.md) instead. Outside the team, the only reports we accept are security reports through [SECURITY.md](SECURITY.md).

By contributing you agree to follow our [Code of Conduct](CODE_OF_CONDUCT.md) and confirm that your work belongs to Tyllage LLP under the [Tyllage Proprietary License](LICENSE).
