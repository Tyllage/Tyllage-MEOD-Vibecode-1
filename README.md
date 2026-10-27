# Tyllage × MEOD Farm — Growth Intelligence (Vibecode 1)

A clickable prototype for **MEOD Farm** that answers one question:

> *"If we grow another 100 kg of vegetables next month, who is actually going to buy them?"*

Most farms work **grow → find buyers → sell**. This prototype tries part of it the other way round: **attract customers → convert them → keep them → validate demand → plan production with confidence.** Tyllage stays MEOD's technology partner, a frontman for helping the farm grow, not a middleman selling its vegetables. Customers see MEOD, trust MEOD and buy from MEOD Fresh.

It has two parts:

1. **Consumer page (`index.html`): *This Week at MEOD*.** A MEOD-branded, mobile-first page that shows this week's harvest, suggests recipes using only produce that's actually available, finds the nearest **group-buy collection point** from a postal code, and lets households tell the farm what they'd buy regularly (*Help shape our next harvest*). Every store link is UTM-tagged so MEOD Fresh can attribute visits.
2. **Farm view (`growth.html`): *Growth Intelligence Hub*.** Seven tabs for MEOD staff: Overview, **Campaign Studio**, **SEO**, **Customers**, **Collection points**, **Demand → Planting** and **Settings**.

Built with plain **HTML, CSS and vanilla JavaScript**. There's no framework, no build step and no backend.

> **Proprietary software. © 2026 Tyllage LLP. All rights reserved.**
> This repository is not open source. Being able to see it on GitHub does not give you permission to copy, use, run, modify, deploy or redistribute any part of it. Outside contributions are not accepted. See [LICENSE](LICENSE).

> ⚠️ **Prototype only.** All data is synthetic and lives in the visitor's browser (`localStorage`). There is no sign-in: the farm view is open to anyone with the link. Every "AI" feature is rule-based: no data is sent to an AI service. Don't put real customer data in this repo. See [SECURITY.md](SECURITY.md) and [audit.md](audit.md).

---

## Run it locally

Any static file server works. From the repo root:

```bash
py -m http.server 5173
```

Then open http://localhost:5173. `npx serve .` or VS Code Live Server work too. Opening `index.html` straight from the file system also works.

> **Seeing an old version after an update?** Browsers cache the JS and CSS. Do a hard refresh (**Ctrl + Shift + R**, or **Cmd + Shift + R** on Mac).

## Deploy to GitHub Pages

The site is plain static files with relative paths, so it runs on GitHub Pages as it is. There's no build step. `.nojekyll` tells Pages to serve the files untouched.

1. Push to GitHub.
2. In the repo, go to **Settings → Pages**.
3. Under **Build and deployment**, set **Source** to *Deploy from a branch*, choose **main** and **/ (root)**, and save.
4. After a minute the site is live at `https://<org-or-user>.github.io/<repo-name>/`. The farm view is at `…/growth.html`.

Every push to `main` redeploys automatically.

> **Heads-up:** the GitHub Pages site is public. It only ever holds the synthetic demo data in each visitor's browser. Never connect real data or API keys to it.

---

## Consumer page — This Week at MEOD

| Section | What's on it |
|---|---|
| **Hero** | "Fresh from the farm. Made for your table." with the current week, plus delivery facts (Tue / Thu / Sat, free from S$60, or collect from a group buy) |
| **This week's harvest** | Crop cards chosen by Tyllage: only crops with enough **uncommitted** harvest to sell, most spare first. Each shows harvest day, kg still available, *Buy on MEOD Fresh ↗* (tracked link) and *Recipes* |
| **What should I cook?** | Household size, time to cook and preferences (vegetarian, kid-friendly, no spicy). Recipes are filtered to crops available this week, ranked by spare harvest, and scaled to the household ("about 250 g Nai Bai for 1–2 people"). Each links to the product on MEOD Fresh |
| **Collect from a neighbour** | Enter a 6-digit postal code to see the 3 nearest group-buy pickups (area, distance, day, window, order cutoff). If none is within 3 km, it asks you to register interest instead. *Ask to join* is simulated: nothing is sent |
| **Help shape our next harvest** | Pick crops, frequency and pickup or delivery; optional postal code; a consent tick. Clearly labelled *not an order*. Only the postal **sector** (first two digits) is stored. A bar list shows what neighbours have asked for (demo numbers plus yours) |
| **Meet your farmers** | Three short farm stories with MEOD's photos |

The **Farm view** button in the nav opens the hub. The footer and a top bar say plainly that this is a prototype and not MEOD's live site.

## Farm view — Growth Intelligence Hub

