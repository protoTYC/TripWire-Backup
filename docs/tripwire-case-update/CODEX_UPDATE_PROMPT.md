# TripWire: simplify the admin workspace and make visa preparation actionable

Revise the EXISTING TripWire application. Read BUSINESS_TRAVEL_GUIDES.md, MOTION_AND_REFERENCE_BRIEF.md and ACCEPTANCE_CHECKS.md in this pack. Inspect the supplied screenshots and the travel_01 reference video (or sampled frames) before coding. Preserve working functionality and data. The pack is a specification, not application source. If the actual repository is inaccessible, say so instead of claiming implementation.

## Objective and precedence

The administrator should see today's work immediately and be able to prepare a business-trip visa case without prior visa knowledge. Replace generic preparation tasks with a guided, named-document process and functioning actions. These new instructions supersede earlier requirements for Overview filters, an Active abroad card, Travel under Assignments, repeated demo wording, and research metadata expanded in every row.

Do not rebuild from scratch or substitute a marketing page. Keep original TripWire logo, Archivo Black wordmark, Poppins interface, #080679 primary, #9ecfff secondary, white surfaces and a very pale neutral canvas. Use the current project stack. No production backend, real email, payment, official filing, or government integration is required for this iteration.

## 1. Shell and navigation

Use Cases as the user-facing replacement for Assignments. Cases means a visa/document-preparation workflow; Travel means actual/planned movement and time abroad. Keep internal assignment IDs stable. Redirect legacy /assignments URLs with parameters to the corresponding case routes rather than breaking bookmarks. Do not change the meaning of an existing work assignment merely by renaming the interface.

Sidebar order: Overview, Cases, Travel, Employees, Documents, then a Support group with Inbox and Urgent, then Travel guide. Settings stays at bottom. At desktop height, retain access to all items with contained sidebar scrolling if needed. Urgent has a red numeric badge only when unresolved urgent cases exist. Cases and Travel are independent top-level destinations.

Swap the current sidebar workspace card and header New assignment action locations. Beneath the logo, give New case the large full-width sidebar slot currently used by Northstar. Make it a prominent 64-80px-height action without an explanatory slogan. Move Northstar Manufacturing into a compact header workspace dropdown, occupying approximately the old top-right New assignment area. Do not repeat New case in the header. Keep global search, then the compact workspace control, Inbox icon, alert bell and Jeffrey Tang account menu. Put the inbox icon adjacent to the bell. Their badges mean unread employee messages and unacknowledged notifications respectively; they are not the Urgent count.

Rename active admin Avery Morgan to Jeffrey Tang, initials JT, wherever it denotes this configured demo administrator: profile, assigned-person labels, fixtures and message authors. Preserve IDs and relationships. For existing historical events, treat this as correcting the fictional actor's display profile, not rewriting real audit history. No duplicate bottom-left account block.

## 2. Overview: today's actions, no filter bar

Remove the introductory line 'Preparation, document review, and travel across your assignments.' Remove the Destination/Department/date scope filter bar and reset-scope control. Remove the Active abroad metric. Hide technical count explanations and chart data tables behind accessible info/details controls, not explanatory paragraphs across the page.

Prioritize cards for Urgent issues, Documents to review, Departing soon with missing requirements, and Employee questions awaiting reply. Derive counts from shared state and disclose units in tooltips. 'Departing soon' means within the next 72 hours based on configured demo time, with unresolved required steps; missing flight time means label Date only and avoid an invented hour countdown. A card opens its detailed queue, where filters can live.

Put a prioritized Today / Action queue immediately below the cards, before charts. It has concrete item names, employee, case, due/departure context, Assigned to, status and next action. No overview filter tabs or scope dropdowns. Show urgent incidents first, overdue actionable HR work next, then imminent-departure blockers, then regular reviews. Keep small preparation-stage and upcoming-departure charts below the queue or in a compact collapsible Insights area. Preserve chart functionality, but do not let analytics push the work below the first screen. All chart clicks navigate to matching records instead of adding an Overview filter bar.

Use a fixed configurable demo clock consistently. Do not change a deadline to make an urgency card red. A processing estimate is not a deadline; a future departure date is not an overdue action date.

