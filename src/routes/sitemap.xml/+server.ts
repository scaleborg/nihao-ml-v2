import type { RequestHandler } from '@sveltejs/kit';
import { PUBLIC_URL } from '$env/static/public';
import { prisma_client } from '$/server/prisma-client';

const site = `https://${PUBLIC_URL}`;

export const GET: RequestHandler = async function GET({ setHeaders }) {
	const videos = await prisma_client.video.findMany({
		where: {
			is_public: true
		},
		orderBy: {
			created_at: 'desc'
		}
	});

	const xml = `<?xml version="1.0" encoding="UTF-8" ?>
    <urlset
      xmlns="https://www.sitemaps.org/schemas/sitemap/0.9"
      xmlns:news="https://www.google.com/schemas/sitemap-news/0.9"
      xmlns:xhtml="https://www.w3.org/1999/xhtml"
      xmlns:mobile="https://www.google.com/schemas/sitemap-mobile/1.0"
      xmlns:image="https://www.google.com/schemas/sitemap-image/1.1"
      xmlns:video="https://www.google.com/schemas/sitemap-video/1.1"
    >
      <url>
        <loc>${site}</loc>
        <changefreq>daily</changefreq>
        <priority>1</priority>
      </url>

      <url>
        <loc>${site}/about</loc>
        <changefreq>monthly</changefreq>
        <priority>0.4</priority>
      </url>

      <url>
        <loc>${site}/dashboard</loc>
        <changefreq>daily</changefreq>
        <priority>0.8</priority>
      </url>

      <url>
        <loc>${site}/login</loc>
        <changefreq>monthly</changefreq>
        <priority>0.3</priority>
      </url>

      ${videos
				?.map(
					(video) => `
  <url>
    <loc>${site}/watch/${video.slug}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  `
				)
				.join('')}

</urlset>
`;

	setHeaders({
		'cache-control': 'max-age=0, s-maxage=3600',
		'Content-Type': 'application/xml'
	});

	return new Response(xml);
};
