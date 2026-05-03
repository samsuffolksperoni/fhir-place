# FHIR UI Test Plan

**Scope:** End-to-end browser testing of the fhir-place demo app against a live FHIR R4 server (default: public HAPI — `https://hapi.fhir.org/baseR4`).

**Agent instructions**
- Navigate the app at its deployed URL or `http://localhost:5173` (dev server).
- Take a full-page screenshot **before** performing each action and **after** any unexpected result.
- For every bug found: open a GitHub issue in `samsuffolksperoni/fhir-place` with title, reproduction steps, expected vs. actual behaviour, and the screenshot(s) attached.
- Mark a test **PASS**, **FAIL**, or **SKIP** (if a hard dependency is missing).
- When a test requires synthetic data, use the MSW mock server (toggle "Use mock data" in Settings) unless the section says otherwise.

---

## Section 1 — Server Configuration & Settings

### 1.1 Default server is pre-populated
1. Open the app for the first time (clear localStorage first).
2. Navigate to **Settings** (`/fhir-ui/settings`).
3. **Expected:** FHIR base URL field is pre-populated with the HAPI public URL (`https://hapi.fhir.org/baseR4`).
4. **Screenshot:** Settings page on first load.

### 1.2 Change server URL and persist across reload
1. In Settings, clear the FHIR base URL field and type `https://hapi.fhir.org/baseR4`.
2. Save / confirm.
3. Reload the page.
4. **Expected:** The URL is still set correctly after reload; no 404 or blank screen.

### 1.3 Invalid FHIR server URL shows an error
1. In Settings, enter `https://not-a-fhir-server.example.com`.
2. Navigate to any resource list page (e.g., `/fhir-ui/Patient`).
3. **Expected:** A visible error message (not a blank screen or silent failure) tells the user the server is unreachable or returned an unexpected response.
4. **Screenshot:** Error state.

### 1.4 Switch between built-in server presets
1. Open Settings.
2. Select each server preset in turn (HAPI public, docker HAPI, Medplum, Aidbox, MSW mock).
3. **Expected:** The base URL field updates to match each preset; switching to "MSW mock" uses synthetic data without a network call.

### 1.5 Anthropic API key is stored and used
1. In Settings, enter a valid (or mock) Anthropic API key.
2. Navigate to `/fhir-ui/ask`.
3. **Expected:** The AI search box is active (not disabled or showing a "no key" notice).

### 1.6 Theme toggle persists
1. Toggle dark/light mode from the topbar.
2. Reload the page.
3. **Expected:** The chosen theme is still active after reload; all text remains legible (no white-on-white or black-on-black areas).
4. **Screenshot both themes.**

---

## Section 2 — Resource List Page (`/fhir-ui/:resourceType`)

### 2.1 Patient list loads
1. Navigate to `/fhir-ui/Patient`.
2. **Expected:** A table or list of Patient rows is displayed. At least one row is visible when using mock data.
3. **Screenshot.**

### 2.2 Table/list view toggle
1. On the Patient list, find the view-mode toggle (table vs. list).
2. Switch to list view.
3. **Expected:** Cards or list items replace the table; key fields (name, DOB, gender) are still visible.
4. Switch back to table view.
5. **Expected:** Table is restored; column headers are visible and aligned.
6. **Screenshot each view.**

### 2.3 Column picker — show/hide columns
1. Open the column picker popover on the Patient list.
2. Uncheck "Birth Date".
3. **Expected:** The "Birth Date" column disappears immediately.
4. Reload the page.
5. **Expected:** The column is still hidden (persisted in localStorage).
6. Re-check "Birth Date".
7. **Expected:** Column reappears in the correct position.

### 2.4 Column picker keyboard accessibility
1. Focus the column picker trigger with Tab.
2. Open it with Enter/Space.
3. Navigate items with ArrowUp/ArrowDown.
4. Close with Escape.
5. **Expected:** Focus returns to the trigger button after Escape; no layout shift.

### 2.5 Sort a column
1. Click the "Family name" column header (or sort picker for that field).
2. **Expected:** Rows re-sort; an ascending/descending indicator is visible on the header.
3. Click again to reverse sort.
4. **Expected:** Sort direction indicator flips; rows reorder.

