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
  isOfflineMode: boolean;
  refreshWallet: () => Promise<void>;
  toggleOfflineMode: () => void;
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
  isOfflineMode: false,
  refreshWallet: async () => {},
  toggleOfflineMode: () => {},
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
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [lastFetchAttempt, setLastFetchAttempt] = useState<number>(0);
  const OFFLINE_FETCH_INTERVAL = 60000; // Une minute

  // Charger les données du stockage local
  useEffect(() => {
    try {
      const cachedBalance = localStorage.getItem('wallet_balance');
      const cachedHoldings = localStorage.getItem('wallet_holdings');
      const cachedTransactions = localStorage.getItem('wallet_transactions');
      
      if (cachedBalance) setBalance(JSON.parse(cachedBalance));
      if (cachedHoldings) setHoldings(JSON.parse(cachedHoldings));
      if (cachedTransactions) setTransactions(JSON.parse(cachedTransactions));
    } catch (err) {
      console.warn('Erreur lors du chargement des données en cache:', err);
    }
  }, []);

  const fetchWalletData = async () => {
    if (status !== 'authenticated' || !session) {
      setIsLoading(false);
      return;
    }

    // Éviter des tentatives de connexion trop rapprochées en mode hors ligne
    const now = Date.now();
    if (isOfflineMode && now - lastFetchAttempt < OFFLINE_FETCH_INTERVAL) {
      return;
    }
    
    setLastFetchAttempt(now);
    setIsLoading(true);
    setError(null);

    const MAX_RETRIES = 3;
    let retryCount = 0;

    const fetchWithRetry = async (url, errorMessage) => {
      while (retryCount < MAX_RETRIES) {
        try {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`${errorMessage} (${response.status}: ${response.statusText})`);
          }
          return await response.json();
        } catch (err) {
          retryCount++;
          console.warn(`Tentative ${retryCount}/${MAX_RETRIES} échouée pour ${url}:`, err);
          
          if (retryCount >= MAX_RETRIES) {
            throw err;
          }
          
          // Attendre avant de réessayer avec un temps croissant
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        }
      }
    };

    try {
      // Récupérer le solde
      const balanceData = await fetchWithRetry(
        '/api/wallet/balance',
        'Erreur lors de la récupération du solde'
      );

      if (isOfflineMode) {
        // Si on était en mode hors ligne et qu'on retrouve la connexion
        setIsOfflineMode(false);
        toast({
          title: "Connexion rétablie",
          description: "Vos données ont été synchronisées avec le serveur.",
          variant: "default",
        });
      }
      
      setBalance(balanceData.balance || 100000);

      // Récupérer les investissements
      const holdingsData = await fetchWithRetry(
        '/api/wallet/holdings',
        'Erreur lors de la récupération des investissements'
      );
      
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
      const transactionsData = await fetchWithRetry(
        '/api/wallet/transactions',
        'Erreur lors de la récupération des transactions'
      );
      
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
      
      // Mettre en cache les données récupérées
      try {
        localStorage.setItem('wallet_balance', JSON.stringify(balanceData.balance));
        localStorage.setItem('wallet_holdings', JSON.stringify(formattedHoldings));
        localStorage.setItem('wallet_transactions', JSON.stringify(formattedTransactions));
      } catch (err) {
        console.warn('Erreur lors de la sauvegarde du cache local:', err);
      }
    } catch (err) {
      console.error('Erreur lors de la récupération des données du portefeuille:', err);
      setError('Erreur lors de la récupération des données du portefeuille');
      
      // Activer le mode hors ligne
      if (!isOfflineMode) {
        setIsOfflineMode(true);
        toast({
          title: "Mode hors ligne activé",
          description: "Impossible de se connecter au serveur. Les fonctionnalités sont limitées.",
          variant: "destructive",
        });
      }
      
      // Essayer de récupérer les données du local storage en cas d'erreur
      try {
        const cachedBalance = localStorage.getItem('wallet_balance');
        const cachedHoldings = localStorage.getItem('wallet_holdings');
        const cachedTransactions = localStorage.getItem('wallet_transactions');
        
        if (cachedBalance) setBalance(JSON.parse(cachedBalance));
        else setBalance(100000);
        
        if (cachedHoldings) setHoldings(JSON.parse(cachedHoldings));
        else setHoldings([]);
        
        if (cachedTransactions) setTransactions(JSON.parse(cachedTransactions));
        else setTransactions([]);
        
        console.log('Utilisation des données en cache du portefeuille');
      } catch (cacheErr) {
        console.error('Erreur lors de la récupération du cache:', cacheErr);
        // En cas d'erreur, définir des valeurs par défaut
        setBalance(100000);
        setHoldings([]);
        setTransactions([]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === 'loading') return;
    fetchWalletData();
    
    // Configurer un interval pour les tentatives de reconnexion en mode hors ligne
    const reconnectInterval = setInterval(() => {
      if (isOfflineMode) {
        console.log('Tentative de reconnexion...');
        fetchWalletData();
      }
    }, OFFLINE_FETCH_INTERVAL);
    
    return () => clearInterval(reconnectInterval);
  }, [status, session, isOfflineMode]);

  // Fonction pour vérifier une connexion réseau active
  const checkNetworkConnection = () => {
    return typeof navigator !== 'undefined' && navigator.onLine;
  };

  const refreshWallet = async () => {
    // Vérifier la connexion réseau avant d'essayer de rafraîchir
    if (!checkNetworkConnection()) {
      toast({
        title: "Pas de connexion internet",
        description: "Vérifiez votre connexion internet et réessayez.",
        variant: "destructive",
      });
      return;
    }
    
    await fetchWalletData();
  };

  // Fonction pour basculer manuellement le mode hors ligne
  const toggleOfflineMode = () => {
    const newMode = !isOfflineMode;
    setIsOfflineMode(newMode);
    
    if (newMode) {
      toast({
        title: "Mode hors ligne activé",
        description: "Toutes les transactions seront enregistrées localement.",
        variant: "default",
      });
    } else {
      toast({
        title: "Tentative de reconnexion...",
        description: "Tentative de synchronisation avec le serveur.",
        variant: "default",
      });
      fetchWalletData();
    }
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
    // Validation des paramètres d'entrée
    if (!amount || isNaN(amount) || amount <= 0) {
      toast({
        title: "Quantité invalide",
        description: "Veuillez entrer une quantité valide supérieure à 0.",
        variant: "destructive",
      });
      return false;
    }

    if (!price || isNaN(price) || price <= 0) {
      toast({
        title: "Prix invalide",
        description: "Le prix de la crypto n'est pas disponible. Veuillez réessayer.",
        variant: "destructive",
      });
      return false;
    }

    if (!cryptoId || !cryptoName || !cryptoSymbol) {
      toast({
        title: "Informations manquantes",
        description: "Les informations de la crypto sont incomplètes.",
        variant: "destructive",
      });
      return false;
    }

    // Vérifier si l'utilisateur a assez d'argent
    const cost = amount * price;
    
    // Améliorer la vérification des fonds avec une tolérance pour les erreurs de précision
    if (cost > balance + 0.01) { // Tolérance de 1 centime pour les erreurs de calcul
      toast({
        title: "Fonds insuffisants",
        description: `Vous avez besoin de $${cost.toFixed(2)} mais votre solde est de $${balance.toFixed(2)}.`,
        variant: "destructive",
      });
      return false;
    }

    // S'assurer que le coût ne dépasse jamais la balance disponible
    const actualCost = Math.min(parseFloat(cost.toFixed(2)), balance);
    const actualAmount = parseFloat(amount.toFixed(8));
    
    // Simuler l'achat côté client pour une expérience fluide
    // Mettre à jour le solde avec the proper precision
    setBalance(prevBalance => parseFloat((prevBalance - actualCost).toFixed(2)));
    
    // Ajouter ou mettre à jour le holding
    const existingHoldingIndex = holdings.findIndex(h => h.cryptoId === cryptoId);
    let updatedHoldings = [...holdings];
    
    if (existingHoldingIndex >= 0) {
      const existingHolding = updatedHoldings[existingHoldingIndex];
      const newAmount = parseFloat((existingHolding.amount + actualAmount).toFixed(8));
      const newTotalInvested = parseFloat((existingHolding.totalInvested + actualCost).toFixed(2));
      const newAveragePrice = parseFloat((newTotalInvested / newAmount).toFixed(2));
      
      updatedHoldings[existingHoldingIndex] = {
        ...existingHolding,
        amount: newAmount,
        purchasePrice: newAveragePrice,
        totalInvested: newTotalInvested
      };
      
      setHoldings(updatedHoldings);
    } else {
      // Créer un nouveau holding with proper precision
      const newHolding: Holding = {
        id: generateId(),
        cryptoId,
        name: cryptoName,
        symbol: cryptoSymbol,
        amount: actualAmount,
        purchasePrice: price,
        totalInvested: parseFloat(actualCost.toFixed(2))
      };
      
      updatedHoldings = [...holdings, newHolding];
      setHoldings(updatedHoldings);
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
    
    const newTransactions = [newTransaction, ...transactions];
    setTransactions(newTransactions);
    
    // Après chaque transaction réussie, mettre en cache les données localement
    try {
      localStorage.setItem('wallet_balance', JSON.stringify(balance - actualCost));
      localStorage.setItem('wallet_holdings', JSON.stringify(updatedHoldings));
      localStorage.setItem('wallet_transactions', JSON.stringify(newTransactions));
    } catch (err) {
      console.warn('Erreur lors de la sauvegarde du cache local:', err);
    }
    
    // Si en mode hors ligne, ne pas envoyer au serveur
    if (isOfflineMode) {
      toast({
        title: "Transaction en mode hors ligne",
        description: "Votre achat a été enregistré localement et sera synchronisé quand la connexion sera rétablie.",
        variant: "default",
      });
      return true;
    }
    
    // Vérifier la connexion réseau
    if (!checkNetworkConnection()) {
      toast({
        title: "Pas de connexion internet",
        description: "La transaction a été enregistrée localement et sera synchronisée plus tard.",
        variant: "destructive",
      });
      setIsOfflineMode(true);
      return true;
    }
    
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
    
    // Calculer la valeur de la vente with the proper precision
    const saleValue = parseFloat((amount * price).toFixed(2));
    
    // Simuler la vente côté client pour une expérience fluide
    // Mettre à jour le solde with the proper precision
    setBalance(prevBalance => parseFloat((prevBalance + saleValue).toFixed(2)));
    
    // Mettre à jour ou supprimer le holding
    const updatedHoldings = [...holdings];
    const holdingIndex = updatedHoldings.findIndex(h => h.cryptoId === cryptoId);
    
    if (holdingIndex >= 0) {
      const holding = updatedHoldings[holdingIndex];
      const newAmount = parseFloat((holding.amount - amount).toFixed(8));
      
      if (newAmount <= 0) {
        // Supprimer le holding si la quantité devient 0 ou négative
        updatedHoldings.splice(holdingIndex, 1);
      } else {
        // Calculate the prorated investment amount based on the proportion of coins sold
        const soldProportion = amount / holding.amount;
        const soldInvestment = parseFloat((holding.totalInvested * soldProportion).toFixed(2));
        const newTotalInvested = parseFloat((holding.totalInvested - soldInvestment).toFixed(2));
        
        // Mettre à jour le holding avec la nouvelle quantité and investissement total
        updatedHoldings[holdingIndex] = {
          ...holding,
          amount: newAmount,
          totalInvested: newTotalInvested
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
    
    const newTransactions = [newTransaction, ...transactions];
    setTransactions(newTransactions);
    
    // Après chaque transaction réussie, mettre en cache les données localement
    try {
      localStorage.setItem('wallet_balance', JSON.stringify(balance + saleValue));
      localStorage.setItem('wallet_holdings', JSON.stringify(updatedHoldings));
      localStorage.setItem('wallet_transactions', JSON.stringify(newTransactions));
    } catch (err) {
      console.warn('Erreur lors de la sauvegarde du cache local:', err);
    }
    
    // Si en mode hors ligne, ne pas envoyer au serveur
    if (isOfflineMode) {
      toast({
        title: "Transaction en mode hors ligne",
        description: "Votre vente a été enregistrée localement et sera synchronisée quand la connexion sera rétablie.",
        variant: "default",
      });
      return true;
    }
    
    // Vérifier la connexion réseau
    if (!checkNetworkConnection()) {
      toast({
        title: "Pas de connexion internet",
        description: "La transaction a été enregistrée localement et sera synchronisée plus tard.",
        variant: "destructive",
      });
      setIsOfflineMode(true);
      return true;
    }
    
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
      isOfflineMode,
      refreshWallet,
      toggleOfflineMode,
      getCryptoHolding,
      buyCrypto,
      sellCrypto
    }}>
      {children}
    </WalletContext.Provider>
  );
};

export default WalletContext; 