| Tab | What it does |
|---|---|
| **Overview** | Greeting band with this week's headline, KPI tiles (campaign visits, first-time buyers, came back within 28 days, repeat-backed demand in kg/week), **This week's top actions** (planting trials, margin problems, retention risks, full pickups, campaigns, SEO gaps), the **attention → dependable demand** funnel, a Demand → Planting summary, and **From this browser**: live counts of what you did on the consumer page |
| **Campaign Studio** | Pick a crop. Tyllage suggests the objective, audience, channel, theme, offer, maximum kg to promote, posting window and how to measure it, with a tracked link and a **Why?** panel. Editable **Instagram, TikTok and WhatsApp (leader)** drafts with live caption checks. **Submit for MEOD approval** puts it in an approval queue; approving never posts anything. Also: the **recipe vs discount experiment**, a **tracked link builder** and **channel results** |
| **SEO** | Candidate search topics (e.g. *nai bai recipe*, *vegetable group buy near me*) with intent, which MEOD page answers it, status (has page / weak page / no page) and a suggestion. A **page title & description checker**. Search volumes are explicitly *not verified* |
| **Customers** | New, Returning, At risk and Inactive groups with a suggested next step for each (consent respected), new buyers by channel, and the harvest-interest answers from this browser |
| **Collection points** | Every pickup with an 8-week sparkline, households vs capacity, 4-week trend, returning share, a status (Growing, Near capacity, Room to grow, Retention risk, Steady) and a suggested action. **Interest without a pickup nearby** shows where to look for a new leader |
| **Demand → Planting** | Per crop: expected, committed (trade, group buy, pre-order) and what's left for new consumer demand; a bar chart of **paid orders per week** against available supply; a chart of the **returning-buyer share**; and **Tyllage's read** with the reasoning. *Accept* / *Not now* are logged; Tyllage never changes a planting plan |
| **Settings** | Edit every decision threshold (saved in the browser), a table of what's rule-based today vs future, and **Reset demo data** |

### How Demand → Planting decides

Paid, repeat orders count far more than clicks, likes or interest forms. In order:

1. **Keep collecting:** fewer than 4 weeks of paid orders.
2. **Fix margin first:** contribution margin is under the 15% Margin Guard floor. Growing more would grow the loss.
3. **Grow repeat demand:** under 30% of demand comes from returning buyers. Spikes are one-off.
4. **Test more production:** paid demand beat the available supply in 3 of the last 4 weeks **and** at least 40% is from returning buyers. Suggests a one-cycle trial of the average excess, never more than 20% of expected harvest.
5. **Maintain — interest isn't converting:** people say they want much more than they pay for.
6. **Maintain capacity:** supply already covers paid demand.