### 2.6 Pagination — next/previous
1. Ensure the server has more than one page of Patients.
2. Click "Next page".
3. **Expected:** The next bundle page loads; URL or pagination state reflects page 2.
4. Click "Previous page".
5. **Expected:** The first page re-appears; first-page button/previous button is disabled when on page 1.

### 2.7 PatientRowCounts badge
1. On the Patient list, locate the per-row resource-count badges.
2. **Expected:** Each Patient row shows numeric counts for related resources (e.g., Conditions, Observations). Badges are visible and not overlapping text.

### 2.8 Clicking a row navigates to detail
1. Click any Patient row.
2. **Expected:** Navigation to `/fhir-ui/Patient/{id}`; the resource detail page loads without errors.

### 2.9 Non-Patient resource types load
Repeat 2.1–2.8 for: **Observation**, **Condition**, **MedicationRequest**, **Encounter**, **Task**, **Goal**.
- **Expected for each:** List loads, at least one row renders, row click goes to detail page.
- **Screenshot any resource type that fails to render rows or crashes.**

### 2.10 Empty result set displays friendly message
1. Search for a resource type with a query that returns zero results (e.g., Patient `name=zzzzz_no_match`).
2. **Expected:** A "no results" message (not a blank area, not a spinner frozen indefinitely).

### 2.11 Loading state is visible
1. Throttle the network to "Slow 3G" in DevTools.
2. Navigate to `/fhir-ui/Patient`.
3. **Expected:** A loading spinner or skeleton is shown while the bundle loads; it disappears when data arrives.

---

## Section 3 — Resource Search (`<ResourceSearch>`)

### 3.1 Search form renders capability-driven params
1. Navigate to `/fhir-ui/Patient`.
2. Open/expand the search form.
3. **Expected:** Search parameter fields match the `CapabilityStatement` for Patient (at minimum: `name`, `birthdate`, `gender`, `identifier`).

### 3.2 Text search
1. Type a known patient name (e.g., "Eve" in mock data) in the `name` field.
2. Submit search.
3. **Expected:** Result list filters to matching patients; URL query string reflects the search params.

### 3.3 Date search — exact date
1. In the `birthdate` field, enter a valid date (e.g., `1990-01-01`).
2. Submit.
3. **Expected:** Results filtered; no console errors about invalid date format.

### 3.4 Date search — comparator prefix
1. Enter `gt1980-01-01` in the `birthdate` field (or use a date-range picker if present).
2. Submit.
3. **Expected:** Results restricted to patients born after 1980; no "400 Bad Request" error surface.

### 3.5 Token search (gender)
1. Select a gender value from the `gender` dropdown/field.
2. Submit.
3. **Expected:** Results match the selected gender; no results from the opposite gender are shown.

### 3.6 Reference search
1. Navigate to `/fhir-ui/Observation`.
2. In the `subject` or `patient` search field, enter a known patient reference (e.g., `Patient/example`).
3. Submit.
4. **Expected:** Observations filtered to that patient; no 500 error.

### 3.7 "Show more" parameters toggle
1. If the search form has fewer params visible with a "show more" button, click it.
2. **Expected:** Additional parameters appear; none are duplicated.
3. Click "show less" (if present).
4. **Expected:** Only priority params remain.

### 3.8 Clear search
1. Perform a search that filters results.
2. Clear all search fields (or click a "Clear" button if present).
3. Submit.
4. **Expected:** Full unfiltered list returns; URL query params are cleared.

### 3.9 Search with multiple simultaneous params
1. Set `gender=female` and `name=Eve` together.
2. Submit.
3. **Expected:** Only female patients named "Eve" are returned; no client-side error.

### 3.10 Observation-specific search params
1. Navigate to `/fhir-ui/Observation` search.
2. Use `code` (LOINC token) and `date` together.
3. **Expected:** Both fields appear; combined query runs without error; results reflect both constraints.

---

## Section 4 — Resource Detail Page (`/fhir-ui/:resourceType/:id`)