## 3. Cases list and row interaction

Make non-interactive areas of each employee case row clickable. Remove the redundant far-right arrow-only column. Keep a semantic employee/case link for keyboard focus and standard open-in-new-tab behavior. A pointer row click navigates only when the target is not a checkbox, button, link, menu or selected text. Keyboard users activate the explicit link; do not make a table row a fake button containing other buttons. Use a subtle hover background, visible focus and pointer affordance. Row selection or document checkboxes must never trigger navigation.

Display human-readable IDs (e.g. TW-CASE-000142) rather than assignment-2 or employee-69. Add a stable unique employeeNumber (e.g. TW-EMP-000069); leave internal IDs unchanged. Generate sequential display numbers without collisions during migration and creation. Do not derive the next ID from a filtered row count or recycle deleted identifiers.

## 4. Employee profile: useful document inventory

Show photo, name, employee number, department, home office, nationality and case history without redundant subtitles. Add Documents on file: Passport, Portrait photo, relevant visas/authorizations and other stored items, each with icon/status, expiry where known, last checked date and linked case use. A passport checkmark says On file or Reviewed, not universally valid for every trip. Expired/missing/needs update states are prominent. Unknown expiry says Not recorded.

Reuse an existing reviewed document only if the CURRENT version meets that case's criteria. A replaced or expired version triggers revalidation of linked case usage. Do not display a real document's contents by default. Offer View document to authorized roles only when real access control exists; otherwise mark the demonstration's view as a preview and do not claim secure role enforcement. Metadata visibility and file visibility are separate. Use only non-sensitive sample content for this demo.

Remove repeated 'fictional', 'sample employee', 'simulation' descriptions from operational instructions, names, host labels and table rows. Use realistic professional wording. Keep one discreet Demo environment indicator in the account menu/settings and explicit simulation notice at the point of any external-action preview/confirmation. Sample document downloads may retain a sample watermark. Never falsely state that an email, official filing, payment, approval or expert review occurred.

## 5. Rebuild case detail around a guided application

Case header: employee, country, purpose, trip dates, proposed/confirmed route, assigned coordinator and one clear Next action. For example 'Casey Chen / Vietnam / Business meetings' and 'DN1: route needs confirmation' when appropriate. Do not relabel an existing six-month technical-work case as a business visit. Preserve its employment/work-authorization track. Add a separate short business-meeting case as the new novice-friendly demonstration.

Use simple case tabs Process, Documents, Messages, History. The global Travel page links into case/trip details; avoid making Travel's existence depend on opening a case. Process is the default.

Process layout: a short preparation stepper, an actual named-document checklist on the left and a concise Next step / Fees / Timing summary on the right. Suggested stages: Trip details, Documents, Application preparation, Official submission, Decision, Before departure. Stage transitions follow recorded facts and dependencies. Authority processing/decisions cannot be completed by accepting a passport. 'Documents ready' does not mean 'Visa approved' or 'Travel authorized'.

For each requirement show only: icon, exact document/deliverable name, current status, Assigned to (employee/HR/host), action due label where relevant and a meaningful button. Actions include Use document on file, Request document, Upload document, Prepare draft, Review, Request correction, Open official application, Record submission reference, Add decision and Mark checked. All must work locally or explicitly open the cited official site.

Clicking a visa/process card opens a plain-language drawer with:
- What this route is for and what activities it does not establish permission for.
- What the employee supplies and what HR/local sponsor supplies.
- Numbered instructions for the current step, with field guidance (passport name, intended dates, host identity, purpose) and required checks.
- Official fee reference, currency, scope, estimate/confirmed state, exclusions and original source. Unknown charges must say Confirm with issuing office, never $0.
- Timing estimate, internal target and expiry as distinct concepts.
- Current official form/portal link and source-checked date.
- A visible primary action for the next incomplete step.

Use BUSINESS_TRAVEL_GUIDES.md for the supported examples. Support Vietnam business-route education (DN1 versus DN2 and separate e-visa route) and UK business visitor/ETA education. Do not call these 'most popular' without market evidence. Unsupported countries receive a clear intake/review path, not copied Vietnam requirements.

