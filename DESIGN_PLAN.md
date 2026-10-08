# TUTOR HUNT — DESIGN PLAN

Version: 1.0
Companion to: Tutor_Hunt_SYSTEM_BLUEPRINT.txt (v1.2)
Target: Expo SDK 57 / React Native / TypeScript / Expo Go
Status: to be implemented during Phase 1

AUTHORITY
The system blueprint remains the source of truth for architecture, data and
business rules. This document is the source of truth for visual language:
colour, type, spacing, elevation, motion and component states. Where the two
appear to conflict on a visual matter, this document wins.

---

## 1. PURPOSE

Tutor Hunt must not look like a stock component library or a bare utility app.
It is used by tutors to record money and by parents to judge whether a stranger
is safe to teach their child. It therefore has to feel trustworthy and calm,
while still feeling modern and warm rather than corporate.

The goal of this plan is consistency first: one source of tokens, one component
kit, one motion vocabulary. Distinctiveness comes from disciplined repetition of
a few strong choices, not from decoration.

---

## 2. DESIGN PRINCIPLES

1. Calm surface, confident action.
   Screens are quiet. Exactly one primary action is visually dominant per screen.
2. Money is the hero.
   Earnings, balances and fees are the largest, clearest elements on any screen
   that shows them. They use tabular figures and semantic colour for direction.
3. Never rely on colour alone.
   Every status carries an icon and a text label as well as a colour.
4. Motion explains, never decorates.
   Animation is used to show where something came from, what changed, or that a
   press registered. Nothing loops and nothing performs.
5. Warmth through accent, not through noise.
   The amber accent appears sparingly, so it stays meaningful when it does.
6. Touch is generous.
   Minimum 44x44 targets, 48 preferred, and every pressable thing gives
   immediate feedback within 90ms.

---

## 3. FOUNDATIONS

### 3.1 Colour

#### 3.1.1 Primitive ramps

Primary — indigo
```
primary50   #EEF2FF     primary300  #A5B4FC     primary700  #4338CA
primary100  #E0E7FF     primary400  #818CF8     primary800  #3730A3
primary200  #C7D2FE     primary500  #6366F1     primary900  #312E81
                        primary600  #4F46E5  <- brand
```

Accent — amber
```
accent50    #FFFBEB     accent300   #FCD34D     accent700   #B45309
accent100   #FEF3C7     accent400   #FBBF24     accent800   #92400E
accent200   #FDE68A     accent500   #F59E0B  <- accent
                        accent600   #D97706
```

Neutral — slate
```
ink50   #F8FAFC    ink300  #CBD5E1    ink600  #475569    ink900  #0F172A
ink100  #F1F5F9    ink400  #94A3B8    ink700  #334155    white   #FFFFFF
ink200  #E2E8F0    ink500  #64748B    ink800  #1E293B
```

#### 3.1.2 Semantic tokens

Components must only ever reference these, never a primitive or a hex value.

Surfaces
| Token | Value | Used for |
|---|---|---|
| `canvas` | #F8FAFC | screen background |
| `surface` | #FFFFFF | cards, sheets, inputs |
| `surfaceSunken` | #F1F5F9 | wells, disabled fields, track backgrounds |
| `surfaceOverlay` | rgba(15,23,42,0.45) | modal and sheet backdrop |

Text
| Token | Value | Contrast on white |
|---|---|---|
| `textPrimary` | #0F172A | 17.9:1 |
| `textSecondary` | #475569 | 8.6:1 |
| `textMuted` | #64748B | 5.7:1 |
| `textHint` | #94A3B8 | 3.1:1 — placeholders only, never body copy |
| `textOnPrimary` | #FFFFFF | on primary600 |
| `textOnAccent` | #451A03 | on accent500 — amber is too light for white text |

Borders
| Token | Value | Used for |
|---|---|---|
| `borderSubtle` | #E2E8F0 | card and divider default |
| `borderDefault` | #CBD5E1 | input rest state |
| `borderStrong` | #94A3B8 | pressed input, emphasised divider |
| `borderFocus` | #4F46E5 | focused input, focus ring |

Brand
| Token | Value |
|---|---|
| `primary` | #4F46E5 |
| `primaryPressed` | #4338CA |
| `primaryDisabled` | #C7D2FE |
| `primarySubtle` | #EEF2FF |
| `primaryBorder` | #C7D2FE |
| `accent` | #F59E0B |
| `accentPressed` | #D97706 |
| `accentSubtle` | #FFFBEB |
| `accentBorder` | #FDE68A |

