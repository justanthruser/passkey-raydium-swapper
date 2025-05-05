'use client';

import type { FormEvent } from 'react';
import React, { useState, useEffect } from 'react';
// Removed useAuth import as connection state is now handled by useSolana
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, ArrowRightLeft, CheckCircle, Info, Loader2, Wallet } from 'lucide-react';
import { getSupportedTokens, estimateOutputAmount } from '@/services/raydium';
import type { Token, SwapTransaction } from '@/services/raydium'; // Import types
import { useSolana } from '@/context/solana-provider'; // Keep useSolana
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Image from 'next/image';
import { Skeleton } from '@/components/ui/skeleton';
import { formatTokenAmount, parseTokenAmount } from '@/lib/utils'; // Import formatting utils

// Mock balance function (replace with actual fetching logic if available)
// Needs user's public key to fetch balance
const useMockTokenBalance = (token: Token | undefined, publicKey: string | null): number | null => {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (token && publicKey) { // Check for publicKey instead of isAuthenticated
      // Simulate fetching balance for the connected wallet address
      console.log(`Simulating balance fetch for token ${token.symbol} and address ${publicKey}`);
      const mockBalance = Math.random() * 1000; // Random balance for demo
      // Store balance in the smallest unit (like lamports)
      setBalance(Math.floor(mockBalance * Math.pow(10, token.decimals)));
    } else {
      setBalance(null);
    }
  }, [token, publicKey]); // Depend on publicKey

  return balance;
};


