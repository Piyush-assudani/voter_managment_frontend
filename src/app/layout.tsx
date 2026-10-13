import type { Metadata, Viewport } from 'next';
import { Anek_Devanagari, Inter, Noto_Sans_Devanagari, Outfit } from 'next/font/google';
import './globals.css';
import { ContentProtection } from '@/components/ContentProtection';

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
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'VijaySetu | Field workspace',
  description: 'A clear, reliable workspace for voter and booth operations.',
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
        {children}
      </body>
    </html>
  );
}