Feedback — each has a solid, a subtle fill, a border and a text-on-subtle value
| Role | Solid | Subtle | Border | Text on subtle |
|---|---|---|---|---|
| success | #059669 | #ECFDF5 | #A7F3D0 | #065F46 |
| warning | #D97706 | #FFFBEB | #FDE68A | #92400E |
| danger | #DC2626 | #FEF2F2 | #FECACA | #991B1B |
| info | #0284C7 | #F0F9FF | #BAE6FD | #075985 |
| premium | #7C3AED | #F5F3FF | #DDD6FE | #5B21B6 |

#### 3.1.3 Domain status mapping

Status is never expressed as bare coloured text. It is always a chip with an
icon, a label and a semantic tone.

Sessions
| Status | Tone | Label |
|---|---|---|
| scheduled | info | Scheduled |
| completed | success | Completed |
| cancelled_by_tutor | neutral | Cancelled by you |
| cancelled_by_parent | warning | Cancelled by parent |
| student_absent | danger | Student absent |
| rescheduled | premium | Rescheduled |

Payments and money
| State | Tone | Label |
|---|---|---|
| paid | success | Paid |
| partial | warning | Partial |
| unpaid | danger | Unpaid |
| reimbursable | info | Reimbursable |
| included_in_statement | premium | On statement |
| reimbursement paid | success | Reimbursed |

Plans
| Plan | Tone | Treatment |
|---|---|---|
| free | neutral | grey chip, no emphasis |
| pro | premium | violet chip with a small crown glyph |
| trial | accent | amber chip showing days remaining |

#### 3.1.4 Colour combination rules

- One dominant colour per screen. Primary actions are indigo; the amber accent
  appears at most once or twice per screen, for premium, trial or a highlight.
- Never place two solid semantic colours adjacent. Use one solid plus one subtle
  fill when two statuses must sit together.
- Never place `accent` and `warning` next to each other; they are both amber and
  become ambiguous.
- Solid fills are for primary buttons and small badges only. Large areas always
  use a subtle fill with a border.
- Never use pure black or a raw grey for large surfaces. The canvas is `ink50`
  and cards are pure white, which is what creates depth without shadows.

### 3.2 Typography

Family: Inter, loaded through `@expo-google-fonts/inter` (Expo Go compatible).
Fall back to the system font if loading fails. Money and metrics use tabular
figures so digits do not jitter when values animate.

| Token | Size / line | Weight | Used for |
|---|---|---|---|
| `display` | 32 / 38 | 700 | the one hero number on a screen (net income) |
| `h1` | 24 / 30 | 700 | screen titles |
| `h2` | 20 / 26 | 600 | section titles, card headers |
| `h3` | 17 / 24 | 600 | list row primary text, modal titles |
| `body` | 15 / 22 | 400 | default paragraph and field text |
| `bodyStrong` | 15 / 22 | 600 | emphasised inline text |
| `caption` | 13 / 18 | 400 | helper text, secondary row text |
| `micro` | 11 / 16 | 600 | chip labels, section eyebrows, letter-spacing 0.6, uppercase |

Rules
- `display` appears once per screen at most.
- Never mix more than three type tokens in one card.
- Numbers are always `fontVariant: ['tabular-nums']`. Verify on Android; if it
  is not honoured, use a fixed-width number font for money.
- Line length for prose stays under about 70 characters.

### 3.3 Spacing

A strict 4pt rhythm. No arbitrary values anywhere.

```
space2   2     space12  12     space24  24     space48  48
space4   4     space16  16     space32  32     space64  64
space8   8     space20  20     space40  40
```

| Token | Value | Applied to |
|---|---|---|
| `screenPadding` | 16 | horizontal screen gutter |
| `cardPadding` | 16 | inside a card |
| `sectionGap` | 24 | between sections |
| `rowGap` | 12 | between list rows |
| `inlineGap` | 8 | between an icon and its label |

### 3.4 Radius

| Token | Value | Applied to |
|---|---|---|
| `radiusSm` | 8 | chips, small badges, inner elements |
| `radiusMd` | 12 | inputs, buttons, list rows |
| `radiusLg` | 16 | cards, modals |
| `radiusXl` | 22 | bottom sheets, hero cards |
| `radiusPill` | 999 | avatars, filter pills, progress bars |

### 3.5 Elevation and shadow

