# Tyllage — Smart Value & Demand Engine (Vibecode 1)

A clickable prototype for **Tyllage**, our own brand of Singapore-grown vegetables. It starts from one commercial question:

> *Why would someone in Singapore stop buying vegetables at the supermarket or wet market downstairs and order from us instead?*

Being locally grown isn't enough on its own. Shoppers compare prices (YouGov's 2025 Singapore grocery research, as reported by Marketing-Interactive: about 7 in 10 look for the lowest price in a category and 74% would switch supermarket for better prices), they like picking their own produce, and online grocery wins on convenience and exclusive discounts. So the prototype tackles four barriers: **price, convenience, trust in freshness and habit**.

The problem it starts from: someone who wants S$12 of vegetables pays **S$22** with our S$10 delivery fee below S$60. If they can walk downstairs, they won't. Neighbourhood **group-buy pickup** removes the fee, and that's the opening.

The direction is **Smart Value → Repeat customers → Verified demand → Farm growth**:

1. **Consumer page (`index.html`).** Opens with *Your weekly veggie savings*: build a basket, see the **full checkout total** (vegetables, bundle saving, pickup or delivery, an optional *hypothetical* voucher), the **cheapest practical way to get it** for your postal code, and a **like-for-like price check** per 100 g against local vegetables at Supermarket A/B and the wet market. Place a demo order, get the retention offer (loyalty progress, recipe, reminder) and **order the same next week** in one tap. Below that: this week's harvest, bundles, recipes, pickups, new crops and the *Ask Tyllage* assistant. Everything adds to the same basket.
2. **Team view (`growth.html`).** Grouped along the chain:
   - **1 · Smart Value:** Value engine (the chain and the journey), Price check, Offers & margin, Fulfilment, Offer test, Customer journey.
   - **2 · Repeat customers:** Habits & rewards, Customers, Loyalty & boxes, Feedback, Neighbourhoods, Inbox.
   - **3 · Demand → Growth:** Verified demand, Demand → Planting, New crops.
   - **Marketing:** Promotions & budget, Campaign Studio, Experiments, SEO, Trends & partners, Farm stories. Plus **Overview**, **Strategy** and **Settings**.

## Start here: the Nai Bai scenario

The team view opens on **Growth loop → Nai Bai scenario**, one journey that has to work end to end:

1. **Goal:** more customers for Nai Bai (37 kg/week uncommitted, 42% margin, 55% of demand already from returning buyers).
2. **Segment & offer:** lapsed and occasional Nai Bai buyers (opted in) plus neighbours at pickups with room; offers for a Nai Bai + Xiao Bai Cai bundle ranked against the price floor; the **whole basket compared** with Supermarket A/B (in store and online) and the wet market, with delivery or collection fees, vouchers and promotions, and when each price was checked; and whether we can **sustainably match** the cheapest complete like-for-like basket. Launch it.
3. **Customers buy:** the campaign link opens the shop with the bundle and offer ready (S$1 off at a collection point, first order only). Place a demo order, then *Order the same next week*.
4. **Measure:** visits, new and repeat orders, repeat rate, cost per new customer, revenue, offer and ad cost, contribution, and kg of Nai Bai, including your own demo orders.
5. **Decide:** seven checks (paid weeks, repeat share, demand over supply, margin, recurring growth, campaign repeat rate, campaign profit) and a verdict; log *Approve a trial* or *Not yet*. Planting is never changed by the prototype.

Each step says what works in the prototype and what is simulated. *Restart scenario* clears it in this browser.

## Demand Growth Loop (flagship workflow)

**Discover → Convert → Retain → Validate → Plan farm growth.** Farm-commerce platforms overseas (e.g. Barn2Door, Local Line, Harvie, GrazeCart) already automate reminders, subscriptions, segmentation and promotions. Tyllage's aim is to connect that demand to production decisions for Singapore farms, including neighbourhood group buys. We don't claim to be the first to combine marketing and farming.

Three connected screens:

1. **Consumer Smart Savings** (`index.html#savings`): approved bundles, collection options, the full checkout total, a reward that fits the shopper (first-time: capped S$2 off; occasional: one-tap repeat; loyal: every-4th-order reward), and a nudge when a few more neighbours would make their pickup cheaper to run.
2. **Growth dashboard** (team view, first screen): the five loop stages, the **"200 one-time customers or 50 weekly households?"** priority with a 6-month comparison, campaign conversion, new vs returning orders, group-buy performance with **momentum targets from delivery economics**, and contribution margins with evidence-to-grow per crop.
3. **Growth Advisor**: what to fix first (smart cart recovery, voice of the customer), the **next campaign or demand test** for the chosen priority with guardrails (stock limit, price floor, monthly discount budget), a **harvest-aware calendar** (holidays to confirm, forecast-only weeks flagged), a **demand experiment designer** (two similar pickups, sample size, duration, metrics) and a five-check **evidence-to-grow** verdict per crop.

Rules decide every number and limit (`js/loop.js`). An LLM could later write the strategy and explanations from the same figures; predictive models only once there's enough real sales history. Planting stays a farm manager's decision. Shopify, social and WhatsApp integrations stay planned until authorised.

## Friendly for every age, plus a mock log-in

- **Text size** (A / A+ / A++) on every page, remembered in this browser; every size scales from one setting.
- Bigger tap targets (buttons 48px, fields 50px, chips 46px), darker secondary text, five top links on desktop (the menu still lists everything), and an app-style bottom bar on phones: Home, Basket (with pack count), Cook, Pickup, Account.
- **`login.html`**: shopper or team log-in, create-account for shoppers, show/hide password, plain-English errors, *Continue as a guest*, and demo details. **Mock only:** any well-formed email (or SG mobile for shoppers) and an 8+ character password work; only a display name and role are kept in `localStorage`, never the password, email or number. The team view sends signed-out visitors to the log-in page, but that check runs in the browser and protects nothing.

## Smart Value & Demand Engine

| | Function | In this prototype | Before it's real | Where |
|---|---|---|---|---|
| A | **Smart basket price comparison** | S$/100 g against Supermarket A/B and the wet market; only Singapore-grown produce in a similar pack size counts as like-for-like; each price shows its source and date or "not checked yet"; editable price book with *Mark checked today* | A small catalogue checked by hand weekly, or a permitted data feed. Don't scrape sites that don't allow it | Consumer *Savings*, hub *Price check* |
| B | **Voucher & bundle optimiser** | Line-by-line bundle economics (retail → production and packing → fulfilment → discount → contribution), a closed-form price floor, and six offers ranked by 6-month value among those that keep the floor. Editable cost, retail and group-buy prices for the top vegetables | Our real costs, leader commission and delivery costs | Hub *Offers & margin* |
| C | **Smart fulfilment recommendation** | Pickup vs delivery total for the customer's basket and postal sector; pickup only if one is within 3 km, not nearly full, and the basket is S$8+; table of what each basket size costs the customer and earns us | Real leader windows, capacities and any collection charge | Consumer *Savings*, hub *Fulfilment* |
| D | **Habit & rewards intelligence** | One-tap repeat order, cutoff reminders, recipe after each order; loyalty reward (S$3 off every 4th S$15+ order) checked against a holdout so it must pay for itself | A real holdout on our own customers | Consumer *after order*, hub *Habits & rewards* |
| E | **Demand-backed production planner** | New vs repeat orders from the savings checker, recurring kg per crop, spare supply after commitments; flags "investigate growing more" only when recurring demand keeps rising past spare supply and the margin holds | Orders tagged by offer and channel | Hub *Verified demand* → *Demand → Planting* |
| | **Offer test (A/B/C)** | Cheaper basket vs Convenience vs Loyalty: clicks, first orders, repeat orders, cost per customer, 8-week value, two-proportion z-test. Each browser always sees the same offer | Random assignment of real visitors, run to the planned sample size | Consumer offer banner, hub *Offer test* |

Every price, floor, saving and recommendation comes from fixed formulas in `js/value.js`. Nothing is invented by a language model. **All supermarket and wet-market prices are placeholders; our costs are demo values.** The figures we need first, for our top five vegetables: production cost, retail price, group-buy price, leader commission and allocated delivery cost.

## The 10 AI features