The demo crops are set up so each verdict appears at least once (Nai Bai → test more, Kai Lan → grow repeat demand, Tuscan Kale → interest isn't converting, Choy Sum → keep collecting, Xiao Bai Cai → maintain, Mesclun → fix margin).

### How Campaign Studio decides

- **No promotion needed** when 15% or less of the harvest is uncommitted.
- **Channel:** among past campaigns where at least 25% of new buyers came back, the one with the best contribution per new buyer.
- **Theme:** recipe-led or discount-led, from the recorded experiment (recipe won on repeat rate and contribution in the demo).
- **Where:** a collection point with room to grow whose households already buy that crop.
- **Offer:** normal price, unless more than half the harvest is uncommitted; then a 10% bundle **only if** it passes Margin Guard.
- **Cap:** never promote more than the uncommitted kg, so confirmed orders are protected.

### AI-assisted features

Every AI-assisted feature carries the same **AI-assisted** pill and a **Why?** panel. All of them are **rule-based** in the prototype: they read the demo records, show how they reached an answer, and never post, message, change prices or change planting on their own. A person always approves.

| Part | How it works | Status |
|---|---|---|
| Featured crops and consumer supply | Calculation: expected − committed | Now |
| Demand → Planting verdict | Explainable rules on paid demand, repeat share and margin | Now |
| Campaign suggestion | Rules + recorded campaign results | Now |
| Post drafts | Editable templates with caption checks | Now |
| Recipe ranking | Filters and a simple score on spare harvest | Now |
| Attribution | UTM-tagged links; real numbers need MEOD Fresh / Shopify analytics | Needs integration |
| Writing drafts with a language model | Optional LLM; MEOD approves every post | Future |
| Demand forecasting | Model trained on MEOD's real order history | Future, once there's enough data |

### Business rules (illustrative — MEOD to confirm)

All of these live in `RULES` in `js/data.js`. Staff can change them in **Settings**.

- **Money** is integer cents per kg. Format it only with `MEOD.money()`.
- **Margin Guard:** contribution margin must be at least 15%. A bundle price must stay at or above cost + 15%.
- **Planting:** 4 weeks of paid data, demand over supply in 3 of the last 4 weeks, 40%+ returning share, trial capped at 20% of expected harvest.
- **Collection points:** "room to grow" under 60% full; "retention risk" under 40% returning; "growing" at +10% over 4 weeks; a pickup is "near" within 3 km.
- **Delivery:** Tue / Thu / Sat, free from S$60, orders close 10pm the night before (taken from MEOD Fresh's public site; MEOD to confirm).
- **Who does what:** MEOD owns the produce, prices, customers, posts and every decision. Tyllage analyses, recommends, drafts and reports. It never buys or resells produce.

---

## Project layout

```
index.html        consumer page: This Week at MEOD
growth.html       farm view: Growth Intelligence Hub

css/style.css     both pages; design tokens in :root (MEOD palette)

js/data.js        demo data (crops, recipes, collection points, campaigns, SEO topics,
                  segments), RULES, localStorage state, tracking, and the decision logic:
                  featuredCrops, plantingVerdict, pointStatus, campaignStats,
                  recommendCampaign, drafts, captionChecks, nearestPoints
js/ui.js          h() / s() DOM helpers (textContent only), toast, copy, AI pill
js/site.js        consumer page
js/growth.js      farm view: tabs, charts, tables, approvals, settings

assets/           MEOD logo (SVG)
assets/img/       optimised WebP photos and favicon
.nojekyll         serve files as-is on GitHub Pages
```

**Script order:** `data.js → ui.js → site.js` on `index.html`, and `data.js → ui.js → growth.js` on `growth.html`.

**No third-party scripts.** The only external request is Google Fonts (Caveat Brush and Figtree). Charts are hand-drawn SVG.

## Demo data

- Stored in `localStorage` under `tyllage-growth-demo-v1`: harvest-interest answers, consumer-page activity, campaign drafts, planting decisions and edited thresholds. Each browser has its own copy.
- The rest (crops, campaigns, collection points, segments) is fixed in `js/data.js`.
- **Reset:** **Settings → Reset demo data** in the farm view, or clear the site's storage.
- **Try the loop:** on the consumer page, search a postal code and fill in *Help shape our next harvest*. Then open the farm view: **Overview → From this browser**, **Customers** and **Collection points** pick it up.

## Responsive breakpoints

| Width | What changes |
|---|---|
| ≤ 1000 px | Campaign drafts stack |
| ≤ 960 px | Consumer nav collapses to a menu button |
| ≤ 860 px | Two-column sections stack; KPI tiles go 2 × 2 |
| ≤ 640 px | Hub tables become labelled cards |
| ≤ 520 px | *Farm view* button hides from the consumer nav; postal form stacks |

Checked at 375 px and 1280 px with no sideways scrolling on every tab (27 Oct 2026).

## Path to production

| Prototype | Becomes |
|---|---|
| Demo crops and harvest figures in `js/data.js` | Harvest Planner / stock from Tyllage's farm-ops data |
| `CAMPAIGNS` results | Real attribution: MEOD Fresh (Shopify) orders matched to UTM tags and discount codes |
| Interest answers in `localStorage` | Server-side, consented, de-duplicated records with a retention period |
| Collection points | Group-buy module data (leaders, pickups, orders), shared with leaders' agreement |
| SEO topics | Google Search Console data for MEOD's own site |
| Drafts and approvals | Server-side approvals with roles; optional publishing through official social APIs later |
| Open farm view | Server-side sign-in and role checks |

See [audit.md](audit.md) for the gap list and the questions to validate with MEOD before building further.

## License and ownership

© 2026 Tyllage LLP. All rights reserved.

This prototype, including its code, designs, business rules and documentation, is proprietary to Tyllage LLP and is shared under the [Tyllage Proprietary License](LICENSE). No licence is granted to use, copy, modify, deploy or redistribute it without Tyllage's prior written permission. GitHub's Terms of Service let you view and fork public repositories on GitHub; that does not give any further right to use this code.

The MEOD name, logo and photographs belong to MEOD Farm and are used here for demonstration to MEOD only. The fonts loaded from Google Fonts remain under their own licences.

For licensing or partnership enquiries, contact the team through the [Tyllage GitHub organisation](https://github.com/Tyllage).

## Docs

[CONTRIBUTING.md](CONTRIBUTING.md) · [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) · [SECURITY.md](SECURITY.md) · [audit.md](audit.md) · [LICENSE](LICENSE)
