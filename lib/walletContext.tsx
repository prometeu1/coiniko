"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { useToast } from "@/components/ui/use-toast";

// Types
export type CryptoHolding = {
  id: string;
  cryptoId: string;
  name?: string;
  symbol?: string;
  amount: number;
  averageBuyPrice: number;
  totalValue?: number;
};

export type Transaction = {
  id: string;
  cryptoId: string;
  cryptoName?: string;
  cryptoSymbol?: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  value?: number;
  timestamp: Date;
};

type WalletContextType = {
  balance: number;
  holdings: CryptoHolding[];
  transactions: Transaction[];
  addFunds: (amount: number) => Promise<boolean>;
  buyCrypto: (
    cryptoId: string,
    cryptoName: string,
    cryptoSymbol: string,
    amount: number,
    price: number
  ) => Promise<boolean>;
  sellCrypto: (
    cryptoId: string,
    cryptoName: string,
    cryptoSymbol: string,
    amount: number,
    price: number
  ) => Promise<boolean>;
  getCryptoHolding: (cryptoId: string) => CryptoHolding | undefined;
  isLoading: boolean;
  refreshWallet: () => Promise<void>;
};

const WalletContext = createContext<WalletContextType | null>(null);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [balance, setBalance] = useState<number>(0);
  const [holdings, setHoldings] = useState<CryptoHolding[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch wallet data when session changes
  useEffect(() => {
    if (status === 'authenticated' && session) {
      refreshWallet();
    } else if (status !== 'loading') {
      setIsLoading(false);
    }
  }, [session, status]);

  // Refresh wallet data from API
  const refreshWallet = async () => {
    if (status !== 'authenticated' || !session) return;
    
    setIsLoading(true);
    
    try {
      // Fetch balance
      const balanceRes = await fetch('/api/wallet/balance');
      if (balanceRes.ok) {
        const data = await balanceRes.json();
        setBalance(parseFloat(data.balance));
      }

      // Fetch holdings
      const holdingsRes = await fetch('/api/wallet/holdings');
      if (holdingsRes.ok) {
        const data = await holdingsRes.json();
        // Convert from DB format to app format
        const formattedHoldings = data.holdings.map((h: any) => ({
          id: h.id,
          cryptoId: h.crypto_id,
          amount: parseFloat(h.amount.toString()),
          averageBuyPrice: parseFloat(h.average_buy_price.toString()),
        }));
        setHoldings(formattedHoldings);
      }

      // Fetch transactions
      const transactionsRes = await fetch('/api/wallet/transactions');
      if (transactionsRes.ok) {
        const data = await transactionsRes.json();
        // Convert from DB format to app format
        const formattedTransactions = data.transactions.map((t: any) => ({
          id: t.id,
          cryptoId: t.crypto_id,
          type: t.transaction_type,
          amount: parseFloat(t.amount.toString()),
          price: parseFloat(t.price_at_transaction.toString()),
          timestamp: new Date(t.timestamp),
        }));
        setTransactions(formattedTransactions);
      }
    } catch (error) {
      console.error('Error refreshing wallet data:', error);
      toast({
        title: "Erreur",
        description: "Impossible de récupérer les données du portefeuille",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add funds to wallet
  const addFunds = async (amount: number): Promise<boolean> => {
    if (status !== 'authenticated' || !session) {
      toast({
        title: "Non connecté",
        description: "Vous devez être connecté pour ajouter des fonds",
        variant: "destructive",
      });
      return false;
    }
    
    try {
      const response = await fetch('/api/wallet/balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast({
          title: "Erreur",
          description: errorData.error || "Impossible d'ajouter des fonds",
          variant: "destructive",
        });
        return false;
      }
      
      const data = await response.json();
      setBalance(parseFloat(data.balance.toString()));
      
      toast({
        title: "Succès",
        description: `${amount}$ ont été ajoutés à votre portefeuille`,
        variant: "default",
      });
      
      return true;
    } catch (error) {
      console.error('Error adding funds:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter des fonds",
        variant: "destructive",
      });
      return false;
    }
  };

  // Find a crypto holding by ID
  const getCryptoHolding = (cryptoId: string) => {
    return holdings.find(holding => holding.cryptoId === cryptoId);
  };

  // Buy cryptocurrency
  const buyCrypto = async (
    cryptoId: string,
    cryptoName: string,
    cryptoSymbol: string,
    amount: number,
    price: number
  ): Promise<boolean> => {
    if (status !== 'authenticated' || !session) {
      toast({
        title: "Non connecté",
        description: "Vous devez être connecté pour acheter",
        variant: "destructive",
      });
      return false;
    }
    
    try {
      const response = await fetch('/api/wallet/holdings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          crypto_id: cryptoId,
          crypto_name: cryptoName,
          crypto_symbol: cryptoSymbol,
          amount,
          price,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast({
          title: "Erreur d'achat",
          description: errorData.error || "Impossible d'acheter cette crypto",
          variant: "destructive",
        });
        return false;
      }

      const data = await response.json();
      toast({
        title: "Achat réussi",
        description: `Vous avez acheté ${amount} ${cryptoSymbol}`,
        variant: "default",
      });
      
      // Refresh wallet data after successful purchase
      await refreshWallet();
      return true;
    } catch (error) {
      console.error('Error buying crypto:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'acheter cette crypto",
        variant: "destructive",
      });
      return false;
    }
  };

  // Sell cryptocurrency
  const sellCrypto = async (
    cryptoId: string,
    cryptoName: string,
    cryptoSymbol: string,
    amount: number,
    price: number
  ): Promise<boolean> => {
    if (status !== 'authenticated' || !session) {
      toast({
        title: "Non connecté",
        description: "Vous devez être connecté pour vendre",
        variant: "destructive",
      });
      return false;
    }
    
    try {
      const response = await fetch('/api/wallet/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          crypto_id: cryptoId,
          crypto_name: cryptoName,
          crypto_symbol: cryptoSymbol,
          amount,
          price,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast({
          title: "Erreur de vente",
          description: errorData.error || "Impossible de vendre cette crypto",
          variant: "destructive",
        });
        return false;
      }

      const data = await response.json();
      toast({
        title: "Vente réussie",
        description: `Vous avez vendu ${amount} ${cryptoSymbol}`,
        variant: "default",
      });
      
      // Refresh wallet data after successful sale
      await refreshWallet();
      return true;
    } catch (error) {
      console.error('Error selling crypto:', error);
      toast({
        title: "Erreur",
        description: "Impossible de vendre cette crypto",
        variant: "destructive",
      });
      return false;
    }
  };

  const value = {
    balance,
    holdings,
    transactions,
    addFunds,
    buyCrypto,
    sellCrypto,
    getCryptoHolding,
    isLoading,
    refreshWallet
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

export default WalletContext; 