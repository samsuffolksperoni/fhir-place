# Deploying your own fhir-place instance

fhir-ui (`apps/demo`) is a Vite SPA — the build output is a folder of static
files that can be served from any CDN or static host with no server-side
runtime.

## Prerequisites

- **Node.js ≥ 20** and **pnpm** (`npm i -g pnpm`)
- A FHIR R4 server to point at, or use the in-browser MSW mock (no server
  needed — good for UI-only deployments)

---

## Option 1 — Fork + GitHub Pages (recommended, zero config)

This is the easiest path. GitHub Pages is already wired up; you just need to
enable it on your fork.

1. **Fork** the repository on GitHub.
2. In your fork, go to **Settings → Pages** and set **Source** to
   **GitHub Actions**.
3. Push any commit to `main` — the
   [pages.yml](../.github/workflows/pages.yml) workflow fires automatically
   and deploys to:

   ```
   https://<your-username>.github.io/<your-repo-name>/
   ```

   The workflow injects `VITE_BASE_PATH` from the repo name automatically, so
   routing works without any manual edits.

4. **Point at your own FHIR server** by editing the `Build demo (main)` step
   in `.github/workflows/pages.yml`:

   ```yaml
   - name: Build demo (main)
     working-directory: main-src
     run: pnpm --filter @fhir-place/demo build
     env:
       VITE_USE_MOCK: "false"
       VITE_BASE_PATH: "/${{ github.event.repository.name }}/"
       VITE_FHIR_BASE_URL: "https://your-fhir-server.example.com/fhir/R4"
   ```

   Alternatively, leave `VITE_USE_MOCK` unset (defaults to `true`) so the app
   ships with the in-browser mock — users can always switch servers at runtime
   via the **Server picker** in the top bar.

---

## Option 2 — Vercel

1. Import your fork on [vercel.com](https://vercel.com).
2. Set the **Framework preset** to **Vite**.
3. Override the build settings:

   | Setting | Value |
   |---|---|
   | Build command | `pnpm --filter @fhir-place/react-fhir build && pnpm --filter @fhir-place/demo build` |
   | Output directory | `apps/demo/dist` |
   | Install command | `pnpm install --frozen-lockfile` |

4. Add environment variables in the Vercel dashboard:

   | Variable | Value |
   |---|---|
   | `VITE_USE_MOCK` | `false` |
   | `VITE_FHIR_BASE_URL` | `https://your-fhir-server.example.com/fhir/R4` |
   | `VITE_BASE_PATH` | `/` |

5. Deploy. Vercel's edge network handles SPA routing (`/` rewrites) automatically.

---

## Option 3 — Netlify

1. Connect your fork in the [Netlify UI](https://app.netlify.com).
2. Set **Build settings**:

   | Setting | Value |
   |---|---|
   | Build command | `pnpm install --frozen-lockfile && pnpm --filter @fhir-place/react-fhir build && pnpm --filter @fhir-place/demo build` |
   | Publish directory | `apps/demo/dist` |

3. Add environment variables (Site settings → Environment variables):

   ```
   VITE_USE_MOCK=false
   VITE_FHIR_BASE_URL=https://your-fhir-server.example.com/fhir/R4
   VITE_BASE_PATH=/
   ```

4. Add a `_redirects` file so deep links work. Create
   `apps/demo/public/_redirects` with:

   ```
   /* /index.html 200
   ```

5. Deploy. Netlify picks up the file automatically.

---

## Option 4 — Any static host (S3, GCS, nginx, …)

Build locally, then upload the output folder:

```bash
# from the repo root
pnpm install --frozen-lockfile

# Build the library first (demo imports it as a workspace dep)
pnpm --filter @fhir-place/react-fhir build

# Build the demo, pointing at your FHIR server
VITE_USE_MOCK=false \
VITE_FHIR_BASE_URL=https://your-fhir-server.example.com/fhir/R4 \
VITE_BASE_PATH=/ \
pnpm --filter @fhir-place/demo build
```

The output is in `apps/demo/dist/`. Upload its contents to your host.

**SPA routing** — every URL must fall back to `index.html`. Add a rewrite rule
appropriate for your host:

- **nginx**: `try_files $uri $uri/ /index.html;`
- **Apache**: `FallbackResource /index.html` (or an `.htaccess` rewrite)
- **AWS S3 + CloudFront**: set the custom error page (403/404) to
  `/index.html` with response code `200`
- **GitHub Pages** (without the Actions workflow): copy `dist/index.html` to
  `dist/404.html` before uploading — Pages serves `404.html` for unmatched
  paths, which lets the SPA router take over

---

## Environment variable reference

All variables are prefixed `VITE_` so Vite inlines them at build time.
They are **not** secret — they end up in the browser bundle.

| Variable | Default | Description |
|---|---|---|
| `VITE_USE_MOCK` | `true` | `true` = in-browser MSW mock; `false` = real FHIR server |
| `VITE_FHIR_BASE_URL` | _(none)_ | FHIR R4 base URL, e.g. `https://hapi.fhir.org/baseR4` |
| `VITE_FHIR_BEARER_TOKEN` | _(none)_ | Static bearer token injected into every FHIR request |
| `VITE_BASE_PATH` | `/` | URL prefix — must match where the app is served (e.g. `/fhir-place/` on GitHub Pages) |
| `VITE_SENTRY_DSN` | _(none)_ | Sentry DSN; omit to disable error monitoring |
| `VITE_APP_VERSION` | _(none)_ | Release tag passed to Sentry |
| `VITE_SENTRY_TRACE_TARGETS` | `localhost` | Comma-separated URLs that receive distributed-trace headers |

Build-time only (not inlined into the bundle — keep these in CI secrets):

| Variable | Description |
|---|---|
| `SENTRY_AUTH_TOKEN` | Sentry auth token for source-map upload |
| `SENTRY_ORG` | Sentry org slug |
| `SENTRY_PROJECT` | Sentry project name |

---

## Pointing at a FHIR backend

The app ships `.env` presets for three tested backends. For local development:

```bash
# Public HAPI (no auth)
cp apps/demo/.env.example apps/demo/.env.local
# (or just export VITE_FHIR_BASE_URL=https://hapi.fhir.org/baseR4 VITE_USE_MOCK=false)

# Medplum public sandbox (needs a bearer token)
cp apps/demo/.env.example.medplum apps/demo/.env.local

# Local Aidbox via docker-compose
cp apps/demo/.env.example.aidbox apps/demo/.env.local
docker compose up -d
```

Users can also switch servers at runtime without redeploying — use the
**Server picker** in the app's top bar.

Full per-backend setup (auth config, docker-compose steps, known caveats):
[`apps/demo/docs/interop-matrix.md`](../apps/demo/docs/interop-matrix.md).

---

## NLP / Ask AI feature

The "Ask AI" search requires an [Anthropic API key](https://console.anthropic.com/).
Users paste their key in the app's **Settings** page; it is stored in
`localStorage` only and never sent to this app's server. No build-time
configuration is needed for this feature.
