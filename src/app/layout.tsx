import type { Metadata, Viewport } from 'next';
import { Inter, Noto_Sans_Devanagari } from 'next/font/google';
import './globals.css';
import { ContentProtection } from '@/components/ContentProtection';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});
const notoSansDevanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari', 'latin'],
  variable: '--font-noto-sans-devanagari',
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
    <html lang="hi">
      <body
        className={`${inter.variable} ${notoSansDevanagari.variable} bg-[#FAFAFA] text-[#111827]`}
        suppressHydrationWarning
      >
        <ContentProtection />
        {children}
      </body>
    </html>
  );
}
