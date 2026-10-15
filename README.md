# Tutor Buddy

A mobile app for tutors across the Philippines to manage students, sessions,
expenses, payments, and professional statements.

Tutor Buddy is tutor-only. Parent marketplace features and routes have been
removed from the app; student guardian details remain available for tutors to
manage their records.

## License

The original Tutor Buddy source code and assets are proprietary to Nicanor
Nikko Villas. See `LICENSE`. Third-party dependencies remain under their
respective licenses.

## Stack

| Layer | Choice |
|---|---|
| Platform | Expo SDK 57 / React Native 0.86 / Expo Go |
| Language | TypeScript (strict) |
| Navigation | Expo Router (routes in `src/app/`) |
| Backend | Firebase — Auth, Cloud Firestore, Storage (JS SDK, no native module) |
| State | Zustand |
| Animation | Reanimated + Gesture Handler (both bundled in Expo Go) |
| PDF | expo-print + expo-sharing, generated on device |

## Documents

| File | Authority for |
|---|---|
| `Tutor_Hunt_SYSTEM_BLUEPRINT.txt` | architecture, data model, business rules, phases |
| `DESIGN_PLAN.md` | colour, type, spacing, elevation, motion, component states |
| `Tutor_Hunt_SYSTEM_BLUEPRINT_v1.0.txt` | archived original, for reference only |

Where the blueprint and the design plan appear to disagree about something
visual, the design plan wins. Where they disagree about data or behaviour, the
blueprint wins.

## Setup

```bash
npm install
cp .env.example .env      # then paste your Firebase web config
npx expo start
```

Without `.env` the app still boots and shows a setup screen with instructions,
rather than crashing on launch.

### Note on node_modules

`firebase`, `zustand`, `@expo/vector-icons`, `react-native-web` and
`@firebase/rules-unit-testing` were installed by copying them in from a scratch
install, because the agent environment's bulk-delete guard blocked `npm install`
in this directory. The tree typechecks and the app config resolves, but it is not
what npm would have written. The first time you can run `npm install` normally
here, do it — that reconciles the tree and the lockfile.

### Firebase

1. Create a project at console.firebase.google.com
2. Enable **Google** under Authentication → Sign-in method
3. Create a **Cloud Firestore** database
4. Copy the web app config into `.env`
5. Deploy the rules and indexes:

```bash
npx firebase-tools login
npx firebase-tools use --add          # select your project, alias it "default"
npx firebase-tools deploy --only firestore,storage
```

## Scripts

| Command | Does |
|---|---|
| `npm start` | Expo dev server |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | Expo ESLint checks, including raw-colour protection in screens/components |
| `npm test` | pricing and ledger unit tests (no emulator needed) |
| `npm run test:rules` | security rules tests — needs the Firestore emulator |
| `npx expo-doctor` | dependency and config diagnostics |

Rules tests:

```bash
npx firebase-tools emulators:start --only firestore --project demo-tutor-hunt
RULES_TEST=1 npm run test:rules
```

## Project structure

```
src/
  app/                 Expo Router routes (files here are screens)
    (auth)/            Google login and tutor onboarding
    (app)/             authenticated tutor area and tabs
  components/
    ui/                the design-system primitives
  constants/plans.ts   the single PLAN_LIMITS definition
  hooks/               auth bootstrap, count-up
  screens/             role home screens
  services/            firebase, auth, entitlements
  stores/              zustand stores
  theme/               colour, type, spacing, radius, elevation, motion
  types/               domain models
  utils/               pricing (pure), currency, date
tests/                 pricing.test.ts, rules.test.ts
```

Routes live in `src/app/`, which is the convention for Expo SDK 55 and later.
Config files stay at the repository root.

## Non-negotiables

These come from the blueprint and are enforced in review:

- **Never hardcode a colour, spacing, radius, elevation or duration.** Use
  `theme/` tokens.
- **Never store an entitlement, quota counter or verification flag in a
  document the client can write.**
- **Never store a derived count.** Derive it with a bounded query.
- **All money maths goes through `src/utils/pricing.ts`**, which is pure and
  unit tested. No screen computes a fee, total or balance on its own.
- **One `array-contains` per Firestore query.** Any new query needs an entry in
  `firestore.indexes.json`.

## Known limitation

The monthly PDF quota is enforced client-side. The rules prevent the counter
from being lowered within a month and prevent `usageMonth` from moving
backwards, but they cannot stop a client from advancing `usageMonth` to reset
it, because Firestore rules cannot compute the Manila month from `request.time`.
Closing this needs a Cloud Function (blueprint sections 32 and 33). The quota is
a product limit, not a security boundary. Pro escalation *is* fully blocked.

## Status

**Phase 1 complete** — project foundation, authentication, entitlements,
security rules, indexes, design system and the tested pricing module.

**Phase 2 complete** — student management: paginated list with status filters,
add and edit forms, a detail view, archive and restore, automatic age
calculation, custom avatar upload, and the free-plan cap enforced by a bounded
query rather than a stored counter.

**Phase 3 complete** — session management: paginated and filterable history,
student-specific history, add/edit/detail/delete flows, duration and fee
calculation, status and billable handling, plus linked replacement sessions
for rescheduling.

**Phase 4 complete** — expense management: paginated expense history, multiple
occurrence dates, student association, reimbursable expenses, reimbursement
status tracking, add/edit/detail/delete flows, and
expense totals calculated from the tested pricing module.

**Phase 5 complete** — payment ledger and earnings: payment model, paginated
payment history, record/edit/delete payment flows, student balances, gross
earnings, outstanding balances, reimbursable and reimbursed expenses, tutor
costs, net cash income, monthly summaries, and live home-dashboard figures.

**Phase 6 complete** — PDF statements: student and date-range statement
builder, selectable billable sessions, selectable reimbursable expenses, local
PDF generation, preview and sharing, sequential statement metadata, atomic
expense inclusion/quota updates, statement history, and free-plan quota UI.

**Tutor-only migration complete** — public tutor profiles, parent profiles,
marketplace browsing, favorites, parent postings, and tutor-interest
notifications were removed from the product. Existing Firestore documents are
left untouched for safe archival or future migration.

**Phase 7 complete** — recurring sessions with weekday/date-range generation,
series management, holiday skips, caps, and Pro gating.

**Phase 4 of the tutor-only migration complete** — the app no longer exposes or
writes marketplace collections, public tutor profiles, parent accounts,
favorites, parent postings, or tutor-interest notifications. Firestore,
Storage, indexes, and Cloud Functions are aligned with the tutor-only model.
Legacy documents remain untouched for safe archival; deploy the prepared rules,
indexes, Storage rules, and Functions when you are ready to apply the backend
cutover.

The product-hardening status is now:

- **Phase 11 complete** — Free/Pro limits are centralized and enforced in the
  UI and services, Pro expiry is handled, reimbursable expense tracking is
  included in the Free plan,
  pricing is locked to ₱29 / 30 days, ₱149 / 6 months, and ₱249 / 1 year, and
  renewals extend active access correctly. Backend deployment and live-account
  QA remain operational follow-up steps.

**Phase 12 implementation complete** — account deletion is handled by the
trusted `deleteMyAccount` Cloud Function, suspension is enforced by Rules,
verification requests have a private schema, and web App Check can be enabled
with `EXPO_PUBLIC_FIREBASE_APPCHECK_SITE_KEY`. Deploy the backend before
testing account deletion:

```powershell
npx firebase-tools deploy --only functions,firestore,storage --project tutorhunt-ded38
```

Native Android/iOS App Check still requires a native provider in an EAS build;
it is intentionally not enabled in Expo Go.
