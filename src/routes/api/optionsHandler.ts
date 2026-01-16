import { dev } from '$app/environment';
import type { RequestHandler } from '@sveltejs/kit';

const ALLOWED_ORIGINS = new Set([
	'https://nihao.ml',
	'https://www.nihao.ml',
	// Dev origins
	...(dev ? ['http://localhost:5173', 'http://localhost:4173', 'http://127.0.0.1:5173'] : [])
]);

const optionsHandler = (methods: string = 'OPTIONS,POST') => {
	const options: RequestHandler = async ({ request }) => {
		const origin = request.headers.get('origin');
		const allowedOrigin = origin && ALLOWED_ORIGINS.has(origin) ? origin : null;

		// Reject unknown origins
		if (!allowedOrigin) {
			return new Response(null, { status: 403 });
		}

		return new Response(null, {
			headers: {
				'Access-Control-Allow-Credentials': 'true',
				'Access-Control-Allow-Origin': allowedOrigin,
				'Access-Control-Allow-Methods': methods,
				'Access-Control-Allow-Headers':
					'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
			}
		});
	};
	return options;
};

export default optionsHandler;
