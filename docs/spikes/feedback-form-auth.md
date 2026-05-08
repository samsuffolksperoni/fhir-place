# Feedback-form Auth — Spike

Status: Proposed — May 2026
Drives: #349 (`Add an in-app feedback button and form that files GitHub issues`)
Related: `docs/sdlc/gaps.md` Theme 1 (agentic users for post-deploy walkthroughs)

## TL;DR

Build a small server-side proxy. A Cloudflare Worker (free tier, ~5
min cold-start-free) holding a fine-scoped GitHub App installation
token, with Turnstile in front of the form, rate-limited per IP, with
a PHI-shape pre-flight check on the payload before forwarding to
GitHub. Single endpoint, ~150 LOC of Worker code, one new GitHub App
scoped to `issues: write` on this one repo.

The other four options I considered are weaker on at least one of the
three goals: (a) low friction for real human visitors, (b) usable by
agentic users via Playwright with no GitHub identity, and (c) faithful
end-to-end test of the path real users take. The proxy is the only
option that hits all three.

Cost is the obvious counter — this is the project's first piece of
backend infra. The spike argues that cost is small, well-understood,
and recoverable (delete the Worker, the form falls back to a "go to
GitHub" link).

## Why now

#349's user stories make the trade-off sharp:

- **A real visitor** at a connectathon demo who hits a bug should be
  able to file in 30 seconds without leaving the page or signing in.
- **Marco, the FHIR-engineer persona** (an agentic user, see Theme 1
  in `docs/sdlc/gaps.md`), should walk the live build via Playwright
  and file an issue *through the same UI a human would use*. That's
  the whole point of agentic users — exercise the user-shaped path,
  not the API-shaped path.
- **Captured context** (route, server URL, viewport, console errors,
  network 4xx/5xx, build SHA) shouldn't be the user's job to type.

The first goal kills GitHub-OAuth-per-user (signup friction). The
second kills it again (agentic users have no GitHub identity, per the
rule in `hourly-engineer-dispatch.md`: *"the bot has no GitHub user
identity"*). The third kills email-forwarders (the user can't see the
auto-context being attached, can't dedupe, can't choose labels).

What's left is "the form has a backend that holds the auth." That's
the proxy.

## Goals and non-goals

### Goals

- Ship a "Report feedback" button in the demo app that opens a form,
  collects the user's answers + auto-captured context, and creates a
  GitHub issue in one click.
- Same UI surface for human visitors and agentic users (Playwright-
  driven). `data-testid` selectors specified in #349.
- No GitHub identity requirement for the filer.
- Spam-resistant. Rate-limited. Bounded payload.
- PHI-safe — no SSN, NPI, or recognisable patient identifier patterns
  forwarded.
- Recoverable — if the proxy is shut off, the form gracefully degrades
  to a "Open this prefilled issue in a new tab" link.
- Cheap — should run on a free tier with no per-request cost at the
  volumes the demo will see (single-digit issues per day for a long
  while).

### Non-goals

- Multi-tenant. This files into one repo.
- Authoring rich content (markdown editor, image attachments beyond a
  single screenshot). The form is for "I hit a bug" / "I have a
  thought," not for filing well-structured tickets — PM triage labels
  the rest.
- Replacing the GitHub Issues UI for power users.
- Per-user attribution. Every issue arrives `origin: in-app-feedback`
  with no GitHub user attached. Real users typing with attitude can
  add a sign-off in their text.

## Options considered

### A — Server-side proxy (recommended)

A small HTTP service holds a GitHub App installation token. UI POSTs
`{title, body, labels, severity, context}` to the service's single
endpoint. The service validates the payload, runs the spam/PHI gates,
calls `POST /repos/.../issues`, returns the new issue URL.

Concrete tech choice: **Cloudflare Workers**. Free tier covers
100k requests/day; cold-start is sub-millisecond; native KV/D1 if we
later need rate-limit state; built-in Turnstile integration; no
container infra to maintain. Alternatives — AWS Lambda + API Gateway
(works but more moving parts for the same result), Vercel Functions
(same shape as Cloudflare; team preference), Fly Machines (overkill).

GitHub auth: **a new GitHub App** named `fhir-place feedback proxy`,
installed only on this repo, scoped only to `issues: write`. Use
installation-token auth (refreshes every hour, no PAT in the Worker).
Token lives in a Cloudflare secret, never logged.

Spam gate: **Cloudflare Turnstile** widget on the form (invisible by
default, challenges suspect submissions). Free, no JS-side captcha
puzzle for honest users.

Rate limit: per IP (Cloudflare's `cf.connectingIp`), 10 issues/hour,
implemented in Workers KV. Exceeds → 429.

Pros:
- Hits all three goals.
- Cheap. Realistic monthly bill: $0.
- Recoverable. Delete the Worker → the form falls back to option E
  (see below) gracefully.
- Token rotation / revocation is GitHub-native (App installation can
  be uninstalled in two clicks).

Cons:
- New infra. The project hasn't had backend before.
- A new secret to manage (the Cloudflare API token for deploys, plus
  the GitHub App private key Cloudflare uses to mint installation
  tokens).
- Spam exposure is real if Turnstile + rate limit are bypassed.

### B — GitHub OAuth per user (Device Flow)

Each visitor authenticates via GitHub OAuth. The form POSTs directly
to the GitHub API as that user.

Pros:
- No proxy infra. UI is the only thing we host.
- Per-issue attribution is correct.
- Spam is GitHub's problem.

Cons:
- Friction. A first-time visitor at the connectathon hits the
  feedback button → "sign in with GitHub" wall → bounces.
- **Fatal for agentic users.** Per `hourly-engineer-dispatch.md`:
  *"the bot has no GitHub user identity"*. Adding one would mean
  giving the agent its own GitHub account, which then has write scope
  and shows up in commit/issue trails as a third human-looking actor.
  Exactly the thing the existing rule is trying to avoid.

### C — Email-to-issue forwarder (Formspree / Webhook → Action)

Form POSTs to Formspree (or similar). Formspree emails an inbox; a
GitHub Action polls or receives webhooks, parses, opens the issue.

Pros:
- Zero infra we own.
- Zero token in the browser.

Cons:
- Latency: minutes between submit and issue. The user gets no
  immediate "filed as #NNN" confirmation.
- Brittle: Formspree downtime, email parsing fragility, label
  application via post-hoc Action is fiddly.
- Auto-context attachment via email gets ugly fast (multipart
  encoding of console-error blobs).
- The agent driving an agentic user can't dedupe-by-issue-number
  because there's no immediate response.

### D — `mailto:` link

Form opens the user's mail client with a prefilled subject + body. The
user sends the email, a GitHub Action turns it into an issue.

Pros:
- Zero infra. Zero JS.

Cons:
- Mobile mail clients mangle long bodies.
- The user has to actually have a mail client configured.
- Same latency / parsing fragility as C, plus broken UX.
- Agentic users can't "send mail" from Playwright easily.

### E — Prefilled GitHub `issues/new` link (the fallback)

A "Report feedback" button opens
`https://github.com/danielsperoniteam/fhir-place/issues/new?title=…&body=…&labels=…`
in a new tab. The user is on GitHub's own form, signed in as
themselves, with the title/body/labels pre-populated.

Pros:
- Zero infra. Zero secrets. Zero spam gate (GitHub handles it).
- Trivial to implement (one `<a>` tag with a `URLSearchParams`).
- Per-user attribution is real and free.

Cons:
- The user must have a GitHub account.
- Body length limited to ~7KB after URL encoding — kills auto-context
  attachment of console errors / network logs.
- Cannot attach screenshots via URL.
- Agentic users still can't use this path (no GitHub identity).
- Different UX than the in-app form — "sign in to GitHub" friction
  for a subset of users.

E is **not the recommended primary path**, but it's the **fallback
mode** for option A: when the proxy is unreachable (down, removed, or
the user's network blocks it), the form gracefully degrades to "Open
this prefilled issue on GitHub" with a truncated body. This makes A
recoverable.

## Scoring

| Option | Friction for visitors | Works for agentic users | Auto-context preserved | Infra cost | Time to first issue |
| --- | --- | --- | --- | --- | --- |
| A — Proxy | Low | **Yes** | **Yes** | Low (CF free tier) | < 1 second |
| B — OAuth | High (signup) | No | Yes | None | < 1 second |
| C — Email | Low | Sort-of | Partial | Low | Minutes |
| D — mailto: | Medium | No | Partial | None | Manual |
| E — Prefill link | Medium (signup) | No | No (URL length) | None | < 1 second |

Only A clears all three blocking constraints. B fails on agentic
users; C/D fail on UX and round-trip; E fails on auto-context.

## Recommended architecture

```
Browser (apps/demo)
  │
  │  POST /api/feedback
  │  Content-Type: application/json
  │  { title, body, severity, context, turnstileToken }
  │
  ▼
Cloudflare Worker (fhir-place-feedback)
  │
  │  1. Verify Turnstile token (CF API, ~30 ms)
  │  2. Rate-limit check (Workers KV, ~1 ms)
  │  3. PHI-shape regex on body + context (~1 ms)
  │  4. Mint GitHub App installation token (cached 50 min)
  │  5. POST /repos/danielsperoniteam/fhir-place/issues
  │     - title (no bracket prefix)
  │     - body (user text + collapsible "Auto-attached context")
  │     - labels: [type:bug | type:feature, area:fhir-explorer,
  │               origin:in-app-feedback, priority:<derived>,
  │               human-review-needed:low]
  │  6. Return { issueNumber, url } to the browser
  │
  ▼
GitHub Issues
```

### Endpoint shape

`POST https://feedback.fhir-place.workers.dev/api/feedback`

Request body:

```json
{
  "title": "Patient detail crashes when name.given is missing",
  "severity": "blocking" | "bug" | "thought",
  "summary": "I clicked Patient → first row → modal opened but body is empty.",
  "expected": "Modal should show the patient's data",
  "actual": "Modal renders blank, console shows TypeError",
  "context": {
    "route": "#/Patient/abc-123",
    "fhirBaseUrl": "https://r4.smarthealthit.org",
    "useMock": false,
    "viewport": { "w": 1280, "h": 800 },
    "userAgent": "...",
    "buildSha": "f6e1ad1",
    "consoleErrors": ["TypeError: Cannot read property 'given' of undefined ..."],
    "networkFailures": [
      { "url": "/Patient/abc-123", "status": 200 }
    ]
  },
  "turnstileToken": "..."
}
```

Response:

```json
{ "issueNumber": 412, "url": "https://github.com/.../issues/412" }
```

Errors: 400 (validation), 401 (Turnstile), 429 (rate limit), 422 (PHI
shape detected, body returned to caller for review), 5xx (GitHub
unavailable, fall back to E client-side).

### PHI-shape pre-flight

Before forwarding the body to GitHub, the Worker greps the combined
text for:

- US SSN: `\b\d{3}-\d{2}-\d{4}\b`
- NPI: `\b\d{10}\b` *and* the word "NPI" within 50 chars
- MRN-shaped: `\bMRN[ :]?\d{6,}\b`
- Phone: `\b\d{3}[ -]\d{3}[ -]\d{4}\b` *unless* the host is
  `r4.smarthealthit.org` (the Synthea synthetic data uses real-shape
  phones intentionally)
- Email: `[\w.+-]+@[\w.-]+\.\w+` *unless* the host is a known
  sandbox

A hit returns 422 with the matching string highlighted, so the user
can clean it up and resubmit. This is **defensive only** — the demo
points at sandbox FHIR servers with synthetic data. Real PHI shouldn't
exist there. The check is for the case where a user typed a real
patient detail in the description by mistake.

### Turnstile gate

Cloudflare Turnstile (`cf-turnstile`) widget on the form, invisible
by default. The Worker validates the token via Cloudflare's API
(`https://challenges.cloudflare.com/turnstile/v0/siteverify`) before
processing. Free tier covers the demo's volume.

### Rate limiting

Workers KV namespace `feedback-ratelimit`. Key: `ip:<sha256(ip)>`.
Value: `count:<n>:resetAt:<ts>`. TTL: 1 hour. Limit: 10/hour/IP.
Hash the IP so we don't store raw IPs.

### Token rotation / revocation

GitHub App installation tokens auto-rotate every hour. The private
key the Worker uses to mint them lives in `wrangler secret`
(encrypted, never in repo). If the proxy is compromised, uninstall
the App from the repo (two clicks in GitHub UI) and the existing
tokens become useless.

## Operational concerns

### Cost

- Cloudflare Workers free tier: 100k req/day, 10ms CPU/req.
- Cloudflare KV free tier: 100k reads/day, 1k writes/day, 1 GB.
- Turnstile: free, unlimited.
- GitHub App: free.
- Realistic demo volume: < 50 issues/day. **$0/month expected.**

### Deploy

`wrangler deploy` from CI on push to `main` of a new
`infra/feedback-proxy/` directory. Two new repo secrets:
`CLOUDFLARE_API_TOKEN`, `GITHUB_APP_PRIVATE_KEY`.

### Observability

Worker writes structured logs (Cloudflare Logpush → R2 if we want
retention). Each request logs: timestamp, IP hash, Turnstile pass/fail,
PHI-gate pass/fail, GitHub API response code, latency. **Never the
body or the user's text.**

### Failure modes

| Failure | UI behaviour |
| --- | --- |
| Worker 5xx / unreachable | Fall back to option E — open a new tab to GitHub's `issues/new` with a truncated prefilled body. Show "Couldn't file directly — opened a draft on GitHub for you to submit." |
| Turnstile fails | Show "Please confirm you're human" with the visible challenge. |
| Rate limit hit | Show "Too many issues filed from this network in the last hour. Try again later or open the issue on GitHub directly." |
| PHI gate hits | Show "Looks like there might be PHI in your text or context — please review the highlighted parts and resubmit." |
| GitHub 422 (issue body invalid) | Show "GitHub rejected the issue — please simplify and try again," log the validation error. |

### What if the proxy is abused?

- Cloudflare Turnstile + 10/hour/IP cap is the front door.
- The GitHub App is scoped to `issues: write` only, on this one repo.
  Worst case: someone spams 10 issues/hour and PM-triage closes them
  the next morning.
- If abuse becomes systemic: tighten rate limit, add captcha
  visibility, or temporarily uninstall the App. None of these touch
  the rest of the system.

## Open questions worth validating before implementation

1. **Cloudflare account ownership.** Whose Cloudflare account does
   the Worker live in? If the project doesn't have a CF account, who
   creates one and pays the (zero) bill? Suggest: a fresh CF account
   under the org, billing alert at $1/month.
2. **GitHub App private key storage.** `wrangler secret put` is fine
   for the Worker; what about the *backup* of the key for disaster
   recovery? Suggest: the GitHub App's "Generate a private key"
   action keys, with the active one in `wrangler secret` and the
   spare in 1Password (or wherever the team keeps shared secrets).
3. **Turnstile site-key choice.** Cloudflare offers a "Managed"
   challenge mode (recommended) and "Non-interactive" / "Invisible"
   modes. Confirm the Managed mode doesn't surface a CAPTCHA puzzle
   for honest users in the typical case.
4. **`origin: in-app-feedback` label.** Needs to be added to
   `scripts/sync-labels.mjs` in the same PR as #345 (the
   `human-review-needed:` label PR), or a sibling PR that lands
   first.
5. **Agentic-user flow specifically.** When Marco the agentic user
   files via this form, his Playwright run sees Turnstile. Does the
   Cloudflare bypass-secret feature work cleanly here? Suggest:
   issue a per-environment Turnstile site-key for "agentic" runs
   that solves automatically (Cloudflare supports
   `bypass-for-test` keys).

## What this spike does NOT decide

- The visual design of the form (#349 has a sketch; design polish is
  a follow-up issue).
- Whether to extend this proxy to other write operations later (e.g.
  posting comments). Out of scope; if needed, a separate spike.
- Whether to allow signed-in GitHub users to optionally attribute
  their feedback (via a "Sign in with GitHub" link on the form that
  upgrades the issue's body with their handle but doesn't change the
  filing path). Nice-to-have, defer to v2.
- Whether the proxy should also gate UAT-validation comments or
  other agentic comment-writes. Today those go through MCP with
  `GITHUB_TOKEN` — a different, workflow-scoped path, fine for now.

## Sub-issues this spike unlocks

If the recommendation lands, #349 splits into:

1. **`infra(feedback-proxy)`** — Create the GitHub App, the
   Cloudflare Worker source under `infra/feedback-proxy/`,
   `wrangler.toml`, the deploy workflow, the rate-limit + Turnstile
   + PHI gates, and a smoke test that POSTs to the deployed Worker
   and confirms a test issue is created and closed.
2. **`feat(demo): feedback button + form UI`** — Floating button,
   modal form, a11y, Playwright `data-testid` selectors, captures
   route/server/console/network/build SHA, calls the proxy.
3. **`feat(demo): graceful fallback to GitHub prefill link`** —
   Option E behaviour when the proxy 5xxs.
4. **`chore(labels): add origin: in-app-feedback`** — small label
   sync change. Should chain after #345 if that's still in flight.

The first sub-issue is the gating one — until the proxy exists, the
form has nothing to talk to. Suggested order is the order above.

## Recommendation

**Adopt option A.** Spin out the four sub-issues above, in the listed
order, each as a separate PR.

Confidence is high. The infra is small, the security model is
well-trodden, the cost is zero, and the recoverability story (delete
the Worker → fall back to option E in the UI) means we can back out
without breaking the form.