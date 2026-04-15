# Website Fix Plan

This document is for future Codex chats to implement the museum website fixes in a controlled order.

## Current Status

Implemented in this pass:
- Split auth entry points into separate staff and member pages.
- Added role-specific page framing and theme styling through shared layout/CSS.
- Made table action controls render like visible buttons.
- Strengthened supervisor alert visibility.
- Fixed membership update writes that incorrectly referenced `req.session.user.username`.
- Strengthened ticket-sale membership validation so inactive memberships do not receive member pricing.
- Added route-level negative stock validation for gift shop and cafe inventory/cart updates.
- Added trigger updates for stock-check-on-update and negative-stock prevention in `sqlFiles/008_triggers.sql`.
- Improved reports by adding ticket purchase-type and member-vs-guest filtering plus summary metrics.
- Removed the main `Museum Queries` wording and replaced it with user-facing collection search copy.

Still not completed:
- Full delete/edit audit across all CRUD routes.
- Full museum visual overhaul with imagery on every major role page.
- Full accessibility walkthrough and first-time-user copy cleanup.
- Additional report expansion beyond the ticket sales improvements added here.
- Express removal.

## Scope

Constraint:
- Make the smallest code changes necessary to address the TA feedback.
- Do not refactor working code unless the current structure directly blocks a required fix.
- Prefer targeted route, SQL, CSS, and copy fixes over architecture changes.

Current codebase notes:
- The app already runs on `node server.js`.
- The runtime currently uses `Express` and `express-session`.
- Several business-rule protections already exist in `sqlFiles/008_triggers.sql` and some route-level membership checks already exist in `webapp/routes/purchaseTicket.js` and `webapp/routes/tours.js`.
- This plan should focus on fixing what is visibly broken, confusing, or incomplete first.

Important clarification:
- The TA also mentioned changing from Express to plain Node.
- That is a separate high-risk architecture task, not a minimal bug fix.
- Do not start Express removal unless grading explicitly requires it for this submission.

## Priority Order

Fix work in this order:

1. Broken behavior that affects correctness.
2. UI issues that make the site confusing or unusable.
3. Report improvements needed for the demo.
4. Visual differentiation and museum feel.
5. Express removal only if it is truly mandatory.

## Phase 1: Fix Broken Delete And Edit Flows
Priority: Critical

Status:
- Partially completed.
- Action buttons are now visibly button-like through shared CSS.
- Delete validation was improved in gift shop and cafe inventory flows.
- A full route-by-route delete/edit audit is still needed for admissions, artist, department, employee, event, loans, schedule, and tours.

Goal:
- Make delete and edit actions actually work and clearly communicate success or failure.

Why this is first:
- The TA explicitly called out delete as broken.
- Broken CRUD behavior is a harder failure than weak styling.

Tasks:
- Audit every visible delete flow and confirm the button submits to the expected route.
- Check for missing hidden IDs, wrong form actions, and redirects that hide errors.
- Ensure failed deletes show a visible flash/error message instead of silently returning.
- Verify edit flows preload the current record and visibly save changes.
- Where deletes are intentionally blocked by FK or trigger rules, explain why in plain language.

Primary files to inspect:
- `webapp/routes/admission.js`
- `webapp/routes/artist.js`
- `webapp/routes/department.js`
- `webapp/routes/employee.js`
- `webapp/routes/event.js`
- `webapp/routes/loans.js`
- `webapp/routes/membership.js`
- `webapp/routes/schedule.js`
- `webapp/routes/tours.js`

Done when:
- Delete buttons are visible and functional.
- Edit buttons are visible and functional.
- A blocked delete never looks like a broken button.

## Phase 2: Enforce Membership And Trigger Rules Correctly
Priority: Critical

Status:
- Mostly completed for ticket purchasing.
- Member self-purchase already checked active membership; staff ticket sale flow now also blocks inactive memberships from receiving member pricing.
- Trigger coverage was extended for update-time stock checks.
- Tour and event registration paths were not reworked in this pass and still need a focused review.

Goal:
- Make business rules consistent with the TA feedback, especially around membership-based ticket access.

Why this is second:
- The TA specifically called out weak trigger/business-rule thinking.
- This is a correctness issue, not just polish.

Tasks:
- Verify member self-purchase rejects inactive, expired, cancelled, or missing memberships.
- Verify staff ticket-sale flow checks membership status, not just membership existence.
- Verify tour and event registration paths follow the same rule where member-only behavior applies.
- Review `sqlFiles/008_triggers.sql` to confirm protections exist for inserts and updates where needed.
- Add route-level validation only where trigger coverage is missing or where the UI needs a clearer message.
- Surface plain-language errors such as `Membership inactive. Full-price or guest purchase only.` when appropriate.