| # | Feature | In this prototype | Next, with real data | Where |
|---|---|---|---|---|
| 1 | **Growth Strategy Advisor** | Ranks moves (expand to a similar area, production trial, fix a leaky pickup, shift budget, win back customers, fix margin). Each explanation is written only from the figures listed under *Evidence* | LLM explanations grounded in the same verified analytics | Strategy |
| 2 | **Social Media Campaign Studio** | Suggests objective, audience, channel, timing and kg cap; drafts Instagram, Facebook, TikTok/Reels and WhatsApp posts for three angles (recipe, farm story, intro bundle) with caption checks; approval queue | LLM drafts from the same farm data; results fed back into suggestions | Campaign Studio |
| 3 | **SEO & Search Opportunity Advisor** | Clusters search queries by topic and flags high-opportunity clusters; content gaps; outlines a useful page from approved facts; imports a Search Console CSV in the browser | Search Console API with Tyllage's authorisation; AI-assisted page prose | SEO |
| 4 | **Customer Segmentation & Churn** | RFM segments (Champions, Loyal, New, Needs attention, At risk, Hibernating); "likely lapsing" when a customer is 1.5× past *their own* usual gap; consent-aware next step | Predictive churn model once there are 6+ months of purchases | Customers |
| 5 | **Demand-to-Planting Forecaster** | Trend forecast with an 80% range and a backtest; forecast confidence; trial size; "grow something different?" crop-mix check | Seasonal time-series model on full sales and group-buy orders, scored weekly | Demand → Planting |
| 6 | **Personalised Vegetable & Recipe Recommender** | Content-based: cooking style, taste and spare harvest; only crops that are available and pass Margin Guard; a matching recipe | Order-history personalisation; collaborative filtering later | Consumer page → *Try something new* |
| 7 | **Neighbourhood Demand Intelligence** | Opportunity score (0–100), area types (Growing & loyal, Untapped, Leaky, Saturated, Stable), crop mix per pickup with groups under 5 hidden, interest without a pickup | Clustering on purchase patterns; per-area forecasts | Neighbourhoods |
| 8 | **Campaign Experiment Optimiser** | Extra orders over the usual and extra contribution per campaign; two-proportion z-tests; a sample-size planner for the next test | Holdout groups for true incremental orders; adaptive budget allocation | Experiments |
| 9 | **Customer Engagement Assistant** | *Ask Tyllage*: keyword retrieval over approved FAQ plus live harvest, recipe and pickup data; logs purchase intent; hands complaints, refunds, health and bulk orders to staff; removes phone numbers, emails and full postal codes | Retrieval-augmented generation on Tyllage's authorised chat channels, same hand-over rules | Consumer page, Inbox |
| 10 | **Farm Storytelling Assistant** | Drafts from approved farm records only, in three tones; every fact must be ticked as verified before it can go for approval | LLM storytelling from the same records, with the fact checklist kept | Farm stories |

## 12 more AI features, plus Smart Savings

