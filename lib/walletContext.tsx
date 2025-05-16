"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { useToast } from "@/components/ui/use-toast";

// Types
export type Holding = {
  id: string;
  cryptoId: string;
  name: string;
  symbol: string;
  amount: number;
  purchasePrice: number;
  totalInvested: number;
};

export type Transaction = {
  id: string;
  cryptoId: string;
  cryptoName: string;
  cryptoSymbol: string;
  amount: number;
  price: number;
  type: 'buy' | 'sell';
  timestamp: number;
};

interface WalletContextType {
  balance: number;
  holdings: Holding[];
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  refreshWallet: () => Promise<void>;
  getCryptoHolding: (cryptoId: string | number) => Holding | undefined;
  buyCrypto: (
    cryptoId: string,
    cryptoName: string,
    cryptoSymbol: string,
    amount: number,
    price: number
  ) => boolean;
  sellCrypto: (
    cryptoId: string,
    cryptoName: string,
    cryptoSymbol: string,
    amount: number,
    price: number
  ) => boolean;
}

const WalletContext = createContext<WalletContextType>({
  balance: 0,
  holdings: [],
  transactions: [],
  isLoading: true,
  error: null,
  refreshWallet: async () => {},
  getCryptoHolding: () => undefined,
  buyCrypto: () => false,
  sellCrypto: () => false
});

export const useWallet = () => useContext(WalletContext);

