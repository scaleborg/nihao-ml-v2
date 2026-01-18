import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma_client } from '$server/prisma-client';

// Get example sentences containing a character from the user's watched videos
export const GET: RequestHandler = async ({ params, locals, url }) => {
	const char = params.char;
	const user = locals.user;

	if (!char || [...char].length !== 1) {
		return json({ error: 'Invalid character' }, { status: 400 });
	}

	const limit = parseInt(url.searchParams.get('limit') || '5');

	// If user is logged in, prioritize examples from their videos
	let examples: { text: string; pinyin: string | null; video_title: string; video_slug: string }[] =
		[];

	if (user) {
		// Get examples from user's watched videos
		const user_examples = await prisma_client.transcriptLine.findMany({
			where: {
				text: { contains: char },
				transcript: {
					video: {
						user_videos: {
							some: { user_id: user.id }
						}
					}
				}
			},
			take: limit,
			select: {
				text: true,
				pinyin: true,
				transcript: {
					select: {
						video: {
							select: {
								title: true,
								slug: true
							}
						}
					}
				}
			}
		});

		examples = user_examples.map((e) => ({
			text: e.text,
			pinyin: e.pinyin,
			video_title: e.transcript.video.title,
			video_slug: e.transcript.video.slug
		}));
	}

	// If not enough examples, get from all public videos
	if (examples.length < limit) {
		const remaining = limit - examples.length;
		const existing_texts = new Set(examples.map((e) => e.text));

		const public_examples = await prisma_client.transcriptLine.findMany({
			where: {
				text: { contains: char },
				transcript: {
					video: {
						is_public: true
					}
				},
				NOT: {
					text: { in: [...existing_texts] }
				}
			},
			take: remaining,
			select: {
				text: true,
				pinyin: true,
				transcript: {
					select: {
						video: {
							select: {
								title: true,
								slug: true
							}
						}
					}
				}
			}
		});

		examples = [
			...examples,
			...public_examples.map((e) => ({
				text: e.text,
				pinyin: e.pinyin,
				video_title: e.transcript.video.title,
				video_slug: e.transcript.video.slug
			}))
		];
	}

	return json({ examples });
};
