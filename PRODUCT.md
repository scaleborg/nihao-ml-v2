# nihao.ml — Product Vision & Specification

A Chinese learning platform built on real content. Watch videos, learn characters, track progress.

## Vision

**Target user:** Intermediate Mandarin learners (HSK 3-5) who understand basic grammar but need massive input exposure with deep character understanding.

**Core loop:** Import → Study → Review → Master

**Philosophy:**

- Real content over textbooks (YouTube, podcasts, articles)
- Deep understanding (radicals, etymology, stroke order — not just translation)
- Spaced repetition that works (FSRS algorithm)
- Multi-device (study on phone, review on desktop)

---

## Technology Stack

Built on Syntax.fm's production-grade architecture:

| Layer      | Technology                      |
| ---------- | ------------------------------- |
| Framework  | SvelteKit 2.x + Svelte 5        |
| Language   | TypeScript (strict)             |
| Database   | MySQL + Prisma ORM              |
| Cache      | Redis (Upstash)                 |
| Auth       | OAuth (GitHub, Google)          |
| Styling    | PostCSS + CSS custom properties |
| Deployment | Vercel (Node.js 22.x)           |
| Monitoring | Sentry                          |

### Key Libraries

| Purpose              | Library                                       |
| -------------------- | --------------------------------------------- |
| Chinese segmentation | `nodejieba` or `segmentit`                    |
| Pinyin generation    | `pinyin` (npm)                                |
| Character data       | `hanzi` + CC-CEDICT                           |
| Stroke order         | `hanzi-writer` (includes quiz mode)           |
| Audio processing     | FFmpeg WASM                                   |
| YouTube              | `ytdl-core` + IFrame API                      |
| Transcription        | Deepgram (Phase 4 — podcasts, custom uploads) |
| Search               | FlexSearch                                    |
| SRS algorithm        | Custom FSRS implementation                    |

---

## Data Model

### Core Entities

```prisma
model User {
  id            String   @id @default(cuid())
  email         String   @unique
  name          String?
  avatar        String?
  createdAt     DateTime @default(now())

  // Learning state
  characters    UserCharacter[]
  vocabulary    UserVocabulary[]
  studySessions StudySession[]
  videos        UserVideo[]
}

model Video {
  id           String   @id // YouTube video ID
  slug         String   @unique
  url          String
  title        String
  channelName  String?
  thumbnailUrl String?
  duration     Int?     // seconds

  transcript   Transcript?
  createdAt    DateTime @default(now())

  userVideos   UserVideo[]
}

model Transcript {
  id       String @id @default(cuid())
  videoId  String @unique
  video    Video  @relation(fields: [videoId], references: [id])

  lines    TranscriptLine[]
}

model TranscriptLine {
  id           String @id @default(cuid())
  transcriptId String
  transcript   Transcript @relation(fields: [transcriptId], references: [id])

  index        Int      // Line number
  startTime    Float    // seconds
  endTime      Float    // seconds
  text         String   // Chinese text
  pinyin       String?  // Generated pinyin

  @@index([transcriptId, index])
}

model Character {
  id            String @id // The character itself (e.g., "好")
  pinyin        String // Primary pronunciation
  pinyinAlt     String? // Alternative pronunciations
  definition    String // English definition
  hskLevel      Int?   // 1-6, null if not in HSK
  frequency     Int?   // Usage frequency rank
  radical       String? // Primary radical
  components    String? // JSON array of components
  strokeCount   Int?
  strokeOrder   String? // Stroke order data for animation

  userCharacters UserCharacter[]
}

model UserCharacter {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
  characterId String
  character   Character @relation(fields: [characterId], references: [id])

  // Familiarity (manual rating, separate from FSRS)
  familiarity Int      @default(1) // 1-4 = learning levels, 5 = known

  // FSRS state
  stability   Float    @default(0)
  difficulty  Float    @default(0)
  lastReview  DateTime?
  nextReview  DateTime?
  reps        Int      @default(0)
  lapses      Int      @default(0)
  state       Int      @default(0) // 0=new, 1=learning, 2=review, 3=relearning

  firstSeen   DateTime @default(now())

  @@unique([userId, characterId])
}

model UserVocabulary {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])

  word      String   // The word/phrase
  pinyin    String
  meaning   String?
  context   String?  // Source sentence
  videoId   String?  // Where they found it

  // FSRS state (same as UserCharacter)
  stability   Float    @default(0)
  difficulty  Float    @default(0)
  lastReview  DateTime?
  nextReview  DateTime?
  reps        Int      @default(0)
  state       Int      @default(0)

  createdAt DateTime @default(now())

  @@index([userId])
}

model UserVideo {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  videoId   String
  video     Video    @relation(fields: [videoId], references: [id])

  progress  Float    @default(0) // Playback position (seconds)
  completed Boolean  @default(false)
  addedAt   DateTime @default(now())

  @@unique([userId, videoId])
}

model StudySession {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])

  type      String   // "video", "review", "character"
  videoId   String?
  duration  Int      // seconds

  charsStudied Int   @default(0)
  wordsStudied Int   @default(0)

  createdAt DateTime @default(now())
}
```