### Meaningful application automation

The New case intake keeps searchable employee selection, autofill and click-based conditional questions. Reuse employee, host and trip data to select an explicit template. Show a short answer review and route assumptions. Generate named requirements, default assignees, draft document requests and internal preparation targets, not only 'Confirm assignment facts'. Unknown or conflicting facts produce one actionable review item rather than blocking the whole screen behind a wall of metadata.

Implement Prepare application as a real local workflow: prefill an editable field summary from current records, identify missing inputs, preview it, and export a PDF/printable sheet plus a dossier checklist/index. Label it TripWire preparation draft, not an official filing-ready form. Do not recreate an outdated official form or claim fields are mapped to its latest version unless actually verified. Keep a current official-form link and show any unavailable source/form version clearly.

Request missing documents works for selected items and creates case-linked employee-facing requests. Use document on file links the right current version and records its use. A submitted replacement needs review. At final handoff, preview what will be submitted, who submits, fee assumptions, unresolved steps and the official site. The demo can record a simulated reference through Demo controls, but real submission/payment remains a deliberate external action outside this prototype. A manual Record submission requires a reference/date/actor and cannot retroactively pretend local preparation was an actual authority filing.

Keep generic HR tasks in a separate internal task model/list. Do NOT migrate 'Review submitted documents', 'Confirm assignment facts', or 'Confirm outstanding actions' into pretend document rows. Hide duplicated legacy prep rows from the Process checklist while preserving their stored history and links. Rebuild requirements for seeded cases from versioned templates with a migration/diff, not a destructive reset. Specifically check the old Casey case, which currently retains generic rows instead of a usable dossier.

## 6. Plain language and progressive disclosure

Replace Responsible owner / Owner with Assigned to. Replace Mobility specialist with Travel adviser or Immigration adviser when that is the actual role. Specialist review means checking an uncertain route, exemption or legal requirement; it is not an extra document everyone must upload. Show 'Advice needed: confirm [specific question]' and a Request review action only where needed. Create an assigned review request with a genuine Unassigned state if nobody exists. Do not invent a named lawyer or a guaranteed support service.

Move source basis, template identifier, document issuer constraints, applicability logic, translation/legalization checks, dependency graph, version history and research dates into Details or Sources & requirements. Keep important exceptions visible as short actionable callouts, not hidden warnings. Remove 'None specified' filler. Source data remains in the model and accessible when requested. Do not expose developer strings like 'Preserved preparation action from the existing case' or instructions to provide 'fictional passport samples'. Write 'Upload passport photo page' or 'Confirm passport expiry' in normal UI.