### 4.1 All core FHIR datatypes render
Navigate to the detail page for each resource type and confirm rendering:

| Resource | Key datatype to verify |
|---|---|
| Patient | HumanName, Address, ContactPoint (phone/email), birthDate, gender (code) |
| Observation | code (CodeableConcept), value[x] (Quantity/string/boolean), status (code), effectiveDateTime |
| Condition | code (CodeableConcept), onset[x] (datetime/Period), severity, clinicalStatus |
| MedicationRequest | medication[x] (CodeableConcept/Reference), dosageInstruction (BackboneElement array), status |
| Encounter | type (array of CodeableConcept), period (Period), class (Coding) |
| AllergyIntolerance | code, category (array), criticality, reaction BackboneElement |

**Expected for each:** No field renders as raw JSON or `[object Object]`; each datatype has a human-readable display.
**Screenshot any field that shows raw JSON unexpectedly.**

### 4.2 Narrative tab
1. Navigate to a Patient with a narrative block.
2. Click the "Narrative" tab (or find the narrative section).
3. **Expected:** HTML narrative is rendered (sanitized); no `<script>` tags execute; no `on*` event handlers are present in the DOM.
4. Inspect the rendered HTML for any unsanitized content.

### 4.3 JSON tab
1. On any resource detail page, click "JSON".
2. **Expected:** The raw FHIR JSON is displayed, properly formatted (indented). The JSON is the same resource that was fetched (not a re-serialized version).
3. Verify the JSON is valid (no truncation, no `undefined` values).

### 4.4 References pane
1. Navigate to a Patient detail page.
2. Look for a "References" or "Related" pane.
3. **Expected:** References to related resources (e.g., managingOrganization) are listed and clickable.
4. Click one.
5. **Expected:** Navigation to the referenced resource's detail page; no 404.

### 4.5 Compartment links (Patient)
1. Navigate to a Patient detail page.
2. Find the compartment links section (Condition, Observation, Encounter, MedicationRequest, etc.).
3. Click "Conditions for this patient".
4. **Expected:** Navigates to `/fhir-ui/Condition?patient={id}` (or equivalent); results are filtered to this patient.

### 4.6 BackboneElement arrays render
1. Navigate to a MedicationRequest detail.
2. Find `dosageInstruction` (array of BackboneElement).
3. **Expected:** Each element of the array is displayed as a separate group; nested fields (text, timing, route) are visible.
4. If the array has more than one entry, all entries are shown.

### 4.7 choice-type fields (value[x])
1. Find an Observation where `valueQuantity` is set (e.g., a lab result).
2. **Expected:** The field shows "Value" with a Quantity display (number + unit); not as `valueQuantity: {...}`.
3. Find an Observation where `valueString` is set.
4. **Expected:** The field shows a plain string value, not a Quantity widget.

### 4.8 Resource with extensions
1. Find (or create) a resource with a non-modifierExtension FHIR extension.
2. **Expected:** Extensions are either rendered with their URL + value or gracefully omitted; they do not crash the renderer.

### 4.9 Resource with modifierExtension
1. Find a resource with a `modifierExtension`.
2. **Expected:** It is either displayed with a clear warning (spec: "modifies meaning") or explicitly omitted; the page does not crash.

### 4.10 Version history link
1. On any resource detail page, look for a "History" link or button.
2. **Expected:** Navigates to a history view or calls `/_history` on the resource; at least the current version is listed.

---

## Section 5 — Create Resource (`/fhir-ui/:resourceType/new`)

### 5.1 Create a new Patient — happy path
1. Navigate to `/fhir-ui/Patient/new`.
2. Fill in:
   - Family name: `TestFamily`
   - Given name: `TestGiven`
   - Birth date: `1985-06-15`
   - Gender: `male`
3. Click "Save".
4. **Expected:** A `201 Created` response is received; the app redirects to the new patient's detail page; the detail page shows the values entered.
5. **Screenshot the created patient.**

### 5.2 Required fields validation
1. Navigate to `/fhir-ui/Patient/new`.
2. Leave all fields blank and click "Save".
3. **Expected:** Either client-side validation prevents submission with visible field errors, or the server returns a 422/400 and the error is surfaced to the user — not swallowed silently.

