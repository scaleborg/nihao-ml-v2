# YouTube Chinese Captions - Redesign

## Problem

Current implementation uses `yt-dlp` CLI tool which:

- Requires system binary installation
- **Does not work on Vercel serverless**
- Server-only approach fails when YouTube blocks datacenter IPs

## Solution

Hybrid client + server approach (ported from mandarin-maestro project):

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Client    │────▶│   Server    │────▶│  Database   │
│ (Browser)   │     │  (Vercel)   │     │  (Prisma)   │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │
      ▼                   ▼
 CORS Proxy          Fallbacks:
 (primary)           1. youtube-transcript npm
                     2. Innertube API
```

## Architecture

### Client-Side (`src/lib/youtube-captions.ts`)

Primary caption fetcher - browsers can access YouTube when servers can't.

- Fetch YouTube page via CORS proxy (`corsproxy.io`)
- Extract `ytInitialPlayerResponse` from page HTML
- Get caption tracks from `playerCaptionsTracklistRenderer`
- Select Chinese track (zh-Hans → zh-CN → zh-Hant → zh-TW → zh)
- Fetch and parse subtitle XML

### Server-Side (`src/server/video/captions.ts`)

Fallback when client-side fails.

**Strategy 1: `youtube-transcript` npm package**

```typescript
import { YoutubeTranscript } from 'youtube-transcript';
const entries = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'zh-Hans' });
```

**Strategy 2: Innertube API (YouTube internal player API)**

- Try multiple client configs: WEB, ANDROID, IOS, TV
- Different configs work better from different IP ranges

### Import Flow

1. User pastes YouTube URL in browser
2. Client fetches captions via CORS proxy
3. If success → pass subtitles to server with import request
4. If client fails → server tries fallback strategies
5. Store video + transcript in database

## Files to Change

| File                                             | Action                                                        |
| ------------------------------------------------ | ------------------------------------------------------------- |
| `src/lib/youtube-captions.ts`                    | **Create** - Client-side caption fetcher                      |
| `src/server/video/captions.ts`                   | **Rewrite** - Remove yt-dlp, add npm fallbacks                |
| `src/routes/(site)/admin/import/+page.svelte`    | **Update** - Add client-side fetch before submit              |
| `src/routes/(site)/admin/import/+page.server.ts` | **Update** - Accept client subtitles, use new captions module |
| `package.json`                                   | **Update** - Add `youtube-transcript` dependency              |

## Language Priority

```typescript
const CHINESE_LANGS = ['zh-Hans', 'zh-CN', 'zh-Hant', 'zh-TW', 'zh'];
```

## Dependencies

**Add:**

- `youtube-transcript` - npm package for server-side fetching

**Remove:**

- `yt-dlp` system dependency (not in package.json, but was required on server)

## Error Handling

- Client fetch fails → fall through to server
- Server fetch fails → return error to user with message "No Chinese captions available"
- Partial success → store what we got, flag video as incomplete
