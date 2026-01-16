/* eslint-disable @typescript-eslint/no-explicit-any */
declare const __VER__: string;
declare module 'postcss-import' {
	export const atImport: any;
	export default atImport;
}

// Legacy type alias - maps old Show type to Video for player compatibility
// The player code was written for podcasts (Show) but now works with Videos
type Show = import('@prisma/client').Video & {
	number?: number; // Optional for backwards compatibility
	show_notes?: string;
};

// YouTube IFrame Player API types
declare namespace YT {
	interface PlayerOptions {
		videoId?: string;
		width?: number | string;
		height?: number | string;
		playerVars?: PlayerVars;
		events?: Events;
	}

	interface PlayerVars {
		autoplay?: 0 | 1;
		cc_load_policy?: 0 | 1;
		controls?: 0 | 1 | 2;
		disablekb?: 0 | 1;
		fs?: 0 | 1;
		modestbranding?: 0 | 1;
		rel?: 0 | 1;
		start?: number;
		end?: number;
	}

	interface Events {
		onReady?: (event: PlayerEvent) => void;
		onStateChange?: (event: OnStateChangeEvent) => void;
		onError?: (event: OnErrorEvent) => void;
	}

	interface PlayerEvent {
		target: Player;
	}

	interface OnStateChangeEvent {
		target: Player;
		data: PlayerState;
	}

	interface OnErrorEvent {
		target: Player;
		data: number;
	}

	enum PlayerState {
		UNSTARTED = -1,
		ENDED = 0,
		PLAYING = 1,
		PAUSED = 2,
		BUFFERING = 3,
		CUED = 5
	}

	class Player {
		constructor(element: HTMLElement | string, options: PlayerOptions);
		playVideo(): void;
		pauseVideo(): void;
		stopVideo(): void;
		seekTo(seconds: number, allowSeekAhead?: boolean): void;
		getCurrentTime(): number;
		getDuration(): number;
		getPlayerState(): PlayerState;
		destroy(): void;
	}
}
