# TripWire: verification and acceptance evidence

The initial `protoTYC/TripWire` checkout and remote `main` contained only `README.md` at commit `9550874cb1fa3f241960f14cabf7886b658c6b8b`. The user then explicitly requested replacing it with the new project. The resulting application is a new implementation of the pack, not a migration of an unavailable earlier application's records. Preservation tests exercise the new versioned state and legacy-style fixtures.

## Actual validation

Final results in this workspace:

| Command | Actual result |
| --- | --- |
| `npm ci --cache /workspace/.npm --no-audit --no-fund` | Passed from the committed lockfile |
| `npm run build` | Passed: TypeScript and Vite production bundle |
| `npm test` | 19 passed, 0 failed, 0 skipped |
| `npm run test:e2e` | 25 passed, 0 failed, 0 skipped; 52.8 seconds against the compiled production preview |
| `git diff --check` | Passed |

The browser regression run includes the passport-dependent permission checks and corrected tablet Insights layout. Earlier failures were diagnosed and fixed; the final results above refer to the complete rerun. GitHub Actions is configured, but its remote result was not queried or claimed. These checked-in tests are reproducible with the same commands.

The domain suite covers inclusive interval unions, country transitions, cancelled/open stays, year boundaries, planned versus actual days, approved-return status, unique display IDs, template separation, current-version reuse, expiry, exact sponsor deliverables, dependent permission/draft revalidation, idempotent migration and malformed-storage quarantine.

Real Chromium browser tests cover intake, row/checkbox/text-selection behavior, route assumptions, requests, reuse/upload/review, editable summary and downloaded dossier, blocked handoff, manual versus simulated authority records, decision/departure dependencies, persistence, employee creation, document replacement, travel filters and extensions, budgets, separate conversation audiences, internal deep links, urgent response actions, guide-to-intake routing, confirmed reset, corruption recovery, reduced motion and focus traps.

Application screens were inspected at **1280×800** and **1440×900**. Responsive checks also exercise **390×844** and a **720×450** CSS viewport (the layout width of a 1440-wide window at 200% browser zoom). This is focused browser QA, not a complete accessibility certification or a test of every browser/assistive-technology combination.

## Acceptance checks

| #   | Implemented behavior and evidence                                                                                                                                                                                                 |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Overview has no legacy subtitle/scope controls/Active abroad card; queue precedes Insights. Browser tests verify navigation and order.                                                                                            |
| 2   | Large sidebar New case, header workspace, adjacent Inbox/bell and Jeffrey/JT account; inspected at both requested desktop sizes.                                                                                                  |
| 3   | Separate destinations, parameter-preserving assignment redirects, stable IDs and version history; redirect/browser and migration tests.                                                                                           |
| 4   | Semantic case links, non-interactive row navigation, checkbox exclusion and drag-text-selection guard; real pointer/keyboard tests.                                                                                               |
| 5   | Sequential persistent employee numbers; current-version inventory, expiry/unknown/expired states; creation and reload tests. Initials avatars provide the photo fallback.                                                         |
| 6   | Reuse is current-version and case-compatible. Replacement/expiry requires revalidation; passport-linked results and downstream checks are invalidated. Domain and browser regressions.                                            |
| 7   | Old Casey fixture remains technical work, with generic tasks separate; a new 10-day meeting case uses DN1 education. Domain and browser checks. No unavailable original database was imported.                                    |
| 8   | Search/autofill, conditional questions, review, route assumptions and named requirements. UK uncertainty, exemptions and conflicting work activities produce specific review requests.                                            |
| 9   | Requests, metadata upload, reuse, editable preparation, printable worksheet/dossier export, source links, blocked handoff and explicit authority-record controls; end-to-end browser tests.                                       |
| 10  | Route drawer separates purpose, assignees, fees/exclusions, processing/targets and current-source links. DN1/DN2/e-visa and ETA/visitor templates are distinct. Supplied research is labeled rather than independently certified. |
| 11  | Compact named checklist with progressive Details and source/template/version information; inspected Process and drawer. Legacy generic tasks remain in their internal list.                                                       |
| 12  | Labeled status icons distinguish completion, progress, submission and correction. Administrative completion is separate from authority decisions. Visual inspection and state tests.                                              |
| 13  | Independent entry/exit 30/90/180-day filters, company-approved-date statuses and audited extensions; browser tests verify exact memberships and unchanged permission expiry.                                                      |
| 14  | Actual/planned, overlap, open/cancelled stay, year boundary and country-transition unit tests; actual dates and explicit-currency budget estimates exercised in browser.                                                          |
| 15  | Employee-default Inbox, separate Internal view, local replies and distinct unread/unresolved counts; persistence and audience/deep-link regressions.                                                                              |
| 16  | Incident creation/linkage, acknowledgment, assignment, information request, document linking, internal escalation, resolution and reopening. Unresolved counts survive acknowledgment; no boarding/entry guarantee.               |
| 17  | Searchable Vietnam/UK guide with official sources, checked dates and legal statement; guide uses the same route template for intake. Browser routing/template tests.                                                              |
| 18  | Stable shell, short transitions, reduced motion, keyboard/focus trap/Escape, scrolling dialogs and responsive layouts. Actual app screenshots and browser tests at the stated viewports.                                          |
| 19  | Refresh, stable IDs, migrations, corrupt-state recovery, backup and confirmed fixture reset. Build/TypeScript, domain and browser commands listed above. README contains actual scope and replay instructions.                    |

## Reference review

Read all five supplied Markdown files. Inspected the nine inline screenshots, including the previous Overview, employee profile, case requirements, legacy-task rows, Inbox and four Perk frames. Original screenshot files were not available as local workspace files; no local screenshot copies were fabricated.

Inspected the actual `references/perk-travel-reference.mp4` with ffprobe/ffmpeg and sampled frames: **12.4 seconds, 1460×652, 30 fps**. Flight selection is clear around 1–3 seconds; itinerary 4–7.5; green checklist feedback around 6; highlighted action around 7; transition around 8; approval view 8.5–11.5; staged success around 10.5; pale canvas at 12. The fixed shell, typography and understated surfaces informed the app. The oversized cursor and multi-second presentation choreography were not reproduced. Interaction durations in the brief are proposed app values, not measured live-app timings.

## Limits

All tested state is local, non-sensitive demonstration data. Uploads preserve file metadata and version histories, not file bytes. There is no backend role enforcement, real email, authority filing/payment or legal determination. Exports are TripWire worksheets, not verified latest official forms. Real record preservation from the earlier screenshot application remains untestable because that application's source and database were never supplied; the user authorized a new replacement instead.

A public deployment is separate from this workspace server and GitHub source upload. Deployment configuration is provided, but an unprovisioned public hosting URL is not claimed.