// Fonction pour générer un ID unique
const generateId = () => {
  return 'id-' + Math.random().toString(36).substr(2, 9) + '-' + Date.now().toString(36);
};

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [balance, setBalance] = useState<number>(0);
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWalletData = async () => {
    if (status !== 'authenticated' || !session) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Récupérer le solde
      const balanceResponse = await fetch('/api/wallet/balance');
      if (!balanceResponse.ok) {
        throw new Error('Erreur lors de la récupération du solde');
      }
      const balanceData = await balanceResponse.json();
      setBalance(balanceData.balance || 0);

      // Récupérer les investissements
      const holdingsResponse = await fetch('/api/wallet/holdings');
      if (!holdingsResponse.ok) {
        throw new Error('Erreur lors de la récupération des investissements');
      }
      const holdingsData = await holdingsResponse.json();
      
      // Transformer les données pour correspondre à notre format
      const formattedHoldings = holdingsData.map((h: any) => ({
        id: h.id,
        cryptoId: h.crypto_id,
        name: h.crypto_name || 'Crypto',
        symbol: h.crypto_symbol || 'CRYPTO',
        amount: parseFloat(h.amount) || 0,
        purchasePrice: parseFloat(h.average_buy_price) || 0,
        totalInvested: parseFloat(h.amount) * parseFloat(h.average_buy_price) || 0
      }));
      
      setHoldings(formattedHoldings);

      // Récupérer les transactions
      const transactionsResponse = await fetch('/api/wallet/transactions');
      if (!transactionsResponse.ok) {
        throw new Error('Erreur lors de la récupération des transactions');
      }
      const transactionsData = await transactionsResponse.json();
      
      // Transformer les transactions pour correspondre à notre format
      const formattedTransactions = transactionsData.map((t: any) => ({
        id: t.id,
        cryptoId: t.crypto_id,
        cryptoName: t.crypto_name || 'Crypto',
        cryptoSymbol: t.crypto_symbol || 'CRYPTO',
        amount: parseFloat(t.amount) || 0,
        price: parseFloat(t.price_at_transaction) || 0,
        type: t.transaction_type as 'buy' | 'sell',
        timestamp: new Date(t.timestamp).getTime()
      }));
      
      setTransactions(formattedTransactions);
    } catch (err) {
      console.error('Erreur lors de la récupération des données du portefeuille:', err);
      setError('Erreur lors de la récupération des données du portefeuille');
      
      // En cas d'erreur, définir des valeurs par défaut
      setBalance(100000);
      setHoldings([]);
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'loading') return;
    fetchWalletData();
  }, [status, session]);

  const refreshWallet = async () => {
    await fetchWalletData();
  };

  // Fonction pour trouver un crypto holding par ID
  const getCryptoHolding = (cryptoId: string | number): Holding | undefined => {
    const idString = String(cryptoId);
    return holdings.find(holding => holding.cryptoId === idString);
  };

  // Fonction pour acheter une crypto
  const buyCrypto = (
    cryptoId: string,
    cryptoName: string,
    cryptoSymbol: string,
    amount: number,
    price: number
  ): boolean => {
    // Vérifier si l'utilisateur a assez d'argent
    const cost = amount * price;
    // Fix for 100% purchase - use a small epsilon value to account for floating point precision
    const EPSILON = 0.00001; // Marge d'erreur pour les calculs à virgule flottante
    
    if (cost > balance + EPSILON) {
      toast({
        title: "Fonds insuffisants",
        description: "Vous n'avez pas assez de fonds pour cet achat.",
        variant: "destructive",
      });
      return false;
    }

    // Si l'achat est presque égal au solde complet (à l'EPSILON près), utiliser tout le solde
    const actualCost = Math.abs(cost - balance) < EPSILON ? balance : cost;
    const actualAmount = actualCost / price;
    
    // Simuler l'achat côté client pour une expérience fluide
    // Mettre à jour le solde
    setBalance(prevBalance => prevBalance - actualCost);
    
    // Ajouter ou mettre à jour le holding
    const existingHoldingIndex = holdings.findIndex(h => h.cryptoId === cryptoId);
    if (existingHoldingIndex >= 0) {
      const updatedHoldings = [...holdings];
      const existingHolding = updatedHoldings[existingHoldingIndex];
      const newAmount = existingHolding.amount + actualAmount;
      const newTotalInvested = existingHolding.totalInvested + actualCost;
      const newAveragePrice = newTotalInvested / newAmount;
      
      updatedHoldings[existingHoldingIndex] = {
        ...existingHolding,
        amount: newAmount,
        purchasePrice: newAveragePrice,
        totalInvested: newTotalInvested
      };
      
      setHoldings(updatedHoldings);
    } else {
      // Créer un nouveau holding
      const newHolding: Holding = {
        id: generateId(),
        cryptoId,
        name: cryptoName,
        symbol: cryptoSymbol,
        amount: actualAmount,
        purchasePrice: price,
        totalInvested: actualCost
      };
      
      setHoldings(prevHoldings => [...prevHoldings, newHolding]);
    }
    
    // Ajouter la transaction
    const newTransaction: Transaction = {
      id: generateId(),
      cryptoId,
      cryptoName,
      cryptoSymbol,
      amount: actualAmount,
      price,
      type: 'buy',
      timestamp: Date.now()
    };
    
    setTransactions(prevTransactions => [newTransaction, ...prevTransactions]);
    
    // Appeler l'API pour mettre à jour le portefeuille côté serveur
    // Cette partie est asynchrone, mais nous ne l'attendons pas pour une meilleure UX
    fetch('/api/wallet/holdings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        crypto_id: cryptoId,
        crypto_name: cryptoName,
        crypto_symbol: cryptoSymbol,
        amount: actualAmount,
        price,
      }),
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Erreur lors de l\'achat côté serveur');
      }
      return response.json();
    })
    .then(data => {
      console.log('Achat réussi:', data);
      // Rafraîchir les données après l'achat réussi
      setTimeout(() => refreshWallet(), 500);
    })
    .catch(err => {
      console.error('Erreur lors de l\'achat côté serveur:', err);
      // En cas d'erreur, on raffraîchit les données pour synchroniser
      setTimeout(() => refreshWallet(), 500);
    });
    
    return true;
  };
  
  // Fonction pour vendre une crypto
  const sellCrypto = (
    cryptoId: string,
    cryptoName: string,
    cryptoSymbol: string,
    amount: number,
    price: number
  ): boolean => {
    // Vérifier si l'utilisateur possède cette crypto et en quantité suffisante
    const holding = getCryptoHolding(cryptoId);
    if (!holding || holding.amount < amount) {
      toast({
        title: "Quantité insuffisante",
        description: "Vous ne possédez pas suffisamment de cette crypto.",
        variant: "destructive",
      });
      return false;
    }
    
    // Calculer la valeur de la vente
    const saleValue = amount * price;
    
    // Simuler la vente côté client pour une expérience fluide
    // Mettre à jour le solde
    setBalance(prevBalance => prevBalance + saleValue);
    
    // Mettre à jour ou supprimer le holding
    const updatedHoldings = [...holdings];
    const holdingIndex = updatedHoldings.findIndex(h => h.cryptoId === cryptoId);
    
    if (holdingIndex >= 0) {
      const holding = updatedHoldings[holdingIndex];
      const newAmount = holding.amount - amount;
      
      if (newAmount <= 0) {
        // Supprimer le holding si la quantité devient 0 ou négative
        updatedHoldings.splice(holdingIndex, 1);
      } else {
        // Mettre à jour le holding avec la nouvelle quantité
        // Note: le prix moyen d'achat reste le même
        updatedHoldings[holdingIndex] = {
          ...holding,
          amount: newAmount,
          totalInvested: holding.totalInvested * (newAmount / holding.amount)
        };
      }
      
      setHoldings(updatedHoldings);
    }
    
    // Ajouter la transaction
    const newTransaction: Transaction = {
      id: generateId(),
      cryptoId,
      cryptoName,
      cryptoSymbol,
      amount,
      price,
      type: 'sell',
      timestamp: Date.now()
    };
    
    setTransactions(prevTransactions => [newTransaction, ...prevTransactions]);
    
    // Appeler l'API pour mettre à jour le portefeuille côté serveur
    fetch('/api/wallet/transactions', {
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
        transaction_type: 'sell'
      }),
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Erreur lors de la vente côté serveur');
      }
      return response.json();
    })
    .then(data => {
      console.log('Vente réussie:', data);
      // Rafraîchir les données après la vente réussie
      setTimeout(() => refreshWallet(), 500);
    })
    .catch(err => {
      console.error('Erreur lors de la vente côté serveur:', err);
      // En cas d'erreur, on raffraîchit les données pour synchroniser
      setTimeout(() => refreshWallet(), 500);
    });
    
    return true;
  };

  return (
    <WalletContext.Provider value={{ 
      balance, 
      holdings, 
      transactions, 
      isLoading, 
      error,
      refreshWallet,
      getCryptoHolding,
      buyCrypto,
      sellCrypto
    }}>
      {children}
    </WalletContext.Provider>
  );
};

export default WalletContext; 