import { prisma_client } from '$/server/prisma-client';

interface Block {
	breadcrumbs: string[];
	content: string;
	href: string;
	id: string;
}

// Placeholder video titles - must match +page.server.ts
const PLACEHOLDER_TITLES = [
	'HSK 1 Vocabulary | 150 Essential Words',
	'Chinese Listening Practice | Daily Conversations',
	'Learn Mandarin While You Sleep | 8 Hours',
	'Chinese Grammar Explained | Beginner to Advanced',
	'Street Food Tour in Beijing | Food Vocabulary',
	'How to Order Food in Chinese | Restaurant Phrases',
	'Chinese Numbers 1-1000 | Counting Made Easy',
	'Mandarin Tones Explained | Pronunciation Guide',
	'Chinese Characters for Beginners | Radicals',
	'Travel Chinese | Airport & Hotel Vocabulary',
	'Chinese Slang & Internet Words | 网络用语',
	'HSK 2 Full Course | Complete Vocabulary',
	'Chinese Movie Review | Learn from Films',
	'Business Chinese | Meeting Vocabulary',
	'Chinese Cooking Show | Kitchen Vocabulary',
	'Learn Chinese with Songs | Music Vocabulary',
	'Chinese History Explained | 中国历史',
	'Shanghai Travel Vlog | City Vocabulary',
	'Chinese New Year Traditions | Holiday Words',
	'Mandarin Conversation Practice | Dialogue',
	'Chinese Podcast for Beginners | Episode 1',
	'HSK 3 Listening Practice | Exam Prep',
	'Chinese Calligraphy Basics | 书法入门',
	'Learn Chinese with News | Current Events',
	'Chinese Tea Culture | 茶文化',
	'Mandarin Pronunciation | Common Mistakes',
	'Chinese Idioms Explained | 成语故事',
	'Daily Routine in Chinese | Morning Vocabulary',
	'Chinese Weather Vocabulary | 天气词汇',
	'Shopping in Chinese | Market Phrases',
	'Chinese Body Parts | Medical Vocabulary',
	'Mandarin Directions | Navigation Words',
	'Chinese Colors & Shapes | Basic Vocabulary',
	'Family Members in Chinese | 家庭成员',
	'Chinese Animals Vocabulary | 动物词汇',
	'Time Expressions in Chinese | Hours & Days',
	'Chinese Emotions & Feelings | 情感词汇',
	'Mandarin Question Words | How to Ask',
	'Chinese Sports Vocabulary | 体育词汇',
	'Clothes & Fashion in Chinese | 服装词汇',
	'Chinese Technology Words | Modern Vocabulary',
	'Mandarin Comparisons | Grammar Pattern',
	'Chinese Measure Words | 量词大全',
	'HSK 4 Reading Practice | Comprehension',
	'Chinese Sentence Patterns | Structure Guide',
	'Mandarin Negation | 不 vs 没',
	'Chinese Aspect Particles | 了, 过, 着',
	'Location Words in Chinese | 位置词',
	'Chinese Conjunctions | Connecting Ideas',
	'Advanced Chinese Grammar | Complex Sentences'
];

export async function content() {
	const blocks: Block[] = [];

	// Get real videos from database
	const videos = await prisma_client.video.findMany({
		where: {
			is_public: true
		},
		orderBy: { created_at: 'desc' }
	});

	// Add real videos to search index
	videos.forEach((video) => {
		blocks.push({
			breadcrumbs: [video.title],
			content: video.title,
			href: `/video/${video.slug}`,
			id: video.id
		});
	});

	// Add placeholder videos to search index (matches homepage behavior)
	PLACEHOLDER_TITLES.forEach((title, i) => {
		blocks.push({
			breadcrumbs: [title],
			content: title,
			href: `/video/placeholder-video-${i}`,
			id: `placeholder-${i}`
		});
	});

	return blocks;
}
