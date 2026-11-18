# Motion and screenshot brief

## What was observed

The supplied travel_01(1).mp4 is 12.4 seconds, 1460x652 at 30fps. It is a staged product clip, not proof of every animation's behavior in the live Perk application. Sampled at one-second and two-second intervals, it shows: a pale opening canvas; a white app shell and flight-choice view around seconds 2-3; an itinerary summary around seconds 4-5; checklist indicators turning green and a highlighted continuation action around seconds 6-7; a brief transition around second 8; an approval-request screen around seconds 9-10; and a pale ending by second 12. Cursor movement and display pacing are part of the presentation, not required automated app behavior.

Take the clear typography, understated surfaces, restrained sidebar, state feedback and smooth screen changes. Do not copy the large presentation cursor, flight-booking functions, policy-compliance claim or exact marketing pacing. The original logo/palette remain TripWire's.

## Proposed implementation values, not measured clip timings

| Interaction | Proposed app behavior |
| --- | --- |
| Hover/pressed | 120-160ms color/border transition; no layout shift |
| Page change | 180-240ms opacity and up to 8px vertical motion; stable shell |
| Wizard step | 180-220ms crossfade/short slide; focus moves to step heading |
| Drawer/modal | 200-240ms transform/opacity; proper focus trap and Escape |
| Checklist completion | Brief check-circle transition after actual saved state |
| Related-step feedback | Optional 50-70ms stagger, no artificial multi-second wait |
| Reduced motion | Remove translations/stagger and use immediate state change or short fade |

Animations reflect operations that actually occurred. Do not auto-mark required items complete for a cinematic effect. Trigger feedback after a successful local save; do not imply external submission or legal review. No autonomous cursor or auto-navigation in the normal app. A separate optional demo tour can guide focus, but must be user-controlled.

Codex should inspect the video using available video/frame tools. If it cannot read the MP4, use the included reference frames and state that limitation. Final QA must use the actual app, not the reference images.

## Image-to-change map

| Reference | Visible issue / intended change |
| --- | --- |
| current-overview.png | Remove subtitle and global filter bar, replace abroad metric, move queue above analytics, swap company/action positions, add Inbox header icon |
| current-employee-profile.png | Replace employee-69 with stable display employee number; add documents-on-file and expiry summary |
| current-case-requirements.png | Remove technical expanded metadata from default view; use guided Process with clear documents/actions |
| current-case-legacy-tasks.png | Generic tasks have survived as document rows; migrate without losing history but remove these from the dossier checklist |
| current-inbox.png | Internal notes dominate; default to employee questions and add Employees/Internal switch |
| perk-travel-reference.mp4 | Visual/motion reference as described above |
| frames/perk-02.png, perk-05.png, perk-07.png, perk-09.png | Representative shell, itinerary summary, successful-state feedback and approval layout |

## Plain-language replacements

| Current label | Proposed presentation |
| --- | --- |
| Assignments | Cases |
| Responsible owner / Owner | Assigned to |
| Mobility specialist | Travel adviser / Immigration adviser, only for a real configured role |
| Specialist review | Advice needed, followed by the actual question and Request review |
| Applicability / workflow | Status, with detailed applicability under Details |
| Source basis / Template | Sources & requirements drawer |
| View 2 preserved versions | Version history, under document details |
| Validity unknown | Expiry not recorded, or the specific missing check |
| Provide a fictional passport sample | Upload passport photo page |

Do not merely hide relevant blockers. When something prevents progress, show the missing fact and its action clearly. Keep a discreet Demo environment indicator and honest external-action previews while removing repetitive scaffolding prose from operational screens.