Use distinct but restrained status icons with readable colors: green check-circle Completed, amber clock In progress, neutral circle Not started, blue document Submitted/Awaiting review, red alert Needs correction/Overdue, gray minus Not applicable. Use stronger green (#15803D with a pale green background is a starting point), text labels and sufficient contrast. Green only means the labeled workflow step is complete, not legal clearance. Do not classify a route as legally suitable from color alone.

## 7. Travel: top-level planning and cumulative time abroad

Travel is a standalone operational dashboard. Show employees abroad, upcoming departures/returns, actual days abroad YTD, planned duration and extensions beyond company-approved return dates. Keep country grouping and employee drilldowns. Add Country, Department, Status and date filters, with distinct modes 'Entry in next 30/90/180 days', 'Exit in next 30/90/180 days' and Custom range. These are date windows, not maximum-stay rules. Add a separate Duration filter if desired, labeled Stay length, never reuse Entry window to mean duration. Dates without times use date-only comparisons consistently.

Compare actual stay with approved dates and internal policy. Green Within approved dates, amber Approaching approved return, red Past approved return date. An approved extension updates the approved target, logs approval and can resolve the company-date exception. It cannot extend a visa or other permission. Keep legal expiry/authorized stay dates in distinct fields and sources. Do not call a company-date overrun an immigration overstay.

Use actual entry/exit records for physical presence, with planned/forecast days separate. Demo reporting counts entry/exit days inclusively, merges overlapping same-country intervals, clips open stays at the demo date, excludes cancelled legs and clips YTD to the year. Overall away days are the union of away dates; do not double-count country transitions. Show the reporting convention in an info tooltip, not as tax advice. No generic 183-day tax-safe progress bars or automatic legality from days alone.

Optional estimated extra cost = recorded additional days times an explicitly entered daily budget in its own currency. Label Estimate; missing budget means Not available. Do not invent actual expenses or mix currencies without a disclosed rate/date. Keep the existing expense scope small, with no need to add finance integrations.

## 8. Inbox and Urgent

Inbox defaults to Employee questions. Provide a clear Employees / Internal switch. Seed realistic non-urgent employee questions: which passport page to provide, how to replace a photo, whether dates can change, who supplies the host invitation. Preserve internal notes in the Internal view. Each thread has linked employee/case, assigned responder, unread/reply status and next response. Employee messages and internal notes have distinct audiences. Switching views must not leak internal notes into employee replies. Replies record in the local demo without sending emails.

Urgent is a separate prioritized incident queue, not just unread Inbox. Include employee-reported airport document problem, travel within 24 hours with a blocking required item, and time-critical corrections. Auto rules need a specific source/reason and must not classify every routine HR task as urgent. Show the incident, location/time zone, departure if known, severity, elapsed time, linked case/documents and assigned responder. Actions: Acknowledge, Assign, Ask for information, Link document, Escalate internally, Resolve with a note, Reopen. State machine Open -> Acknowledged -> In progress -> Resolved. Unread is separate from unresolved. Badge/card counts reflect open incidents consistently.

An employee question can be escalated into a linked urgent incident without losing its conversation. An acknowledged incident remains urgent until resolved or explicitly downgraded with reason. Do not promise 24/7 assistance, airline boarding overrides, guaranteed entry or live support integrations. The app organizes response and documents; actual carrier/authority decisions remain external.

## 9. Travel guide

Create a top-level searchable Travel guide. Start with Vietnam and United Kingdom, with country, nationality, purpose and route selection plus short articles for business meetings versus work. Each entry has Overview, Who this route is for, Documents, Step-by-step, Fees & timing, Before departure, Official sources. Use the accompanying researched guide data and distinguish official required material, conditional evidence and company-recommended preparation. Do not require every possible document for all travelers.

Allow Start case using this guide to preselect the country/purpose and reuse the same versioned template that powers Process. An article and its generated checklist must not contradict each other. Keep source version, checked date, scope, effective date where established, and review state accessible. Fees remain keyed to route/entry type/office/currency and checked date. Display a concise legal statement in the guide: 'TripWire provides administrative tools and general information. We are not a law firm and do not provide legal advice. Requirements and fees can change; confirm your circumstances with the relevant authority or a qualified adviser.' Do not plaster this text over every operational row.

## 10. Motion and professional finish

Follow MOTION_AND_REFERENCE_BRIEF.md. The supplied clip is a staged product demonstration, so distinguish its presentation pacing from real application interactions. Reuse its clean hierarchy, smooth page changes, progressive completion checks and crisp hover feedback. Keep the live app fast, with 160-240ms control/drawer transitions and short page transitions rather than multi-second scene fades or automatic navigation.

Add reduced-motion support and deterministic functional state changes. Animations must reflect completed operations; no fake checkmarks, timed legal approvals or disabled controls that imply verification is running when nothing is happening. Keep popovers and focus rings polished, avoid full-page blank flashes, and respect the user's scroll position. Use the existing animation/CSS stack when possible.

## 11. Implement, verify, report

Inspect current routes/data first. Briefly describe the implementation plan, then execute it without stopping at another design proposal. Migrate display IDs, Jeffrey's configured identity, cases/requirements and support records while preserving existing user work and version history. Persist changes, handle corrupt storage gracefully and provide a confirmed demo reset. No real sensitive documents or credentials should be introduced.

Follow ACCEPTANCE_CHECKS.md, run relevant build/type checks and meaningful workflow tests, and visually inspect the actual screens at 1280x800 and 1440x900. Report checks actually run and limitations; update the project's README and old specifications so they do not reintroduce the previous contradictory UI requirements. Provide the exact local preview URL if a server is running. Do not deploy, send external messages, pay fees or submit government forms.
