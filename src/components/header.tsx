import type { FC } from 'react';
import { AuthButton } from '@/components/auth-button';
import { Sparkles, Wallet } from 'lucide-react';

export const Header: FC = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container flex h-16 items-center">
        <div className="m-4 p-7 flex items-center gap-2 from-primary/20 via-primary/10 to-transparent rounded-lg">
          <Sparkles className="h-5 w-5 text-primary animate-pulse" />
          <span className="font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            PassRaydSwpr
          </span>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
              <Wallet className="h-4 w-4" />
              <span>Solana Network</span>
            </div>
            <AuthButton />
          </nav>
        </div>
      </div>
    </header>
  );
};
