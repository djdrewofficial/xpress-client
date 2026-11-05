# Xpress Client — Developer Handoff

The couples/guests mobile app for Xpress Entertainment (Drew's South Florida wedding-DJ company). This document is the onboarding brief for the next developer. Everything here is confirmed from the code in this repo or from direct work on it; where something is a plan rather than shipped code it is labeled as such.

Repo: `djdrewofficial/xpress-client` · Local path on this Mac: `/Users/andrewsegura/xpress-client`

---

## 1. What the app is, who uses it, main screens & flows

A wedding-planning companion app. The DJ (staff) runs everything from the **XOS** web CRM; this app is what the **couple and their guests** use on their phones to plan the music and timeline for their event.

**Users / roles** (from `accounts.account_type`, surfaced via `useAuth().profile.accountType`):
- **client** — the couple. Full planning access to their event(s).
- **event_guest** — invited guests. Scoped, read/limited access (e.g. can view, some can answer/suggest).
- **staff** — DJs/admins. Land on an **Events list** and open any event into the same planner (used for preview/management).

**Accounts are invite-only** — there is **no in-app sign-up**. Staff provision accounts in XOS; the person gets an invite email → sets a password via a deep link. (Important for App Store review — see §6/§8.)

**Main screens** (file-based routes, see §3):
- `login` — email + password. "Forgot password" → in-app reset (email → code → new password). Invite links land on `auth/set-password`.
- `(app)/(tabs)` — the signed-in tab bar:
  - **Plan** (`(plan)/index.tsx`) — home. Hero card (cover photo, welcome, event date, a **countdown**, overall **progress ring**), a "pick up where you left off" card, and category cards ("groups") that open into sections.
  - **Music** (`music.tsx`) — vibe/open-dancing playlists.
  - **Timeline** (`timeline.tsx`) — the couple's event timeline view.
  - **You** (`you.tsx`) — account: package/financials summary (when visible), team contacts, privacy policy link, AI disclosure, and **Delete account**.
- `(app)/events.tsx` — staff-only event list (couples don't see this; they use the inline event switcher when they have >1 event).
- `(app)/(tabs)/(plan)/group/[id].tsx` — a category's section list.
- `(app)/section/[id].tsx` — a single section: answer questions (autosave) + manage songs (add/search/import, must-play / do-not-play, notes).

**Core planning flow:** open a group → open a section → answer questions (saved automatically) and/or add songs via the **SongPicker** (catalog search, "For You" AI recommendations, or paste a public Spotify/Apple Music playlist). Progress rings fill as you go. A first-run **OnboardingTour** walks new users through it.

---

## 2. Tech stack

- **Expo SDK 54** (`expo ~54.0.36`), **React Native 0.81.5**, **React 19.1.0**. **New Architecture enabled** (`newArchEnabled: true`).
- **Navigation:** `expo-router ~6.0.24` (file-based routing; `main` = `expo-router/entry`). Tabs + stacks via route groups.
- **State management:** React Context — no Redux/Zustand. Two key providers:
  - `useAuth()` from `@/lib/auth` — `profile`, `session`, `signOut`.
  - `useEvent()` from `@/lib/events` — current `event` (id/name/event_date/cover/venue_id/package_id), `events`, `selectEvent`, `reload`.
  - Persistence via `@react-native-async-storage/async-storage` (selected event per user, "onboarding seen" flag).
- **Styling:** React Native `StyleSheet` + a custom theme in `@/lib/theme` (`Brand`, `Colors`, `Space`, `Radius`, `Shadow`, `Fonts`). Colors are consumed through `useC()` (from `@/components/ui`), which resolves light/dark via `useColorScheme`. `userInterfaceStyle: automatic`, portrait only.
- **Fonts:** DM Serif Display (display/headlines) + Montserrat (UI/body), via `@expo-google-fonts/*`. A `fontPatch` maps `fontWeight` → the right Montserrat family.
- **Key libraries:** `@supabase/supabase-js`, `expo-audio` (song previews), `expo-image`, `expo-blur`, `expo-linear-gradient`, `expo-image-picker` (cover photo), `expo-document-picker`, `react-native-reanimated ~4` + `react-native-worklets`, `react-native-gesture-handler`, `react-native-reorderable-list` (section reordering), `react-native-svg` (progress rings), `react-native-keyboard-controller`, `react-native-safe-area-context`, `expo-updates` (OTA), `expo-dev-client`.
- **Language/tooling:** TypeScript `~5.9.2`. Lint: `expo lint`. Type-check: `npx tsc --noEmit` (the standard verification step — see §7).

---

## 3. Folder structure

```
src/
  app/                         # expo-router routes (file = screen)
    _layout.tsx                # root stack; registers auth deep-link screens
    login.tsx
    auth/forgot-password.tsx
    auth/set-password.tsx      # invite / reset deep link: xpressclient://auth/set-password
    (app)/
      _layout.tsx              # signed-in gate + providers
      events.tsx               # staff event list
      section/[id].tsx         # section detail (questions + songs)
      (tabs)/
        _layout.tsx            # tab bar
        music.tsx
        timeline.tsx
        you.tsx                # account + delete-account + privacy
        (plan)/
          _layout.tsx
          index.tsx            # Plan home (hero, countdown, progress, groups)
          group/[id].tsx       # a category's sections
  components/                  # presentational + feature components
    AppHeader, Backdrop, BrandSplash, Logo, Countdown, OnboardingTour,
    SongPicker, SectionSongs, PhotoBoothSection, VendorTeam, EventSwitcher,
    AddSectionSheet, InvitePersonSheet, TimePickerSheet, SocialPrompt,
    Encourager, MixtapeLoader, MovingBlobs, ProviderLogo, ui.tsx (useC, Ring, …)
  lib/                         # data + helpers (the "model" layer)
    supabase.ts                # supabase client
    auth.tsx                   # useAuth provider
    events.tsx                 # useEvent provider
    planning.ts                # loadOverview, sections/songs/answers CRUD, types
    api.ts                     # apiBase() / authHeader() for XOS /api/mobile/*
    account.ts, recommendations.ts, musicSearch.ts, spotify.ts,
    coverPhoto.ts, eventFiles.ts, people.ts, photobooth.ts, social.ts,
    vendors.ts, theme.ts, fontPatch.ts
  assets/                      # icon, logos, noise/texture, X-stroke art
app.json                       # Expo config (bundle id, permissions, updates)
eas.json                       # EAS build/submit profiles
.env.example                   # env var names (copy to .env)
```

**Where important logic lives:** almost all data access is in `src/lib/*`. `planning.ts` is the heart of it — `loadOverview(eventId)` returns the groups/sections + question/song counts that drive the Plan home and progress. UI composition lives in `src/components/*`; screens in `src/app/*` are thin and wire lib + components together.

---

## 4. Backend & data

- **Supabase** project `qjnzicqvzmvwryisjvip` (`*.supabase.co`). **This project serves both dev and prod** — there is no separate staging DB. Be careful with destructive queries.
- **XOS backend** — the Next.js CRM at `https://xos.xpressdjs.com` (repo `djdrewofficial/XOS` at `~/XOS`, auto-deploys to Netlify on push to `main`). The app calls its **mobile endpoints under `/api/mobile/*`** via `apiBase()` + `authHeader()` (`@/lib/api`). Those endpoints are public-by-path but **each self-verifies the Bearer JWT** and resolves the caller's event role (`resolveEventRole`) before doing anything; host/couple writes that RLS blocks are done server-side with the admin client after that check. Examples in use: `/api/mobile/planning/sections`, `/api/mobile/planning/addable-sections`, `/api/mobile/delete-account`, music search/preview/playlist-import.
- **Auth flow:** Supabase email/password (`supabase.auth.signInWithPassword`). **No social/OAuth login** (so Sign in with Apple is not required). Invite + reset flows set the password through the `xpressclient://auth/set-password` deep link; in-app forgot-password does email → code → new password. Session persists via AsyncStorage.
- **Account model:** an `accounts` row links a Supabase `auth_user_id` to a `client` or `event_guest` (or staff `employee`). `useEvent` resolves which event(s) the signed-in user can plan.
- **Account deletion:** `deleteAccount()` (`@/lib/account`) → `POST /api/mobile/delete-account`, which removes the `accounts` link row + the Supabase auth user (keeps the DJ's CRM data). Satisfies App Store Guideline 5.1.1(v).

**Environment variables (names only — Expo only exposes `EXPO_PUBLIC_*`):**
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_API_URL` — XOS base URL. Prod: `https://xos.xpressdjs.com`. On a physical device in dev, use the Mac's LAN IP (e.g. `http://192.168.x.x:3000`).

Values live in `.env` (gitignored; `.env.example` documents the keys) and are also set per-profile under `build.*.env` in `eas.json`. **Do not commit real values beyond what's already there; never put secrets in this doc or in client code.**

---

## 5. Run locally on this Mac (iOS simulator, live reload)

This app uses a **dev client** (`expo-dev-client`) + New Architecture, so it does **not** run in plain Expo Go — it needs the custom development build installed on the simulator.

**Normal day-to-day (dev client already installed on the iPhone simulator):**
1. `cd ~/xpress-client`
2. `npx expo start`  ← starts Metro (this is the "restart" command)
3. Open the iOS Simulator (iPhone 17 is the one used here) and launch the already-installed **Xpress Entertainment** dev build, or press `i` in the Metro terminal. It connects to Metro and Fast Refresh/live reload works on save.

Two-window workflow: Claude Code / editor in one window, the Simulator in the other. **Xcode stays closed** for normal work.

**First-time setup on a fresh machine (no dev build yet):** install deps with `npm install`, create `.env` from `.env.example`, then build+install the dev client once with either `npx expo run:ios` (local build — needs Xcode + CocoaPods installed) or `eas build --profile development -p ios` (cloud build, install the resulting app on the simulator/device). After that, step 2–3 above is all you need.

**Verify a simulator screenshot without tapping:** `xcrun simctl io booted screenshot /tmp/shot.png` (the Simulator here can't be driven by tapping via tooling — verify visually with screenshots).

**Common fixes:**
- Stale/weird Metro state → stop and `npx expo start -c` (clear cache).
- Env var change not picked up → restart Metro (env is inlined at bundle time).
- Native module / pod mismatch after dependency changes → rebuild the dev client (`npx expo run:ios`), not just a Metro restart.

---

## 6. Builds & releases

- **EAS** (`eas.json`), `appVersionSource: remote`. Profiles:
  - `development` — `developmentClient: true`, internal distribution, `development` channel.
  - `preview` — internal distribution, real device (`ios.simulator: false`), `preview` channel.
  - `production` — `autoIncrement: true`, `production` channel.
- **Bundle identifier:** `com.xpressentertainment.client` (iOS and Android). Expo `owner: drewsegura`, EAS `projectId: 6adaa737-a3a0-4d16-ad16-361a15fcab94`.
- **App Store Connect:** `submit.production.ios.ascAppId: 6788780432`.
- **OTA updates:** `expo-updates` against `u.expo.dev/6adaa737-...`, `runtimeVersion.policy: fingerprint`, `checkAutomatically: ON_LOAD`. JS-only changes can ship via `eas update` on the matching channel; native changes require a new build.
- **Versioning:** marketing `version` is `1.0.0` in `app.json`; build number auto-increments on production (`autoIncrement`). Bump `version` in `app.json` for a new marketing version.
- **Release path:** `eas build -p ios --profile production` → `eas submit -p ios --profile production` → TestFlight → App Store review. `ITSAppUsesNonExemptEncryption: false` is set (skips the export-compliance prompt).

**App Store review note (process, not code):** because login is invite-only with no self-sign-up, submissions **must** include working demo couple credentials in App Review Notes, pointed at a content-rich event. This is the most likely thing to stall review. (A full App Store readiness audit was done — the big code requirements are already satisfied: in-app account deletion, email/password auth, live privacy policy at `xos.xpressdjs.com/app-privacy`, photo-library purpose string, AI disclosure.)

---

## 7. Conventions & rules (always / never)

**Workflow:**
- **Work on a branch and open a PR — Drew merges.** Don't push to `main` directly.
- **Per-repo git identity:** `djdrewofficial` / `drew@xpressdjs.com` (global git on this Mac is a different identity, so set it per-repo).
- End commit messages with the agreed co-author trailer:
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
- **Verify with `npx tsc --noEmit`** in the repo before calling anything done. (Run it from the repo root; make sure cwd is `~/xpress-client`, not another repo.)
- **Read the current code before editing it** — don't trust a summary of what a file does.
- **The Simulator can't be tapped by tooling** — reach couple screens by temporarily auto-selecting/navigating in code, verify with `xcrun simctl io booted screenshot`, then **remove the temporary code** before finishing.

**Backend (XOS) rules that affect this app:**
- **DB migrations are numbered SQL** in `~/XOS/supabase/migrations/` (latest is `00153`; a `00154` is drafted — see §8). **Drew runs migrations manually** — hand him the next number + SQL, don't apply them.
- **Never run `next build` in `~/XOS`** (Drew usually has the dev server running). Verify XOS with `npx tsc --noEmit` only. Every push to XOS `main` auto-deploys via Netlify.

**Code patterns:**
- Colors via `useC()`; spacing/radius/shadow/fonts from `@/lib/theme` — don't hardcode hex or magic numbers when a token exists. Brand purple `#4b328e`, purpleLight `#8b6fd6`, red `#fe3a3b`.
- Current user via `useAuth()`, current event via `useEvent()`.
- Planning data via `@/lib/planning` (`loadOverview`, `addSong`, `saveAnswer`, section CRUD). Network to XOS via `apiBase()`/`authHeader()` in `@/lib/api`.
- Keep screens thin; put data/logic in `src/lib/*`, presentation in `src/components/*`.

---

## 8. Known state: uncommitted WIP, half-finished work, roadmap

**Uncommitted changes currently in the working tree** (branch `main`, nothing committed yet — these are intentional holds awaiting Drew's review/packaging into PRs):
- **Non-zero progress seed** — `src/lib/planning.ts` (`setupMilestones`, `blendedProgress`, `EventLite`/`StaffEvent` gain `venue_id`/`package_id`), `src/app/(app)/(tabs)/(plan)/index.tsx`, `src/app/(app)/events.tsx`. The Plan hero ring blends "booking milestones already done" (booked/date/venue) so a brand-new couple opens at ~15–25% instead of 0%, with "already on your way" copy. (An earlier "The Basics" checklist card for this was built and then **removed** at Drew's request — don't reintroduce it.)
- **Onboarding first-song step** — `src/components/OnboardingTour.tsx`. Adds a "Make it real" slide that opens the real `SongPicker` targeting the open dance-floor playlist (resolves `Open Dancing Music` / `Dancing`), marks the added song must-play, and ends on a celebration slide. (Originally targeted "First Dance"; Drew asked to use the dancing playlist instead.)
- **Living countdown** — `src/components/Countdown.tsx` (new) + wired into the Plan hero. Replaces the old "N days to go" pill; frames a specific future moment and shifts tone by proximity (far = "dream big", mid = "let's shape the night", final week = "final magical touches", day-of = celebratory).
- **`src/lib/account.ts`** — a financials-visibility change (uses a Supabase RPC `event_financials_hidden` to decide `hidden`, falling back to per-event override → event type). This was already in the tree, separate from the three features above.

A **"Weekly single-focus card + streak"** feature was built in this area and then **fully removed** at Drew's request (including a `pickWeeklyFocus` ladder and `mustPlayCount` on `loadOverview`). Don't resurrect it unless asked.

**Next planned build — "Personalized timelines" (confirmed design, not yet built):**
The problem: XOS templates seed *every* section onto every event, so the plan assumes all couples do grandparent/parent entrances, parent dances, cake cutting, etc. The agreed fix is an **opt-in confirmation** model:
- **Migration `00154_optional_sections.sql`** is drafted in `~/XOS/supabase/migrations/` (Drew to run): adds `planning_template_sections.optional`, `planning_sections.optional`, and `planning_sections.included` (tri-state: `true`=yes/show+count, `false`=no/hidden-from-couple but DJ sees "not doing this", `null`=undecided). Grandfathers existing events to `included = true`; flags the usual optional moments on templates by title.
- Still to build (both repos): `seedFromTemplate` seeds optional sections as `included = null`; a mobile `set_included` endpoint action; a Template Builder "optional" toggle; a couple-facing **"Personalize your timeline"** triage (Yes / No / Not sure); an **"Add a moment"** tray; and filtering so Plan progress, Timeline, and Music only count `included` sections while the staff planner shows the tri-state.

**Other roadmap / context:**
- **Spotify is being retired** (hit the 250k MAU cap); **Apple Music is the intended replacement** for search/preview/playlist-import. The "From a playlist" tab in `SongPicker` still accepts Spotify links — make sure that path works (or lead with Apple Music) before an App Store submission so it doesn't look broken.
- App Store audit follow-ups to decide: Spotify import error-hardening; whether to keep `supportsTablet: true` (reviewers test iPad) or set it false.

---

## 9. Gotchas (things that bit us, and the fix)

- **Wrong-directory `tsc`.** Running `npx tsc` without the right cwd can grab a bogus global `tsc` package or type-check the *other* repo. Always `cd ~/xpress-client` (or `~/XOS`) first, or run `node_modules/.bin/tsc --noEmit`.
- **Nested modals.** `SongPicker` is a full-screen `Modal`; it's opened from inside the `OnboardingTour` (also a `Modal`). Nesting works on iOS, but a `Modal` rendered by a screen *below* a pushed native-stack screen won't appear over the pushed screen — keep that in mind when verifying.
- **Simulator not tappable by tools.** Verify couple-facing screens with temporary code + `xcrun simctl io booted screenshot`, then strip the temp code. Leftover auto-navigate/auto-select hooks will hijack the app on the next launch.
- **Shared dev+prod Supabase.** `qjnzicqvzmvwryisjvip` is the real production DB. No staging buffer — don't run destructive SQL casually; migrations are additive and Drew-run.
- **Env is inlined at bundle time.** Changing `.env` requires a Metro restart; it won't hot-reload.
- **Mobile endpoints look public but aren't.** `/api/mobile/*` is exempt from XOS's login-wall by path, but each route verifies the JWT and event role itself — don't assume "public route" means "no auth" when adding endpoints.
- **Section intent is inferred from titles.** E.g. "do not play" detection and the dance-playlist targeting match on section *title* text. Title changes in templates can shift that behavior — prefer explicit flags where possible (this is part of why the `00154` optional-section work adds real flags).

---

*Primary contacts/paths:* app `~/xpress-client` · backend `~/XOS` · Supabase `qjnzicqvzmvwryisjvip` · XOS prod `https://xos.xpressdjs.com`.
