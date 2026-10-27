# Security Policy

## Status

This repository is a **prototype**. It is a static site with no sign-in and no backend; all data lives in the visitor's browser. It is **not secure and must not hold real customer, order, campaign or sales data.** All bundled data is synthetic.

## Reporting a vulnerability

Please **do not open a public issue** for security problems. Instead:

- use GitHub's **private vulnerability reporting** on this repository ([Report a vulnerability](https://github.com/Tyllage/Tyllage-MEOD-Vibecode-1/security/advisories/new) in the Security tab), or
- message the Tyllage project lead directly.

Include:

- what you found
- steps to reproduce
- the impact you expect

We aim to acknowledge reports within **3 working days**. If MEOD data or systems could be affected, MEOD will be told as well.

If you think real customer data has leaked:

1. Disable the affected integration.
2. Rotate secrets.
3. Inform MEOD so they can run their response procedure.

## Supported versions

Only the latest commit on `main` is maintained.

| Version | Supported |
|---|---|
| `main` (latest) | ✅ |
| Older commits | ❌ |
| Forks and copies of this repository | ❌ Not authorised. See [LICENSE](LICENSE). |

## Known limitations (by design for the prototype)

| Area | Prototype | Required before a live pilot |
|---|---|---|
| Authentication | None. The farm view (`growth.html`) is open to anyone with the link and marked `noindex` | Server-side auth, hashed passwords, httpOnly `Secure` `SameSite` cookies, rate-limited login, MFA for admin |
| Authorisation | None. Anyone can approve campaigns or accept planting suggestions in their own browser | Roles enforced on the server for every request; approvals by a *different* person than the drafter |
| Data storage | `localStorage`: interest answers (crops, frequency, postal **sector** only), page activity, drafts, decisions, thresholds | PostgreSQL with restricted network access, encrypted backups, retention policy |
| Personal data | No names, phone numbers, emails or full postal codes are collected. The postal code typed into *Collect from a neighbour* is used in the browser and never stored | Consent recorded with timestamp and purpose; PDPA notice; group-buy members contacted through their leader unless they agree to hear from MEOD directly |
| Tracking | UTM tags on outbound links to meodfresh.com; on-page activity counted in `localStorage` only. No analytics or cookies | A consented analytics setup on MEOD's own store; no third-party trackers without review |
| Hosting | Public static site on GitHub Pages | Static front end on Pages is fine; the backend (API, database, webhooks) runs on a separate server host |
| Secrets | None used | Kept only in the backend host's environment variables; never in git, the front end, or chat (see list below) |
| Headers | GitHub Pages defaults (custom response headers aren't supported) | CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors` |
| AI | Rule-based mock. Nothing is sent to an AI service. Suggestions need a person to act | OpenAI project key with spend limits; send minimum fields; redact PII; AI never posts, messages customers, changes prices or changes planting |
| Social publishing | None. Drafts are copied by hand; approving posts nothing | Official platform APIs with MEOD-owned tokens, approval enforced on the server, audit log |
| Third-party scripts | None. Only Google Fonts stylesheets | Pin and add `integrity` hashes to any script added later |
| Ask MEOD assistant | Keyword retrieval over a fixed approved FAQ plus demo data. Phone numbers, emails and full postal codes are removed before a question is saved to `localStorage`. Complaints, refunds, health and bulk orders are always handed to staff | RAG only over approved content, scoped answers, prompt-injection testing, rate limits, a PDPA notice at the start of the chat, retention period for transcripts, staff hand-over on MEOD's authorised channel |
| Search Console import | CSV read in the browser (2 MB cap, 2,000 rows), kept in memory only, never saved or sent | Search Console API with MEOD's OAuth consent, read-only scope, tokens only on the backend |
| Customer analytics | 80 synthetic, pseudonymous customers. Segments and churn signals are suggestions; customers without consent are never messaged | Run on the server with role-based access; staff see pseudonymous IDs; consent checked at send time; a person decides every message |
| Neighbourhood data | Breakdowns for fewer than 5 households are shown as "<5"; no addresses anywhere | Keep the small-group threshold on the server; never expose individual addresses or leader contact details |
| Farm stories | Only facts from approved farm records; every fact must be ticked as verified | Records come from authenticated farm staff; verification and approval logged |

## Secrets for the production build

Set these as environment variables on the **backend** host, never in the repo. GitHub Pages only serves public static files, so it must never hold any of them:

- `DATABASE_URL`
- `SHOPIFY_SHOP_DOMAIN`, `SHOPIFY_ACCESS_TOKEN`, `SHOPIFY_WEBHOOK_SECRET`
- `META_WABA_ID`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_VERIFY_TOKEN`
- `META_APP_SECRET`, `INSTAGRAM_ACCESS_TOKEN`, `TIKTOK_ACCESS_TOKEN` (only if publishing through official APIs is approved)
- `GOOGLE_SEARCH_CONSOLE_CREDENTIALS`
- `OPENAI_API_KEY`, `OPENAI_MODEL`
- `JWT_SECRET`, `SESSION_SECRET`
- `PUBLIC_SITE_URL`, `CORS_ORIGIN`

## Reports from outside the team

We welcome responsible security reports from anyone. Reporting a vulnerability does not give you any right to use, copy or modify the code (see [LICENSE](LICENSE)). Please:

- test only against the public demo, never against MEOD's real systems or data;
- don't access, change or keep anyone else's data;
- don't publish details until we've fixed the issue or agreed a date with you.

There is no bug bounty.

Security reports and testing do not grant any licence to copy, use, modify or redistribute Tyllage code.

## Unauthorised copies and forks

This repository is proprietary. Tyllage does not support, and has not authorised, any deployment, fork or copy of this code outside the Tyllage team. Vulnerabilities found only in someone else's copy are out of scope. If you find Tyllage code being used or hosted without permission, please tell us through the same private reporting channel.

## Rules for team members

- Never commit real names, phone numbers, addresses, emails, order data or MEOD's real sales figures. Use synthetic numbers and pseudonymous leader IDs (`PG-01`).
- Render user or data content with `textContent` (the `h()` helper in `js/ui.js`). Only fixed illustration markup written in the code may be built as SVG nodes.
- Don't add third-party scripts without a review. Pin an exact version, load it only where it's needed, and add an `integrity` hash.
- Keep AI features advisory: they may draft or suggest, but a person approves anything that is posted, sent to customers, or changes prices or planting.
- Store the least data possible. Keep only the postal sector, never a full address, and never collect contact details in the prototype.
- Anything typed by visitors (Ask MEOD) goes through `MEOD.redact()` before it is saved.
- Never show a breakdown for fewer than `MEOD.MIN_GROUP` (5) households.
- Never import real Search Console, customer or order exports into the public demo.
