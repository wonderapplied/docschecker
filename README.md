# 🔓 Unlocked

Connect a Google Doc, set a goal (words, sentences, or both), and write. Friends watch your
progress bar in the lobby, and when you hit the goal everyone gets pinged that you're ready to play.

Next.js 16 + Tailwind 4 · Auth.js (Google) · Google Docs API + Picker (`drive.file`) · Supabase
(Postgres + Realtime) · Discord webhook.

## How it works

- **Access:** sign-in asks only for `drive.file`, a non-sensitive scope. The app can read just
  the docs you pick in the Google Picker.
- **Counting** (`lib/count.ts`): `documents.get?includeTabsContent=true`, text from every tab's
  body (paragraphs and tables; headers, footers, footnotes and the table of contents are
  skipped). Words come from `Intl.Segmenter` word segments where `isWordLike` is true. Sentences come
  from the sentence segmenter, plus a fix-up pass that rejoins splits after titles like "Dr." and
  "Mr.", which ICU breaks on.
- **Progress** is current count minus the baseline taken when the session starts, so existing
  text doesn't count. It's a net count, so deleting removes progress. With both goals set you need both.
- **Polling:** the dashboard polls `/api/session/poll` every 45s while the tab is open. The server
  ignores polls less than 20s apart. Each poll stores a snapshot for the words-per-minute graph.
- **Anti-cheat** (`lib/anticheat.ts`):
  - *Paste:* a jump of 50+ words faster than 120 words/minute (the allowance grows with the gap
    between checks) doesn't count. The writer sees "Pasted 300 words, not counted"; friends only see the count.
  - *Junk:* over the words *added* this session, a unique/total ratio under 0.3 or one word over 20%,
    or more than 10% lorem-ipsum vocabulary, shows a note to the writer only.
- **Lobby:** the server writes a `lobby_status` row (numbers only, plus the doc title if you opt in).
  The browser subscribes over Supabase Realtime with a short-lived JWT minted by
  `/api/realtime-token`, and RLS limits rows to you and your friends. A writing card with no update
  for 2.5 minutes shows as Paused (the writer's tab is closed or hidden).
- **Unlock:** when you first hit the goal, `unlocked_at` is set, you get a full-screen celebration
  (time taken, streak, personal best), friends get a lobby banner with a Ping button, and your ping
  channel gets "@you unlocked in 1h 12m and is free. Hop on."
- **Discord:** "Connect Discord" (OAuth, `identify` scope) stores your Discord ID so pings @mention
  you. Each person sets a ping channel (a channel webhook URL) on /friends; `DISCORD_WEBHOOK_URL` is
  the fallback.

## Setup

### 1. Google Cloud
1. Create a project. Enable the **Google Docs API** and the **Google Picker API**.
2. Set up the OAuth consent screen (External). Add the scope `.../auth/drive.file`. While in
   testing, add your friends as test users.
3. Create an **OAuth client ID** (Web application):
   - Authorized JavaScript origins: `http://localhost:3000` and your production URL.
   - Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google` and the production equivalent.
4. Create an **API key** and restrict it to the Google Picker API and your site's referrers.
5. Note the **project number** (Dashboard → Project info). This is the Picker app ID.

### 2. Supabase
1. Create a project and run `supabase/schema.sql` in the SQL editor. It's safe to re-run; the
   end of the file adds the columns introduced after the first version.
2. Copy the project URL, the anon key, the service role key, and the **legacy JWT secret**
   (Project Settings → JWT Keys). The legacy secret signs the lobby's Realtime tokens.

### 3. Discord (optional)
1. Ping channel: in your server, open Channel → Edit → Integrations → Webhooks → New Webhook and copy
   the URL. Paste it on /friends (or set `DISCORD_WEBHOOK_URL` as a site-wide fallback).
2. Connect Discord button: create an app in the Discord Developer Portal, add the redirect
   `<NEXT_PUBLIC_SITE_URL>/api/discord/callback` under OAuth2, and set `DISCORD_CLIENT_ID` and
   `DISCORD_CLIENT_SECRET`.

### 4. Run
```bash
cp .env.example .env.local   # fill it in
npm install
npm run dev
```

### 5. Deploy
Push to Vercel, add the same env vars, and set `NEXT_PUBLIC_SITE_URL` to the production URL.

## Legal and age check
- `/privacy` and `/terms` read the operator name, contact email and governing state from
  `NEXT_PUBLIC_OPERATOR_NAME`, `NEXT_PUBLIC_CONTACT_EMAIL` and `NEXT_PUBLIC_GOVERNING_STATE`.
  They show `[BRACKETS]` until those are set. Every page links to both in the footer, which Google's
  OAuth review needs.
- Sign-in starts at `/start`: a neutral birth month/year question plus agreeing to the Terms,
  asked *before* Google sign-in so nothing is collected from under-13s. Under 13 sets a 30-day
  block cookie and stores nothing. The birth date is never stored; only `terms_accepted_at` and
  `terms_version` are.
- Bump `LEGAL.version` in `lib/legal.ts` when the Terms or Privacy Policy change materially;
  everyone is asked to agree again on their next page load.
- Friends → Account → Delete account removes the user (everything else cascades) and revokes
  the Google grant.
- The policy promises the session word tally is deleted when a session ends; `endSession` and
  `startSession` clear `baseline_freq`.

## Scripts
- `npm run dev` / `npm run build` / `npm start`
- `npm test` runs counting, anti-cheat, progress, formatting and age tests (Vitest).
- `npm run typecheck`

## Pages
| Path | What |
|---|---|
| `/` | Landing |
| `/start` | Age question + agree to Terms, then Google sign-in |
| `/privacy`, `/terms` | Privacy Policy and Terms of Service |
| `/dashboard` | Your active session (or the new-session form when there isn't one) |
| `/connect` | "New session": pick a doc, goal and deadline presets |
| `/lobby` | Friends' progress sorted by status, ready-to-play banner, pings |
| `/friends` | Invite link (copy, share, reset), friend list, Discord |
| `/invite/[code]` | Accepting an invite makes you mutual friends |

## Known limits
- Counting only runs while your dashboard tab is open. Background polling needs stored refresh
  tokens plus a job runner that fires every minute; Vercel Hobby cron only runs once a day.
- To find "words added", the server stores word *frequencies* (not text) from the session start. Friends never see them.

## Later
A weekly leaderboard, squad mode (unlock only when everyone's done), and a Chrome extension.
