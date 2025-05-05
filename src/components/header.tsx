import type { FC } from 'react';
import { KeyRound } from 'lucide-react'; // Using KeyRound as a placeholder icon for passkeys
import { AuthButton } from '@/components/auth-button'; // Placeholder import

export const Header: FC = () => {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 flex items-center">
          <KeyRound className="h-6 w-6 mr-2 text-primary" />
          <span className="font-bold">Passkey Raydium Swapper</span>
        </div>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-1">
            <AuthButton />
          </nav>
        </div>
      </div>
    </header>
  );
};
