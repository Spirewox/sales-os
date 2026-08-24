import type { Metadata, Viewport } from 'next';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata: Metadata = {
  title: 'FudFarmer POS',
  description: 'Offline-first point of sale for FudFarmer retail stores, franchises and subscribers.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'FF POS', statusBarStyle: 'black-translucent' },
};

export const viewport: Viewport = {
  themeColor: '#15803d',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster theme="dark" position="top-center" richColors />
      </body>
    </html>
  );
}
