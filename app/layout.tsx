import type { Metadata, Viewport } from 'next';
import './globals.css';
import Providers from '@/components/layout/Providers';
import Header from '@/components/layout/Header';
import BottomNav from '@/components/layout/BottomNav';

export const metadata: Metadata = {
  title: 'Chammery - Institutional Meal Management',
  description: 'Corporate and institutional meal requesting and point tracking system with mobile-first biometric access.',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#FFF8F0',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#FFF8F0] text-[#1A1A2E] antialiased flex flex-col selection:bg-[#E67E22] selection:text-white">
        <Providers>
          <Header />
          <main className="flex-1 w-full max-w-5xl mx-auto">
            {children}
          </main>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}

