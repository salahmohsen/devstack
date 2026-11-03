# Revenue strategy for the job pipeline

**Date:** 2026-11-02
**Status:** Research and recommendation. No code changed.
**Scope:** Competitors, pricing, payments, marketing, deploy cost, launch budget, workflow audit, UI migration.

## How to read this

Every number carries a label. **Measured** means I read it from this repo or from the live uiarc.dev and Dokploy data. **Sourced** means it comes from a web page, linked inline. Most web sources here are vendor blogs and comparison sites, and they often disagree, so treat sourced prices as rough until you open the vendor's own page. **Estimate** means my arithmetic from stated assumptions.

## 1. Decision summary

1. **Drop the portfolio and focus on the pipeline.** Agreed, with one sequencing change. Hide it behind a flag first, then delete in waves (section 3).
2. **Your biggest revenue blocker is not a missing feature.** It is that the product has no billing, no pricing, no public signup, and requires every user to bring their own AI key. Job seekers who are not developers cannot do that (section 5).
3. **Launch to developers first.** Software engineers have API keys, use Claude Code, read Hacker News, and your new MCP server speaks directly to them. This is the one segment where BYO AI is a feature instead of a wall.
4. **Use a merchant of record.** Polar first, because it has an official Better Auth plugin and you already run Better Auth. Dodo Payments is the fallback if your country is not supported. Confirm payout support before writing any billing code (section 6).
5. **Do not migrate the UI to Arc now.** Arc's core is free and MIT. Buy Pro only if you want its landing and pricing blocks at launch. A full migration earns nothing (section 9).
6. **Defer Gmail.** Your code requests `gmail.readonly` and `gmail.send`. Google may require an annual security assessment that sources price from $540 to $4,500 and more. Launch with forwarding-based mail ingest and add Gmail after revenue pays for the review (section 8).
7. **Stop writing specs.** Your velocity collapsed after August and the backlog of decisions is the blocker, not the code (section 4).

## 2. What the product is today

**Measured.**

- 262,592 lines of TypeScript and TSX tracked in git. 1,155 commits.
- 59 design specs, 62 implementation plans, 20 ADRs, 139 test files.
- Invite-only signup. `PRODUCT.md` states "Undecided: pricing, licensing, open registration". There are no testimonials, benchmarks, or pricing pages.
- MIT licensed.
- Largest code areas. Hub chat in `apps/web/src/features/agent-hub` is 17,405 lines. The Mastra agent in `apps/agent/src` is 17,694 lines. The GitHub package is 7,558 lines. The applications CRM is 2,927 lines.
- No billing code. A search for Stripe, Polar, or Paddle in `apps` and `packages` found nothing.
- Job source is one third-party API, freehire.me, described on its own site as "the open-source search engine for tech jobs". I could not find a terms page that states whether commercial reuse is allowed. Check that before charging for results built on it.

**The loop that earns money.** Find jobs from freehire, score them with your AI, track them in the CRM, draft a resume and cover letter as an apply package, and read replies from mail. The portfolio, GitHub surface, custom domains, and stack detection are not on that path.

## 3. Dropping the portfolio

**Recommendation.** Yes, drop it. Sequence it as a subtraction.

**Why it earns no revenue.** None of the competitors in section 5 sells a portfolio. `PRODUCT.md` already says the apply loop is the product and the public site only shows the work. The portfolio also carries costs the pipeline does not. These are custom domain verification, a public GitHub OAuth surface, public pages that expose personal data, stack detection AI workflows, and a Socket.IO signal relay.

**Rough size of what leaves (measured).** `packages/github` 7,558 lines, `features/stacks` 1,087, `features/github` 364, `features/profile` 200, `features/domain` 177, `features/portfolio` 93. That is about 9,500 lines plus the routes, database tables, and agent workflows behind them. Resume PDF generation in `packages/pdf` (3,006 lines) belongs to the apply package, so keep it.