| # | Feature | In this prototype | Next, with real data | Where |
|---|---|---|---|---|
| 11 | **Conversion & Customer Journey Analyst** | Checkout funnel by cart size; flags any step that drops more than 3 standard deviations from its own history and estimates lost orders. Demo: carts under S$60 stop at the S$10 delivery fee | Tyllage analytics with authorisation, checked daily; LLM explanations | Customer journey |
| 12 | **Neighbourhood Opportunity Finder** | Campaign visits vs orders vs pickup awareness per area; separates "low awareness" from "low conversion" | Geographic clustering on aggregated data | Neighbourhoods |
| 13 | **Basket Builder** | Household size + must-haves + complementary greens, sized for a week; shows pickup vs delivery cost and how far from free delivery | Order history, price sensitivity, stock-aware bundles | Consumer page → *Fresh deals* |
| 14 | **Replenishment Predictor** | Each customer's own reorder gap and usual delivery day; reminder timed before the cutoff; consent only; suggests a promotable crop | Predictive reorder model | Loyalty & boxes |
| 15 | **Customer Feedback Intelligence** | Groups reviews, complaints, social comments, enquiries and Ask Tyllage chats into themes; sentiment from words + ratings; separates growth barriers from product issues. Demo: pickup convenience is the top barrier | Topic clustering, sentiment models, LLM summaries | Feedback |
| 16 | **New Crop Demand Tester** | "I'm interested" vs "Reserve first harvest (pay at collection)"; trial sized to reservations only; margin check | Refundable deposits on Tyllage; trial-size scenarios | New crops, consumer page → *Coming next* |
| 17 | **Subscription & Retention Designer** | Finds steady buyers, designs weekly/fortnightly boxes priced 5% under separate items (pickup), checks Margin Guard, estimates committed kg | Real cohorts; box demand feeding planting | Loyalty & boxes |
| 18 | **Seasonal Food Trend Radar** | Interest index vs recipe-link orders; a topic must rise in both before it becomes a campaign | Search/social trend data with authorisation | Trends & partners |
| 19 | **Creator & Community Matcher** | Topic fit + area fit (pickups with room) + recorded Tyllage results; never invents follower counts or engagement | Content classification of real partner content | Trends & partners |
| 20 | **Marketing Budget Allocator** | Spends in S$5 steps where the next dollar earns most (6-month value vs cost per buyer incl. staff time), with diminishing returns, 3× past-spend caps and ≤15% on unproven channels | Fitted channel response curves | Promotions & budget |
| 21 | **Planting Scenario Simulator** | 2,000 simulated weeks of demand and yield for +0–50% production; unsold kg, waste risk, extra contribution. Demo: Nai Bai +10% is the best balance; +50% loses money | Probabilistic forecasts from real sales and yields; real spoilage and clearance | Demand → Planting |
| 22 | **Customer Lifetime Value & Loyalty Analyst** | 6-month value by acquisition channel (retention × orders × order value × margin) vs cost to acquire | Real cohorts; predictive value model | Loyalty & boxes |

### Smart Savings and the Promotion Profitability Optimiser

The idea: make buying from the farm feel like a better deal **without a price war**. Instead of subsidising home delivery for everyone, neighbourhood collection becomes the cheaper way to buy: *"Fresh Singapore-grown vegetables. Better value when your neighbourhood buys together."*

- **Consumer page → Fresh deals near you:** pickup vs home delivery, the basket builder, farm-approved bundles (only shown if they pass Margin Guard), first-order and refer-a-neighbour offers (illustrative), and three survey questions: *cheaper but collect?*, *pay more for delivery?*, *is freshness and local enough?*
- **Hub → Promotions & budget:**
  - **Profitability check:** enter normal price, offer price and produce + packing cost, and see contribution and margin for pickup vs home delivery against Margin Guard. With the demo costs, a S$12 → S$10 bundle earns S$1.50 (15%) through pickup but only S$1.00 (10%) by home delivery, so Tyllage suggests testing it **through pickup only**.
  - **Which promotions to test:** group deals, bundles, first-order voucher, loyalty, refer-a-neighbour, pre-orders, Surprise Bags and free delivery, each with its per-order economics, the evidence on repeat buying, and a 6-month value.
  - The **budget allocator** and the **survey results**.
- Delivery terms (S$10 below S$60, free from S$60) are from Tyllage's published shipping policy and should be re-checked. Tyllage's own delivery, drop and packing costs are made up.

Everything is rule-based and runs in the browser. Nothing is sent to an AI service, nothing is posted or messaged, and a person approves every action.

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

## Consumer page — This Week at Tyllage

