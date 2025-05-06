// src/services/raydium.ts
export interface Token {
  address: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
}

export interface SwapTransaction {
  inputToken: Token;
  outputToken: Token;
  inputAmount: number;
  expectedOutputAmount: number;
  slippage?: number;
}

export async function getSupportedTokens(): Promise<Token[]> {
  // Fetch from Raydium SDK or API
  return [
    { address: 'So11111111111111111111111111111111111111112', symbol: 'SOL', decimals: 9, logoURI: '...' },
    { address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', symbol: 'USDC', decimals: 6, logoURI: '...' },
  ];
}

export async function estimateOutputAmount(details: SwapTransaction): Promise<number> {
  // Use Raydium SDK to estimate output
  return details.inputAmount * 0.99; // Placeholder
}