---

## Routes

### Public Routes

| Route    | Purpose                                |
| -------- | -------------------------------------- |
| `/`      | Landing page — value prop, sign up CTA |
| `/login` | OAuth login (GitHub, Google)           |
| `/about` | About the app                          |

### Authenticated Routes

| Route                | Purpose                                   |
| -------------------- | ----------------------------------------- |
| `/dashboard`         | Library, progress overview, quick actions |
| `/study/[slug]`      | Study player for a video                  |
| `/review`            | SRS review session                        |
| `/characters`        | Character browser/dictionary              |
| `/characters/[char]` | Single character deep-dive                |
| `/vocabulary`        | User's saved vocabulary                   |
| `/settings`          | User preferences                          |
| `/import`            | Import new content                        |

### API Routes

| Route                    | Method | Purpose                   |
| ------------------------ | ------ | ------------------------- |
| `/api/videos`            | POST   | Import a YouTube video    |
| `/api/videos/[id]`       | GET    | Get video with transcript |
| `/api/characters/[char]` | GET    | Character lookup          |
| `/api/review/next`       | GET    | Get next review items     |
| `/api/review/grade`      | POST   | Submit review result      |
| `/api/progress`          | GET    | User's learning stats     |

---

## Features

### Phase 1: Core Study Experience

| Feature               | Description                                                   |
| --------------------- | ------------------------------------------------------------- |
| **Auth**              | OAuth login (GitHub, Google)                                  |
| **Video Import**      | Paste YouTube URL → extract captions → generate pinyin        |
| **Study Player**      | YouTube embed with synced transcript                          |
| **Click-to-seek**     | Click any line → video jumps to timestamp                     |
| **Pinyin Toggle**     | Show/hide pinyin under Chinese text                           |
| **Follow Along**      | Auto-scroll transcript with playback                          |
| **Word Familiarity**  | Color-code transcript: blue=new, yellow=learning, white=known |
| **Character Sidebar** | Click character → sidebar with definition, HSK, save button   |
| **Per-Video Stats**   | Show new/learning/known word counts for each video            |
| **Progress Tracking** | Track characters seen, time studied                           |

### Phase 2: Spaced Repetition

| Feature              | Description                                     |
| -------------------- | ----------------------------------------------- |
| **FSRS Algorithm**   | Spaced repetition for characters and vocabulary |
| **Review Session**   | Daily review of due items                       |
| **Character Cards**  | Show character → recall pinyin + meaning        |
| **Vocabulary Cards** | Show word in context → recall meaning           |
| **Stats Dashboard**  | Known vs learning vs new                        |

### Phase 3: Enhanced Study

| Feature                | Description                                        |
| ---------------------- | -------------------------------------------------- |
| **Audio Clips**        | Isolated sentence audio for shadowing              |
| **Stroke Quiz**        | Draw character, get feedback                       |
| **Related Characters** | Characters sharing radicals/components             |
| **Example Sentences**  | Sentences from user's library containing character |
| **Anki Export**        | Export vocabulary to Anki                          |

### Phase 4: Multi-Source Content

| Feature            | Description                           |
| ------------------ | ------------------------------------- |
| **Podcast Import** | RSS feed with transcripts             |
| **Article Reader** | Paste Chinese text, get same study UI |
| **Custom Upload**  | Upload video + SRT file               |
| **Bilibili**       | Support for Bilibili videos           |

### Phase 5: Social & Advanced

| Feature                | Description                  |
| ---------------------- | ---------------------------- |
| **Public Library**     | Share processed videos       |
| **Study Groups**       | Study with friends           |
| **Leaderboards**       | Optional competitive element |
| **Native Definitions** | French, Spanish, etc.        |

---

## User Flows

### 1. Import a Video

```
User pastes YouTube URL
  → System validates zh-Hans manual captions exist
  → System extracts captions (ytdl-core)
  → System generates pinyin for each line
  → System extracts unique characters
  → Video appears in user's library
  → User clicks to start studying
```

### 2. Study Session

```
User opens /study/[slug]
  → YouTube player loads
  → Transcript displays with pinyin (toggleable)
  → User clicks a line → video seeks
  → User clicks a character → panel shows details
  → System tracks characters seen (passive learning)
  → User can save words to vocabulary
  → Session duration tracked
```

### 3. Review Session

```
User opens /review
  → System fetches due items (FSRS)
  → Shows character card (front: character)
  → User recalls pinyin + meaning
  → User grades: Again / Hard / Good / Easy
  → System updates FSRS state
  → Next card or session complete
```

---

## Character Panel

When user clicks a character, show:

| Field             | Source                          |
| ----------------- | ------------------------------- |
| Character         | Clicked text                    |
| Pinyin + tone     | `pinyin` library                |
| Definition        | CC-CEDICT via `hanzi`           |
| HSK Level         | HSK wordlist                    |
| Radical           | `hanzi` decomposition           |
| Components        | `hanzi` decomposition           |
| Stroke Count      | Dictionary data                 |
| Stroke Order      | Animation data                  |
| Example Words     | Words containing this character |
| Example Sentences | From user's video library       |

