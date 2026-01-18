/**
 * Import Chinese character data from multiple sources:
 * - Make Me a Hanzi: radicals, components, stroke count
 * - CC-CEDICT: pinyin, definitions
 * - HSK 3.0 lists: HSK levels
 *
 * Usage: npx tsx scripts/import-characters.ts
 */

import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

// Data source URLs
const MAKEMEAHANZI_DICTIONARY =
	'https://raw.githubusercontent.com/skishore/makemeahanzi/master/dictionary.txt';
const MAKEMEAHANZI_GRAPHICS =
	'https://raw.githubusercontent.com/skishore/makemeahanzi/master/graphics.txt';
const CEDICT_URL = 'https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz';
const HSK_BASE_URL =
	'https://raw.githubusercontent.com/krmanik/HSK-3.0/main/New%20HSK%20(2021)/HSK%20Hanzi/HSK%20';

interface CharacterData {
	id: string;
	pinyin: string;
	pinyin_alt: string | null;
	definition: string;
	hsk_level: number | null;
	frequency: number | null;
	radical: string | null;
	components: string | null;
	stroke_count: number | null;
}

interface MakeHanziEntry {
	character: string;
	definition: string;
	pinyin: string[];
	radical: string;
	matches: number[][];
	strokes: string[];
	decomposition: string;
}

interface CEDICTEntry {
	traditional: string;
	simplified: string;
	pinyin: string;
	definitions: string[];
}

// ============ Make Me a Hanzi ============

async function fetchMakeHanziData(): Promise<Map<string, MakeHanziEntry>> {
	console.log('Fetching Make Me a Hanzi data...');

	// Fetch dictionary (definitions, pinyin, radical, decomposition)
	const dictResponse = await fetch(MAKEMEAHANZI_DICTIONARY);
	const dictText = await dictResponse.text();

	const entries = new Map<string, MakeHanziEntry>();
	const dictLines = dictText.trim().split('\n');

	for (const line of dictLines) {
		try {
			const entry = JSON.parse(line) as MakeHanziEntry;
			entries.set(entry.character, entry);
		} catch {
			// Skip malformed lines
		}
	}

	console.log(`  Dictionary: ${entries.size} characters`);

	// Fetch graphics (strokes)
	const graphicsResponse = await fetch(MAKEMEAHANZI_GRAPHICS);
	const graphicsText = await graphicsResponse.text();
	const graphicsLines = graphicsText.trim().split('\n');

	let strokesAdded = 0;
	for (const line of graphicsLines) {
		try {
			const graphics = JSON.parse(line) as { character: string; strokes: string[] };
			const entry = entries.get(graphics.character);
			if (entry) {
				entry.strokes = graphics.strokes;
				strokesAdded++;
			}
		} catch {
			// Skip malformed lines
		}
	}

	console.log(`  Graphics: ${strokesAdded} characters with stroke data`);
	return entries;
}

// ============ CC-CEDICT ============

