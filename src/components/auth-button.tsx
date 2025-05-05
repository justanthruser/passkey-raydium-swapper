'use client';

import React, { useState, useEffect } from 'react';
import { useSolana } from '@/context/solana-provider'; // Import useSolana
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, Loader2, Wallet, KeyRound, AlertTriangle } from 'lucide-react'; // Added Wallet, KeyRound, AlertTriangle
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export const AuthButton: React.FC = () => {
  const {
    connect,
    disconnect,
    isConnected,
    publicKey,
    isLoading, // Use combined loading state from SolanaProvider
    lazorError,
  } = useSolana();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // This code runs only on the client after hydration
    setIsClient(true);
  }, []);

  if (!isClient) {
    // Render a placeholder or skeleton while waiting for client-side hydration
    return <Button variant="outline" size="sm" disabled><Loader2 className="h-4 w-4 animate-spin mr-2" />Loading...</Button>;
  }

  // Optionally display LazorKit specific errors
  if (lazorError) {
       return (
           <DropdownMenu>
               <DropdownMenuTrigger asChild>
                    <Button variant="destructive" size="sm">
                        <AlertTriangle className="mr-2 h-4 w-4" />
                        Error
                    </Button>
               </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Wallet Error</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem disabled className="text-xs text-destructive-foreground bg-destructive">
                        {lazorError}
                    </DropdownMenuItem>
                    {/* Optionally add a retry or disconnect button */}
                     <DropdownMenuItem onClick={disconnect}>
                         <LogOut className="mr-2 h-4 w-4" />
                         Disconnect
                     </DropdownMenuItem>
                </DropdownMenuContent>
           </DropdownMenu>
       )
  }


  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Connecting...
      </Button>
    );
  }

  if (isConnected && publicKey) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
             {/* Using Wallet icon now for connected state */}
            <Wallet className="mr-2 h-4 w-4" />
            {/* Display truncated public key */}
            {`${publicKey.substring(0, 4)}...${publicKey.substring(publicKey.length - 4)}`}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Connected Wallet</DropdownMenuLabel>
           <DropdownMenuItem disabled className="text-xs">
                {publicKey}
           </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={disconnect}>
            <LogOut className="mr-2 h-4 w-4" />
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Button to connect using LazorKit
  return (
    <Button variant="outline" size="sm" onClick={connect} disabled={isLoading}>
      {/* Using KeyRound as it relates to security/passkeys which LazorKit uses */}
      <KeyRound className="mr-2 h-4 w-4" />
      Connect Lazor Wallet
    </Button>
  );
};
