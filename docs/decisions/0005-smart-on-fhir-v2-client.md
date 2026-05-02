# 0005 SMART on FHIR v2 Client in the Demo App

## Status
Accepted

## Context
The `apps/demo` SPA was a plain FHIR REST client: open access or static bearer
token only. To be a publishable SMART app (listable on apps.smarthealthit.org,
launchable from production EHRs) it must implement SMART App Launch v2.2:

- Authorization-code flow with PKCE S256 (mandatory for public clients)
- Both EHR-initiated launch (`launch_uri`) and standalone launch
- OpenID Connect with the `fhirUser` claim
- Optional `offline_access` refresh-token flow
- Discovery of authorization endpoints via `/.well-known/smart-configuration`

ADR 0004 already noted "SMART on FHIR v2 auth" as deferred with a clear
direction: peer-dep on `smart-on-fhir/client-js` (`fhirclient` npm) rather
than reimplementing the OAuth/PKCE dance. The library's `FetchFhirClient`
already exposed `getHeaders?: () => Promise<Record<string,string>>` for
exactly this use case.

## Decision

### Library: fhirclient (smart-on-fhir/client-js)
Depend on `fhirclient` in `apps/demo` only. It handles:
- PKCE S256 code-challenge generation (`pkceMode: "required"`)
- EHR- and standalone-launch flows (`FHIR.oauth2.authorize`)
- Authorization-code exchange (`FHIR.oauth2.ready`)
- Automatic token refresh (`client.refresh()`)
- OpenID Connect id_token parsing (`client.getFhirUser()`, `client.getPatientId()`)
- State parameter generation and verification (CSRF protection)
- Well-known endpoint discovery (built into `authorize`)

No change to `packages/react-fhir`. The library API is untouched.

### Auth injection: getHeaders
`main.tsx` builds `FetchFhirClient` with `getHeaders` when the active server
uses `authMode === "smart"`. On every FHIR request the closure reads the
current access token from a module-scoped Client cache in `smartSession.ts`,
refreshing if within 60 s of expiry. For `none`/`bearer` servers the existing
`headers` path is unchanged — no regression risk.

### Routing: /launch and /redirect
Two new top-level routes (outside `/fhir-ui/*`):

- `/launch` — `LaunchPage`: reads `iss` + `launch` from query string, finds
  the matching `ServerConfig` by host, calls `smartAuthorize`. Used as the
  `launch_uri` registered with EHRs.
- `/redirect` — `RedirectPage`: calls `smartReady()`, caches the client, and
  navigates into the app (to the bound patient's record if `launch/patient`
  was granted). Used as the `redirect_uri`.

### Redirect URI: hash-routed form
`getSmartRedirectUri()` returns `<origin><base>#/redirect` when `USE_HASH_ROUTER`
is true (GitHub Pages), and `<origin><basename>/redirect` otherwise. The hash
form works on any static host without server-side route support; OAuth2 RFC 6749
§3.1.2 allows fragments in redirect URIs and SMART sandboxes accept them.
Trade-off: a minority of production EHR registration UIs reject `#` in redirect
URIs. Workaround (documented in the app's settings UI): deploy with
`VITE_USE_HASH_ROUTER=false` on a server that supports path-based routing.

### ServerConfig extension
Added `authMode: "smart"` and an optional `smart: { clientId, scope, offlineAccess }`
block. The SMART Health IT sandbox (`launch.smarthealthit.org`) is a built-in
server pre-configured with `authMode: "smart"` and the default scope string
`openid fhirUser launch launch/patient patient/*.read`.

### Settings UX
`SettingsPage` now has a "SMART on FHIR v2" auth mode option. When selected:
- Inputs for `clientId` and `scope` (with a sensible default).
- Checkbox for `offline_access`.
- "Sign in with SMART" button (standalone launch → `FHIR.oauth2.authorize`).
- "Sign out" button when a session exists (clears sessionStorage + in-memory cache).
- Read-only `launch_uri` and `redirect_uri` fields with copy buttons for
  pasting into EHR registration screens.

### Public manifest
`apps/demo/public/smart-manifest.json` documents the app's registration
metadata (launch_uri, redirect_uri, scopes, capabilities). This file is the
payload for a future apps.smarthealthit.org gallery PR.

## Consequences
- The demo is now a spec-compliant SMART v2 public client, testable end-to-end
  against https://launch.smarthealthit.org.
- `fhirclient` adds ≲ 35 KB gzipped to the demo bundle. Acceptable for a demo
  app; not shipped in `packages/react-fhir`.
- Token lifetime is managed by `fhirclient` (sessionStorage by default). A
  page reload without an active session shows the `RequireSmartSession` CTA.
- Follow-ups: Inferno (g)(10) CI badge (issue #127), apps.smarthealthit.org
  gallery PR (needs screenshots + privacy policy URL), confidential-client /
  `client_assertion` support (needs a backend; explicit non-goal for a SPA).
