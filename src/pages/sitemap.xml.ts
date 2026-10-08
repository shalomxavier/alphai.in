import type { APIRoute } from 'astro';

const PATHS = ['/', '/about', '/testimonials', '/contact'];

export const GET: APIRoute = ({ site }) => {
  const base = site?.origin ?? 'https://alphai.in';
  const urls = PATHS.map(
    (p) => `  <url><loc>${base}${p}</loc></url>`,
  ).join('\n');

  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      `${urls}\n</urlset>`,
    { headers: { 'Content-Type': 'application/xml' } },
  );
};
