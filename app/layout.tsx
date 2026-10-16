import type { Metadata, Viewport } from 'next';
import './globals.css';

// Fonts load from a plain stylesheet so the build never needs the network; system fonts stand in offline.
const FONTS = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:wght@500;600&display=swap';

export const metadata: Metadata = {
  title: 'Bentham · Your loan, still there in December',
  description: 'A careful money friend for students: safe-to-spend until your next loan, scam checks, and honest answers to "can I afford it?". Built with Claude.',
};

export const viewport: Viewport = { themeColor: '#0F1922', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={FONTS} />
      </head>
      <body>{children}</body>
    </html>
  );
}
