# Acceptance checks for the existing application

These are requested checks, not tests already run. Codex must report actual implementation and verification results.

1. Overview opens without subtitle/filter bar/Active abroad card. The action queue is above analytics. Metric links navigate to actionable records.
2. New case occupies the former sidebar company-card slot; compact workspace control is in the header. Inbox icon sits next to the bell and opens employee messages. Jeffrey Tang/JT is the active account, with no duplicate footer account.
3. Cases, Travel, Urgent and Travel guide are separate top-level destinations. Legacy assignment links still work; internal IDs and existing uploaded version history survive migration.
4. Clicking a case row's empty space opens it; checkbox/menu/button/link clicks do only their own actions; text selection does not unexpectedly navigate. Keyboard link access and focus work.
5. Employee number is unique/stable across reloads and newly created employees. Profile displays documents-on-file, current version, recorded expiry and status. Unknown expiry is not treated as valid; expired passport prompts an update.
6. An existing reviewed passport can be linked to a compatible case; replacement/expiry requires revalidation, and an old acceptance does not silently apply to a new file.
7. The old Casey work case no longer shows legacy generic tasks as pretend document requirements. It retains its actual work-purpose assessment. A separate short Vietnam business-trip case supports the complete demonstration.
8. From New case: search employee, choose host/country/dates/activity, review suggested route, generate named document list. An unknown/conflicting purpose leads to a specific review request, not a confident visa recommendation.
9. From Process: request missing passport/photo, reuse a document, prepare/edit/export application field summary and dossier index, view current official source, record reference via explicit demo/manual action, and review result. Every button has visible meaningful behavior. No local event falsely says an authority approved or received it.
10. Visa detail drawer explains steps/fields, assignees, route-specific fees/exclusions, processing estimate, internal targets and official link. Unknown total cost says Confirm, not zero. A domestic government fee reference is not presented as an embassy all-in quote. DN1 and DN2 are distinct; UK ETA and visitor-visa checklists are distinct.
11. Default process rows are short and actionable. Sources/template IDs/dependencies/version history are discoverable in Details. No fictional-sample instructions, 'None specified' filler or 'preserved preparation action' developer prose appears in operational rows.
12. Icons and text make Completed/In progress/Submitted/Needs correction distinguishable without color. Checkmarks do not imply general legal clearance.
13. Travel filters separately handle entry/exit next 30/90/180 days. A duration filter does not change meaning. Green/amber/red compares company-approved dates, and extending those dates never changes visa validity.
14. Test actual versus planned days, same-country overlap, cancelled travel, open stay, year boundary and country transition without duplicate global days. Estimated extra costs use an entered budget and currency; missing data remains unavailable.
15. Inbox defaults to employee questions; Internal switch preserves team notes. Employee reply does not include internal notes. Unread counts and unresolved counts stay distinct.
16. Airport-document incident can be acknowledged, assigned to Jeffrey, linked to a case, escalated, resolved and reopened. Acknowledgment does not prematurely clear urgent badges. Routine unread messages are not automatically urgent. No promise of 24/7 live response or boarding clearance.
17. Travel guide contains Vietnam and UK examples, official sources/checked dates and concise legal statement. Start case from a guide uses the same template as Process.
18. Reduced motion works; transitions do not stall a demo, cause full-page flashes or fake operation success. Inspect actual screens at 1280x800 and 1440x900, with keyboard navigation, modal scrolling and normal text zoom/reflow.
19. Refresh preserves changes, migration retains data and confirmed Reset restores known fixtures. Run build/type checks and focused workflow/date/state tests. Update README with actual results and replay steps.

Suggested replay: open Overview, open new case, select the short Vietnam business-trip preset, reuse a reviewed passport, request a missing photo, prepare the draft/index, inspect official submission handoff, then open an employee question and escalate an airport-document issue into Urgent. Do not rush a real filing or payment during the class presentation.