Elevation is expressed as both an iOS shadow and an Android `elevation`. Depth
comes from elevation plus border plus surface colour together, never from a
shadow alone.

| Token | shadowOpacity | shadowRadius | shadowOffset | Android elevation | Used for |
|---|---|---|---|---|---|
| `e0` | — | — | — | 0 | flat rows, inputs, dividers |
| `e1` | 0.06 | 8 | {0, 2} | 2 | resting cards |
| `e2` | 0.08 | 12 | {0, 4} | 4 | raised cards, FAB, sticky header |
| `e3` | 0.10 | 20 | {0, 8} | 8 | bottom sheets, modals |
| `e4` | 0.14 | 28 | {0, 14} | 12 | popovers, dropdowns, toasts |

`shadowColor` is always `ink900` (#0F172A), never pure black — a black shadow on
a cool palette reads dirty.

Platform notes, all of which must be handled in the shared `elevation` helper:
- Android ignores `shadowColor` before API 28 and draws its own shadow from
  `elevation`, so the two platforms will not match exactly. Accept that; do not
  fake it with a second view.
- Android `elevation` only draws if the view has a `backgroundColor`. Every
  elevated component must set one.
- `overflow: 'hidden'` clips the iOS shadow. When a card needs both a shadow and
  a rounded clipping child, wrap the child instead of clipping the card.
- Never stack more than two elevation levels in one view hierarchy; it produces
  muddy grey edges.
- Dark mode is not in scope, so shadows are tuned for a light canvas only.

### 3.6 Motion

Durations
| Token | ms | Used for |
|---|---|---|
| `instant` | 90 | press-in feedback |
| `fast` | 140 | press release, chip toggle, colour change |
| `base` | 200 | sheet backdrop, modal, toast, progress |
| `slow` | 280 | list entrance, layout change, progress bar |
| `deliberate` | 380 | counter roll-up, success confirmation |

Easings, expressed for Reanimated
| Token | Value | Used for |
|---|---|---|
| `standard` | `Easing.bezier(0.2, 0, 0, 1)` | most state changes |
| `decelerate` | `Easing.bezier(0, 0, 0.2, 1)` | things entering |
| `accelerate` | `Easing.bezier(0.4, 0, 1, 1)` | things leaving |
| `spring` | `{ damping: 18, stiffness: 220, mass: 1 }` | sheets, selection, success |

Transforms
| Token | Value | Used for |
|---|---|---|
| `pressScaleButton` | 0.97 | buttons, icon buttons |
| `pressScaleCard` | 0.985 | interactive cards only |
| `enterOffsetY` | 12 | list item entrance |

Reduce motion
`AccessibilityInfo.isReduceMotionEnabled()` must be read once and exposed by the
theme. When it is on: every transform becomes an opacity-only fade, every
duration halves, springs become `standard`, and the counter roll-up renders its
final value immediately.

### 3.7 Iconography

`@expo/vector-icons` (bundled with Expo). One family only: Ionicons for
interface glyphs, with MaterialCommunityIcons permitted only for subject and
expense-category icons where Ionicons has no equivalent.

- Default size 20 inside buttons and rows, 24 for standalone navigation.
- Stroke-like outline style by default; filled only for a selected tab or an
  active filter.
- Icons never carry meaning alone. Any icon-only control needs an
  `accessibilityLabel`.
- Icon colour follows the text token of its context.

### 3.8 Illustration and imagery

- Built-in student avatars are shipped as assets: boy, girl and neutral, each in
  a circular frame with a tinted ring.
- Empty states use a simple two-tone line illustration drawn from the indigo and
  amber ramps, not a stock 3D render.
- Tutor profile photos are square-cropped to a circle with a 2px ring in
  `primaryBorder` when verified.
- No decorative photography, no gradient backgrounds, no texture overlays.

---

## 4. COMPONENT LIBRARY

Every primitive lives in `components/ui/` and is built only from tokens. A
screen must never define its own colours, spacing, radius or durations.

| Component | Variants | Notes |
|---|---|---|
| `Screen` | default, scroll, withHeader | safe area, canvas background, gutter |
| `Text` | all type tokens | the only way text is rendered |
| `Button` | primary, secondary, ghost, accent, destructive | 3 sizes, full state set |
| `IconButton` | plain, tonal | always has an accessibility label |
| `Card` | flat, raised, interactive, accent, premium | flat = border only, raised = e1 |
| `ListRow` | default, withAvatar, withChip, swipeable | leading visual + trailing chevron |
| `Chip` | filter, status, removable | filter chips are selectable |
| `Badge` | count, plan, dot | plan badge uses the premium tone |
| `TextField` | default, withIcon, multiline | label, helper, error, counter |
| `SelectField` | inline, sheet | opens a bottom sheet picker |
| `DateField` | date, dateRange, time | opens native pickers |
| `SwitchField` | default | row with label and description |
| `SegmentedControl` | 2–3 options | for rateType and similar toggles |
| `Avatar` | builtin, custom, group | ring states |
| `StatTile` | default, hero, withDelta | animated value, tabular figures |
| `ProgressBar` | determinate, quota | quota bar turns warning then danger |
| `EmptyState` | illustration + copy + CTA | never text only |
| `Skeleton` | line, card, list | gentle pulse, not a sweeping shimmer |
| `BottomSheet` | default, scrollable | spring in, backdrop fade |
| `Toast` | info, success, warning, danger | slides from top, auto-dismiss |
| `FAB` | single, extended | e2, for quick actions |
| `SectionHeader` | default, withAction | `micro` eyebrow style |

### 4.1 Button — full specification

Sizes
| Size | Height | Horizontal padding | Text | Icon |
|---|---|---|---|---|
| sm | 36 | 12 | caption, 600 | 16 |
| md | 48 | 16 | bodyStrong | 20 |
| lg | 56 | 20 | h3 | 22 |

Variants and states
| Variant | Rest | Pressed | Disabled | Loading |
|---|---|---|---|---|
| primary | bg `primary`, text `textOnPrimary`, e1 | bg `primaryPressed`, scale 0.97 | bg `primaryDisabled`, text white 70% | spinner replaces label, width locked |
| secondary | bg `surface`, border `borderDefault`, text `textPrimary` | bg `ink100`, border `borderStrong` | text `textHint`, border `borderSubtle` | spinner in `textPrimary` |
| ghost | transparent, text `primary` | bg `primarySubtle` | text `textHint` | spinner in `primary` |
| accent | bg `accent`, text `textOnAccent` | bg `accentPressed`, scale 0.97 | bg `accentBorder`, text `textOnAccent` 60% | spinner in `textOnAccent` |
| destructive | bg `danger`, text white | bg #B91C1C, scale 0.97 | bg `dangerBorder`, text white 70% | spinner in white |

Behaviour
- `onPressIn` fires at once: scale to `pressScaleButton` over `instant`, and a
  light haptic via `expo-haptics` for primary, accent and destructive only.
- `onPressOut`: scale back over `fast`.
- Loading locks width to the measured rest width so the layout does not jump.
- The whole button is the hit target, minimum 44pt tall even at `sm` via padding.
- Disabled buttons keep their shape and never drop below 3:1 contrast.
- RN has no `onclick`; the mapping is `onPress`, `onPressIn`, `onPressOut`,
  `onLongPress`. Long-press is reserved for destructive or bulk actions and must
  be paired with a confirm.

### 4.2 Card

- `flat`: white, `borderSubtle` 1px, no elevation. Default for dense lists.
- `raised`: white, `borderSubtle`, `e1`. Default for content cards.
- `interactive`: `raised` plus press feedback — scale 0.985 and bg `ink50`.
  Never use scale on full-width list rows; use the background change alone.
- `accent`: `accentSubtle` fill, `accentBorder`, used once per screen at most.
- `premium`: `premiumSubtle` fill with a `premiumBorder` and a violet eyebrow,
  used for Pro-only features and upgrade prompts.

### 4.3 Chip

- Filter chip, unselected: white, `borderDefault`, text `textSecondary`.
- Filter chip, selected: bg `primary`, text white, border `primary`, with a check
  glyph that springs from 0 to 1 and a background cross-fade over `fast`.
- Status chip: subtle fill plus matching border and text, with a leading icon.
- Removable chip: trailing close glyph, 44pt target, removal confirms if the
  action destroys data.
- Chips never wrap to more than two lines; overflow becomes a "+N" chip.

### 4.4 TextField

- Rest: `surface`, `borderDefault`, radius `radiusMd`, height 48.
- Focused: border `borderFocus` at 2px plus a 3px `primarySubtle` outer ring.
  This ring is the one place a focus affordance may be visually prominent.
- Error: border `danger`, helper text in `danger`, and a shake of 4px over
  `base` on submit failure.
- Disabled: `surfaceSunken`, text `textHint`.
- Always shows a label above, never a placeholder used as a label.
- Numeric fields (rates, amounts) use the numeric keypad and tabular figures.

### 4.5 StatTile

- Label in `micro` above, value below.
- `default`: value in `h2`. `hero`: value in `display` with tabular figures.
- `withDelta`: adds a small chip showing change, success tone for up and danger
  for down, with an arrow icon.
- Value animates from the previous value to the new one over `deliberate` when
  the screen mounts, and instantly when it updates in place.
- Currency always renders as `₱1,250.00` with the peso sign, thousands
  separators and two decimals, via `Intl.NumberFormat`.

---

## 5. INTERACTION STATES

Global rule: every interactive element must define rest, pressed, disabled and
loading where applicable, and must respond within 90ms of touch.

| State | Visual treatment | Motion |
|---|---|---|
| rest | token defaults | none |
| pressed | darker or tinted background, optional scale | `instant` in, `fast` out |
| selected | filled brand background plus a check glyph | spring on the glyph, `fast` on colour |
| focused | 2px `borderFocus` plus a subtle outer ring | `fast` |
| disabled | muted fill, muted text, no elevation | none |
| loading | inline spinner, size locked | spinner only |
| error | `danger` border and helper, optional shake | 4px shake over `base` |
| success | brief `success` tint or a check that springs in | spring |
| long-press | scale to 0.96 and a light haptic before the action sheet | `instant` |

Selection specifics
- Filter chip selection: fill cross-fade plus check glyph spring.
- Segmented control: the selected pill slides between segments over `base`
  `standard`; it does not cross-fade.
- Radio and checkbox rows: the tick draws in over `fast`; the row background
  tints `primarySubtle` while selected.
- Tab bar: the icon switches from outline to filled and scales 1 to 1.08 and
  back over `fast`; the label colour cross-fades. There is no sliding indicator
  on a five-tab bar because it becomes unreadable at that width.

Destructive actions
- Always `danger` tone, always a confirm step.
- Confirm buttons put the destructive action second, never in the primary slot.

---

## 6. MOTION CATALOGUE

| Moment | Animation | Duration | Easing |
|---|---|---|---|
| Any button press | scale to 0.97 and back | 90 / 140 | standard |
| Card press | scale 0.985 plus bg tint | 90 / 140 | standard |
| List row press | background tint only | 140 | standard |
| List entrance | opacity 0→1 and y 12→0, staggered 40ms | 280 | decelerate |
| Screen push | Expo Router stack default | platform | platform |
| Tab switch | cross-fade, no slide | 200 | standard |
| Bottom sheet open | translateY from 100% to 0, backdrop 0→0.45 | spring / 200 | spring / standard |
| Bottom sheet close | translateY to 100% | 200 | accelerate |
| Modal | scale 0.94→1 plus opacity | 200 | decelerate |
| Toast | slide from −12 to 0 plus opacity, auto-dismiss at 3s | 200 / 200 | decelerate / accelerate |
| Chip select | check glyph scale 0→1, colour cross-fade | spring / 140 | spring |
| Segmented control | selected pill slides | 200 | standard |
| Quota progress | width animate to new value | 280 | standard |
| Stat counter | value rolls from old to new | 380 | standard |
| Skeleton | opacity pulse 0.5↔1 | 1200 loop | sine |
| Statement generated | check scales in, `success` haptic | spring | spring |
| Swipe to reveal row actions | translateX follows finger, snaps past threshold | spring | spring |

Banned outright
- parallax or collapsing headers
- animated gradients or shimmer sweeps across cards
- confetti, particles, or celebratory bursts
- any looping decorative animation
- entrance animation on more than the first eight rows of a list
- motion on more than one element at a time per user action

---

## 7. SCREEN PATTERNS

List screen
`Screen` + `SectionHeader` + rows grouped in `Card`s of 8 or fewer, or a single
`flat` card with dividers for dense lists. Empty state replaces the list, it
does not sit above it.

Form screen
Single column, `TextField` stack with `inlineGap` between label and field and
`sectionGap` between groups. The primary action is pinned at the bottom in a
safe-area footer, never inline at the end of a long scroll.

Detail screen
Header with avatar or icon and title, a `StatTile` row for the money summary,
then a tabbed or sectioned body. Destructive actions live at the bottom,
separated by a divider and visually de-emphasised until pressed.

Dashboard
Greeting, then one `hero` StatTile for the month's earnings, then a row of
smaller tiles, then today's sessions, then quick actions as an `extended` FAB or
a 2x2 action grid. Never more than four tiles in one row.

Marketplace card
Avatar, name, verified badge, subject chips (maximum three plus "+N"), rate,
city, and a favourite affordance. The card is `raised` and `interactive`.

Empty state
Two-tone line illustration, a `h3` headline, a `caption` explanation, and one
primary action. Never a bare sentence.

---

## 8. ACCESSIBILITY

- Minimum touch target 44x44pt; 48pt for primary actions.
- Body text meets 4.5:1; large text and icons meet 3:1.
- Status is always icon plus label plus colour, never colour alone.
- `accessibilityLabel` on every icon-only control.
- `accessibilityRole` and `accessibilityState` set on buttons, switches, chips
  and tabs so screen readers announce selected and disabled correctly.
- Reduce-motion is honoured globally through the theme.
- Test at 130% font scaling; layouts must not clip. Where a fixed-height control
  would break, allow the height to grow rather than truncating text.
- Haptics are supplementary. No information is conveyed by haptics alone.

---

## 9. IMPLEMENTATION NOTES

Libraries, all of which must be verified against Expo SDK 57 at install time
rather than assumed:
- `react-native-reanimated` for all animation
- `react-native-gesture-handler` for swipe and sheet gestures
- `expo-haptics` for press and success feedback
- `expo-google-fonts/inter` for the typeface
- `@expo/vector-icons` for icons (already bundled)
- `expo-print` and `expo-sharing` for statements
- `react-native-safe-area-context` for screen insets

Blueprint rule 19 applies: confirm SDK 57 compatibility and justify each
dependency before adding it. If a library is not Expo Go compatible it does not
go in, and the feature is redesigned around one that is.

Project structure to add
```
theme/
  colors.ts        semantic tokens only
  typography.ts    type scale and families
  spacing.ts       4pt scale
  radius.ts
  elevation.ts     iOS shadow + Android elevation helper
  motion.ts        durations, easings, reduce-motion flag
  index.ts         single import surface
  ThemeProvider.tsx
  useTheme.ts

components/ui/     the primitive set in section 4
```

Theming approach
Light only for the MVP, but every token is named semantically. `useTheme()`
returns the token object, so adding a dark palette later is a second token set
plus a scheme check, with no changes to any component. Components must never
import a primitive colour directly.

---

## 10. ANTI-BLAND RULES

The specific habits that make an app look generic, and what we do instead:

1. Canvas is `ink50`, cards are white, borders are `borderSubtle`. Never a flat
   all-white screen.
2. Depth comes from border plus elevation plus surface contrast, layered
   together. Never a hairline border alone on a card.
3. Every list row has a leading visual — avatar, icon chip or coloured initial —
   and a trailing affordance. No bare text rows.
4. Every status is a chip with icon and label. No bare coloured words.
5. Money uses `display` or `h2` with tabular figures and semantic colour.
6. Section headers use the `micro` eyebrow style with letter-spacing. This one
   detail does more for perceived polish than any animation.
7. Amber appears at most twice per screen, so premium and trial moments land.
8. Exactly one primary button per screen. Everything else is secondary or ghost.
9. Empty states always get an illustration and an action.
10. Consistent 4pt rhythm throughout. Arbitrary spacing is the fastest way to
    look unfinished.
11. Press feedback on everything, within 90ms.
12. No more than three type tokens per card.

---

## 11. OUT OF SCOPE

Not in this plan, and not to be built during Phase 1:
- dark mode
- custom illustration beyond the empty-state set
- animated onboarding or a splash sequence
- tablet or landscape-specific layouts
- sound
- theme switching or white-labelling

---

## 12. PHASE 1 ACCEPTANCE CHECKLIST

Phase 1 is not complete until:
- [ ] `theme/` exists and every token above is defined
- [ ] `useTheme()` works and no component imports a raw hex value
- [ ] the primitives in section 4 exist with all documented states
- [ ] `Button` implements rest, pressed, disabled and loading for all five variants
- [ ] `TextField` implements rest, focused, error and disabled
- [ ] `Chip` implements unselected and selected with the check spring
- [ ] elevation renders correctly on both iOS and Android
- [ ] reduce-motion is respected and demonstrable
- [ ] one real screen (Tutor Home) is built with the kit as the reference
- [ ] a lint rule or review check prevents raw hex values in `components/` and `app/`
