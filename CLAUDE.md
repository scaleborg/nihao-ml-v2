# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**nihao.ml** — A Chinese learning platform built on real content. Watch videos, learn characters, track progress.

- **Product spec**: [PRODUCT.md](./PRODUCT.md) — Vision, data model, features (Phases 1-5)
- **Progress**: [docs/progress.md](./docs/progress.md) — Current implementation status (Sprints)

## Development Commands

### Core Commands

- `pnpm dev` - Start development server
- `pnpm build` - Build production application
- `pnpm check` - Run TypeScript type checking
- `pnpm lint` - Run prettier + eslint + stylelint
- `pnpm test` - Run Playwright tests
- `pnpm test:unit` - Run Vitest unit tests

### Database Commands

- `pnpm db:studio` - Open Prisma Studio GUI
- `pnpm db:generate` - Generate Prisma client
- `pnpm db:push` - Push schema changes to database
- `pnpm db:seed` - Seed database with test data
- `pnpm i-changed-the-schema` - Shortcut for push + generate after schema changes

## Technology Stack

| Layer      | Technology                       |
| ---------- | -------------------------------- |
| Framework  | SvelteKit 2.x + Svelte 5         |
| Language   | TypeScript (strict)              |
| Database   | MySQL + Prisma ORM (PlanetScale) |
| Cache      | Redis (Upstash)                  |
| Styling    | PostCSS + CSS custom properties  |
| Deployment | Vercel (Node.js 22.x)            |
| Monitoring | Sentry                           |

## Key Directory Structure

```
src/
├── routes/
│   ├── (site)/           # Main website layout
│   │   └── video/[slug]/ # Video study page
│   ├── (blank)/          # Clean layout for embeds
│   └── api/              # API endpoints
│       └── character/    # Character lookup API
├── lib/
│   └── chinese/          # Chinese-specific components
│       └── CharacterPopup.svelte
├── server/               # Server-side logic
│   └── prisma-client.ts
├── state/                # Svelte stores
├── styles/               # CSS with themes
├── actions/              # Svelte actions (click_outside, etc.)
└── utilities/            # Shared utilities
```

## Database Schema

Core models for Chinese learning:

| Model              | Purpose                                                        |
| ------------------ | -------------------------------------------------------------- |
| **Video**          | YouTube videos with metadata                                   |
| **Transcript**     | Synced transcript with lines                                   |
| **TranscriptLine** | Individual lines with timestamps, text, pinyin                 |
| **Character**      | Chinese characters with pinyin, definition, HSK level, radical |
| **UserCharacter**  | User's learning state per character (FSRS SRS)                 |
| **UserVocabulary** | Saved words/phrases                                            |
| **User**           | OAuth authentication                                           |

See full schema in [PRODUCT.md](./PRODUCT.md#data-model).

## Code Style and Conventions

### Naming Conventions

- **Components**: PascalCase for `.svelte` files (e.g., `CharacterPopup.svelte`)
- **Variables/Functions**: snake_case for variables, functions, and props
- **Constants**: UPPER_CASE for true constants only
- **Types**: PascalCase for TypeScript interfaces

### Svelte 5 Patterns

```typescript
// Reactive state
let show_pinyin = $state(true);
let current_line_index = $state(-1);

// Derived values
let { video } = $derived(data);

// Props
let { character, data, onclose }: Props = $props();

// Complex state with classes
class PlayerState {
	currentVideo = $state<Video | null>(null);
	isPlaying = $state(false);
}
```

### CSS Architecture

- CSS variables in `src/styles/variables.css`
- Use `bg` and `fg` convention for colors
- Custom media queries:
  ```css
  @custom-media --below-med (width < 700px);
  @custom-media --above-med (width > 700px);
  ```

## Key Features (Implemented)

### Video Study Page (`/video/[slug]`)

- YouTube IFrame API with 100ms polling for sync
- Transcript synced with video playback
- Click line to seek
- Auto-scroll to active line
- Pinyin toggle
- Line progress indicator

### Playback Controls (Sprint 1)

| Key       | Action                  |
| --------- | ----------------------- |
| `Space`   | Play/pause              |
| `A` / `S` | Previous/next line      |
| `R`       | Repeat current line     |
| `←` / `→` | Seek ±5s                |
| `[` / `]` | Speed down/up (0.5x-2x) |
| `L`       | Toggle loop mode        |
| `P`       | Toggle auto-pause       |
| `?`       | Show help               |
| `Escape`  | Close popup/dialog      |

### Character Popup (Sprint 3)

- Click any Chinese character → popup appears
- Shows: pinyin, definition, HSK level, radical, stroke count
- Client-side caching (no repeat API calls)
- API: `GET /api/character/[char]`

## Common Patterns

### Character Lookup

```typescript
// API endpoint: src/routes/api/character/[char]/+server.ts
const character = await prisma_client.character.findUnique({
	where: { id: char },
	select: {
		id: true,
		pinyin: true,
		definition: true,
		hsk_level: true,
		radical: true,
		stroke_count: true
	}
});
```

### Chinese Text Handling

```typescript
// Detect Chinese characters
const CHINESE_CHAR_REGEX = /[\u4e00-\u9fff]/;

// Split text into clickable/non-clickable chars
function splitChineseText(text: string) {
	return [...text].map((char) => ({
		char,
		isClickable: CHINESE_CHAR_REGEX.test(char)
	}));
}
```

### Component with Popup

```svelte
<script lang="ts">
	import { clickOutside } from '$actions/click_outside';

	let { character, onclose }: Props = $props();
</script>

<div use:clickOutside onclick-outside={onclose}>
	<!-- popup content -->
</div>
```

## Development Workflow

### Adding New Features

1. Check [PRODUCT.md](./PRODUCT.md) for the feature spec
2. Update [docs/progress.md](./docs/progress.md) with the sprint
3. Create components in `/src/lib/`
4. Add routes in `/src/routes/`
5. Run `pnpm check` before committing

### Database Changes

1. Modify `/prisma/schema.prisma`
2. Run `pnpm i-changed-the-schema`
3. Update seed data if needed

## Skills (Slash Commands)

| Command           | Purpose                                                    |
| ----------------- | ---------------------------------------------------------- |
| `/security-check` | Red-team pen-test: scan for vulnerabilities, suggest fixes |

## Planning Mode Policy

Always enter planning mode before implementing features that:

- Touch more than 2 files
- Have multiple valid approaches
- Add new functionality (not just bug fixes or small tweaks)

Skip planning mode for:

- Single-file fixes with obvious solutions
- Very specific user instructions
- Simple refactors or deletions