### 5.3 Create Observation linked to Patient
1. Navigate to `/fhir-ui/Observation/new`.
2. Fill `subject` reference with a valid `Patient/{id}`.
3. Set `status = final`, `code` = any LOINC code.
4. Set `valueQuantity` with value `98.6` and unit `degF`.
5. Save.
6. **Expected:** Observation is created; detail page shows the linked patient reference as a clickable link.

### 5.4 Array field — add multiple entries
1. In the Patient editor, add two given names.
2. Save.
3. **Expected:** Both given names appear on the detail page.

### 5.5 Array field — remove an entry
1. In the Patient editor (edit mode for the patient from 5.1), remove one given name.
2. Save.
3. **Expected:** Only the remaining given name is present; no empty string or `null` artifacts in the JSON.

### 5.6 Choice-type switching (value[x])
1. In the Observation editor, select `valueString` as the value type.
2. Enter text.
3. Switch to `valueQuantity`.
4. **Expected:** The string input disappears and a Quantity input (value + unit) appears; previously entered string is cleared (not silently merged).

### 5.7 ReferencePicker widget
1. In any editor with a Reference field (e.g., Observation.subject), use the reference picker widget.
2. Type a partial patient name.
3. **Expected:** Async search results appear in a dropdown; selecting one populates the reference field with the correct `Patient/{id}` string.

### 5.8 CodeableConcept input
1. In the Condition editor, interact with the `code` (CodeableConcept) field.
2. **Expected:** A text or combobox input is shown; entering and saving a code + display produces valid FHIR (`system`, `code`, `display` populated).

---

## Section 6 — Edit Resource (`/fhir-ui/:resourceType/:id/edit`)

### 6.1 Edit existing Patient — happy path
1. Navigate to an existing Patient detail page.
2. Click "Edit".
3. Modify the family name to `EditedFamily`.
4. Click "Save".
5. **Expected:** `200 OK` (or `201` if version-aware); detail page shows `EditedFamily`.

### 6.2 Optimistic concurrency (If-Match)
1. Open the same resource in two browser tabs.
2. In tab 1, edit and save.
3. In tab 2, edit (stale version) and save.
4. **Expected:** Tab 2 receives a `409 Conflict` or `412 Precondition Failed`; an error is displayed to the user explaining the conflict — not a silent failure or data overwrite.

### 6.3 Cancel edit discards changes
1. Navigate to edit a Patient.
2. Change the family name.
3. Click "Cancel" (or navigate away).
4. **Expected:** The original name is preserved; no partial update was sent to the server.

### 6.4 Saving indicator
1. Throttle the network to Slow 3G.
2. Click Save on an edit form.
3. **Expected:** A spinner or "Saving…" indicator appears while the PUT request is in flight; the button is disabled to prevent double-submit.

### 6.5 Server-side validation error displayed
1. Edit a Patient and set `birthDate` to an invalid value (e.g., `not-a-date`) via the JSON tab (if allowed) or by direct manipulation.
2. Save.
3. **Expected:** The server 422/400 `OperationOutcome` is displayed to the user with the relevant field error message.

---

## Section 7 — Delete Resource

### 7.1 Delete with confirmation
1. Navigate to any Patient detail page.
2. Click "Delete".
3. **Expected:** A confirmation dialog appears before the delete is executed.
4. Cancel.
5. **Expected:** Resource is NOT deleted; user remains on the detail page.

### 7.2 Confirm delete
1. Click "Delete" again.
2. Confirm the dialog.
3. **Expected:** `DELETE` request sent; app navigates to the Patient list; the deleted patient no longer appears in the list.

### 7.3 Delete a resource referenced by another
1. Attempt to delete a Patient that has linked Observations on the server.
2. **Expected:** If the server returns a 409/422 (referential integrity), the error is surfaced — not silently ignored.

---

## Section 8 — AI / Ask Page (`/fhir-ui/ask`)

### 8.1 Page loads with API key set
1. Ensure an Anthropic API key is saved in Settings.
2. Navigate to `/fhir-ui/ask`.
3. **Expected:** A natural-language input field is visible and active; no error banner.

