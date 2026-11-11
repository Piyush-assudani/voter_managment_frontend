import type { Metadata, Viewport } from 'next';
import { Anek_Devanagari, Inter, Noto_Sans_Devanagari, Outfit } from 'next/font/google';
import './globals.css';
import { ContentProtection } from '@/components/ContentProtection';
import { AppResilienceProvider } from '@/components/AppResilienceProvider';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-inter',
  display: 'swap',
});
const notoSansDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari', 'latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-noto-sans-devanagari',
  display: 'swap',
});
const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-outfit',
  display: 'swap',
});
const anekDevanagari = Anek_Devanagari({
  subsets: ['devanagari', 'latin'],
  weight: ['400', '500', '600', '700', '800'],
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
        {children}
      </body>
    </html>
  );
}
