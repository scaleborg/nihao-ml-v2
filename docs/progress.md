# nihao.ml Progress

> Implementation progress for [PRODUCT.md](../PRODUCT.md) Phase 1 (Core Study Experience)

## Status

| Sprint | Description                                            | Status  |
| ------ | ------------------------------------------------------ | ------- |
| 1      | Playback controls (keyboard, speed, loop, auto-pause)  | Done    |
| 2      | UI polish (control bar, visual feedback)               | Skipped |
| 3      | Character popup (click word → pinyin, definition, HSK) | Done    |
| 4      | Word Familiarity System (LingQ-inspired)               | Done    |
| 5      | Progress & Gamification                                | Next    |

---

## Done

### Sprint 1: Playback Controls

**Shipped:** Keyboard shortcuts, speed control, loop mode, auto-pause

| Feature            | Implementation                  |
| ------------------ | ------------------------------- |
| Play/pause         | `Space` key                     |
| Previous/next line | `A` / `S` keys                  |
| Repeat line        | `R` key                         |
| Seek ±5s           | `←` / `→` arrows                |
| Speed control      | `[` / `]` keys, 0.5x-2x         |
| Loop mode          | `L` key - replay current line   |
| Auto-pause         | `P` key - pause after each line |
| Help dialog        | `?` key                         |

**Files:** `src/routes/(site)/video/[slug]/+page.svelte`

---

### Sprint 3: Character Popup

**Shipped:** Click any Chinese character → popup with pinyin, definition, HSK level

| Feature         | Implementation                                                  |
| --------------- | --------------------------------------------------------------- |
| Click character | Shows popup below character                                     |
| Popup content   | Character, pinyin, definition, HSK badge, radical, stroke count |
| Close           | Click outside or `Escape`                                       |
| Caching         | Client-side Map, no repeat API calls                            |
| API             | `GET /api/character/[char]`                                     |

**Files:**

- `src/routes/api/character/[char]/+server.ts` - API endpoint
- `src/lib/chinese/CharacterPopup.svelte` - Popup component
- `src/routes/(site)/video/[slug]/+page.svelte` - Click handling

---

### Sprint 4: Word Familiarity System

**Shipped:** Character familiarity tracking, colored transcript, sidebar with save

| Feature              | Implementation                                      |
| -------------------- | --------------------------------------------------- |
| Familiarity levels   | 1-4 (learning) + 5 (known), stored in DB            |
| Colored transcript   | Blue (new), Yellow (learning), No highlight (known) |
| Character sidebar    | Slide-in panel with familiarity buttons (1-4 + ✓)   |
| Per-video word stats | Shows New/Learning/Known counts above transcript    |
| Mark all as known    | Bulk action with confirmation                       |
| Keyboard shortcuts   | Press 1-5 in sidebar to set familiarity             |

**Files:**

- `src/lib/chinese/CharacterSidebar.svelte` - Sidebar component
- `src/lib/chinese/WordStats.svelte` - Stats display
- `src/routes/api/user-character/+server.ts` - Save familiarity
- `src/routes/api/user-characters/+server.ts` - Batch lookup
- `src/routes/api/user-characters/bulk/+server.ts` - Bulk save
- `src/routes/(site)/video/[slug]/+page.svelte` - Colored transcript

---

## Next

### Sprint 5: Progress & Gamification

**Goal:** Track user's knowledge of each word, color-code transcript accordingly

---

#### 4.1 Word State Model

**Database:** Uses existing `UserCharacter` model with FSRS fields

| State    | Color           | Database condition             | Meaning                  |
| -------- | --------------- | ------------------------------ | ------------------------ |
| New      | 🔵 Blue bg      | No `UserCharacter` record      | Never seen               |
| Learning | 🟡 Yellow bg    | Has record, `state` in (0,1,3) | Saved, actively studying |
| Known    | ⬜ No highlight | Has record, `state` = 2        | In review (mastered)     |

**Existing schema:**

```prisma
model UserCharacter {
  state Int @default(0) // 0=new, 1=learning, 2=review, 3=relearning
  // ... FSRS fields (stability, difficulty, next_review, etc.)
}
```

**Schema addition needed:** Add `familiarity` for manual 1-5 rating (separate from FSRS):

```prisma
familiarity Int @default(1) // 1-4 = learning levels, 5 = known
```

---

#### 4.2 Colored Transcript

**Behavior:**

- Fetch user's `UserCharacter` records for all unique characters in video
- Color each character based on state:
  - No record → blue (new)
  - Has record, not in review state → yellow (learning)
  - In review state (or has `familiarity=5`) → no highlight (known)