export default function Home() {
  // Use useSolana for connection status and signing
  const {
      connection, // Keep connection
      signAndSendTransaction,
      isLoading: isSolanaLoading, // Renamed to avoid conflict locally
      isConnected, // Use isConnected from useSolana
      publicKey, // Use publicKey from useSolana
      lazorError // Get potential Lazor errors
   } = useSolana();
  const { toast } = useToast();

  const [supportedTokens, setSupportedTokens] = useState<Token[]>([]);
  const [inputToken, setInputToken] = useState<Token | undefined>(undefined);
  const [outputToken, setOutputToken] = useState<Token | undefined>(undefined);
  const [inputAmountString, setInputAmountString] = useState<string>('');
  const [estimatedOutput, setEstimatedOutput] = useState<number | null>(null);
  const [isLoadingTokens, setIsLoadingTokens] = useState<boolean>(true);
  const [isLoadingEstimate, setIsLoadingEstimate] = useState<boolean>(false);
  const [isSwapping, setIsSwapping] = useState<boolean>(false); // Local state for swapping process itself
  const [swapError, setSwapError] = useState<string | null>(null);
  const [swapSuccess, setSwapSuccess] = useState<string | null>(null);

   // Pass publicKey to the balance hook
   const inputBalance = useMockTokenBalance(inputToken, publicKey);


  // Fetch supported tokens on mount (no change needed here)
  useEffect(() => {
    const fetchTokens = async () => {
      setIsLoadingTokens(true);
      try {
        const tokens = await getSupportedTokens();
        setSupportedTokens(tokens);
        if (tokens.length > 0) setInputToken(tokens.find(t => t.symbol === 'SOL'));
        if (tokens.length > 1) setOutputToken(tokens.find(t => t.symbol === 'USDC'));
      } catch (error) {
        console.error("Failed to fetch supported tokens:", error);
        toast({ title: "Error", description: "Could not load supported tokens.", variant: "destructive" });
      } finally {
        setIsLoadingTokens(false);
      }
    };
    fetchTokens();
  }, [toast]);

  // Estimate output amount (no change needed here, relies on local state)
  useEffect(() => {
    const estimate = async () => {
      const parsedInputAmount = parseTokenAmount(inputAmountString, inputToken?.decimals);

      if (inputToken && outputToken && parsedInputAmount > 0) {
        setIsLoadingEstimate(true);
        setEstimatedOutput(null);
        setSwapError(null);

        try {
          const transactionDetails: SwapTransaction = {
            inputToken,
            outputToken,
            inputAmount: Number(parsedInputAmount), // Ensure number type if needed by estimate func
            expectedOutputAmount: 0,
          };
          const estimated = await estimateOutputAmount(transactionDetails);
          setEstimatedOutput(estimated);
        } catch (error: any) {
          console.error("Failed to estimate output amount:", error);
          setEstimatedOutput(null);
          setSwapError(`Estimation failed: ${error.message || 'Unknown error'}`);
        } finally {
          setIsLoadingEstimate(false);
        }
      } else {
        setEstimatedOutput(null);
      }
    };

    const debounceTimeout = setTimeout(estimate, 300);
    return () => clearTimeout(debounceTimeout);

  }, [inputToken, outputToken, inputAmountString]);

   // handleSelectToken and handleSwapDirection remain the same
   const handleSelectToken = (type: 'input' | 'output', address: string) => {
    const selectedToken = supportedTokens.find(t => t.address === address);
    if (!selectedToken) return;

    if (type === 'input') {
        if (selectedToken.address === outputToken?.address) {
            setOutputToken(inputToken); // Swap if selecting the same token as the other side
        }
        setInputToken(selectedToken);
    } else {
         if (selectedToken.address === inputToken?.address) {
            setInputToken(outputToken); // Swap if selecting the same token as the other side
        }
        setOutputToken(selectedToken);
    }
     setInputAmountString(''); // Clear amount on token change
     setEstimatedOutput(null);
     setSwapError(null);
  }

  const handleSwapDirection = () => {
    if(inputToken && outputToken) {
        const tempToken = inputToken;
        const tempAmount = inputAmountString; // Keep track of the input string

        setInputToken(outputToken);
        setOutputToken(tempToken);

        // Set input amount string based on the previously *estimated* output
        const newAmountString = estimatedOutput !== null && outputToken
          ? formatTokenAmount(estimatedOutput, outputToken.decimals)
          : ''; // If no estimate, clear the input
        setInputAmountString(newAmountString);

        // Clear the *new* estimate, as inputs have changed
        setEstimatedOutput(null);
        setSwapError(null);
    }
  }

  const handleMaxBalance = () => {
      if (inputBalance !== null && inputToken) {
          setInputAmountString(formatTokenAmount(inputBalance, inputToken.decimals));
      }
  }

  const handleSwapSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const parsedInputAmount = parseTokenAmount(inputAmountString, inputToken?.decimals);

    // Check conditions based on isConnected and publicKey from useSolana
    if (!isConnected || !publicKey || !inputToken || !outputToken || !parsedInputAmount || parsedInputAmount <= 0 || !connection || estimatedOutput === null) {
       let errorDesc = "Please complete all fields and ensure your wallet is connected.";
       if (!isConnected) errorDesc = "Please connect your Lazor wallet to perform a swap.";
       else if (!inputToken || !outputToken) errorDesc = "Please select both input and output tokens.";
       else if (!parsedInputAmount || parsedInputAmount <= 0) errorDesc = "Please enter a valid input amount.";
       else if (!estimatedOutput) errorDesc = "Waiting for estimated output amount.";
       else if (!connection) errorDesc = "Solana connection not available.";

      toast({ title: "Swap Error", description: errorDesc, variant: "destructive" });
      return;
    }

     if (inputBalance !== null && parsedInputAmount > inputBalance) {
         toast({ title: "Swap Error", description: "Input amount exceeds your available balance.", variant: "destructive" });
         return;
     }

    setIsSwapping(true); // Start local swapping process indicator
    setSwapError(null);
    setSwapSuccess(null);

    try {
      const transactionDetails: SwapTransaction = {
        inputToken,
        outputToken,
        inputAmount: Number(parsedInputAmount), // Use parsed amount
        expectedOutputAmount: estimatedOutput,
        slippage: 0.5,
      };

      console.log("Preparing swap transaction...", transactionDetails);

      // Use the signAndSendTransaction from SolanaProvider which now uses LazorKit
      const signature = await signAndSendTransaction(transactionDetails);

      if (signature) {
        setSwapSuccess(`Swap submitted successfully! Signature: ${signature}`);
        // Toast is handled within signAndSendTransaction on success/error
         setInputAmountString('');
         setEstimatedOutput(null);
         // Consider fetching new balances here after success
      } else {
         // Error handling is done within signAndSendTransaction via toast
         // Set local error state if needed, though toast might be sufficient
         setSwapError("Transaction failed. Check wallet or previous notifications.");
      }

    } catch (error: any) {
      // This catch might be redundant if signAndSendTransaction handles all errors,
      // but kept as a safety net.
      console.error("Swap submission failed:", error);
      const errorMessage = error.message || "An unknown error occurred during the swap submission.";
      setSwapError(`Swap failed: ${errorMessage}`);
       toast({ title: "Swap Failed", description: errorMessage, variant: "destructive" });
    } finally {
      setIsSwapping(false); // End local swapping process indicator
    }
  };

   // renderTokenSelectItem and renderTokenTriggerValue remain the same
   const renderTokenSelectItem = (token: Token) => (
     <SelectItem key={token.address} value={token.address} disabled={token.address === inputToken?.address || token.address === outputToken?.address}>
        <div className="flex items-center gap-2">
            {token.logoURI ? (
                 <Image src={token.logoURI} alt={token.symbol} width={20} height={20} className="rounded-full" />
            ) : (
                 <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs">{token.symbol.charAt(0)}</div>
            )}
            <span>{token.symbol}</span>
        </div>
    </SelectItem>
  )

  const renderTokenTriggerValue = (token: Token | undefined) => {
      if (!token) return <span className="text-muted-foreground">Select token</span>;
      return (
          <div className="flex items-center gap-2">
              {token.logoURI ? (
                    <Image src={token.logoURI} alt={token.symbol} width={20} height={20} className="rounded-full" />
              ) : (
                    <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs">{token.symbol.charAt(0)}</div>
              )}
              <span>{token.symbol}</span>
          </div>
      )
  }


   // Update totalLoading to include isSwapping (local) and isSolanaLoading (from context)
  const totalLoading = isSwapping || isSolanaLoading;

  return (
    <div className="container mx-auto p-4 md:p-8 flex flex-col items-center">
      <Card className="w-full max-w-md shadow-lg border border-border">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-primary">
            Raydium LazorKit Swap {/* Updated Title */}
          </CardTitle>
          <CardDescription className="text-center text-muted-foreground">
            {/* Update description based on isConnected */}
            {isConnected ? `Swap tokens securely using your Lazor wallet.` : 'Connect your Lazor wallet to swap.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Check isConnected instead of isAuthenticated */}
          {!isConnected ? (
             <div className="text-center p-6 bg-muted rounded-md">
                <Info className="mx-auto h-8 w-8 text-primary mb-2" />
                {/* Update prompt message */}
                <p className="text-muted-foreground">Please connect your Lazor wallet using the button in the header to enable swapping.</p>
            </div>
          ) : isLoadingTokens ? (
             <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
             </div>
          ) : (
            <form onSubmit={handleSwapSubmit} className="space-y-6">
              {/* Input Section - Check publicKey for balance display */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <Label htmlFor="input-token">You Pay</Label>
                    {/* Show balance only if connected (publicKey exists) and balance is loaded */}
                    {publicKey && inputBalance !== null && inputToken && (
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          className="text-xs h-auto p-0 text-primary hover:text-primary/80"
                          onClick={handleMaxBalance}
                          disabled={totalLoading}
                        >
                          Balance: {formatTokenAmount(inputBalance, inputToken.decimals)} {inputToken.symbol} (Max)
                        </Button>
                    )}
                     {publicKey && inputBalance === null && inputToken && (
                          <span className="text-xs text-muted-foreground">Loading balance...</span>
                     )}
                </div>
                 {/* Input fields remain the same */}
                <div className="flex gap-2">
                   <Select
                      value={inputToken?.address}
                      onValueChange={(value) => handleSelectToken('input', value)}
                      disabled={totalLoading}
                    >
                      <SelectTrigger id="input-token" aria-label="Select input token" className="w-1/3 min-w-[100px]">
                        <SelectValue placeholder="Token">
                           {renderTokenTriggerValue(inputToken)}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                         <SelectGroup>
                            <SelectLabel>Input Token</SelectLabel>
                            {supportedTokens.map(renderTokenSelectItem)}
                         </SelectGroup>
                      </SelectContent>
                    </Select>
                    <Input
                        id="input-amount"
                        type="text"
                        placeholder="0.0"
                        value={inputAmountString}
                        onChange={(e) => setInputAmountString(e.target.value.replace(/[^0-9.]/g, ''))}
                        required
                        className="w-2/3 text-right text-lg tabular-nums"
                        disabled={totalLoading}
                    />
                </div>
              </div>

              {/* Swap Direction Button (remains the same) */}
              <div className="flex justify-center my-[-1rem]">
                <Button variant="outline" size="icon" type="button" onClick={handleSwapDirection} disabled={totalLoading || !inputToken || !outputToken} className="z-10 bg-background border-2 border-border hover:bg-accent hover:text-accent-foreground rounded-full p-1 h-9 w-9">
                    <ArrowRightLeft className="h-4 w-4 text-primary group-hover:text-accent-foreground"/>
                    <span className="sr-only">Swap token direction</span>
                </Button>
              </div>

              {/* Output Section (remains the same) */}
              <div className="space-y-2">
                <Label htmlFor="output-token">You Receive (Estimated)</Label>
                 <div className="flex gap-2">
                    <Select
                        value={outputToken?.address}
                        onValueChange={(value) => handleSelectToken('output', value)}
                        disabled={totalLoading}
                      >
                        <SelectTrigger id="output-token" aria-label="Select output token" className="w-1/3 min-w-[100px]">
                           <SelectValue placeholder="Token">
                             {renderTokenTriggerValue(outputToken)}
                           </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                           <SelectGroup>
                                <SelectLabel>Output Token</SelectLabel>
                                {supportedTokens.map(renderTokenSelectItem)}
                            </SelectGroup>
                        </SelectContent>
                      </Select>
                       <div className="flex items-center justify-end border rounded-md px-3 py-2 h-10 w-2/3 bg-muted/50 text-lg tabular-nums">
                         {isLoadingEstimate ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : <span className="text-foreground">{estimatedOutput !== null && outputToken ? formatTokenAmount(estimatedOutput, outputToken.decimals) : '0.0'}</span>}
                      </div>
                 </div>
              </div>

             {/* Swap Button - Update disabled conditions and text */}
             <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-lg py-6"
                disabled={
                    !isConnected || // Must be connected
                    totalLoading || // Any loading state
                    isLoadingEstimate || // Estimate loading
                    !estimatedOutput || estimatedOutput <= 0 || // Valid estimate needed
                    (inputBalance !== null && parseTokenAmount(inputAmountString, inputToken?.decimals) > inputBalance) // Balance check
                 }
               >
                {totalLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Wallet className="mr-2 h-5 w-5" />}
                 {/* Update button text based on state */}
                 {!isConnected ? 'Connect Wallet' :
                  isSolanaLoading ? 'Connecting/Signing...' : // Combined loading text
                  isSwapping ? 'Processing Swap...' : // Local swap process
                  (inputBalance !== null && parseTokenAmount(inputAmountString, inputToken?.decimals) > inputBalance) ? 'Insufficient Balance' :
                  (!estimatedOutput || estimatedOutput <= 0) ? 'Enter Amount' :
                  'Swap Tokens'
                 }
              </Button>
            </form>
          )}
        </CardContent>
        {/* Footer remains the same for displaying swap results/errors */}
        {(swapError || swapSuccess || lazorError) && (
            <CardFooter className="flex flex-col gap-3 pt-4">
                  {lazorError && ( // Display LazorKit errors here too
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4"/>
                        <AlertTitle>Wallet Error</AlertTitle>
                        <AlertDescription className="break-words text-xs">{lazorError}</AlertDescription>
                    </Alert>
                 )}
                 {swapError && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4"/>
                        <AlertTitle>Swap Error</AlertTitle>
                        <AlertDescription className="break-words text-xs">{swapError}</AlertDescription>
                    </Alert>
                 )}
                 {swapSuccess && (
                    <Alert variant="default" className="border-green-500 dark:border-green-600 bg-green-50 dark:bg-green-900/20">
                         <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-500" />
                         <AlertTitle className="text-green-800 dark:text-green-400">Swap Successful</AlertTitle>
                         <AlertDescription className="break-all text-xs text-green-700 dark:text-green-300">{swapSuccess}</AlertDescription>
                    </Alert>
                 )}
            </CardFooter>
        )}
      </Card>
       <p className="text-xs text-muted-foreground mt-4 text-center max-w-md">
            {/* Updated disclaimer */}
           This is a demo using LazorKit for wallet connection and transaction signing, interacting with Raydium on Solana Devnet. Balances are mock data. Use with caution.
       </p>
    </div>
  );
}
