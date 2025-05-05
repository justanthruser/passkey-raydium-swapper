import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a token amount from its smallest unit (e.g., lamports) to a decimal string.
 * @param amount The amount in the smallest unit (e.g., BigInt or number).
 * @param decimals The number of decimal places for the token.
 * @returns A formatted string representation of the amount, or '0.0' if amount is invalid.
 */
export function formatTokenAmount(amount: number | bigint | null | undefined, decimals: number): string {
  if (amount === null || amount === undefined || decimals < 0) {
    return '0.0';
  }

  const factor = BigInt(10) ** BigInt(decimals);
  const amountBigInt = BigInt(amount);

  const integerPart = amountBigInt / factor;
  const fractionalPart = amountBigInt % factor;

  if (fractionalPart === 0n) {
    return integerPart.toString(); // Return whole number if no fractional part
  }

  // Pad fractional part with leading zeros if necessary
  const fractionalString = fractionalPart.toString().padStart(decimals, '0');
  // Remove trailing zeros from fractional part
  const trimmedFractional = fractionalString.replace(/0+$/, '');

  // If all fractional digits were zeros, return only the integer part
  if (trimmedFractional.length === 0) {
    return integerPart.toString();
  }

  return `${integerPart}.${trimmedFractional}`;
}


/**
 * Parses a decimal string representation of a token amount into its smallest unit (e.g., lamports).
 * @param amountString The decimal string representation of the amount.
 * @param decimals The number of decimal places for the token.
 * @returns The amount in the smallest unit as a bigint, or 0n if the input is invalid.
 */
export function parseTokenAmount(amountString: string | null | undefined, decimals: number | undefined): bigint {
  if (!amountString || typeof decimals !== 'number' || decimals < 0 || isNaN(decimals)) {
    return 0n;
  }

  // Remove any non-numeric characters except the decimal point
  const sanitizedAmount = amountString.replace(/[^0-9.]/g, '');
  const parts = sanitizedAmount.split('.');

  // Ensure there's at most one decimal point
  if (parts.length > 2) {
    return 0n;
  }

  let integerPart = parts[0] || '0';
  let fractionalPart = parts[1] || '';

   // Ensure fractional part does not exceed the number of decimals
   if (fractionalPart.length > decimals) {
      fractionalPart = fractionalPart.substring(0, decimals);
   }

  // Pad fractional part with trailing zeros if necessary
  fractionalPart = fractionalPart.padEnd(decimals, '0');

  // Combine integer and fractional parts
  const combinedString = integerPart + fractionalPart;

  try {
    // Convert to BigInt
    const amountBigInt = BigInt(combinedString);
    return amountBigInt;
  } catch (error) {
    console.error("Error parsing token amount:", error);
    return 0n; // Return 0 if conversion fails
  }
}
