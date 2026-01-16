# Word Familiarity System Design

> Sprint 4 - Learning tracking foundation for nihao.ml

## Overview

Track user's familiarity with Chinese characters using a simple 1-5 scale. Color-code transcript to show learning progress at a glance.

## Decisions

| Decision            | Choice                | Rationale                                 |
| ------------------- | --------------------- | ----------------------------------------- |
| Familiarity vs FSRS | Familiarity only      | Keep simple until flashcard review exists |
| Save behavior       | Explicit save         | No accidental saves from curiosity clicks |
| Tracking unit       | Characters only       | Matches existing model, words come later  |
| API design          | Single upsert + batch | Simple with bulk support                  |
| Data loading        | Hybrid server+client  | No flash of unstyled content              |

---

## Data Model

Add `familiarity` field to existing `UserCharacter` model:

```prisma
model UserCharacter {
  id           String   @id @default(cuid())
  user_id      String
  character_id String   // The Chinese character (e.g., "好")
  familiarity  Int      @default(1) // 1-4 = learning, 5 = known
  created_at   DateTime @default(now())
  updated_at   DateTime @updatedAt

  user      User      @relation(fields: [user_id], references: [id])
  character Character @relation(fields: [character_id], references: [id])

  @@unique([user_id, character_id])
}
```

### Familiarity Levels

| Value | Meaning      | Transcript Color |
| ----- | ------------ | ---------------- |
| null  | Never saved  | Blue (new)       |
| 1     | Just saved   | Yellow           |
| 2     | Recognized   | Yellow           |
| 3     | Familiar     | Yellow           |
| 4     | Almost known | Yellow           |
| 5     | Known        | No highlight     |

Existing FSRS fields remain untouched for future flashcard scheduling.

---

## API Endpoints

### POST `/api/user-character`

Save or update familiarity (upsert).

```typescript
// Single character
{ character: "好", familiarity: 3 }

// Batch
{ characters: [
  { character: "好", familiarity: 5 },
  { character: "你", familiarity: 5 }
]}

// Response
{ success: true, updated: ["好", "你"] }
```

- Requires authentication (401 if not logged in)
- Creates record if new, updates if exists

### GET `/api/user-characters`

Fetch familiarity for characters.

```typescript
// Request
GET /api/user-characters?chars=你好世界

// Response
{
  "你": { familiarity: 3, updated_at: "2026-01-15T..." },
  "好": { familiarity: 5, updated_at: "2026-01-14T..." }
}
```

- Characters not in response = new (user hasn't saved)
- Returns `{}` if not logged in (all characters treated as new)

---

## Video Page Data Flow

### Server-side Load

```typescript
// video/[slug]/+page.server.ts
const video = await getVideo(params.slug);
const transcript = video.transcript;

const uniqueChars = getUniqueChineseChars(transcript);

let userFamiliarity = {};
if (locals.user) {
	userFamiliarity = await getUserCharacters(locals.user.id, uniqueChars);
}

return { video, transcript, userFamiliarity };
```

### Client-side State

```svelte
<script>
	let { data } = $props();
	let familiarity_map = $state(data.userFamiliarity);

	async function updateFamiliarity(char, level) {
		await fetch('/api/user-character', {
			method: 'POST',
			body: JSON.stringify({ character: char, familiarity: level })
		});
		familiarity_map[char] = { familiarity: level };
	}
</script>
```

### Character State Logic

```typescript
function getCharState(char: string): 'new' | 'learning' | 'known' {
	const record = familiarity_map[char];
	if (!record) return 'new';
	if (record.familiarity === 5) return 'known';
	return 'learning';
}
```

---

## Colored Transcript

### Component

```svelte
{#each splitChineseText(line.text) as { char, isClickable }}
	{#if isClickable}
		<span
			class="char"
			class:new={getCharState(char) === 'new'}
			class:learning={getCharState(char) === 'learning'}
			onclick={() => openSidebar(char)}
		>
			{char}
		</span>
	{:else}
		{char}
	{/if}
{/each}
```

### CSS

```css
.char {
	cursor: pointer;
	padding: 0 1px;
	border-radius: 2px;
	transition: background 0.15s;
}

.char.new {
	background: hsl(210, 100%, 85%); /* light blue */
}

.char.learning {
	background: hsl(45, 100%, 75%); /* light yellow */
}

.char:hover {
	filter: brightness(0.95);
}
```

---

## Character Sidebar

Replaces current `CharacterPopup.svelte`. Slides in from right.

```
┌─────────────────────────────┐
│  ✕                          │
│                             │
│         好                  │
│        hǎo                  │
│                             │
│  good, well, fine           │
│                             │
│  ┌─────┐                    │
│  │HSK 1│  部首: 女  笔画: 6  │
│  └─────┘                    │
│                             │
│  ─────────────────────────  │
│                             │
│  How well do you know this? │
│                             │
│  [1] [2] [3] [4] [✓]        │
│                             │
└─────────────────────────────┘
```

### Behavior

- Opens on character click
- Closes on ✕, `Escape`, or click outside
- If not logged in: hide familiarity buttons, show "Log in to track"
- If saved: highlight current familiarity level
- Clicking button saves immediately, updates transcript colors

### File

`src/lib/chinese/CharacterSidebar.svelte`

---

## Out of Scope

| Feature              | Reason                            |
| -------------------- | --------------------------------- |
| Per-video word stats | Add after core works              |
| "Mark all as known"  | Add after single-save works       |
| FSRS integration     | Not needed until flashcard review |
| Audio pronunciation  | Requires TTS setup                |
| Personal notes       | Future enhancement                |
| Word-level tracking  | Characters first                  |

---

## Files to Create/Modify

| File                                             | Action                       |
| ------------------------------------------------ | ---------------------------- |
| `prisma/schema.prisma`                           | Add familiarity field        |
| `src/routes/api/user-character/+server.ts`       | New POST endpoint            |
| `src/routes/api/user-characters/+server.ts`      | New GET endpoint             |
| `src/lib/chinese/CharacterSidebar.svelte`        | New component                |
| `src/routes/(site)/video/[slug]/+page.server.ts` | Load user familiarity        |
| `src/routes/(site)/video/[slug]/+page.svelte`    | Colored transcript + sidebar |
| `src/lib/chinese/CharacterPopup.svelte`          | Delete after sidebar works   |