### 8.2 Natural language query produces FHIR search
1. Type: `"Show me female patients born after 1990"`.
2. Submit.
3. **Expected:** The app displays generated FHIR search params (e.g., `gender=female&birthdate=gt1990-01-01`) and results — OR clearly shows the params it generated before executing.

### 8.3 Ambiguous query prompts clarification or sensible fallback
1. Type: `"blood pressure"`.
2. Submit.
3. **Expected:** A reasonable query is generated (e.g., Observation with LOINC BP code); or the app asks a clarifying question — it should NOT crash or show an unhandled exception.

### 8.4 Page degrades without API key
1. Remove the Anthropic API key from Settings.
2. Navigate to `/fhir-ui/ask`.
3. **Expected:** The page shows a clear message that an API key is required; the input is disabled or redirects to Settings.

### 8.5 Long query does not break layout
1. Paste 500+ characters of text into the query field.
2. **Expected:** Text wraps or truncates gracefully; no overflow outside container.

---

## Section 9 — CQL Runner (`/cql-runner`)

### 9.1 Page loads
1. Navigate to `/cql-runner`.
2. **Expected:** A code editor (or textarea) and a "Run" button are visible; no console errors on load.

### 9.2 Simple CQL executes
1. Paste:
   ```
   library TestLib version '1.0'
   using FHIR version '4.0.1'
   context Patient
   define "Age": AgeInYears()
   ```
2. Select a patient context (if required).
3. Click "Run".
4. **Expected:** Results panel shows the expression output (a numeric age); no crash.

### 9.3 Invalid CQL shows parse error
1. Paste syntactically invalid CQL (e.g., `define "Bad": !!`).
2. Click "Run".
3. **Expected:** A parse or compile error is displayed — not a blank result or unhandled exception.

### 9.4 CQL with FHIR data retrieval
1. Paste a CQL expression that retrieves Observations:
   ```
   library ObsTest version '1.0'
   using FHIR version '4.0.1'
   context Patient
   define "Observations": [Observation]
   ```
2. Select a patient with known Observations.
3. Run.
4. **Expected:** Results list the Observations for that patient; references are resolved without error.

### 9.5 Results display is readable
1. Run any successful CQL query that returns multiple results.
2. **Expected:** Results are formatted (not raw JSON blob), with resource types or expression names clearly labelled.

---

## Section 10 — Navigation & App Shell

### 10.1 Sidebar — resource type navigation
1. Use the sidebar to navigate between at least 5 different resource types.
2. **Expected:** Each navigation lands on the correct list page; the sidebar item for the current type is highlighted/active.

### 10.2 Sidebar — search history
1. Perform several searches across different resource types.
2. **Expected:** A "Recent searches" (or equivalent) section appears in the sidebar showing the searches; clicking one re-runs it.

### 10.3 Tab system — open multiple tabs
1. Navigate to a Patient detail page.
2. Open the same detail page in a second tab (using the tab UI, not browser tabs).
3. Navigate to an Observation in a third tab.
4. **Expected:** All tabs are visible; switching between tabs restores the correct page state; URL reflects the active tab.

### 10.4 Tab system — close a tab
1. Close the middle tab.
2. **Expected:** Remaining tabs are still intact; focus moves to an adjacent tab; no crash.

### 10.5 Browser back/forward navigation
1. Navigate Patient list → Patient detail → edit → cancel.
2. Use browser Back.
3. **Expected:** Returns to Patient detail (not a blank page or error).
4. Use browser Forward.
5. **Expected:** Returns to the edit page or the list (consistent with history).

### 10.6 Direct URL access (deep link)
1. Copy the URL of a Patient detail page.
2. Open a new browser tab, paste the URL.
3. **Expected:** The page loads directly without needing to navigate from the home page; no redirect loop.

### 10.7 Server status indicator
1. Locate the server status indicator in the topbar.
2. With a valid server, it should show green/OK.
3. Set an invalid server URL in Settings.
4. **Expected:** Status indicator turns red/error within a reasonable time.

---

## Section 11 — FHIR Spec Compliance & Data Fidelity