**One thing to keep.** A public profile is a free acquisition loop in some products. For job seekers it is weak, because people hide their job search from their employer. I would not keep it for growth.

**Sequence (Subtract Before You Add).**

1. Add a single `PORTFOLIO_ENABLED` flag. Default it off. Hide nav items, routes, and hub tools behind it.
2. Run for one week and confirm nothing in the pipeline imports from the portfolio packages.
3. Delete in waves, one package per pull request, with the type checker as the gate.
4. Keep `username` as an internal identity field until a later cleanup. Do not rename it during the cut.

## 4. Workflow audit

**Premise to attack.** Every plan in the last five months assumed that more product depth leads to revenue. The evidence says otherwise. Five months of building produced no user, no price, and no billing. Per the Attack the Premise principle, I tested that premise against the git history instead of proposing another feature plan.

**Evidence (measured).**

| Signal                      | Value                                                                                          |
| --------------------------- | ---------------------------------------------------------------------------------------------- |
| Commits by month            | June 193, July 454, August 494, September 12, October 0, November 2                            |
| Commit types since August 1 | 197 feat, 166 fix, 77 docs, 22 chore                                                           |
| Fix to feature ratio        | 0.84 fixes per feature                                                                         |
| Specs and plans             | 59 specs and 62 plans for a product with no paying user                                        |
| Polish specs                | 6 specs on UI details such as dynamic island, blobatar, status morph toggle, and action groups |
| Status                      | Invite-only, no pricing, no testimonials                                                       |

**Findings.**

1. **No feedback loop.** Nobody outside you uses the product, so no spec was ever tested against a buyer. Specs, grill locks, and the AI feature harness are controls built for a team that has users to protect.
2. **Polish before demand.** Six specs went to micro-interactions before a single price existed.
3. **Fixes follow features.** Roughly five fixes for every six features suggests each feature ships before it is stable. That is normal for a solo builder, and it is a reason to build less.
4. **The stall is the signal.** Output fell from about 490 commits to 12 after August. The README, plans, and ADRs do not say why. My guess is the work grew past what one person can finish without a launch date. I cannot verify that from the repo.
5. **Production shares a box with a homelab (inference).** The Dokploy account lists Dev-Stack next to Media (Jellyfin, Radarr, Sonarr, qBittorrent, Jackett, Immich), Tools (Ollama, n8n, AdGuard, a Cloudflare tunnel), Books, and CILAS. Dokploy lists zero remote servers, so these all run on one host. Paying customers' data should not share a machine with a torrent stack. This is an inference from names, so confirm where that host lives.
6. **Infrastructure is sized for scale you do not have.** Three Node services, Postgres with pgvector, Redis, and MinIO serve zero external users. Complexity costs you attention, not just money.

**Changes, in order of payoff.**

1. Freeze new specs. The next document is a one-page launch checklist.
2. Set a launch date. Pick one four weeks out and work backward.
3. Ship to 10 to 20 people before building anything else. Record what they actually click.
4. Replace spec, plan, and harness ceremony with a short issue per change. Keep ADRs only for decisions that are expensive to reverse, such as payment provider and mail strategy.
5. Move ordering to "can a stranger pay me for this today". Hub chat polish, new HITL card types, and further assistant-ui work wait until a paying user asks for them.
6. Measure one number weekly. Use activated users, defined as users who generated their first apply package.

## 5. Competitors and what they offer

**Sourced, with conflicts noted.** Prices vary across sources. Check each vendor's page.

