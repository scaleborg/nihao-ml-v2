import { pinyin } from 'pinyin';

/**
 * Generate pinyin with tone marks from Chinese text
 * Uses the pinyin library with word segmentation for better accuracy
 */
export function generatePinyin(text: string): string {
	// Use segment mode for better word boundary detection
	// style: 'tone' gives us diacritical marks (e.g., zhōng xīn)
	const result = pinyin(text, {
		style: 'tone',
		segment: true, // Use Chinese word segmentation
		group: true // Group multi-character words together
	});

	// Flatten the nested array and join with spaces
	return result.map((syllables) => syllables.join('')).join(' ');
}

/**
 * Generate pinyin for each line of text
 * Returns an array matching the input lines
 */
export function generatePinyinForLines(lines: string[]): string[] {
	return lines.map((line) => generatePinyin(line));
}
