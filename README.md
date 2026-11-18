# TripWire

A working administrative workspace for business travel and visa preparation. Built with React, TypeScript and Vite, with Poppins, Archivo Black and TripWire’s navy/lavender palette.

This is the **new replacement project** requested after repository inspection found only the initial README. There was no previous application or record database to import. The supplied brief and references are retained in [docs/tripwire-case-update](docs/tripwire-case-update/START_HERE.md); the application includes realistic demo records and a tested migration path for its own versioned workspace schema.

## Run

Use Node.js 22 or newer and npm. This environment was verified with Node 24.19.0.

```sh
npm ci
npm run dev
```

Open **http://localhost:3000/**. The server binds to `0.0.0.0` so a workspace port forward can reach it. For the production build, run `npm run build`, stop the development server, then run `npm run preview`. Both servers use port 3000.

```sh
npm test          # domain, date, migration and document-version tests
npm run test:e2e  # real Chromium workflow and responsive tests
npm run build    # TypeScript and production bundle
```

Browser tests use system Chromium when installed at `/usr/bin/chromium`. Otherwise run `npx playwright install chromium`, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to an installed browser. Tests start a server automatically when port 3000 is free.

## What works

- Action-first Overview with shared-state urgent, review, departure and employee-question queues; charts navigate to matching records.
- Separate Cases, Travel, Employees, Documents, Inbox, Urgent and Travel guide destinations. Legacy `/assignments` URLs retain their parameters when redirected.
- Searchable, conditional intake; stable sequential employee/case numbers; versioned, route-specific named requirements. Casey’s six-month technical-work fixture is separate from the short Vietnam meetings example.
- Document version history, current-version reuse, explicit review/correction and passport-expiry checks. A replacement passport invalidates preparation, passport-linked permission checks and departure checks; it retains the historical result. Sponsor documents are checked for their particular deliverable.
- Editable application summaries, missing-input checks, a printable preparation worksheet and dossier index export. Use the browser’s Print / Save as PDF action for a PDF. Exports are labeled **TripWire preparation draft**, with official-source links and no claim to be a verified current government form.
- Explicit manual or simulated submission/decision records. A reviewed passport never creates an authority result. ETA/e-visa passport replacement requires a new reference and a recorded linkage check.
- Planned versus actual travel; entry/exit 30/90/180-day windows; inclusive merged presence days; company extensions with approval records that leave permission expiry unchanged; budget-based extra-cost estimates.
- Employee-first conversations with separate internal audiences, local replies, urgent escalation, assignment, acknowledgments, information requests, document links, resolution notes and reopening.
- Vietnam DN1/DN2 and separate e-visa education; UK ETA and visitor-visa education; shared guide/process templates, fees, scope, sources and checked-date metadata.

## Demo replay

1. Open Overview. Review Today’s priorities, or select a metric to open its detailed queue.
2. Select sidebar **New case**, then **Use business-trip preset**. Review Casey’s meeting-only activity, dates and host; create the new case. Record a route assessment with its basis.
3. Use the reviewed passport on file. Select the missing photograph and request it; the request appears in employee messages. File actions in this demo store non-sensitive metadata, not document contents.
4. Select **Prepare draft**. Edit the field summary, inspect missing inputs, preview and export the worksheet/dossier index. Check the official sources in the route drawer. Handoff stays blocked until the necessary documents and checks are complete.
5. For authority-record controls, use the separate e-visa example after completing its outstanding steps. Review the handoff and open **Demo controls** to record an explicitly simulated reference and result. Manual records require a reference, date and actor. TripWire does not file or pay.
6. Open Inbox, reply to an employee, then escalate a time-sensitive question with a reason/location/time zone. Open Urgent to acknowledge, assign, request information, link a document, escalate internally, resolve with a note and reopen. Acknowledgment leaves the urgent count unresolved.
7. Refresh to confirm persistence. Settings offers a JSON backup, configurable demo clock and a confirmed reset to known fixtures.

The fixed workspace clock initially reads `2026-10-20T10:00:00Z`. Date-only trips do not show an invented flight countdown. Processing estimates, internal targets, company-approved return dates and legal permission dates are distinct.

## Data and scope

State persists in this browser under `tripwire.workspace.v3`. Migration retains internal identifiers, document versions, custom requirements and legacy internal tasks, repairs display-number collisions, and logs template changes. Unreadable data is quarantined before recovery; if preservation fails, persistence pauses rather than overwriting it.

This is a local demonstration, with no authentication backend, secure file store, external messaging, filing, payments or live support integration. File previews are explicitly metadata previews. Conversation audiences are separated in the interface; they are not a substitute for server-enforced access control. Employee images use initials avatars. Do not enter sensitive documents or production credentials.

Guide research and checked dates come from the supplied pack. The implementation links to those official sources but does not independently certify current fees, forms, eligibility or legal suitability. Total unconfirmed charges remain “Confirm with issuing office.”

## Verification and hosting

**Verified in this workspace:** frozen-lockfile installation, TypeScript/production build, **19 domain tests** and **25 Chromium browser tests** passed. The browser suite was run against the compiled production preview.

See [actual verification results and acceptance evidence](docs/tripwire-case-update/VERIFICATION_RESULTS.md). The original screenshots and the actual 12.4-second MP4 were inspected; application QA uses the running app rather than reference images. GitHub Actions runs the same build, domain and browser checks on pushes and pull requests.

`vercel.json` and `netlify.toml` provide SPA fallback configuration for those hosts. A running workspace preview and a GitHub source upload do not by themselves create a public production deployment. Publishing this cloud environment is a separate product action; saved startup instructions restart the server in future tasks.
