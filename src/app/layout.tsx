
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Header } from '@/components/header';
import { cn } from '@/lib/utils';
// Removed AuthProvider import
import { SolanaProvider } from '@/context/solana-provider'; // Keep SolanaProvider
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'PassRaydSwapr',
  description: 'Swap tokens on Raydium using LazorKit wallet connection',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn('font-sans', inter.variable, 'antialiased')}>
        {/* Removed AuthProvider wrapper */}
        <SolanaProvider>
          <div className="relative flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
          </div>
          <Toaster />
        </SolanaProvider>
        {/* Removed closing AuthProvider tag */}
      </body>
    </html>
  );
}
