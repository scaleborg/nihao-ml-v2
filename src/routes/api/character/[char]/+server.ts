import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { prisma_client } from '$server/prisma-client';

export const GET: RequestHandler = async ({ params }) => {
	const char = params.char;

	if (!char || [...char].length !== 1) {
		return json({ error: 'Invalid character' }, { status: 400 });
	}

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

	if (!character) {
		return json({ error: 'Character not found' }, { status: 404 });
	}

	return json(character);
};
