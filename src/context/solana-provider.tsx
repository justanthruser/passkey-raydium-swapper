'use client';

import type { ReactNode } from 'react';
import React, { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react';
import { Connection, clusterApiUrl, Transaction, VersionedTransaction, PublicKey } from '@solana/web3.js';
import type { TransactionInstruction } from '@solana/web3.js';
import { useToast } from '@/hooks/use-toast';
import { useWallet } from '@lazorkit/wallet'; // Import LazorKit hook
import type { SwapTransaction, Token } from '@/services/raydium'; // Import types
import { Buffer } from 'buffer'; // Import Buffer
import process from 'process'; // Import process

// Define the Solana network to use (devnet as requested)
const SOLANA_NETWORK = 'devnet';
const RPC_URL = clusterApiUrl(SOLANA_NETWORK);

// Define the shape of the context state
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

  // Initialize connection on mount
  useEffect(() => {
    try {
      const conn = new Connection(RPC_URL, 'confirmed');
      setConnection(conn);
      console.log(`Connected to Solana ${SOLANA_NETWORK}`);
    } catch (error) {
      console.error("Failed to connect to Solana:", error);
      toast({ title: "Solana Connection Error", description: "Could not connect to the Solana network.", variant: "destructive" });
    }
  }, [toast]);

  // Use LazorKit's useWallet hook
  const {
    connect: lazorConnect,
    disconnect: lazorDisconnect,
    isConnected,
    publicKey, // This is the user's Solana public key string from LazorKit
    signMessage: lazorSignMessage, // Renamed to avoid conflict
    error: lazorError,
    isLoading: isLazorLoading, // Loading state from LazorKit
  } = useWallet(connection); // Pass the connection instance

   const isLoading = isSigning || isLazorLoading; // Combined loading state


  const connect = useCallback(async () => {
      if (!connection) {
          toast({title: "Error", description: "Solana connection not initialized.", variant: "destructive"});
          return;
      }
      try {
          await lazorConnect();
          toast({ title: "Wallet Connected", description: `Connected with public key: ${publicKey?.substring(0, 6)}...` });
      } catch(err: any) {
          console.error("LazorKit connection failed:", err);
          toast({ title: "Connection Failed", description: err.message || "Could not connect Lazor wallet.", variant: "destructive"});
      }
  }, [lazorConnect, connection, publicKey, toast]);

  const disconnect = useCallback(() => {
      lazorDisconnect();
      toast({title: "Wallet Disconnected"});
  }, [lazorDisconnect, toast]);

  // Function to sign and send transaction using LazorKit
  const signAndSendTransaction = useCallback(async (swapDetails: SwapTransaction): Promise<string | null> => {
    if (!connection || !isConnected || !publicKey || !lazorSignMessage) {
      toast({ title: "Error", description: "Not connected to Solana or Lazor wallet.", variant: "destructive" });
      return null;
    }

    setIsSigning(true); // Start signing specific loading state
    try {
      console.log("Attempting to sign with LazorKit for public key:", publicKey);

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
        feePayer: new PublicKey(publicKey), // Use the public key from LazorKit as the fee payer
      }).add(...swapInstructions);

       // --- Sign Transaction using LazorKit's signMessage ---
       // LazorKit's signMessage expects the message to sign (the transaction data).
       // For a full transaction, we usually need to serialize it *without* signatures,
       // send that for signing, then add the signature back.
       // LazorKit's current signMessage might be designed for arbitrary messages,
       // not full transaction signing directly in this way.
       // Let's assume for now signMessage can take the *message* part of the transaction
       // or potentially the serialized transaction for signing.
       // **This part requires clarification from LazorKit docs on full transaction signing.**

       // **Scenario 1: Signing the serialized unsigned transaction message**
       const messageToSign = transaction.serializeMessage();
       console.log("Message to sign (Buffer):", messageToSign);

       // Use LazorKit's signMessage
       const signature = await lazorSignMessage(messageToSign); // Expects Uint8Array, returns Uint8Array signature

       console.log("Signature received (Uint8Array):", signature);

       // Add the signature to the transaction
       // The signature received needs to be paired with the public key
       transaction.addSignature(new PublicKey(publicKey), Buffer.from(signature)); // Convert signature Uint8Array back to Buffer

       // **Scenario 2: If LazorKit provides a specific signTransaction method (Hypothetical)**
       // const signedTransaction = await lazorSignTransaction(transaction); // This method doesn't exist in the provided docs


       // --- Send the Signed Transaction ---
       const serializedTx = transaction.serialize();
       const txSignature = await connection.sendRawTransaction(serializedTx);
       await connection.confirmTransaction({
            signature: txSignature,
            blockhash: blockhash,
            lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight // Fetch blockhash again for confirmation
        }, 'confirmed');

       console.log("Transaction confirmed with signature:", txSignature);
       toast({ title: "Swap Submitted", description: `Transaction signature: ${txSignature.substring(0, 20)}...` });
       return txSignature;


    } catch (error: any) {
      console.error("Failed to sign or send transaction:", error);
      // Check if it's a LazorKit specific error if possible
      const errorMessage = lazorError || error.message || "An unknown error occurred.";
      toast({ title: "Transaction Failed", description: errorMessage, variant: "destructive" });
      return null;
    } finally {
      setIsSigning(false); // End signing specific loading state
    }
  }, [connection, isConnected, publicKey, lazorSignMessage, toast, lazorError]);


  const contextValue = useMemo(() => ({
    connection,
    network: SOLANA_NETWORK,
    signAndSendTransaction,
    isLoading,
    connect,
    disconnect,
    isConnected,
    publicKey,
    lazorError,
  }), [connection, signAndSendTransaction, isLoading, connect, disconnect, isConnected, publicKey, lazorError]);

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
