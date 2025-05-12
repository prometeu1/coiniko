"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Types
export type CryptoHolding = {
  id: number;
  name: string;
  symbol: string;
  amount: number;
  purchasePrice: number;
  totalInvested: number;
};

export type Transaction = {
  id: string;
  cryptoId: number;
  cryptoName: string;
  cryptoSymbol: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  value: number;
  timestamp: number;
};

type WalletContextType = {
  balance: number;
  holdings: CryptoHolding[];
  transactions: Transaction[];
  addFunds: (amount: number) => void;
  buyCrypto: (
    cryptoId: number,
    cryptoName: string,
    cryptoSymbol: string,
    amount: number,
    price: number
  ) => boolean;
  sellCrypto: (
    cryptoId: number,
    cryptoName: string,
    cryptoSymbol: string,
    amount: number,
    price: number
  ) => boolean;
  getCryptoHolding: (cryptoId: number) => CryptoHolding | undefined;
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
  // Initial state with $10,000 starting balance
  const [balance, setBalance] = useState<number>(10000);
  const [holdings, setHoldings] = useState<CryptoHolding[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // Load data from localStorage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedBalance = localStorage.getItem('wallet_balance');
      const savedHoldings = localStorage.getItem('wallet_holdings');
      const savedTransactions = localStorage.getItem('wallet_transactions');

      if (savedBalance) setBalance(parseFloat(savedBalance));
      if (savedHoldings) setHoldings(JSON.parse(savedHoldings));
      if (savedTransactions) setTransactions(JSON.parse(savedTransactions));
    }
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('wallet_balance', balance.toString());
      localStorage.setItem('wallet_holdings', JSON.stringify(holdings));
      localStorage.setItem('wallet_transactions', JSON.stringify(transactions));
    }
  }, [balance, holdings, transactions]);

  // Add funds to wallet
  const addFunds = (amount: number) => {
    setBalance(prevBalance => prevBalance + amount);
  };

  // Find a crypto holding by ID
  const getCryptoHolding = (cryptoId: number) => {
    return holdings.find(holding => holding.id === cryptoId);
  };

  // Buy cryptocurrency
  const buyCrypto = (
    cryptoId: number,
    cryptoName: string,
    cryptoSymbol: string,
    amount: number,
    price: number
  ): boolean => {
    const totalCost = amount * price;
    
    // Check if user has enough balance
    if (totalCost > balance) {
      return false;
    }

    // Create a transaction record
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      cryptoId,
      cryptoName,
      cryptoSymbol,
      type: 'buy',
      amount,
      price,
      value: totalCost,
      timestamp: Date.now()
    };

    // Update holdings
    const existingHolding = holdings.find(h => h.id === cryptoId);
    
    if (existingHolding) {
      // Update existing holding
      const updatedHoldings = holdings.map(holding => {
        if (holding.id === cryptoId) {
          const newAmount = holding.amount + amount;
          const newTotalInvested = holding.totalInvested + totalCost;
          const newPurchasePrice = newTotalInvested / newAmount; // Average purchase price
          
          return {
            ...holding,
            amount: newAmount,
            purchasePrice: newPurchasePrice,
            totalInvested: newTotalInvested
          };
        }
        return holding;
      });
      
      setHoldings(updatedHoldings);
    } else {
      // Add new holding
      const newHolding: CryptoHolding = {
        id: cryptoId,
        name: cryptoName,
        symbol: cryptoSymbol,
        amount,
        purchasePrice: price,
        totalInvested: totalCost
      };
      
      setHoldings([...holdings, newHolding]);
    }

    // Update balance and add transaction
    setBalance(prevBalance => prevBalance - totalCost);
    setTransactions(prev => [newTransaction, ...prev]);
    
    return true;
  };

  // Sell cryptocurrency
  const sellCrypto = (
    cryptoId: number,
    cryptoName: string,
    cryptoSymbol: string,
    amount: number,
    price: number
  ): boolean => {
    const existingHolding = holdings.find(h => h.id === cryptoId);
    
    // Check if user has enough of this cryptocurrency
    if (!existingHolding || existingHolding.amount < amount) {
      return false;
    }

    const saleValue = amount * price;

    // Create a transaction record
    const newTransaction: Transaction = {
      id: Date.now().toString(),
      cryptoId,
      cryptoName,
      cryptoSymbol,
      type: 'sell',
      amount,
      price,
      value: saleValue,
      timestamp: Date.now()
    };

    // Update holdings
    const updatedHoldings = holdings.map(holding => {
      if (holding.id === cryptoId) {
        const newAmount = holding.amount - amount;
        const proportionSold = amount / holding.amount;
        const soldInvestment = holding.totalInvested * proportionSold;
        
        return {
          ...holding,
          amount: newAmount,
          totalInvested: holding.totalInvested - soldInvestment
        };
      }
      return holding;
    }).filter(holding => holding.amount > 0); // Remove holdings with zero amount
    
    // Update balance and add transaction
    setBalance(prevBalance => prevBalance + saleValue);
    setHoldings(updatedHoldings);
    setTransactions(prev => [newTransaction, ...prev]);
    
    return true;
  };

  const value = {
    balance,
    holdings,
    transactions,
    addFunds,
    buyCrypto,
    sellCrypto,
    getCryptoHolding
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
};

export default WalletContext; 