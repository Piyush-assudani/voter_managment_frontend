import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { ContentProtection } from '@/components/ContentProtection';
import { AppResilienceProvider } from '@/components/AppResilienceProvider';
import ToastContainer from '@/components/Toast';

const inter = localFont({
  src: '../../public/fonts/Inter-latin.woff2',
  weight: '400 800',
  variable: '--font-inter',
  display: 'swap',
});
const notoSansDevanagari = localFont({
  src: [
    { path: '../../public/fonts/NotoSansDevanagari-devanagari.woff2', weight: '400 900' },
    { path: '../../public/fonts/NotoSansDevanagari-latin.woff2', weight: '400 900' },
  ],
  variable: '--font-noto-sans-devanagari',
  display: 'swap',
});
const outfit = localFont({
  src: '../../public/fonts/Outfit-latin.woff2',
  weight: '400 900',
  variable: '--font-outfit',
  display: 'swap',
});
const anekDevanagari = localFont({
  src: [
    { path: '../../public/fonts/AnekDevanagari-devanagari.woff2', weight: '400 800' },
    { path: '../../public/fonts/AnekDevanagari-latin.woff2', weight: '400 800' },
  ],
  variable: '--font-anek-devanagari',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
  interactiveWidget: 'resizes-content',
  themeColor: '#047857',
};

export const metadata: Metadata = {
  title: 'VijaySetu (विजयसेतु) | चुनाव प्रबंधन प्रणाली',
  description: 'विजयसेतु - आधुनिक मतदाता खोज, लाइव पोलिंग डेस्क, और इलेक्शन मैनेजमेंट प्लेटफॉर्म।',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'VijaySetu',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="hi" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${notoSansDevanagari.variable} ${outfit.variable} ${anekDevanagari.variable} bg-[#FAFAFA] text-[#111827]`}
        suppressHydrationWarning
      >
        <ContentProtection />
        <AppResilienceProvider />
        <ToastContainer />
        {children}
      </body>
    </html>
  );
}
