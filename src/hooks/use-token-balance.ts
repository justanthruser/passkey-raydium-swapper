import { useState, useEffect } from 'react';
import { useSolana } from '@/context/solana-provider';
import { PublicKey, GetProgramAccountsFilter } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import type { Token } from '@/services/raydium';

export const useTokenBalance = (token: Token | undefined, publicKey: string | null): number | null => {
  const { connection } = useSolana();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!token || !publicKey || !connection) {
      setBalance(null);
      return;
    }

    const fetchBalance = async () => {
      try {
        console.log(publicKey);
        const owner = new PublicKey(publicKey);
        const mint = new PublicKey(token.address);

        const filters: GetProgramAccountsFilter[] = [
          { dataSize: 165 },
          { memcmp: { offset: 32, bytes: owner.toBase58() } },
          { memcmp: { offset: 0, bytes: mint.toBase58() } },
        ];

        const accounts = await connection.getProgramAccounts(TOKEN_PROGRAM_ID, { filters });
        if (accounts.length === 0) {
          setBalance(0);
          return;
        }

        const accountInfo = await connection.getAccountInfo(accounts[0].pubkey);
        if (accountInfo?.data) {
          const balance = Number(accountInfo.data.readBigUInt64LE(64)) / Math.pow(10, token.decimals);
          setBalance(balance);
        } else {
          setBalance(0);
        }
      } catch (error) {
        console.error(`Failed to fetch balance for ${token.symbol}:`, error);
        setBalance(null);
      }
    };

    fetchBalance();
  }, [token, publicKey, connection]);

  return balance;
};