Primary files to inspect:
- `webapp/routes/purchaseTicket.js`
- `webapp/routes/tours.js`
- `webapp/routes/eventRegistration.js`
- `sqlFiles/008_triggers.sql`
- `sqlFiles/011_membership_status.sql`

Done when:
- A non-active member cannot receive member-only purchase behavior.
- Staff cannot accidentally bypass the rule through a manual sale flow.

## Phase 3: Remove Negative Stock Paths
Priority: Critical

Status:
- Partially completed.
- Gift shop and cafe inventory forms now reject negative stock values.
- Gift shop and cafe cart quantity edits now re-check live stock.
- SQL trigger definitions now include negative-stock prevention plus update-time stock checks.
- Database changes still need to be applied manually if the schema has already been created.

Goal:
- Make negative inventory impossible in supported workflows.

Why this matters:
- The TA explicitly called out negative stock.
- Inventory going below zero is a visible correctness failure.

Tasks:
- Audit gift shop and cafe create/edit flows for stock values below zero.
- Prevent direct edits that set stock below zero.
- Verify insert, update, and delete sale-line triggers restore and deduct stock correctly.
- Add route validation where trigger-only protection would leave the UI confusing.
- Make stock-related failure messages visible to the user.

Primary files to inspect:
- `webapp/routes/giftShop.js`
- `webapp/routes/cafe.js`
- `sqlFiles/008_triggers.sql`

Done when:
- Stock cannot become negative from forms, edits, or order workflows.

## Phase 4: Remove Confusing Copy And Improve Action Visibility
Priority: High

Status:
- Partially completed.
- Shared query/report/dashboard/auth copy was improved in the touched files.
- Action controls in tables now render like visible buttons.
- Some older pages still contain technical or awkward copy and need a separate sweep.

Goal:
- Eliminate the most obviously bad text and make actions look like actions.

Why this is next:
- This is low-risk and high-value.
- The TA repeatedly called the UI confusing and ugly.

Tasks:
- Remove the text `queries for members`.
- Rename technical labels into user-facing labels.
- Fix any broken text encoding and awkward punctuation.
- Make delete, edit, renew, resolve, and similar actions actual visible buttons.
- Ensure destructive actions look destructive and primary actions look primary.

Primary files to inspect:
- `webapp/helpers.js`
- `webapp/public/styles.css`
- route files that render action links/buttons
- `webapp/routes/queries.js`

Done when:
- No visible developer-facing copy remains.
- No important action looks like plain text.

## Phase 5: Separate Member And Staff Entry Points
Priority: High

Status:
- Completed for the current auth flow.
- `/staff-login`, `/member-login`, and `/member-signup` now exist, and legacy `/login` and `/signup` redirect into them.

Goal:
- Stop making staff and members log in through the same confusing entrance.

Why this matters:
- The TA explicitly called for different staff/member login pages.
- This is a targeted UX fix, not a full auth rewrite.

Tasks:
- Create separate landing choices for member and staff logins.
- Split the current shared login page into at least:
  - `/member-login`
  - `/staff-login`
- Keep shared auth logic internally if possible.
- Ensure post-login redirects still go to the correct dashboard.

Primary files to inspect:
- `webapp/routes/authentication.js`
- `webapp/helpers.js`
- `webapp/public/styles.css`

Done when:
- A first-time user can clearly tell where to log in.

## Phase 6: Make Roles Visually Distinct
Priority: High

Status:
- Partially completed.
- Shared role banners and role-based theme colors now differentiate member, admissions, gift shop, cafe, curator, supervisor, and general staff pages.
- This is still lighter than the full museum-style role treatment requested by the TA.

Goal:
- Make it obvious which role area the user is in.

Why this matters:
- The TA said every role currently looks the same.
- This directly hurts usability and demo clarity.

Tasks:
- Add a persistent role label, sidebar, badge, or banner to logged-in pages.
- Give each role a distinct section treatment while staying within the current code structure.
- Make supervisor pages feel different from member pages.
- Make cafe and gift shop pages visibly distinct from each other.
- Keep the changes CSS-first where possible.

Suggested role groupings:
- Member
- Admissions
- Gift Shop
- Cafe
- Curator
- Supervisor/Admin

Primary files to inspect:
- `webapp/routes/dashboard.js`
- `webapp/helpers.js`
- `webapp/public/styles.css`
- `webapp/public/app.js`

Done when:
- A user can tell within a few seconds which role area they are viewing.

## Phase 7: Make Supervisor Notifications Impossible To Miss
Priority: High

Status:
- Partially completed.
- Supervisor notifications and trigger violations now render inside strong alert panels with counts and an immediate-attention banner.
- Modal/popup escalation was intentionally skipped to keep changes minimal.