| Product                             | Free tier                                  | Paid tier                                                   | Notes                                                                                                                                                                            |
| ----------------------------------- | ------------------------------------------ | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Teal                                | Unlimited job tracking, limited AI credits | Teal+ about $29 per month, $79 per quarter, or $13 per week | Weekly plan is poor value per [one review](https://toolradar.com/tools/teal-hq/pricing)                                                                                          |
| Huntr                               | Up to 100 jobs, per most sources           | Pro about $40 per month                                     | Stripe case study says revenue doubled four years in a row with a six-person team ([Stripe](https://stripe.com/en-de/customers/huntr))                                           |
| Simplify                            | Free autofill and tracking                 | Simplify+ about $39.99 per month, $89.99 per three months   | Pricing page not public per one source                                                                                                                                           |
| Jobscan                             | Limited scans                              | About $40 to $50 per month                                  | Focus on ATS resume matching                                                                                                                                                     |
| Careerflow                          | Free tier                                  | Sources conflict from about $40 per month to $99 per month  | Do not rely on this number                                                                                                                                                       |
| Auto-apply bots (LazyApply, Sonara) | Varies                                     | Varies                                                      | [Employers call auto-apply "snake oil"](https://www.hiration.com/blog/ai-auto-apply-bots/) and one competitor-run test found only three of eight bots completed the final submit |

Broader roundups: [Rework](https://resources.rework.com/tools/ai-tools/best-ai-tools-for-job-seekers-2026), [Dev.to ranking](https://dev.to/charliemorrison/the-7-best-ai-job-search-tools-in-2026-tested-and-ranked-g56).

**What I could not find.** Churn or retention data for any of these. Ask early users how long they stay active. Job seekers leave when they get hired, so expect a short lifetime, probably a few months (guess).

**Where you can win (inference).**

- Auto-apply has a bad reputation with employers. A tool that drafts evidence-grounded applications and keeps a human approval step has room to be the trusted option.
- Competitors lean on browser extensions and manual tracking. Reading replies from mail to update the CRM automatically is your most distinctive loop. I did not verify competitors' mail features, so confirm before you put it in marketing copy.
- Developers specifically. freehire is a tech job index, and your MCP server lets a developer run the pipeline from Claude Code. No competitor I found does that.

**Where you lose.** Teal and Huntr have brand, extensions, and years of data. Do not try to match them on breadth. Match them on one segment.

## 6. Payments without paperwork

**Goal.** Charge monthly subscriptions without incorporating, handling VAT yourself, or filing tax in other countries. A merchant of record (MoR) sells to the customer in its own name, charges and remits tax, and pays you the net.

**Fee comparison (sourced, then calculated).** The following is the cost of one $19 monthly sale. Rates are from [Dupple](https://dupple.com/learn/cheapest-merchant-of-record-platforms), [Polar](https://polar.sh/docs/fees), and [Dodo](https://dodopayments.com/blogs/stripe-managed-payments-fees-explained). Dodo is a competitor to the others, so its Stripe figure is a rival's reading. Polar's page also lists add-ons of about 1.5 percent for international cards and 0.5 percent for subscriptions, which are not in the totals below.

| Provider                  | Rate               | Fee on $19 | Share |
| ------------------------- | ------------------ | ---------- | ----- |
| Creem                     | 3.9% + $0.40       | $1.14      | 6.0%  |
| Polar                     | 4% + $0.40         | $1.16      | 6.1%  |
| Paddle                    | 5% + $0.50         | $1.45      | 7.6%  |
| Stripe Managed Payments   | about 6.4% + $0.30 | $1.52      | 8.0%  |
| Stripe direct (not a MoR) | 2.9% + $0.30       | $0.85      | 4.5%  |

Stripe direct is cheapest on paper, but you file VAT and sales tax yourself in every region. That is the paperwork you want to avoid. Lemon Squeezy is moving its users to Stripe Managed Payments per [one comparison](https://dupple.com/learn/cheapest-merchant-of-record-platforms), so skip it.

**Recommendation.** Polar. Reasons.

- It publishes an official [Better Auth plugin](https://polar.sh/docs/integrate/sdk/adapters/better-auth) with checkout, customer portal, and webhooks. Your auth is Better Auth, so the integration is a plugin and a webhook handler.
- Fee is close to the lowest.
- It supports usage-based billing, which fits AI credits later.

**The gating check, 10 minutes.** Payout support depends on your country and on whether individuals can register. Polar pays out through Stripe Connect Express, so an individual qualifies only where Connect Express supports individuals. I could not confirm Egypt or any specific country for Polar or Creem. One AppSumo answer from a Dodo employee says Egypt and UAE are supported for payins and payouts, but that is a forum post, not policy. Open each provider's supported-countries page, confirm your country and the individual account type, then decide. If Polar rejects your country, use Dodo Payments.

**Billing design (minimum).**

1. One product, two prices, monthly and quarterly. Add annual later.
2. Store the plan on the user and read it through one `getEntitlements(userId)` function. Do not scatter plan checks.
3. Webhook handler is idempotent on the event id. Polar retries.
4. A usage counter per user per month for AI credits.

## 7. Pricing and plans

**Principle.** Job seekers have short lifetimes, so charge enough per month to earn back acquisition cost before they leave. Stay below the $29 to $40 anchor competitors set, because you have fewer integrations.

**Proposed plans (to test, not proven).**

|                     | Free                                               | Pro                                                       |
| ------------------- | -------------------------------------------------- | --------------------------------------------------------- |
| Price               | $0                                                 | $19 per month, $45 per quarter                            |
| Job tracking        | Up to 25 active applications                       | Unlimited                                                 |
| Job discovery       | Daily fetch, top matches shown                     | Full ranked list and filters                              |
| AI                  | 5 AI credits per month (score or apply package)    | 150 credits per month                                     |
| Apply packages      | Resume PDF with watermark-free export, 2 per month | Unlimited tailored resume and cover letter within credits |
| Mail                | Forwarding address, manual review                  | Auto-tracking from replies, smart rules                   |
| MCP and Claude Code | Read-only                                          | Full pipeline control                                     |
| Own AI key          | Allowed, no credits needed                         | Allowed, credits waived                                   |

**Why these limits.**

- **Free must be useful.** Teal's generous free tier is what makes people try it. Keep the tracker free and meter the AI, since AI is your only real variable cost.
- **A bring-your-own-key path stays.** Developers can attach their own key and use Pro features without credits, at a lower price such as $8 per month. This removes your AI cost and keeps your current architecture honest.
- **Credits instead of "unlimited".** The AI margin guide I found warns that power users on flat plans can push a $50 plan to a 30 percent margin ([source](https://www.getmonetizely.com/articles/how-to-factor-llm-api-costs-into-your-pricing-without-killing-your-margins)).

**AI cost per user (estimate).** I priced a monthly active user at 30 scored jobs per day, 20 apply packages per month, and 50 hub chat turns. Model prices are from [aggregator pages](https://www.morphllm.com/gemini-api-pricing), not official pages. Verify them before committing.

| Model class           | Price per million tokens in and out | Estimated monthly cost per user |
| --------------------- | ----------------------------------- | ------------------------------- |
| Gemini 2.5 Flash-Lite | $0.10 and $0.40                     | under $1 for scoring            |
| Gemini 2.5 Flash      | $0.30 and $2.50                     | about $1 to $2 total            |
| Claude Haiku 4.5      | $1 and $5                           | about $3 to $5 total            |

At $19, a Flash-class model leaves about 90 percent gross margin before payment fees. Use a cheap model for scoring and a stronger model only for apply packages.

**Revenue math (estimate).** After a $1.16 payment fee and about $1.50 of AI, one Pro subscriber nets about $16.30 per month.

| Target     | Paying users needed | Free signups needed at 3% conversion |
| ---------- | ------------------- | ------------------------------------ |
| $1,000 MRR | 53                  | about 1,770                          |
| $5,000 MRR | 264                 | about 8,800                          |

The 3 percent conversion is an assumption, not data. Your first beta will replace it.

## 8. Launch checklist and costs

### One-time and annual

| Item                       | Cost                                                     | Notes                                                                                                                         |
| -------------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Domain                     | about $12 to $15 per year (estimate)                     | Check name first (see below)                                                                                                  |
| Legal pages                | $0 to $100                                               | Privacy policy, terms, refund policy. A MoR handles tax and the customer contract, but you still need your own privacy policy |
| Arc Pro (optional)         | $149 per year or $249 once                               | Defer, see section 9                                                                                                          |
| Google security assessment | $0 if you defer Gmail, otherwise $540 to $4,500 per year | See below                                                                                                                     |
| Company registration       | $0 with a MoR, if your country allows individual payouts | Confirm in section 6                                                                                                          |

### Monthly

| Item                | Cost                                | Notes                                                         |
| ------------------- | ----------------------------------- | ------------------------------------------------------------- |
| Server              | about $7 to $18                     | Section 10                                                    |
| Backups             | $0 to $3                            | Offsite object storage                                        |
| Transactional email | $0 to $20                           | Resend free tier is enough for beta. Check its current limits |
| AI                  | about $1 to $5 per active user      | Section 7                                                     |
| Payment fees        | about 6 percent plus $0.40 per sale | Section 6                                                     |
| Monitoring          | $0                                  | Free tiers                                                    |
| Marketing           | $0 to $150                          | Section 11                                                    |

### Total to get to launch

- **Minimum:** about $15 to $120 one-time, plus about $30 to $60 per month before AI usage.
- **If you keep Gmail:** add $540 to $4,500 per year.
- **Marketing inside the first 90 days:** $0 to $500 (see section 11).

### The Gmail problem

`packages/core/src/connections/constants.ts` requests `gmail.readonly` and `gmail.send`. Sources disagree on whether `gmail.readonly` is a restricted scope. Nylas says yes ([source](https://developer.nylas.com/docs/cookbook/use-cases/build/google-oauth-scopes/)), and restricted scopes need an annual CASA Tier 2 assessment. Cost quotes range from $540 under a negotiated rate to $3,000 to $4,500 from [Leviathan](https://leviathansecurity.com/programs/google-casa-cloud-application-security-assessment). Another vendor that sells a shared app claims $15,000 to $75,000, which I would discount.

Until verified, Google caps unverified apps at a small test-user count and shows a warning screen. That blocks a public launch of Gmail features.

**Recommendation.**

1. Launch with a forwarding address. Each user forwards job emails to `jobs+<token>@yourdomain`. Your Resend inbound path already exists, though it is currently bring-your-own, so you must set up one platform inbound domain.
2. Keep Gmail for users on a self-host or testing list.
3. Apply for Google verification only after you have paying users. Read Google's current scope table first, since the vendor sources conflict.

### Other things to verify before launch

- **freehire terms.** Whether you may build a paid product on its API, and its rate limits.
- **Name.** "DEVSTACK" collides with the OpenStack developer tool of the same name, which will hurt search and trademark clarity. Check domain and trademark availability. You already use `tsu-stack` and `personal-hub` internally.
- **Privacy.** You store resumes, mail, and job history. Add data export and delete, and a retention rule. GDPR applies to EU users even with a MoR.
- **Refund policy.** Job seekers will ask. Decide it once and put it on the pricing page.

## 9. The Arc UI question

**What Arc is (sourced).** [uiarc.dev](https://uiarc.dev/pricing) offers a free MIT core with 121 components and 22 blocks, plus a CLI and MCP server. Pro adds 118 components and 116 blocks, including an AI chat block, pricing, and onboarding pieces. Pro costs $149 per year or $249 once. A team lifetime is $799. The launch post was September 29, and 300 developers had bought Pro per its site, so the library is new.

**Recommendation.** Do not migrate the whole UI.

- **No revenue effect.** Your UI already has components from coss on Base UI and assistant-ui for chat. A migration touches every screen and delivers nothing a buyer pays for.
- **Compatibility is unverified.** I did not check whether Arc components work with Base UI primitives and your Tailwind v4 theme. Test one component in a branch first.
- **Free core is enough.** You can adopt individual free components wherever a screen needs one.
- **Revised after a component-level review.** The free tier already covers the landing and pricing blocks, so Pro is not needed for the marketing site. The Pro items worth using are billing, upgrade prompts, mail reply drafting, and answer feedback. At the Egypt lifetime price of $125 that is a reasonable buy once billing work starts. See [Arc UI evaluation](./2026-11-02-arc-ui-evaluation.md).
- **AI chat block.** You already shipped a hub chat on assistant-ui, so a second chat UI is duplicate work.

Per Subtract Before You Add, the UI migration is addition without removal, so it waits behind the portfolio cut.

## 10. Cheapest sensible deploy

**Today (inference).** Production runs on Dokploy on a host shared with a homelab and reached through a Cloudflare tunnel. Dokploy shows no remote servers, so I assume a machine you own. A home host has no uptime guarantee, shares a power and ISP risk, and mixes customer data with a torrent stack.

**Recommendation.** Move production to its own small VPS.

| Option                  | Monthly cost                               | Notes                                                                                    |
| ----------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Hetzner CX23, 4 GB      | about €5.49                                | Reported June 2026 price. Tight for 3 Node services, Postgres, Redis, MinIO, and Dokploy |
| Hetzner CAX21, 8 GB Arm | about €7.99 to €8.49                       | Better fit. Check that your images build for arm64                                       |
| Railway or Fly.io       | about $15 to $35 for this stack (estimate) | Less to maintain, costs more                                                             |
| Home host (current)     | $0 marginal                                | Reliability and security risk                                                            |

Hetzner raised prices in April and June 2026 and sources disagree on current numbers ([Northflank](https://northflank.com/blog/hetzner-cloud-server-price-increases), [Findstack](https://findstack.com/resources/hetzner-price-increase-2026)). Some reports say the cost-optimized plans were hard to order in autumn, so confirm availability on Hetzner's own page. Pick the 8 GB plan, since the stack's real memory use is unmeasured.

**Plan.**

1. Measure actual memory on the current host before choosing a plan. Dokploy metrics need a URL and token, which I did not have.
2. Run the same compose file on the VPS under a separate Dokploy instance.
3. Back up Postgres nightly to object storage outside the VPS. Test one restore.
4. Keep Cloudflare for DNS and TLS, which is free.
5. After the portfolio cut, drop Socket.IO relay and MinIO if uploads allow it. That removes two moving parts.

**Do not do.** A load balancer, Kubernetes, or a second region. None of these matter below a few hundred users.

## 11. Marketing

**Evidence is thin.** The sources I found are founder anecdotes and vendor blogs. One reports a micro-SaaS reaching $8K MRR on under $500, another a job-tool Reddit post that drew about 8,900 views and one paying customer, and a third a Product Hunt top-50 launch that produced no signups ([roundup](https://dev.to/ericwoooo_kr/how-i-got-my-first-100-users-for-a-micro-saas-without-paid-ads-1h6l)). Read these as hints, not benchmarks.

**Plan, in order.**

1. **Network and beta (weeks 1 to 4).** Invite 10 to 20 developers you know. Watch them use it. Your invite system already tracks who invited whom, so reuse it as a referral program (one free month per paying referral).
2. **Show HN and developer communities (week 5).** Lead with the Claude Code and MCP angle and the open-source repo. Developers are your reachable segment. Post when you can reply for a full day.
3. **A free tool with no signup.** Paste a job description and a resume, get a fit score. You already have requirement matching built. It earns search traffic and feeds signups.
4. **Reddit, carefully.** r/cscareerquestions, r/ExperiencedDevs, and r/jobs restrict self-promotion. Answer questions first, and mention the tool only when relevant.
5. **Search content.** Write 5 to 10 pages around job-search tasks, such as tracking applications and tailoring a resume, aimed at developers.
6. **Product Hunt.** Low priority, per the sources above.

**Paid ads.** Skip for now. At $19 per month and a lifetime of perhaps three months, gross revenue per customer is about $57 (estimate), so acquisition cost must stay under about $15 to $20 to be sane.

**Positioning line to test.** A job-search pipeline you can drive from your editor. Human-approved applications, not bot spam. Use only claims you can show, per `PRODUCT.md`.

## 12. Plan

**Week 0 (three days). Decide and verify.**

- Confirm payout country on Polar, then Dodo.
- Read freehire's terms and rate limits.
- Pick the name and check domain and trademark.
- Pick the launch date.

**Weeks 1 to 2. Subtract and add the minimum.**

- Portfolio flag off. Delete in waves afterward.
- Polar checkout, webhook, `getEntitlements`, and a credit counter.
- Platform AI key with a cheap model for scoring.
- Public signup with a free plan. Keep invites as referrals.
- Pricing, privacy, terms, and refund pages.
- Forwarding-based mail ingest.

**Weeks 3 to 4. Private beta.**

- Move production to its own VPS with tested backups.
- 10 to 20 developers. Talk to each one.
- Metric. Percent who reach a first apply package.

**Weeks 5 to 8. Public launch.**

- Show HN, free tool, Reddit answers, first search pages.
- Marketing site, optionally with Arc Pro blocks.
- Decide Gmail verification only after paying users exist.

**Kill and continue gates.**

- **Gate 1, end of week 4.** Fewer than 5 of 15 beta users reach an apply package. Stop adding features and fix onboarding first.
- **Gate 2, end of week 8.** Fewer than 100 free signups. The channel is wrong, so change channels before changing the product.
- **Gate 3, day 90.** Fewer than 10 paying users. Revisit price, segment, and whether the niche is large enough.

## 13. Open questions I could not answer

1. Which country will you receive payouts in, and are you a student or employee? This decides the payment provider.
2. Where does the production host physically run?
3. Does freehire allow commercial use?
4. Are there waiting users, or is the first cohort strangers?
5. Real memory and CPU use of the three services under load.
6. Competitors' exact mail features and current official prices.

## Sources

- Competitors: [Rework](https://resources.rework.com/tools/ai-tools/best-ai-tools-for-job-seekers-2026), [Teal pricing](https://toolradar.com/tools/teal-hq/pricing), [Huntr on Stripe](https://stripe.com/en-de/customers/huntr), [auto-apply critique](https://www.hiration.com/blog/ai-auto-apply-bots/)
- Payments: [Dupple](https://dupple.com/learn/cheapest-merchant-of-record-platforms), [Polar fees](https://polar.sh/docs/fees), [Polar Better Auth](https://polar.sh/docs/integrate/sdk/adapters/better-auth), [Polar countries](https://polar.sh/docs/merchant-of-record/supported-countries), [Creem countries](https://docs.creem.io/faq/supported-countries), [Dodo on Stripe MoR](https://dodopayments.com/blogs/stripe-managed-payments-fees-explained)
- UI: [Arc pricing](https://uiarc.dev/pricing), [Arc docs](https://uiarc.dev/docs)
- Hosting: [Northflank](https://northflank.com/blog/hetzner-cloud-server-price-increases), [Findstack](https://findstack.com/resources/hetzner-price-increase-2026), [Dokploy on Hetzner ADR](https://ideony-docs.pages.dev/decisions/0012-dokploy-hetzner-hosting)
- Gmail: [Nylas](https://developer.nylas.com/docs/cookbook/use-cases/build/google-oauth-scopes/), [Leviathan](https://leviathansecurity.com/programs/google-casa-cloud-application-security-assessment)
- AI cost: [Monetizely](https://www.getmonetizely.com/articles/how-to-factor-llm-api-costs-into-your-pricing-without-killing-your-margins), [Morph](https://www.morphllm.com/gemini-api-pricing)
- Marketing: [Dev.to first 100 users](https://dev.to/ericwoooo_kr/how-i-got-my-first-100-users-for-a-micro-saas-without-paid-ads-1h6l)
