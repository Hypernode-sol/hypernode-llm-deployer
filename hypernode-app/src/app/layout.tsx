import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { WalletProvider } from '@/components/WalletProvider';
import { QueryProvider } from '@/components/QueryProvider';
import { ToastProvider } from '@/components/ui/Toast';
import { APP_CONFIG } from '@/lib/config';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: `${APP_CONFIG.name} - Decentralized GPU Network`,
  description: APP_CONFIG.description,
  keywords: ['GPU', 'Solana', 'AI', 'Machine Learning', 'Decentralized', 'LLM'],
  authors: [{ name: 'Hypernode Team' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: APP_CONFIG.url,
    title: APP_CONFIG.name,
    description: APP_CONFIG.description,
    siteName: APP_CONFIG.name,
  },
  twitter: {
    card: 'summary_large_image',
    site: APP_CONFIG.twitter,
    creator: APP_CONFIG.twitter,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>
          <WalletProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </WalletProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
