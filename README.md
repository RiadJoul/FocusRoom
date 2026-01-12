# FocusRoom – Space‑Themed Deep Work Companion

FocusRoom is an iOS‑only focus app built with Expo and Supabase. It combines a space‑flight theme (2D map + 3D cockpit) with streaks, blocking distracting apps via Screen Time, and a task system designed for recurring missions.

This repo contains the full React Native client, Supabase integration, and Edge Functions used in production.

## Feature Overview

- Space‑flight focus sessions (2D map or 3D desk/cockpit view).
- Task lists with per‑list color/icon, recurring tasks, and day‑based views.
- App blocking during focus sessions using `react-native-device-activity` + Screen Time shields.
- Daily notification reminders and “trial ending soon” push via Supabase Edge Functions.
- Premium subscription via RevenueCat with a 7‑day yearly trial.
- Supabase‑backed analytics for focus sessions and simple Focus Health score.

## Tech Stack

- **App:** Expo Router, React Native, TypeScript, NativeWind.
- **Backend:** Supabase (Postgres, Auth, Edge Functions).
- **Billing:** RevenueCat (iOS only).
- **Notifications:** Expo Notifications + Supabase cron functions.
- **State:** Zustand stores for tasks, lists, sessions, and user.

## Running the App Locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Configure environment variables:

   Create a `.env` file (or use `app.config.ts` / `app.json` env) with:

   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_KEY` (anon key)
   - `EXPO_PUBLIC_REVENUECAT_APPLE_API_KEY`

3. Start the dev client:

   ```bash
   npx expo start
   ```

4. iOS:

   - Use `npx expo run:ios` to build the development client.
   - Make sure iOS native targets (main app + Screen Time extensions) have valid signing and App Group configured.

## Supabase Integration

- Client is initialized in `lib/supabase.ts` using the anon key and AsyncStorage for auth persistence.
- Core data models:
  - `tasks`, `lists`, `focus_sessions`, `users`.
- Stores:
  - `lib/stores/taskStore.ts` – fetch/add/update/delete tasks, create recurring tasks, call RPC `check_and_generate_recurring_tasks`.
  - `lib/stores/listStore.ts` – list CRUD.
  - `lib/stores/sessionStore.ts` – session logging + Focus Health stats.
- On startup (`app/_layout.tsx`), we:
  - Restore the Supabase session.
  - Fetch the `users` row and hydrate `useUserStore`.

### Performance Notes

- All queries are scoped by `user_id` and paginated via `order('created_at')`.
- Deleting a list now bulk‑deletes its tasks server‑side (`removeTasksByList`) instead of one delete per task.
- Heavy recurring‑task logic lives in a Supabase RPC; the client just triggers it and refreshes.

## RevenueCat & Premium

- RevenueCat is configured once in `app/_layout.tsx`, then `logIn(user.id)` is called when a Supabase user is known.
- Supabase is the source of truth for premium:
  - `users.is_premium`, `users.on_trial`, `users.trial_ends_at` are updated by a **RevenueCat → Supabase** webhook Edge Function.
  - Client reads `user.is_premium` for gating features.
- Premium sync helpers:
  - `lib/hooks/usePremiumStatus.ts` – update premium flag and local store.
  - `lib/hooks/usePremiumSync.ts` – optional client‑side sync with RevenueCat.

## Notifications & Cron

Supabase Edge Functions handle scheduled background work:

- **Daily motivation notification**
  - Reads `users` with `notification_enabled = true` and timezone/hour match.
  - Sends a single Expo push per user with motivational copy.

- **Trial‑ending reminder**
  - Reads `users` where `on_trial = true`, `is_premium = true` and `trial_ends_at` 12–36h from now.
  - Sends an Expo push: “Your FocusRoom Pro trial ends tomorrow…”.

All functions use the Supabase **service role key** only on the server; the client never sees it.

## iOS Screen Time Integration

- Uses `react-native-device-activity` to:
  - Request Screen Time / Family Controls permission.
  - Start a blocking session when focus mode begins.
- The shield UI is customized via:
  - A native ShieldConfiguration extension in `targets/ShieldConfiguration`.
  - `updateShield` call in `app/_layout.tsx` with app‑group logo.

## Development Notes

- Routing lives under `app/` using Expo Router.
- Focus session UI and 3D model:
  - `components/focus/FocusSessionScreen.tsx`
  - `components/focus/Space3DViewer.tsx`
- Task and list UI:
  - `components/home/*`
  - Home screen: `app/(tabs)/index.tsx`
  - Cockpit/stats/profile: `app/(tabs)/cockpit.tsx`

## Scripts

- `npm start` – Expo dev server.
- `npm run ios` – run on iOS via `expo run:ios`.
- `npm run android` – Android build (unused for production today).
- `npm run lint` – ESLint via Expo config.

## Scaling Checklist (Current Status)

- Optimized main Supabase queries for per‑user access; bulk delete implemented for list removal.
- Webhooks and cron functions do O(1) work per event and never expose service role keys to the client.
- Notifications are sent from background functions, not in hot user flows.
- For future growth:
  - Add/verify DB indexes on `{user_id, created_at}` for `tasks`, `lists`, and `focus_sessions`.
  - Batch Expo push sends in functions if the user base becomes very large.
  - Increase Supabase log retention + monitor function latency. 