async function fetchCEDICT(): Promise<Map<string, CEDICTEntry[]>> {
	console.log('Fetching CC-CEDICT...');

	// Fetch gzipped file
	const response = await fetch(CEDICT_URL);
	const arrayBuffer = await response.arrayBuffer();

	// Decompress
	const decompressed = await decompressGzip(new Uint8Array(arrayBuffer));
	const text = new TextDecoder('utf-8').decode(decompressed);

	const entries = new Map<string, CEDICTEntry[]>();
	const lines = text.split('\n');

	// CC-CEDICT format: 傳統 简体 [pin1 yin1] /definition 1/definition 2/
	// Regex: more flexible - allow trailing whitespace, don't require final /
	const cedictRegex = /^(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+\/(.+)/;

	let matched = 0;
	for (const line of lines) {
		if (line.startsWith('#') || line.startsWith('%') || !line.trim()) continue;

		const match = line.match(cedictRegex);
		if (match) {
			matched++;
			const [, traditional, simplified, pinyin, defStr] = match;
			// Remove trailing / and split
			const definitions = defStr
				.replace(/\/\s*$/, '')
				.split('/')
				.filter((d) => d.trim());

			const entry: CEDICTEntry = {
				traditional,
				simplified,
				pinyin,
				definitions
			};

			// Index by each character in simplified
			for (const char of simplified) {
				if (!entries.has(char)) {
					entries.set(char, []);
				}
				entries.get(char)!.push(entry);
			}
		}
	}

	console.log(`  Matched ${matched} entries, ${entries.size} unique characters from CC-CEDICT`);
	return entries;
}

async function decompressGzip(data: Uint8Array): Promise<Uint8Array> {
	const ds = new DecompressionStream('gzip');
	const writer = ds.writable.getWriter();
	writer.write(data);
	writer.close();

	const reader = ds.readable.getReader();
	const chunks: Uint8Array[] = [];

	while (true) {
		const { done, value } = await reader.read();
		if (done) break;
		chunks.push(value);
	}

	const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
	const result = new Uint8Array(totalLength);
	let offset = 0;
	for (const chunk of chunks) {
		result.set(chunk, offset);
		offset += chunk.length;
	}

	return result;
}

// ============ HSK Levels ============

async function fetchHSKLevels(): Promise<Map<string, number>> {
	console.log('Fetching HSK 3.0 word lists...');

	const hskMap = new Map<string, number>();

	for (let level = 1; level <= 6; level++) {
		try {
			// HSK 3.0 files are named "HSK 1.txt", "HSK 2.txt", etc.
			const url = `${HSK_BASE_URL}${level}.txt`;
			const response = await fetch(url);

			if (!response.ok) {
				console.log(`  Could not fetch HSK ${level}: ${response.status}`);
				continue;
			}

			const text = await response.text();
			const lines = text.trim().split('\n');

			let count = 0;
			for (const line of lines) {
				const word = line.trim().split('\t')[0]; // First column is the word
				if (word) {
					// Extract individual characters
					for (const char of word) {
						if (isChinese(char) && !hskMap.has(char)) {
							hskMap.set(char, level);
							count++;
						}
					}
				}
			}

			console.log(`  HSK ${level}: ${count} new characters`);
		} catch (error) {
			console.log(`  Error fetching HSK ${level}:`, error);
		}
	}

	console.log(`  Total: ${hskMap.size} characters with HSK levels`);
	return hskMap;
}

function isChinese(char: string): boolean {
	const code = char.charCodeAt(0);
	return code >= 0x4e00 && code <= 0x9fff;
}

// ============ Merge Data Sources ============

function mergeCharacterData(
	hanzi: Map<string, MakeHanziEntry>,
	cedict: Map<string, CEDICTEntry[]>,
	hsk: Map<string, number>
): Map<string, CharacterData> {
	console.log('\nMerging data sources...');

	const merged = new Map<string, CharacterData>();

	// Start with Make Me a Hanzi as the base (best character-level data)
	for (const [char, entry] of hanzi) {
		const cedictEntries = cedict.get(char) || [];

		// Get pinyin - prefer Make Me a Hanzi, supplement with CEDICT
		const pinyinList = entry.pinyin || [];
		const primaryPinyin = pinyinList[0] || cedictEntries[0]?.pinyin || '';
		const altPinyin = pinyinList.length > 1 ? JSON.stringify(pinyinList.slice(1)) : null;

		// Get definition - prefer CEDICT (more complete), fall back to Make Me a Hanzi
		let definition = entry.definition || '';
		if (cedictEntries.length > 0) {
			// Collect unique definitions from CEDICT entries where this char is a single-char word
			const singleCharDefs = cedictEntries
				.filter((e) => e.simplified === char)
				.flatMap((e) => e.definitions)
				.filter((d) => !d.startsWith('CL:') && !d.startsWith('variant of'));

			if (singleCharDefs.length > 0) {
				definition = singleCharDefs.slice(0, 5).join('; ');
			}
		}

		// Parse decomposition for components
		const components = entry.decomposition
			? JSON.stringify(parseDecomposition(entry.decomposition))
			: null;

		merged.set(char, {
			id: char,
			pinyin: primaryPinyin,
			pinyin_alt: altPinyin,
			definition: definition || 'No definition available',
			hsk_level: hsk.get(char) || null,
			frequency: null, // Could add frequency data later
			radical: entry.radical || null,
			components,
			stroke_count: entry.strokes?.length || null
		});
	}

	// Add any characters from HSK that weren't in Make Me a Hanzi
	for (const [char, level] of hsk) {
		if (!merged.has(char)) {
			const cedictEntries = cedict.get(char) || [];
			const singleCharDefs = cedictEntries
				.filter((e) => e.simplified === char)
				.flatMap((e) => e.definitions)
				.filter((d) => !d.startsWith('CL:'));

			merged.set(char, {
				id: char,
				pinyin: cedictEntries[0]?.pinyin || '',
				pinyin_alt: null,
				definition: singleCharDefs.slice(0, 5).join('; ') || 'No definition available',
				hsk_level: level,
				frequency: null,
				radical: null,
				components: null,
				stroke_count: null
			});
		}
	}

	console.log(`  Merged ${merged.size} total characters`);
	return merged;
}

function parseDecomposition(decomposition: string): string[] {
	// Make Me a Hanzi decomposition format: ⿰亻生 or similar
	// Extract the component characters (skip the composition indicator)
	const components: string[] = [];

	for (const char of decomposition) {
		// Skip Ideographic Description Characters (U+2FF0-U+2FFF)
		const code = char.charCodeAt(0);
		if (code >= 0x2ff0 && code <= 0x2fff) continue;

		// Include Chinese characters
		if (isChinese(char)) {
			components.push(char);
		}
	}

	return components;
}

// ============ Database Import ============

async function importToDatabase(characters: Map<string, CharacterData>) {
	console.log('\nImporting to database...');

	const BATCH_SIZE = 500;
	const entries = Array.from(characters.values());

	let imported = 0;
	let updated = 0;
	let errors = 0;

	for (let i = 0; i < entries.length; i += BATCH_SIZE) {
		const batch = entries.slice(i, i + BATCH_SIZE);

		for (const char of batch) {
			try {
				await prisma.character.upsert({
					where: { id: char.id },
					create: char,
					update: {
						pinyin: char.pinyin,
						pinyin_alt: char.pinyin_alt,
						definition: char.definition,
						hsk_level: char.hsk_level,
						frequency: char.frequency,
						radical: char.radical,
						components: char.components,
						stroke_count: char.stroke_count
					}
				});
				imported++;
			} catch (error) {
				errors++;
				if (errors <= 5) {
					console.log(`  Error importing ${char.id}:`, error);
				}
			}
		}

		process.stdout.write(
			`\r  Progress: ${Math.min(i + BATCH_SIZE, entries.length)}/${entries.length}`
		);
	}

	console.log(`\n  Imported/updated: ${imported}, Errors: ${errors}`);
}

// ============ Main ============

async function main() {
	console.log('=== Chinese Character Import ===\n');

	try {
		// Fetch all data sources in parallel
		const [hanzi, cedict, hsk] = await Promise.all([
			fetchMakeHanziData(),
			fetchCEDICT(),
			fetchHSKLevels()
		]);

		// Merge into unified character data
		const merged = mergeCharacterData(hanzi, cedict, hsk);

		// Import to database
		await importToDatabase(merged);

		console.log('\n✅ Import complete!');

		// Show summary
		const stats = await prisma.character.groupBy({
			by: ['hsk_level'],
			_count: true,
			orderBy: { hsk_level: 'asc' }
		});

		console.log('\nHSK Level Distribution:');
		for (const stat of stats) {
			console.log(`  HSK ${stat.hsk_level ?? 'N/A'}: ${stat._count} characters`);
		}

		const total = await prisma.character.count();
		console.log(`\nTotal characters in database: ${total}`);
	} catch (error) {
		console.error('Import failed:', error);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}
}

main();