Goal:
- Put supervisor alerts directly in front of the user.

Why this matters:
- The TA explicitly asked for bold, red, impossible-to-ignore notifications.

Tasks:
- Move unresolved alerts to the top of the supervisor dashboard.
- Add strong high-contrast alert styling.
- Show counts and action-needed language.
- Consider a banner or modal only if it can be added with minimal JS.

Primary files to inspect:
- `webapp/routes/dashboard.js`
- `webapp/public/styles.css`
- `webapp/public/app.js`

Done when:
- Supervisors cannot miss unresolved alerts.

## Phase 8: Turn Reports Into Real Reports
Priority: Medium-High

Status:
- Partially completed.
- Ticket sales reports now support purchase-type and buyer-type filtering and show report summary metrics.
- Other report tabs still need broader filter and framing improvements if time allows.

Goal:
- Make reports answer real questions instead of acting like date-only tables.

Why this matters:
- The TA explicitly said the reports are not real reports.

Tasks:
- Keep existing report routes where possible.
- Add more filter dimensions beyond date-only, based on the data each report already exposes.
- Add summary information before raw rows where possible.
- Rename reports to reflect the question they answer.
- Avoid a large SQL rewrite unless current queries cannot support basic useful filters.

Possible filter additions:
- date range
- department
- purchase type
- member vs non-member
- item/category
- employee/guide
- event or exhibition
- status

Primary files to inspect:
- `webapp/routes/reports.js`
- `sqlFiles/009_reports.sql`
- `webapp/public/styles.css`

Done when:
- Reports feel like management views instead of raw assignment output.

## Phase 9: Add Museum Feel Without A Full Redesign
Priority: Medium

Status:
- Partially completed.
- The landing page and shared workspace framing are clearer and more role-aware.
- Dedicated imagery and a stronger museum atmosphere across all dashboards are still outstanding.

Goal:
- Make the site feel like a museum instead of a generic CRUD project.

Why this is later:
- It matters for presentation, but broken functionality matters more.
- This should be a targeted visual enhancement, not a rebuild.

Tasks:
- Add imagery to the landing page and key role dashboards.
- Use museum-oriented section labels and framing.
- Break up large walls of buttons/text with cards, sections, spacing, and images.
- Improve empty states and first-use guidance for non-technical users.
- Keep accessibility in mind while improving visual appeal.

Primary files to inspect:
- `webapp/public/styles.css`
- `webapp/helpers.js`
- dashboard and landing-page route files

Done when:
- The site no longer feels flat, uniform, and text-heavy.

## Phase 10: Accessibility And Demo Readiness Pass
Priority: Medium

Status:
- Not completed.
- Some clarity and button-visibility issues were improved, but there has not been a full accessibility pass yet.

Goal:
- Clean up the final presentation issues that make the site hard to understand.

Tasks:
- Improve heading structure, labels, button clarity, and focus states.
- Check contrast and spacing.
- Make the main task on each page obvious.
- Add clear instructions for first-time users where needed.
- Do a role-by-role walkthrough before demo.

Role walkthrough checklist:
- Member
- Admissions
- Gift Shop
- Cafe
- Curator
- Supervisor

Done when:
- A confused first-time user can still find the main action on each page.

## Optional Phase 11: Express Removal
Priority: Only if required for grading

Goal:
- Remove Express only if the course requirement truly demands it for this submission.

Why this is optional here:
- It is not a minimal fix.
- It is a large rewrite with high regression risk.
- It should not displace correctness and UI fixes unless it directly affects grading.

Tasks if required:
- Replace Express routing/session/static handling with plain Node utilities.
- Preserve route behavior and current DB-backed flows.
- Re-test authentication, forms, flash messages, and static assets.

Primary files to inspect:
- `webapp/server.js`
- `webapp/package.json`
- `webapp/helpers.js`
- `webapp/routes/`

Done when:
- The app runs correctly with plain Node and no Express dependency remains.

## Recommended Future Chat Order

If the next Codex chats are used to implement this plan, use this order:

1. Phase 1
2. Phase 2
3. Phase 3
4. Phase 4
5. Phase 5
6. Phase 6
7. Phase 7
8. Phase 8
9. Phase 9
10. Phase 10
11. Phase 11 only if required

## Definition Of Success

The final website should satisfy all of these:
- Delete and edit actions are visible and reliable.
- Membership rules are enforced consistently.
- Negative stock is impossible.
- Staff and member login paths are clearly separated.
- Role areas are visibly distinct.
- Supervisor alerts are impossible to miss.
- Reports include meaningful options and outputs.
- The UI feels like a museum, not a raw database assignment.
- The site is less confusing for a first-time user.
- Accessibility is improved enough to avoid obvious demo criticism.