---

## State Management

Use Svelte 5 runes with class-based stores:

```typescript
// src/state/player.svelte.ts
class PlayerState {
	videoId = $state<string | null>(null);
	currentTime = $state(0);
	isPlaying = $state(false);
	followAlong = $state(true);
	showPinyin = $state(true);

	seek(time: number) {
		/* ... */
	}
	togglePinyin() {
		this.showPinyin = !this.showPinyin;
	}
}
export const player = new PlayerState();

// src/state/character.svelte.ts
class CharacterPanelState {
	isOpen = $state(false);
	character = $state<string | null>(null);
	data = $state<CharacterData | null>(null);

	async open(char: string) {
		/* fetch and display */
	}
	close() {
		this.isOpen = false;
	}
}
export const characterPanel = new CharacterPanelState();
```

---

## Caching Strategy

Follow Syntax.fm's caching patterns:

| Data                 | Cache    | TTL |
| -------------------- | -------- | --- |
| Character dictionary | Redis    | 24h |
| Video metadata       | Redis    | 1h  |
| Transcript           | Redis    | 1h  |
| User progress        | No cache | -   |
| Review queue         | No cache | -   |

---

## File Structure

```
src/
├── routes/
│   ├── (marketing)/        # Public pages
│   │   ├── +page.svelte    # Landing
│   │   └── about/
│   ├── (app)/              # Authenticated app
│   │   ├── +layout.svelte  # App shell
│   │   ├── dashboard/
│   │   ├── study/[slug]/
│   │   ├── review/
│   │   ├── characters/
│   │   ├── vocabulary/
│   │   ├── import/
│   │   └── settings/
│   ├── login/
│   └── api/
│       ├── videos/
│       ├── characters/
│       ├── review/
│       └── progress/
├── lib/
│   ├── components/
│   │   ├── player/         # Video player
│   │   ├── transcript/     # Synced transcript
│   │   ├── character/      # Character panel
│   │   └── review/         # Review cards
│   └── types/
├── server/
│   ├── youtube/            # YouTube integration
│   ├── chinese/            # Pinyin, segmentation
│   ├── characters/         # Character lookup
│   ├── srs/                # FSRS algorithm
│   ├── cache/              # Redis caching
│   └── prisma-client.ts
├── state/                  # Svelte stores
└── styles/                 # CSS system
```

---

## Claude Code Tooling

### Skills (Slash Commands)

Use these during development:

| Skill       | When to Use                                      | Phase |
| ----------- | ------------------------------------------------ | ----- |
| `/chinese`  | Pinyin, segmentation, dictionary, character data | 1, 3  |
| `/srs`      | FSRS algorithm, scheduling, review logic         | 2     |
| `/frontend` | Svelte components, state, TypeScript             | All   |
| `/backend`  | Prisma, API routes, caching, auth                | All   |
| `/ux`       | Review UI flows, suggest improvements            | All   |
| `/ship`     | Production deployment workflow                   | All   |

### Agents (via Task Tool)

| Agent     | Purpose                         |
| --------- | ------------------------------- |
| `Explore` | Codebase exploration and search |
| `Plan`    | Design implementation plans     |
| `Bash`    | Command execution               |

### Hooks (Configured)

Project hooks in `.claude/settings.json`:

- **PostToolUse** (Write/Edit) → `pnpm format`
- **PreToolUse** (git commit/push) → `pnpm lint && pnpm check`

### When to Use What

| Task                            | Tool             |
| ------------------------------- | ---------------- |
| Implementing Chinese NLP        | `/chinese` skill |
| Implementing FSRS               | `/srs` skill     |
| Complex feature (player, panel) | Plan mode        |
| Exploring codebase              | `Explore` agent  |
| Before shipping                 | `/ship` skill    |

---

## Non-Goals

- **Language courses** — We provide tools, not curriculum
- **Grammar explanations** — Focus is on character/vocabulary acquisition
- **Speech recognition** — No pronunciation scoring (yet)
- **Auto-captions** — Blocked by default, quality too poor
- **Video downloads** — Only captions and clips

---

## Success Metrics

| Metric                      | Target                      |
| --------------------------- | --------------------------- |
| Characters learned per user | 500+ in first 3 months      |
| Daily active users          | Retention > 30% at day 30   |
| Review completion           | > 80% of due cards reviewed |
| Session length              | Average 15+ minutes         |

---

## QA Checklist

### Phase 1

- [ ] Can sign in with GitHub/Google
- [ ] Can import YouTube video with zh-Hans captions
- [ ] Study page loads with synced transcript
- [ ] Click line → video seeks to timestamp
- [ ] Click character → panel opens with data
- [ ] Pinyin toggle works
- [ ] Follow along scrolls transcript
- [ ] Progress (characters seen) is tracked
- [ ] Works on mobile Safari

### Phase 2

- [ ] Review page shows due cards
- [ ] Can grade cards (Again/Hard/Good/Easy)
- [ ] FSRS schedules next review correctly
- [ ] Stats show known/learning/new counts
- [ ] Streak tracking works
