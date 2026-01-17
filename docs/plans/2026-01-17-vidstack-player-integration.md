# Vidstack Player Integration

**Date:** 2026-01-17
**Status:** Approved

## Overview

Replace the YouTube IFrame API with [Vidstack](https://github.com/vidstack/player) to get custom video controls that match nihao.ml's design. The video still streams from YouTube, but the player UI is ours.

## Why Vidstack

- **29.5k+ stars** on GitHub (Plyr) with Vidstack as its modern successor (3.3k stars)
- **Native Svelte 5 support** - no wrapper needed, hydration bugs fixed in Svelte 5
- **Works with SSR/SvelteKit** - no Shadow DOM
- **Custom controls** replace YouTube's native UI entirely
- **Cleaner API** - native events instead of polling, declarative props

## What Changes

| Before (YT IFrame)              | After (Vidstack)              |
| ------------------------------- | ----------------------------- |
| Manual script loading           | Import at build time          |
| Polling interval (100ms)        | Native `time-update` event    |
| `player.getCurrentTime()`       | `e.detail.currentTime`        |
| `player.seekTo(time, true)`     | `player.currentTime = time`   |
| `player.setPlaybackRate(speed)` | `player.playbackRate = speed` |
| YouTube's controls visible      | Custom controls               |

## What Stays the Same

- YouTube streams the video (no hosting costs)
- `updateCurrentLine()` function logic
- `seekToLine()` logic (just API call changes)
- `scrollToCurrentLine()`
- All keyboard handlers
- Character click handling
- Sidebar component

## Layout Options

### Option A: Enhanced Current Split (Phase 1-2)

Keep the 40/60 split layout but with custom Vidstack controls instead of YouTube's chrome.

### Option B: Theater Mode Toggle (Phase 3)

Add a toggle that switches from split view to full-width video with transcript below.

## Implementation Phases

### Phase 1: Swap YouTube IFrame → Vidstack

**Tasks:**

- [ ] Install `vidstack` package
- [ ] Replace `<div bind:this={player_container}>` with `<media-player>`
- [ ] Wire up existing functions to Vidstack's API:
  - `time-update` → `updateCurrentLine()`
  - `seekToLine()` → `player.currentTime = timestamp`
  - Speed controls → `player.playbackRate`
- [ ] Verify transcript sync still works
- [ ] Remove manual YouTube script loading

**Files changed:**

- `src/routes/(site)/video/[slug]/+page.svelte`
- `package.json`

### Phase 2: Custom Controls Styling

**Tasks:**

- [ ] Use Vidstack's default layout as starting point
- [ ] Match colors to `--primary` CSS variable
- [ ] Hide elements we don't need (share, YouTube logo)
- [ ] Keep: play/pause, seek bar, time display, fullscreen, speed

**Files changed:**

- `src/routes/(site)/video/[slug]/+page.svelte` (or new component)
- CSS additions for Vidstack overrides

### Phase 3: Theater Mode Toggle

**Tasks:**

- [ ] Add button in controls bar: Theater toggle
- [ ] Toggle class that changes grid from `40% 60%` → `100%`
- [ ] Transcript slides below or collapses to overlay
- [ ] Persist preference in localStorage

**Files changed:**

- `src/routes/(site)/video/[slug]/+page.svelte`
- ~50 lines CSS for theater mode

### Phase 4: Polish

**Tasks:**

- [ ] Verify keyboard shortcut parity
- [ ] Add loading states / skeleton
- [ ] Mobile responsive adjustments
- [ ] Poster image from YouTube thumbnail

## Code Examples

### Current YouTube IFrame Approach

```svelte
<script>
	window.onYouTubeIframeAPIReady = () => {
		player = new YT.Player(player_container, {
			videoId: video.id,
			events: { onReady, onStateChange }
		});
	};

	// Poll for time updates
	setInterval(() => {
		const currentTime = player.getCurrentTime();
		updateCurrentLine(currentTime);
	}, 100);
</script>

<div bind:this={player_container}></div>
```

### With Vidstack

```svelte
<script>
	import 'vidstack/player';
	import 'vidstack/player/layouts/default';
	import 'vidstack/player/ui';

	let player: MediaPlayerElement;
</script>

<media-player
	bind:this={player}
	src="youtube/{video.id}"
	on:time-update={(e) => updateCurrentLine(e.detail.currentTime)}
	on:play={() => (is_playing = true)}
	on:pause={() => (is_playing = false)}
>
	<media-provider />
	<media-video-layout />
</media-player>
```

## Resources

- [Vidstack GitHub](https://github.com/vidstack/player)
- [Svelte Installation Guide](https://vidstack.io/docs/player/getting-started/installation/svelte/)
- [Svelte Examples](https://github.com/DGFX/vidstack-examples-svelte)
- [Plyr (predecessor)](https://github.com/sampotts/plyr) - 29.5k stars

## Risk Mitigation

- **YouTube API changes**: Vidstack abstracts this; if YouTube breaks, Vidstack maintainers fix it
- **SSR issues**: Svelte 5 resolved hydration bugs with custom elements
- **Fallback**: Can always revert to YouTube IFrame if issues arise
