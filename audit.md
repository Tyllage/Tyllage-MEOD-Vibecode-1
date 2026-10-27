# Prototype Audit — Tyllage × MEOD Farm Growth Intelligence

**Date:** 27 Oct 2026  **Scope:** static HTML/CSS/JS prototype (this repo)  **Status:** Stage 1 — concept prototype for discussion with MEOD

This audit checks the prototype against the B2C growth concept (*Demand Growth Intelligence*: attract → convert → retain → validate demand → plan production) and lists what must change before any real data is used.

---

## 1. Concept traceability

| Concept requirement | Where in prototype | Status |
|---|---|---|
| **This Week at MEOD**: harvest discovery landing page | `index.html` → This week's harvest | ✅ Featured crops chosen from uncommitted harvest |
| Recipe-to-cart: only suggest available produce | `index.html` → What should I cook? | ✅ Filters to this week's crops; links go to MEOD Fresh, not a second checkout |
| Find your nearest group-buy collection point | `index.html` → Collect from a neighbour | ⚠️ Approximate, by postal district; demo pickups |
| Help shape our next harvest (interest capture) | `index.html` → interest form | ✅ Labelled "not an order"; postal sector only |
| Campaign attribution | UTM tags on every store link; link builder | ⚠️ Links only. Real attribution needs MEOD Fresh / Shopify analytics |
| **Campaign Studio**: crop, audience, channel, timing, CTA | `growth.html#campaigns` | ✅ Rule-based, with Why? panel |
| Social drafts (Instagram, TikTok, WhatsApp) for approval | Campaign Studio → Drafts, Approval queue | ✅ Templates + caption checks; nothing is posted |
| Recipe vs discount campaign experiment | Campaign Studio → Experiment | ✅ Demo results; flagged as a small sample |
| **SEO Opportunity Advisor** | `growth.html#seo` | ⚠️ Candidate topics; volumes not verified; no Search Console link |
| **Customer Growth**: new, returning, at risk, inactive | `growth.html#customers` | ⚠️ Fixed demo counts |
| **Group-buy growth dashboard** | `growth.html#points` | ✅ Trend, capacity, returning share, status, action |
| Leader gap: interest without a pickup | Collection points → Interest without a pickup nearby | ✅ Demo areas + this browser's answers |
| **Demand-to-Planting Advisor** | `growth.html#demand` | ✅ Six explainable verdicts; farm manager decides |
| Margin Guard on any offer and on growth | `plantingVerdict()`, `recommendCampaign()` | ✅ |
| Protect committed orders | Campaign cap = uncommitted kg | ✅ |
| Measure purchases and repeat, not likes | Funnel, channel results | ✅ |
| Automated publishing | — | ❌ Deliberately out of scope |
| Subscription / recurring billing | — | ❌ Deliberately out of scope until demand is shown |

## 2. What is simulated

- All crops, harvests, commitments, paid demand, repeat shares, campaigns, collection points, segments and SEO topics are **made up** in `js/data.js`.
- The "From this browser" numbers are real, but only for the current browser.
- *Ask to join* a pickup, campaign approvals and planting decisions are recorded locally and go nowhere.
- Delivery days, the S$60 free-delivery threshold and the 10pm cutoff come from MEOD Fresh's public site and the earlier prototype; MEOD to confirm.

## 3. Gaps before a pilot

### 3.1 Security and privacy
- No sign-in. The farm view must sit behind server-side auth with roles (admin, staff, leader).
- Interest answers need a PDPA notice, recorded consent and a retention period.
- Group-buy customers belong to a relationship between MEOD and its leaders. Agree with leaders whether MEOD may contact members directly.
- See [SECURITY.md](SECURITY.md) for the full list.

### 3.2 Data
- Real paid-order data per crop per week, split by channel (MEOD Fresh, group buy, trade).
- A way to tell first orders from repeat orders per customer (Shopify customer IDs; leader order lists if leaders consolidate).
- Harvest expectations and commitments from Harvest Planner.
- Campaign spend, discount cost and produce cost for real contribution figures.

### 3.3 Logic
- All thresholds are illustrative. MEOD should set them (see Q3 below).
- The planting verdict ignores seed lead time, greenhouse space and yield risk. Those stay with the farm manager.
- Contribution uses a fixed 55% cost ratio for campaigns. Replace with real costs.
- Postal lookup is by district centre. A real version would use OneMap and real pickup addresses.

## 4. Responsive check

Checked on 27 Oct 2026 at 375 px (phone) and 1280 px (desktop): every hub tab and the consumer page, no horizontal scrolling, no console errors. Hub tables become labelled cards under 640 px.

## 5. Questions to validate with MEOD

1. Which crops would MEOD be willing and able to grow more of, if more repeat demand were shown?
2. What stops new and existing customers buying more often: awareness, price, delivery minimum, pickup distance, cooking habits or range?
3. How much extra confirmed weekly demand, for how many weeks, would justify expanding a growing batch?
4. Does MEOD want to recruit more group-buy leaders, or does it mainly need more customers per leader?
5. How do customers discover and join group buys today (WhatsApp, Telegram, social, referrals, MEOD Fresh)?
6. Do leaders submit one consolidated order, or can MEOD see individual customers and their repeat purchases?
7. What commission, delivery cost and minimum volume make a collection point worthwhile?
8. Are leaders comfortable with MEOD contacting their members directly?
9. Who at MEOD approves posts and offers, and which channels does MEOD already run?
10. Can Tyllage get read access to MEOD Fresh (Shopify) analytics and Google Search Console?

## 6. Suggested first experiment

Run the recipe-led vs discount-led campaign on one agreed crop, with the same window, budget and audience size. Measure visits to MEOD Fresh, first purchases, repeat purchases within 28 days and contribution — not likes. Use the result to set the first real thresholds in Settings.