### 11.1 StructureDefinition drives field order
1. On a Patient detail page, compare the displayed field order against the FHIR R4 Patient `StructureDefinition` snapshot order.
2. **Expected:** Fields appear in snapshot order (id, meta, text, ... identifier, active, name, telecom, gender, birthDate, ...) — not alphabetical, not arbitrary.

### 11.2 Optional fields omitted from display when absent
1. View a minimally populated resource (e.g., Patient with only `id`, `name`).
2. **Expected:** Fields like `address`, `photo`, `contact` are not shown (not shown as blank labels with empty values).

### 11.3 Cardinality — 0..* arrays display all items
1. Find a Patient with multiple names (e.g., official + nickname).
2. **Expected:** Both HumanName entries are displayed; neither is silently dropped.

### 11.4 FHIR Reference display
1. On an Observation detail page, find `subject` (Reference).
2. **Expected:** The reference renders as a clickable link showing either the reference string (`Patient/{id}`) or the resolved display name — not as `[object Object]`.

### 11.5 CodeableConcept display
1. Find a resource with a CodeableConcept field with both `coding` (system+code) and `text`.
2. **Expected:** The `text` is shown preferentially; or the coding display is shown; raw JSON is not shown.

### 11.6 Period display
1. Find a resource with a Period field (e.g., Encounter.period).
2. **Expected:** Start and end dates are shown in a human-readable format (e.g., "Jan 1, 2023 – Mar 15, 2023"); not as ISO strings in curly braces.

### 11.7 Quantity display
1. Find an Observation with `valueQuantity`.
2. **Expected:** Value and unit are shown together (e.g., "98.6 °F"); not split across two unlabeled spans.

### 11.8 Boolean field display
1. Find a resource with a boolean field (e.g., Patient.active).
2. **Expected:** Shows "Yes" / "No" (or equivalent human-readable) — not `true`/`false` strings or a checkbox that can be accidentally clicked on the read view.

### 11.9 id and meta fields
1. On any resource detail page, check whether `id` and `meta` (versionId, lastUpdated) are shown.
2. **Expected:** At minimum `id` and `meta.lastUpdated` are visible (they are critical for EHR workflows).

### 11.10 Narrative sanitization
1. Create (or use) a resource whose `text.div` contains `<script>alert(1)</script>`.
2. View the Narrative tab.
3. **Expected:** No alert dialog fires; the script tag is stripped by DOMPurify; the rest of the narrative renders.
4. **Screenshot the narrative tab content.**

### 11.11 Resource types not in CapabilityStatement
1. Navigate directly to `/fhir-ui/StructureDefinition` (not typically in a clinical CapabilityStatement).
2. **Expected:** Either the list loads (if the server supports it) or a clear "not supported by this server" message appears — no crash.

---

## Section 12 — Error Handling & Resilience

### 12.1 Network timeout
1. Use DevTools to block all requests to the FHIR server.
2. Navigate to `/fhir-ui/Patient`.
3. **Expected:** After a reasonable timeout (≤15 s), an error message appears; the UI does not spin forever.

### 12.2 Server 500 error surface
1. Configure a mock to return `500 Internal Server Error` on `GET /Patient`.
2. **Expected:** The error is displayed in a user-friendly way; no unhandled React error boundary crash.

### 12.3 OperationOutcome error parsing
1. Configure a mock to return a FHIR `OperationOutcome` with `severity=error` and `details.text`.
2. **Expected:** The app shows the human-readable `details.text` from the OperationOutcome — not a raw JSON dump or generic "Something went wrong."

### 12.4 Resource not found (404)
1. Navigate to `/fhir-ui/Patient/this-id-does-not-exist`.
2. **Expected:** A "Resource not found" message is shown; the user can navigate back; no blank screen.

### 12.5 Invalid resource ID in URL
1. Navigate to `/fhir-ui/Patient/../../../../etc/passwd` (path traversal attempt).
2. **Expected:** The app either rejects the navigation or the FHIR client encodes the ID correctly so the server returns 404/400 — the server does not receive a path traversal attempt.

