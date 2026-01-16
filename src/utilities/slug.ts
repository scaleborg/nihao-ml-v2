export default function get_show_path(video: { slug: string }) {
	return `/video/${video.slug}`;
}