| Section | What's on it |
|---|---|
| **Hero** | "Fresh from the farm. Made for your table." with the current week, plus delivery facts (Tue / Thu / Sat, free from S$60, or collect from a group buy) |
| **This week's harvest** | Crop cards chosen by Tyllage: only crops with enough **uncommitted** harvest to sell and a margin above the Margin Guard floor, most spare first. Each shows harvest day, kg still available, *Buy on Tyllage ↗* (tracked link) and *Recipes* |
| **Fresh deals near you** | Pickup vs home delivery, the basket builder (household + must-haves), farm-approved bundles, illustrative first-order and referral offers, and a 3-question survey |
| **Coming next?** | Candidate crops (Red Bayam, Baby Spinach, Kangkong) with *I'm interested* and *Reserve first harvest*. Reservations count separately from interest; nothing is charged |
| **Try something new** | Tick what you usually buy; get up to two other greens from this week's harvest that cook the same way but taste different, with a recipe and a tracked link |
| **What should I cook?** | Household size, time to cook and preferences (vegetarian, kid-friendly, no spicy). Recipes are filtered to crops available this week, ranked by spare harvest, and scaled to the household ("about 250 g Nai Bai for 1–2 people"). Each links to the product on Tyllage |
| **Collect from a neighbour** | Enter a 6-digit postal code to see the 3 nearest group-buy pickups (area, distance, day, window, order cutoff). If none is within 3 km, it asks you to register interest instead. *Ask to join* is simulated: nothing is sent |
| **Help shape our next harvest** | Pick crops, frequency and pickup or delivery; optional postal code; a consent tick. Clearly labelled *not an order*. Only the postal **sector** (first two digits) is stored. A bar list shows what neighbours have asked for (demo numbers plus yours) |
| **Meet your farmers** | Three short farm stories with Tyllage's photos |

The **Ask Tyllage** button (bottom right) opens the assistant. Try *What's fresh this week?*, *Pickup near 820123*, *I want to buy 2kg Nai Bai* or *My order was missing items*, then look at the hub's **Inbox**.

The **Farm view** button in the nav opens the hub. The footer and a top bar say plainly that this is a prototype and takes no real orders.

## Farm view — Growth Intelligence Hub

| Tab | What it does |
|---|---|
| **Overview** | Greeting band, KPI tiles (campaign visits, first-time buyers, came back within 28 days, repeat-backed demand in kg/week), **the three questions** with this week's answer to each, the top 5 **Strategy** recommendations, the **attention → dependable demand** funnel, a Demand → Planting summary with forecast confidence, and **From this browser**: live counts of what you did on the consumer page |
| **Strategy** | Every growth recommendation, ranked, with impact, effort, the evidence behind it and *Plan it* / *Dismiss* |
| **Campaign Studio** | Pick a crop. Tyllage suggests the objective, audience, channel, theme, offer, maximum kg to promote, posting window and how to measure it, with a tracked link and a **Why?** panel. Pick an angle (recipe, farm story, intro bundle) for editable **Instagram, Facebook, TikTok/Reels and WhatsApp (leader)** drafts with live caption checks. **Submit for Tyllage approval** puts it in the approval queue; approving never posts anything. Plus a **tracked link builder** |
| **Experiments** | Each campaign's extra orders over the usual and extra contribution after costs; the **recipe vs discount** test with significance checks; a **planner** for the next test (approaches, buyers needed per approach, weeks at recent pace, past results per approach) |
| **Farm stories** | Pick an approved farm record (harvest, pest control, planting, weather), choose a tone, get Instagram/Facebook, blog and WhatsApp drafts. *Send for approval* unlocks only when every fact is ticked as verified |
| **SEO** | Search queries grouped into topic clusters with impressions, clicks, CTR, position and opportunity; **Import Search Console CSV**; content gaps; **Draft a useful page** (an outline built from approved facts); a **page title & description checker**. Demo search volumes are made up |
| **Customers** | RFM segments with a next step for each; **likely lapsing** customers with a consent-aware suggestion and channel; new buyers by channel; harvest-interest answers from this browser |
| **Neighbourhoods** | Area types; every pickup with an 8-week sparkline, households vs capacity, trend, returning share, **opportunity score**, type and suggested action; **what each area buys** (groups under 5 shown as "<5"); **interest without a pickup nearby** |
| **Demand → Planting** | Per crop: expected, committed and what's left for consumer demand; **paid orders with a 4-week forecast** (80% range) against available supply; the **returning-buyer share**; **Tyllage's read** with forecast confidence and reasoning; **Grow more, or grow something different?**; all crops. *Accept* / *Not now* are logged; Tyllage never changes a planting plan |
| **Inbox** | What customers asked *Ask Tyllage*: questions handed to staff (mark resolved), purchase intent by crop, and questions it couldn't answer (candidates for new FAQ answers or pages) |
| **Customer journey** | Unusual drops in the our checkout funnel with an explanation and a suggested test; where visitors leave, by cart size |
| **Promotions & budget** | Promotion profitability check, which promotions to test, marketing budget allocator, survey answers |
| **Trends & partners** | Seasonal trend radar and the creator & community matcher |
| **Loyalty & boxes** | Lifetime value by channel, customers ready to reorder, weekly/fortnightly box designs |
| **Feedback** | Top barrier summary, themes with example quotes, all feedback with sentiment |
| **New crops** | Interest vs reservations, reserved kg/week, margin and a verdict per candidate crop |
| **Settings** | Edit every decision threshold (saved in the browser), what each AI feature does today vs next, and **Reset demo data** |

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