**Implementation:**

```svelte
<!-- In transcript line -->
{#each characters as char}
	<span class="char" class:new={!userKnows(char)} class:learning={isLearning(char)}>
		{char}
	</span>
{/each}
```

**CSS:**

```css
.char.new {
	background: var(--blue-100);
}
.char.learning {
	background: var(--yellow-100);
}
/* known = no special styling */
```

**Files:** `src/routes/(site)/video/[slug]/+page.svelte`

---

#### 4.3 Enhanced Character Sidebar

**Replace popup with slide-in sidebar panel:**

| Section         | Content                                 |
| --------------- | --------------------------------------- |
| Header          | Character (large), pinyin, audio button |
| Definition      | From `Character` table                  |
| HSK Badge       | Level 1-6 colored badge                 |
| Metadata        | Radical, stroke count                   |
| **Familiarity** | Buttons: `1` `2` `3` `4` `✓`            |
| Notes           | User's personal notes (future)          |

**Save action:**

- Click character → sidebar opens
- Click familiarity button → creates/updates `UserCharacter`
- Character in transcript updates color immediately

**Files:**

- `src/lib/chinese/CharacterSidebar.svelte` (new)
- `src/routes/api/user-character/+server.ts` (new - POST to save)

---

#### 4.4 Per-Video Word Stats

**Show in video header:**

```
迈克是个厨师
New: 58  |  Learning: 2  |  Known: 0
```

**Implementation:**

- On page load, fetch user's `UserCharacter` for all unique chars in transcript
- Count: new (no record), learning (1-4), known (5)
- Display above transcript

**API:** Batch lookup endpoint `GET /api/user-characters?chars=迈克是个厨师...`

---

#### 4.5 Mark All as Known

**Quick action button:** "Mark page as known"

- Bulk-creates `UserCharacter` records with familiarity=5
- Useful for advanced learners to skip basic content

---

### Sprint 4 Scope (MVP)

| Feature                         | Priority | Complexity           |
| ------------------------------- | -------- | -------------------- |
| 4.2 Colored transcript          | P0       | Medium               |
| 4.3 Character sidebar with save | P0       | Medium               |
| 4.4 Per-video word stats        | P1       | Low                  |
| 4.1 Word state model            | P0       | Done (schema exists) |
| 4.5 Mark all as known           | P2       | Low                  |

**Auth required:** Yes - features need logged-in user

---

### Sprint 5: Progress & Gamification (Future)

| Feature                  | Notes                                     |
| ------------------------ | ----------------------------------------- |
| Daily goal setting       | 10/20/40/60 min tiers                     |
| Streak tracking          | Consecutive days studied                  |
| Words learned counter    | Total known words                         |
| Activity stats           | Words read, time listened, LingQs created |
| Review due notifications | FSRS-based reminders                      |

---

## LingQ Research

> Screenshots analyzed from LingQ Chinese learning interface (Jan 2026)

### Key Insights

| LingQ Feature                               | nihao.ml Priority | Notes                      |
| ------------------------------------------- | ----------------- | -------------------------- |
| Word familiarity colors (blue/yellow/white) | **High**          | Core differentiator        |
| Sidebar dictionary with save                | **High**          | Replaces current popup     |
| Per-video word stats                        | **High**          | Shows % new/learning/known |
| Familiarity scale (1-4 + ✓)                 | **Medium**        | Simple version first       |
| Daily goals + streaks                       | **Medium**        | Gamification               |
| Review/flashcards                           | **Low**           | Phase 2+                   |
| Browser extension import                    | **Low**           | We have admin import       |

### Word Color System (LingQ)

| Background | State    | Meaning           |
| ---------- | -------- | ----------------- |
| 🔵 Blue    | New      | Never encountered |
| 🟡 Yellow  | Learning | Saved, levels 1-4 |
| ⬜ White   | Known    | Mastered (✓)      |

### Familiarity Scale

```
🗑️  [1]  [2]  [3]  [4]  [✓]
     ↑                    ↑
  just saved          mastered
```

### Sidebar Dictionary Features

- Audio pronunciation (TTS)
- Pinyin
- Multiple dictionary sources (Baidu, Google Translate)
- Community translations
- Related phrases from corpus
- Personal notes
- Tags/labels
- Familiarity rating buttons

---

## Backlog

Ideas for future phases:

- [ ] Yabla-style segmented progress bar
- [ ] Side panel dictionary (instead of popup)
- [ ] Pitch-corrected slow-down
- [ ] Import own videos
- [ ] Spaced repetition review
- [ ] HSK level filtering
