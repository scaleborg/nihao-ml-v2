import type { Actions } from '@sveltejs/kit';
import { redis } from '$/hooks.server';
import { prisma_client } from '$/server/prisma-client';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	// Fetch recent videos
	const videos = await prisma_client.video.findMany({
		where: { is_public: true },
		orderBy: { created_at: 'desc' },
		take: 12,
		include: {
			transcript: {
				select: {
					_count: {
						select: { lines: true }
					}
				}
			}
		}
	});

	// Also fetch all videos for logged-in users (including private ones they imported)
	const all_videos = await prisma_client.video.findMany({
		orderBy: { created_at: 'desc' },
		take: 20,
		include: {
			transcript: {
				select: {
					_count: {
						select: { lines: true }
					}
				}
			}
		}
	});

	return {
		videos,
		all_videos,
		meta: {
			canonical: `${url.protocol}//${url.host}`
		}
	};
};

export const actions: Actions = {
	logout: async function logout({ cookies }) {
		const access_token = cookies.get('access_token');
		if (access_token) {
			try {
				await prisma_client.session.delete({
					where: { access_token }
				});
			} catch {
				// Session may not exist, that's ok
			}
		}
		// Remove Auth Token Cookie
		cookies.delete('access_token', {
			httpOnly: true,
			path: '/',
			secure: false // Allow on localhost
		});
		return {
			message: 'Logout Successful'
		};
	},
	dump_cache: async function dump_cache() {
		await redis?.flushall();
		return {
			message: 'Dump Cache '
		};
	}
};
