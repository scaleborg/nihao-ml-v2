# Video Study Page UX Redesign

> Approved: 2026-01-17

## Problem

The current video page separates watching from collecting. Controls feel disconnected from the video. Full transcript is overwhelming. Character details open in a sidebar, breaking flow.

## Solution

Unify the learning experience: watch → control → collect in one vertical flow. Reduce transcript to 3 focused lines. Characters fly into a visible word pool.

## Layout

```
┌─────────────────────┬───────────────────────┐
│                     │                       │
│   VIDEO PLAYER      │   0:02 zuótiān...     │  ← prev (dimmed)
│   (16:9)            │                       │
│                     │   0:05 你好吗          │  ← CURRENT (bright)
├─────────────────────┤                       │
│ ▶ [speeds] Loop Pin │   0:08 wǒ hěn hǎo    │  ← next (dimmed)
├─────────────────────┤                       │
│ LEARNING (4)        │                       │
│ 你 好 我 是         │                       │
│ ┌─────────────────┐ │                       │
│ │ 你 nǐ you HSK1  │ │                       │
│ │ ○○○○● [Known]   │ │                       │
│ └─────────────────┘ │                       │
└─────────────────────┴───────────────────────┘
       ~40%                    ~60%
```

### Left Panel (top to bottom)

1. **Video player** — Fixed 16:9 aspect ratio
2. **Controls bar** — Dark theme (already built), includes ?, tooltips show shortcuts on hover
3. **Word pool** — Collected characters, expandable pills

### Right Panel

- **3 transcript lines only** — Previous, current, next
- Vertically centered
- Previous/next dimmed (opacity 0.4, 1.25rem)
- Current bright (opacity 1, 2rem, left accent)
- Click any line to seek

## Word Pool Behavior

### States

- **Collapsed pill** — Just character, colored by status (blue=new, yellow=learning)
- **Expanded** — Shows pinyin, definition, HSK level, familiarity selector
- Only ONE expanded at a time

### Interactions

- Click character in transcript → flies to pool, auto-expands
- Click pill in pool → toggle expand/collapse
- Click [Known] → character graduates (fades out)
- Familiarity dots (1-5) → click to set level

### Auto-add Rules

- New/learning characters → auto-add on click
- Known characters → just show details in pool (don't re-add)

### Graduation

- Characters stay in pool until marked "Known" (level 5)
- On graduation: glow green, float up, fade out
- Pool count decrements

## Animation Flow

### Character flies to pool (~400ms)

```
0ms    Click 你 in transcript
50ms   Ghost copy lifts, scales 1.2x
200ms  Ghost arcs leftward
350ms  Ghost lands in pool, shrinks to pill
400ms  Pool pulses, pill expands
```

- Original character in transcript changes color (blue → yellow)
- Use CSS transforms only (GPU accelerated)

### Character graduates

1. Glow green briefly
2. Float up and fade out
3. Pool count decrements

## Transcript Transitions

- When line advances: smooth slide animation
- Current slides up and dims
- Next slides to center and brightens
- ~200ms ease-out

## Keyboard Shortcuts

- Keep ? button in controls bar for full reference
- Add tooltips on hover (e.g., hover Loop → shows "L")
- No permanent hint bar

## Files to Change

| File                                          | Action                 |
| --------------------------------------------- | ---------------------- |
| `src/routes/(site)/video/[slug]/+page.svelte` | Major layout rewrite   |
| `src/lib/chinese/CharacterSidebar.svelte`     | Delete                 |
| `src/lib/chinese/WordStats.svelte`            | Delete                 |
| `src/lib/chinese/WordPool.svelte`             | Create (new component) |

## Out of Scope

- Mobile layout (future)
- Horizontal/theater mode (Phase 3)
- Spaced repetition integration
- Audio pronunciation on click
