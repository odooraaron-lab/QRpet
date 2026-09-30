import { getBuddy } from '@/lib/buddies';
import { buddyBase } from '@/lib/session';
import { APP_URL } from '@/lib/config';

export const runtime = 'nodejs';

/** "Add to Home Screen": the buddy opens full screen like an app, straight to QR. */
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const b = await getBuddy(slug);
  if (!b) return new Response('Not found', { status: 404 });
  const base = await buddyBase(slug);
  const name = slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' ');
  return Response.json({
    name, short_name: name, start_url: `${base}/`, scope: `${base}/`, display: 'fullscreen', orientation: 'any',
    background_color: '#CFE6FF', theme_color: '#2E2140',
    icons: [{ src: `${APP_URL}/icon.svg`, sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  }, { headers: { 'content-type': 'application/manifest+json', 'cache-control': 'public, max-age=3600' } });
}
