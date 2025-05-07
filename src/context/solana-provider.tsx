'use client';

import type { ReactNode } from 'react';
import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';
import { Connection, Transaction, TransactionInstruction, PublicKey } from '@solana/web3.js';
import { useToast } from '@/hooks/use-toast';
import { useWallet } from '@lazorkit/wallet';
import type { SwapTransaction } from '@/services/raydium';
import { Buffer } from 'buffer';
import process from 'process';

// using lazorKit's custom rpc since the'yre on no net
const RPC_URL = 'https://rpc.lazorkit.xyz/';
const NETWORK_NAME = 'lazorkit'; // Custom network name for context

interface SolanaContextType {
  connection: Connection | null;
  network: string;
  signAndSendTransaction: (swapDetails: SwapTransaction) => Promise<string | null>;
  isLoading: boolean; // Combined loading state
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnected: boolean;
  publicKey: string | null;
  lazorError: string | null;
}

// Create the context with a default value
const SolanaContext = createContext<SolanaContextType | undefined>(undefined);

// Create the provider component
export function SolanaProvider({ children }: { children: ReactNode }) {
    // Add polyfills for browser environment if not present
    useEffect(() => {
        if (typeof window !== 'undefined') {
            if (!window.Buffer) {
                window.Buffer = Buffer;
            }
            if (!window.process) {
                window.process = process;
            }
        }
    }, []);


  const [connection, setConnection] = useState<Connection | null>(null);
  const [isSigning, setIsSigning] = useState<boolean>(false); // Specific loading state for signing
  const { toast } = useToast();

  // Only initialize wallet on client side
  const wallet = typeof window !== 'undefined' ? useWallet(connection || new Connection(RPC_URL, 'confirmed')) : null;

  // Initialize connection on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      const conn = new Connection(RPC_URL, 'confirmed');
      setConnection(conn);
      console.log(`Connected to Solana ${NETWORK_NAME} via ${RPC_URL}`);
    } catch (error) {
      console.error("Failed to connect to Solana:", error);
      toast({ title: "Solana Connection Error", description: "Could not connect to the Solana network.", variant: "destructive" });
    }
  }, []);  // No dependencies needed as this should only run once on mount

  // Wallet state to store useWallet values
  const [walletState, setWalletState] = useState<{
    isConnected: boolean;
    publicKey: string | null;
    lazorError: string | null;
    isLazorLoading: boolean;
    signMessage: ((message: Uint8Array) => Promise<Uint8Array>) | null;
    connect: (() => Promise<void>) | null;
    disconnect: (() => void) | null;
  }>({
    isConnected: false,
    publicKey: null,
    lazorError: null,
    isLazorLoading: false,
    signMessage: null,
    connect: null,
    disconnect: null,
  });

  // Update wallet state
  const updateWalletState = useCallback(() => {
    if (!wallet) return;
    
    setWalletState({
      isConnected: wallet.isConnected,
      publicKey: wallet.publicKey,
      lazorError: wallet.error,
      isLazorLoading: wallet.isLoading,
      signMessage: wallet.signMessage,
      connect: wallet.connect,
      disconnect: wallet.disconnect,
    });
  }, [wallet?.isConnected, wallet?.publicKey, wallet?.error, wallet?.isLoading, wallet?.signMessage, wallet?.connect, wallet?.disconnect]);

  // Initialize wallet state whenever wallet state changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    updateWalletState();
  }, [updateWalletState]);

  const isLoading = isSigning || walletState.isLazorLoading;

  const connect = useCallback(async () => {
    if (!connection || !walletState.connect) {
      toast({
        title: 'Error',
        description: 'Solana connection or wallet not initialized.',
        variant: 'destructive',
      });
          return;
      }
      try {
      await walletState.connect();
      toast({
        title: 'Wallet Connected',
        description: `Connected with public key: ${walletState.publicKey?.substring(0, 6)}...`,
      });
    } catch (err: any) {
      console.error('LazorKit connection failed:', err);
      toast({
        title: 'Connection Failed',
        description: err.message || 'Could not connect Lazor wallet.',
        variant: 'destructive',
      });
      }
  }, [connection, walletState.connect, walletState.publicKey, toast]);

  const disconnect = useCallback(() => {
    if (walletState.disconnect) {
      walletState.disconnect();
      toast({ title: 'Wallet Disconnected' });
    }
  }, [walletState.disconnect, toast]);

  const signAndSendTransaction = useCallback(
    async (swapDetails: SwapTransaction): Promise<string | null> => {
      if (!connection || !walletState.isConnected || !walletState.publicKey || !walletState.signMessage) {
        toast({
          title: 'Error',
          description: 'Not connected to Solana or Lazor wallet.',
          variant: 'destructive',
        });
      return null;
    }

    setIsSigning(true); // Start signing specific loading state
    try {
        console.log('Attempting to sign with LazorKit for public key:', walletState.publicKey);

       // --- Build the Solana Transaction (Same as before, using placeholder instructions) ---
       const swapInstructions: TransactionInstruction[] = [
         new TransactionInstruction({
            keys: [], // Add necessary accounts here
            programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"), // Memo program ID
            data: Buffer.from(`LazorKit Swap: ${swapDetails.inputToken.symbol} to ${swapDetails.outputToken.symbol}`, 'utf-8'),
        }),
       ];

       if (swapInstructions.length === 0) {
           throw new Error("No swap instructions generated.");
       }

      const { blockhash } = await connection.getLatestBlockhash();

      const transaction = new Transaction({
        recentBlockhash: blockhash,
          feePayer: new PublicKey(walletState.publicKey),
      }).add(...swapInstructions);

       const messageToSign = transaction.serializeMessage();
        const signature = await walletState.signMessage(messageToSign);
        transaction.addSignature(new PublicKey(walletState.publicKey), Buffer.from(signature));

       const serializedTx = transaction.serialize();
       const txSignature = await connection.sendRawTransaction(serializedTx);
       await connection.confirmTransaction({
            signature: txSignature,
            blockhash,
            lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight // Fetch blockhash again for confirmation
        }, 'confirmed');

       console.log("Transaction confirmed with signature:", txSignature);
       toast({ title: "Swap Submitted", description: `Transaction signature: ${txSignature.substring(0, 20)}...` });
       return txSignature;


    } catch (error: any) {
        console.error('Failed to sign or send transaction:', error);
        const errorMessage = walletState.lazorError || error.message || 'An unknown error occurred.';
        toast({ title: 'Transaction Failed', description: errorMessage, variant: 'destructive' });
      return null;
    } finally {
      setIsSigning(false); // End signing specific loading state
    }
    },
    [connection, walletState, toast]
  );

  const contextValue = useMemo(() => ({
    connection,
      network: NETWORK_NAME,
    signAndSendTransaction,
    isLoading,
    connect,
    disconnect,
      isConnected: walletState.isConnected,
      publicKey: walletState.publicKey,
      lazorError: walletState.lazorError,
    }),
    [connection, signAndSendTransaction, isLoading, connect, disconnect, walletState]
  );

  return (
    <SolanaContext.Provider value={contextValue}>
      {children}
    </SolanaContext.Provider>
  );
}

// Create a custom hook for using the Solana context
export const useSolana = (): SolanaContextType => {
  const context = useContext(SolanaContext);
  if (context === undefined) {
    throw new Error('useSolana must be used within a SolanaProvider');
  }
  return context;
};
