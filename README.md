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
  - *Paste:* +300 words in one poll (scaled up when polls were far apart) flags `pasted?`.
    With `PASTE_MODE=discount`, those words also stop counting.
  - *Junk:* over the words *added* this session, a unique/total ratio under 0.3 or one word over 20% flags
    `repetitive`, and more than 10% lorem-ipsum vocabulary flags `lorem`.
- **Lobby:** the server writes a `lobby_status` row (numbers only, plus the doc title if you opt in).
  The browser subscribes over Supabase Realtime with a short-lived JWT minted by
  `/api/realtime-token`, and RLS limits rows to you and your friends.
- **Unlock:** when you first hit the goal, `unlocked_at` is set, friends in the lobby get a toast and
  a browser notification, and the Discord webhook posts "**Name** is free, hop on." (it @mentions you
  if you've saved your Discord ID on /friends).

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
1. Create a project and run `supabase/schema.sql` in the SQL editor.
2. Copy the project URL, the anon key, the service role key, and the **legacy JWT secret**
   (Project Settings → JWT Keys). The legacy secret signs the lobby's Realtime tokens.

### 3. Discord (optional)
In your server, open Channel → Edit → Integrations → Webhooks → New Webhook and copy the URL.

### 4. Run
```bash
cp .env.example .env.local   # fill it in
npm install
npm run dev
```

### 5. Deploy
Push to Vercel, add the same env vars, and set `NEXT_PUBLIC_SITE_URL` to the production URL.

## Scripts
- `npm run dev` / `npm run build` / `npm start`
- `npm test` runs counting, anti-cheat and progress tests (Vitest).
- `npm run typecheck`

## Pages
| Path | What |
|---|---|
| `/` | Sign in |
| `/dashboard` | Your active session, progress ring, per-goal bars, wpm graph |
| `/connect` | Pick a doc, set word/sentence goals and an optional deadline |
| `/lobby` | Live grid of friends' progress, unlock toasts and notifications |
| `/friends` | Invite link, friend list, Discord ID |
| `/invite/[code]` | Accepting an invite makes you mutual friends |

## Known limits
- Counting only runs while your dashboard tab is open. Background polling needs stored refresh
  tokens plus a job runner that fires every minute; Vercel Hobby cron only runs once a day.
- To find "words added", the server stores word *frequencies* (not text) from the session start. Friends never see them.

## Later
Streaks, a weekly leaderboard, squad mode (unlock only when everyone's done), and a Chrome extension.
