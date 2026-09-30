import type { Metadata, Viewport } from 'next';
import { APP_URL, PRODUCT, BRAND, HQ_PRODUCT } from '@/lib/config';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: { default: `${PRODUCT}: a digital buddy who grows every day | ${BRAND}`, template: `%s | ${PRODUCT}` },
  description: 'QR is a gentle digital buddy for 2 to 6 year olds. It lives on your TV or tablet, sings, counts and learns one new thing every day. No ads, no chat. Made in NZ.',
  applicationName: PRODUCT,
};

export const viewport: Viewport = { themeColor: '#2E2140', width: 'device-width', initialScale: 1, viewportFit: 'cover' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const hq = process.env.HQ_URL;
  return (
    <html lang="en-NZ">
      <head>
        {/* Google Fonts (not self-hosted) so buddy pages served through teddy.myqr.co.nz load them without CORS setup. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Grandstander:wght@700;800&family=Nunito:wght@400;600;700;800&display=swap" />
        {hq && <script defer src={`${hq}/beacon.js`} data-product={HQ_PRODUCT} />}
      </head>
      <body>{children}</body>
    </html>
  );
}