### 12.6 Concurrent mutation — delete then edit
1. Delete a resource.
2. Immediately (before the UI updates) click "Edit".
3. **Expected:** A meaningful error ("Resource deleted") is shown rather than a crash or silent 404.

---

## Section 13 — Mobile & Responsive Behaviour

### 13.1 Patient list on narrow viewport (375 px)
1. Set browser viewport to 375 × 812 px (iPhone SE).
2. Navigate to `/fhir-ui/Patient`.
3. **Expected:** The list is readable; columns are not cut off; horizontal scroll is not required for the primary content.
4. **Screenshot.**

### 13.2 Navigation on mobile
1. On the 375 px viewport, find the navigation (sidebar or hamburger menu).
2. Open and close the nav.
3. **Expected:** All resource types are reachable; the overlay closes without visual artifacts.

### 13.3 Resource detail on mobile
1. On 375 px, open a Patient detail page.
2. **Expected:** Fields stack vertically; no text overlaps; long values wrap (not overflow).

### 13.4 Edit form on mobile
1. Open the Patient editor on 375 px.
2. Tap on an input and type.
3. **Expected:** The virtual keyboard does not obscure the Save button; inputs are large enough to tap (≥ 44 px hit target recommended).

---

## Section 14 — Accessibility

### 14.1 Keyboard-only navigation through search and list
1. Tab through the search form inputs on `/fhir-ui/Patient`.
2. Submit search with Enter.
3. Tab through the result list.
4. Press Enter on a row.
5. **Expected:** All interactions work without a mouse; focus indicators are visible at each step.

### 14.2 Screen-reader labels
1. Using a screen reader (or axe DevTools), audit the Patient list page and Patient detail page.
2. **Expected:** No critical a11y violations (missing labels, insufficient colour contrast, missing landmark regions).
3. **Screenshot any violations found.**

### 14.3 Focus management after navigation
1. Navigate from Patient list to Patient detail (keyboard).
2. **Expected:** Focus moves to a meaningful element on the detail page (e.g., the page heading), not lost to `<body>`.

---

## Section 15 — Goals & Tasks Sample App

### 15.1 Patient list loads
1. Navigate to the goals-tasks app (separate URL or port).
2. **Expected:** A list of patients is displayed.

### 15.2 Create a Goal
1. Click "New Goal" for a patient.
2. Fill description and lifecycle status.
3. Save.
4. **Expected:** Goal appears in the patient's goal list.

### 15.3 Create a Task linked to a Goal
1. From the Goal detail, create a linked Task.
2. Set status to `in-progress`.
3. Save.
4. **Expected:** Task appears under the Goal; status is correctly displayed.

### 15.4 Edit and complete a Task
1. Edit the Task to status `completed`.
2. **Expected:** Task status updates; UI reflects completion (e.g., strikethrough, badge change).

---

## Bug Filing Template

When filing a GitHub issue, use the following structure:

```
Title: [Component] Short description of the bug

**Steps to reproduce**
1. Navigate to…
2. Click…
3. …

**Expected**
Describe what should happen per the FHIR spec or UX standard.

**Actual**
Describe what happened instead.

**Severity**
[ ] Critical (data loss / security / crash)
[ ] High (core FHIR workflow broken)
[ ] Medium (degraded experience, workaround exists)
[ ] Low (cosmetic / minor)

**Environment**
- App URL:
- FHIR server:
- Browser:
- Viewport:

**Screenshots**
[attach]

**Console errors**
```paste```
```

---

## Test Execution Checklist

| # | Section | Status | Notes |
|---|---------|--------|-------|
| 1 | Server Configuration & Settings | | |
| 2 | Resource List Page | | |
| 3 | Resource Search | | |
| 4 | Resource Detail Page | | |
| 5 | Create Resource | | |
| 6 | Edit Resource | | |
| 7 | Delete Resource | | |
| 8 | AI / Ask Page | | |
| 9 | CQL Runner | | |
| 10 | Navigation & App Shell | | |
| 11 | FHIR Spec Compliance | | |
| 12 | Error Handling & Resilience | | |
| 13 | Mobile & Responsive | | |
| 14 | Accessibility | | |
| 15 | Goals & Tasks App | | |
