# Xpress Entertainment — client app

The couple-facing iOS/Android planning app (Expo + expo-router + React Native).
Talks to the same Supabase as XOS; clients log in with their XOS portal account.

## Setup
```bash
npm install
cp .env.example .env   # fill EXPO_PUBLIC_SUPABASE_URL / _ANON_KEY (+ API_URL)
npx expo start
```
Press `i` for the iOS simulator, or scan the QR with Expo Go on your phone.

## What's here (first vertical)
- Login (Supabase email/password — same accounts as the XOS portal).
- Branded home: the couple's event, overall progress, "pick up where you left off", section list.
- Section screen: answer questions (autosaves to Supabase, with conditional-question logic) + view the section's songs.

## Next
- Music search / preview / Spotify import (call the XOS `/api/music/*` + `/api/spotify/*` endpoints with the user's Supabase token via `EXPO_PUBLIC_API_URL`).
- Vendor Team module, timeline, guided flow, tab bar.
