import { error } from '@sveltejs/kit';
import { getVideo } from '$/server/video/youtube_api';
import { prisma_client } from '$server/prisma-client';
import type { PageServerLoad } from './$types';

const CHINESE_CHAR_REGEX = /[\u4e00-\u9fff]/;

export const load: PageServerLoad = async ({ params, locals }) => {
	const video = await getVideo(params.slug);

	if (!video) {
		error(404, 'Video not found');
	}

	const user = locals.user;
	const is_authenticated = !!user;

	// Extract unique Chinese characters from transcript
	const unique_chars = new Set<string>();
	if (video.transcript?.lines) {
		for (const line of video.transcript.lines) {
			for (const char of line.text) {
				if (CHINESE_CHAR_REGEX.test(char)) {
					unique_chars.add(char);
				}
			}
		}
	}

	// Fetch user's character states if authenticated
	let user_characters: Record<string, { familiarity: number; state: number }> = {};

	if (user && unique_chars.size > 0) {
		const records = await prisma_client.userCharacter.findMany({
			where: {
				user_id: user.id,
				character_id: { in: [...unique_chars] }
			},
			select: {
				character_id: true,
				familiarity: true,
				state: true
			}
		});

		for (const uc of records) {
			user_characters[uc.character_id] = {
				familiarity: uc.familiarity,
				state: uc.state
			};
		}
	}

	return {
		video,
		user_characters,
		is_authenticated
	};
};