### How every AI-assisted feature behaves

Strategy also picks up the checkout drop (Customer journey) and the top feedback barrier.

Every AI-assisted screen carries the same **AI-assisted** pill, a **Why?** or **Evidence** panel, and a short **Now / With real data** note saying what it does today and what would change with Tyllage's real data or an LLM. All of them are rule-based in the prototype: they read the demo records, show how they reached an answer, say so when the data can't answer, and never post, message, change prices or change planting on their own. A person always approves.

Evidence is ranked: **paid repeat orders > paid first orders > registered interest or purchase intent > visits > likes.**

### Business rules (illustrative — Tyllage to confirm)

All of these live in `RULES` in `js/data.js`. Staff can change them in **Settings**.

- **Money** is integer cents per kg. Format it only with `TY.money()`.
- **Margin Guard:** contribution margin must be at least 15%. A bundle price must stay at or above cost + 15%.
- **Planting:** 4 weeks of paid data, demand over supply in 3 of the last 4 weeks, 40%+ returning share, trial capped at 20% of expected harvest.
- **Collection points:** "room to grow" under 60% full; "retention risk" under 40% returning; "growing" at +10% over 4 weeks; a pickup is "near" within 3 km.
- **Delivery:** Tue / Thu / Sat, free from S$60, orders close 10pm the night before (taken from Tyllage's public site; Tyllage to confirm).
- **Who does what:** Tyllage owns the produce, prices, customers, posts and every decision. Tyllage analyses, recommends, drafts and reports. It never buys or resells produce.

---

## Project layout

```
index.html        consumer page: This Week at Tyllage
growth.html       farm view: Growth Intelligence Hub

css/style.css     both pages; design tokens in :root (Tyllage palette)

js/data.js        demo data (crops, recipes, collection points, campaigns, SEO topics,
                  segments), RULES, localStorage state, tracking, and the decision logic:
                  featuredCrops, plantingVerdict, pointStatus, campaignStats,
                  recommendCampaign, drafts, captionChecks, nearestPoints
js/intel.js       intelligence engine: forecasts + backtest, crop mix, RFM + churn signals,
                  recommender, campaign impact + z-tests + sample sizes, neighbourhood
                  scoring, growth strategy, Ask Tyllage retrieval + redaction, farm stories,
                  search clustering + CSV import, SEO page outlines (plus their demo data)
js/insights.js    insights part 2: journey anomalies, area opportunities, delivery economics,
                  promotion check + menu, basket builder, bundles, replenishment, feedback
                  themes + sentiment, new-crop tester, boxes, trends, partners, lifetime
                  value, budget allocator, planting simulator (plus their demo data)
js/value.js       Smart Value & Demand Engine: price book + like-for-like comparison, checkout
                  total, smart fulfilment, unit economics + price floor, offer ranking,
                  A/B/C offer test, reward check, verified demand, demo orders
js/loop.js        Demand Growth Loop: priority comparison, group-buy momentum, personalised
                  rewards, harvest-aware calendar, experiment designer, evidence to grow, next move
js/scenario.js    the Nai Bai scenario: goal, segment + offer, campaign link, results, decision
js/account.js     text size + mock session (name and role only)
js/login.js       mock log-in and sign-up
js/ui.js          h() / s() DOM helpers (textContent only), toast, copy, AI pill
js/site.js        consumer page: weekly savings checker, demo order + repeat, harvest, bundles, Ask Tyllage
js/growth.js      team view: 24 pages in 6 groups, charts, tables, approvals, settings

assets/           Tyllage logo (PNG, transparent)
assets/img/       optimised WebP photos and favicon
.nojekyll         serve files as-is on GitHub Pages
```

**Script order:** `data.js → intel.js → insights.js → value.js → ui.js → site.js` on `index.html`, and `… → value.js → ui.js → growth.js` on `growth.html`.

**No third-party scripts.** The only external request is Google Fonts (Caveat Brush and Figtree). Charts are hand-drawn SVG.

## Demo data

- Stored in `localStorage` under `tyllage-growth-demo-v1`: harvest-interest answers, consumer-page activity, *Ask Tyllage* questions (contact details removed), campaign and story drafts, strategy and planting decisions, survey answers, new-crop interest and reservations, weekly-box interest, and edited thresholds. An imported Search Console CSV is kept in memory only and is gone when you leave the tab. Each browser has its own copy.
- The rest (crops, campaigns, collection points, segments) is fixed in `js/data.js`.
- **Reset:** **Settings → Reset demo data** in the farm view, or clear the site's storage.
- **Try the Smart Value loop:** on the consumer page, open *Savings*, switch between pickup and home delivery, add a postal code, place a demo order and tap *Order the same next week*. Then open the team view: **Smart Value → Value engine**, **Offer test** and **Demand → Growth → Verified demand** include it.
- **Try the loop:** on the consumer page, search a postal code, fill in *Help shape our next harvest* and ask *Ask Tyllage* a few questions. Then open the farm view: **Overview → From this browser**, **Customers**, **Neighbourhoods** and **Inbox** pick it up.

## Responsive breakpoints

| Width | What changes |
|---|---|
| ≤ 1100 px | Campaign and story drafts go two-up |
| ≤ 860 px (consumer) | *Try something new* stacks |
| ≤ 1100 px | Consumer nav collapses to a menu button |
| ≤ 960 px | Overview's three-question cards stack |
| ≤ 860 px | Two-column sections stack; KPI tiles go 2 × 2 |
| ≤ 700 px | Drafts go one column |
| ≤ 640 px | Hub tables become labelled cards |
| ≤ 520 px | *Farm view* button hides from the consumer nav; postal form stacks |

Checked at 375 px, 534 px and 1280 px with no sideways scrolling and no console errors on every tab and the consumer page, including the Ask Tyllage panel (27 Oct 2026).

## Path to production

| Prototype | Becomes |
|---|---|
| Demo crops and harvest figures in `js/data.js` | Harvest Planner / stock from Tyllage's farm-ops data |
| `CAMPAIGNS` results | Real attribution: Tyllage (Shopify) orders matched to UTM tags and discount codes |
| Interest answers in `localStorage` | Server-side, consented, de-duplicated records with a retention period |
| Collection points | Group-buy module data (leaders, pickups, orders), shared with leaders' agreement |
| SEO topics | Google Search Console data for Tyllage's own site |
| Drafts and approvals | Server-side approvals with roles; optional publishing through official social APIs later |
| Ask Tyllage keyword retrieval | RAG over the same approved FAQ and live data, on Tyllage's authorised chat channels |
| Trend forecast, RFM cut-offs, z-tests | Models fitted and scored on Tyllage's real history; holdout groups for experiments |
| Farm records in `FARM_LOG` | Greenhouse round records from Tyllage's farm-ops data |
| Open farm view | Server-side sign-in and role checks |

See [audit.md](audit.md) for the gap list and the questions to validate with Tyllage before building further.

## License and ownership

© 2026 Tyllage LLP. All rights reserved.

This prototype, including its code, designs, business rules and documentation, is proprietary to Tyllage LLP and is shared under the [Tyllage Proprietary License](LICENSE). No licence is granted to use, copy, modify, deploy or redistribute it without Tyllage's prior written permission. GitHub's Terms of Service let you view and fork public repositories on GitHub; that does not give any further right to use this code.

The Tyllage name, logo and photographs belong to Tyllage and are used here for demonstration to Tyllage only. The fonts loaded from Google Fonts remain under their own licences.

For licensing or partnership enquiries, contact the team through the [Tyllage GitHub organisation](https://github.com/Tyllage).

## Docs

[CONTRIBUTING.md](CONTRIBUTING.md) · [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) · [SECURITY.md](SECURITY.md) · [audit.md](audit.md) · [LICENSE](LICENSE)
