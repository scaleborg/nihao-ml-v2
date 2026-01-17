# Control Bar Styling - Dark Mode

> Approved: 2026-01-17

## Goal

Style the transcript control bar to match nihao.ml brand. Dark mode aesthetic that flows from the video player.

## Design

### Base Colors

```css
.controls-bar {
	background: var(--black-9);
	border-top: 1px solid var(--black-7);
	color: var(--black-3);
}

.stats-bar {
	background: var(--black-8);
	border-bottom: 1px solid var(--black-7);
}
```

### Play State Indicator

- Paused: `--black-4`
- Playing: `--primary` (yellow)

### Speed Buttons

Segmented control style:

```css
.speed-buttons {
	background: var(--black-8);
	border-radius: 4px;
	padding: 2px;
	gap: 0;
}

.speed-btn {
	background: transparent;
	color: var(--black-4);
	border: none;
	font-family: var(--body-font-family); /* monospace */
}

.speed-btn:hover {
	background: var(--black-7);
	color: var(--white);
}

.speed-btn.active {
	background: var(--primary);
	color: var(--black-10);
}
```

### Toggle Buttons (Loop, Auto-pause, Pinyin)

Ghost button style, all three share same visual treatment:

```css
.toggle-btn {
	border: 1px solid var(--black-7);
	background: transparent;
	color: var(--black-4);
	font-family: var(--body-font-family);
}

.toggle-btn:hover {
	border-color: var(--black-5);
	color: var(--black-3);
}

.toggle-btn.active {
	border-color: var(--primary);
	color: var(--primary);
	background: color-mix(in srgb, var(--primary) 10%, transparent);
}
```

- Remove emojis from Loop/Auto-pause
- Convert Pinyin checkbox to toggle button

### Help Button

Circular ghost button:

```css
.help-btn {
	width: 24px;
	height: 24px;
	border-radius: 50%;
	border: 1px solid var(--black-7);
	background: transparent;
	color: var(--black-4);
}

.help-btn:hover {
	border-color: var(--primary);
	color: var(--primary);
}
```

## Visual Summary

```
┌──────────────────────────────────────────────────────────────────┐
│ ▶  [0.5x 0.75x 1x 1.25x 1.5x 2x]  │  Loop  Auto-pause  Pinyin  ? │  ← --black-9
├──────────────────────────────────────────────────────────────────┤
│ 58 new · 12 learning · 230 known              [Mark all known]   │  ← --black-8
├──────────────────────────────────────────────────────────────────┤
│ 0:05  nǐ hǎo                                                     │  ← light (unchanged)
│       你好                                                        │
```

## Files to Change

- `src/routes/(site)/video/[slug]/+page.svelte` - Control bar and stats bar styles
- `src/lib/chinese/WordStats.svelte` - Update colors for dark background

## Out of Scope

- Plyr player controls (already has yellow accent, fine as-is)
- Transcript line styling (stays light)
- Mobile layout
