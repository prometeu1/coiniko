// Service pour récupérer les informations sur les cryptomonnaies
import { cache } from 'react';

// Type pour les données de prix
export interface CryptoPrice {
  id: string;
  symbol: string;
  name: string;
  current_price: number;
  price_change_percentage_24h: number;
  image: string;
}

// Cache des données pour éviter trop d'appels API
let priceCache: Record<string, CryptoPrice> = {};
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes en millisecondes
let individualCache: Record<string, { data: CryptoPrice, timestamp: number }> = {};

// Configuration de l'API avec clé d'API si disponible
const API_KEY = process.env.NEXT_PUBLIC_COINGECKO_API_KEY || '';
const API_BASE_URL = 'https://api.coingecko.com/api/v3';
const API_PARAMS = API_KEY ? `&x_cg_demo_api_key=${API_KEY}` : '';

// Options pour contrôler le nombre de tentatives et le délai entre les tentatives
const API_OPTIONS = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // Millisecondes
  REQUEST_TIMEOUT: 8000 // 8 secondes
};

// Fonction pour retarder l'exécution (pour les retries)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Fonction pour essayer de récupérer les données depuis le stockage local (si disponible)
const getFromLocalStorage = (key: string) => {
  if (typeof window === 'undefined') return null;
  
  try {
    const data = localStorage.getItem(key);
    const timestamp = localStorage.getItem(`${key}_timestamp`);
    
    if (data && timestamp) {
      const parsedTimestamp = parseInt(timestamp);
      // Vérifier si les données sont encore valides (moins de 15 minutes)
      if (Date.now() - parsedTimestamp < 15 * 60 * 1000) {
        console.log(`Using local storage data for ${key}`);
        return JSON.parse(data);
      }
    }
  } catch (error) {
    console.error('Error reading from localStorage:', error);
  }
  
  return null;
};

// Fonction pour enregistrer des données dans le stockage local (si disponible)
const saveToLocalStorage = (key: string, data: any) => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(key, JSON.stringify(data));
    localStorage.setItem(`${key}_timestamp`, Date.now().toString());
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

// Liste des IDs des cryptos les plus populaires
const POPULAR_CRYPTO_IDS = [
  'bitcoin',
  'ethereum',
  'binancecoin',
  'ripple',
  'cardano',
  'solana',
  'polkadot',
  'dogecoin',
  'shiba-inu',
  'litecoin',
  'avalanche-2',
  'chainlink',
  'matic-network',
  'uniswap',
  'cosmos',
  'hyperliquid',
  'arbitrum',
  'maker',
  'apecoin',
  'aave',
  'optimism',
  'fantom',
  'theta-token',
  'the-graph',
  'compound-governance-token'
];

// Ajouter plus de données de fallback
const FALLBACK_PRICES: Record<string, CryptoPrice> = {
  'bitcoin': {
    id: 'bitcoin',
    symbol: 'btc',
    name: 'Bitcoin',
    current_price: 68741.00,
    price_change_percentage_24h: 1.53,
    image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png'
  },
  'ethereum': {
    id: 'ethereum',
    symbol: 'eth',
    name: 'Ethereum',
    current_price: 3852.42,
    price_change_percentage_24h: 1.87,
    image: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png'
  },
  'binancecoin': {
    id: 'binancecoin',
    symbol: 'bnb',
    name: 'BNB',
    current_price: 572.45,
    price_change_percentage_24h: 0.76,
    image: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png'
  },
  'ripple': {
    id: 'ripple',
    symbol: 'xrp',
    name: 'XRP',
    current_price: 0.55,
    price_change_percentage_24h: 1.83,
    image: 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png'
  },
  'cardano': {
    id: 'cardano',
    symbol: 'ada',
    name: 'Cardano',
    current_price: 0.44,
    price_change_percentage_24h: 2.14,
    image: 'https://assets.coingecko.com/coins/images/975/large/cardano.png'
  },
  'solana': {
    id: 'solana',
    symbol: 'sol',
    name: 'Solana',
    current_price: 145.32,
    price_change_percentage_24h: 3.1,
    image: 'https://assets.coingecko.com/coins/images/4128/large/solana.png'
  },
  'polkadot': {
    id: 'polkadot',
    symbol: 'dot',
    name: 'Polkadot',
    current_price: 6.85,
    price_change_percentage_24h: 2.14,
    image: 'https://assets.coingecko.com/coins/images/12171/large/polkadot.png'
  },
  'dogecoin': {
    id: 'dogecoin',
    symbol: 'doge',
    name: 'Dogecoin',
    current_price: 0.1243,
    price_change_percentage_24h: 0.95,
    image: 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png'
  }
};

// Fonction pour récupérer les prix depuis CoinGecko avec retries
export const fetchCryptoPrices = async (): Promise<Record<string, CryptoPrice>> => {
  const now = Date.now();
  
  // Vérifier d'abord dans localStorage
  const localData = getFromLocalStorage('crypto_prices');
  if (localData) {
    // Mettre à jour le cache mémoire
    priceCache = localData;
    lastFetchTime = now;
    return localData;
  }
  
  // Utiliser le cache si les données sont récentes
  if (Object.keys(priceCache).length > 0 && now - lastFetchTime < CACHE_DURATION) {
    return priceCache;
  }
  
  let retryCount = 0;
  
  while (retryCount < API_OPTIONS.MAX_RETRIES) {
    try {
      // Tenter de récupérer les données depuis l'API CoinGecko avec un timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_OPTIONS.REQUEST_TIMEOUT);
      
      const response = await fetch(
        `${API_BASE_URL}/coins/markets?vs_currency=usd&ids=${POPULAR_CRYPTO_IDS.join(',')}&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h${API_PARAMS}`,
        { 
          signal: controller.signal,
          cache: 'no-store', // Éviter les problèmes de cache
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
      ).catch(err => {
        console.error(`Network error in fetchCryptoPrices:`, err);
        throw new Error(`Network error: ${err.message}`);
      });
      
      clearTimeout(timeoutId);
      
      // Gestion du cas rate limit (429)
      if (response.status === 429) {
        retryCount++;
        console.log(`Rate limited (429), attempt ${retryCount} of ${API_OPTIONS.MAX_RETRIES}`);
        
        if (retryCount < API_OPTIONS.MAX_RETRIES) {
          // Délai exponentiel entre les tentatives
          await delay(API_OPTIONS.RETRY_DELAY * Math.pow(2, retryCount));
          continue;
        } else {
          throw new Error(`Rate limited (429). Too many requests to the API.`);
        }
      }
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data: CryptoPrice[] = await response.json().catch(err => {
        console.error(`JSON parse error in fetchCryptoPrices:`, err);
        throw new Error(`JSON parse error: ${err.message}`);
      });
      
      // Mettre à jour le cache
      const newCache: Record<string, CryptoPrice> = {};
      data.forEach(crypto => {
        newCache[crypto.id] = crypto;
      });
      
      priceCache = newCache;
      lastFetchTime = now;
      
      // Sauvegarder dans localStorage
      saveToLocalStorage('crypto_prices', newCache);
      
      return priceCache;
    } catch (error) {
      console.error(`Attempt ${retryCount + 1} failed in fetchCryptoPrices:`, error);
      retryCount++;
      
      if (retryCount >= API_OPTIONS.MAX_RETRIES) {
        console.error('Tout les essais ont échoué, utilisation des fallback ou cache');
        break;
      }
      
      // Wait before retrying
      await delay(API_OPTIONS.RETRY_DELAY * Math.pow(2, retryCount));
    }
  }
  
  // Si nous avons un cache, l'utiliser même si expiré
  if (Object.keys(priceCache).length > 0) {
    console.log('Using memory cache after multiple failures');
    return priceCache;
  }
  
  // Si vraiment rien, renvoyer les données de fallback
  console.log('Using fallback price data');
  return FALLBACK_PRICES;
};

// Fonction pour obtenir le prix d'une seule crypto directement avec retry
const fetchSingleCryptoPrice = async (geckoId: string): Promise<CryptoPrice | null> => {
  try {
    // Vérifier d'abord dans localStorage
    const localStorageKey = `crypto_price_${geckoId}`;
    const localData = getFromLocalStorage(localStorageKey);
    if (localData) {
      // Mettre à jour le cache individuel en mémoire 
      individualCache[geckoId] = {
        data: localData,
        timestamp: Date.now()
      };
      return localData;
    }
    
    // Vérifier si nous avons des données en cache récentes
    const cachedData = individualCache[geckoId];
    const now = Date.now();
    
    if (cachedData && (now - cachedData.timestamp) < CACHE_DURATION) {
      return cachedData.data;
    }
    
    let retryCount = 0;
    
    while (retryCount < API_OPTIONS.MAX_RETRIES) {
      try {
        // Si pas de cache ou expiré, faire une requête spécifique pour cette crypto avec timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_OPTIONS.REQUEST_TIMEOUT);
        
        const response = await fetch(
          `${API_BASE_URL}/coins/markets?vs_currency=usd&ids=${geckoId}&order=market_cap_desc&per_page=1&page=1&sparkline=false&price_change_percentage=24h${API_PARAMS}`,
          { 
            signal: controller.signal,
            cache: 'no-store',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          }
        ).catch(err => {
          console.error(`Network error fetching ${geckoId}:`, err);
          throw new Error(`Network error: ${err.message}`);
        });
        
        clearTimeout(timeoutId);
        
        // Gestion du rate limit (429)
        if (response.status === 429) {
          retryCount++;
          console.log(`Rate limited (429), attempt ${retryCount} of ${API_OPTIONS.MAX_RETRIES}`);
          
          if (retryCount < API_OPTIONS.MAX_RETRIES) {
            // Délai exponentiel entre les tentatives
            await delay(API_OPTIONS.RETRY_DELAY * Math.pow(2, retryCount));
            continue;
          } else {
            throw new Error(`Rate limited (429). Too many requests to the API.`);
          }
        }
        
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        
        const data = await response.json().catch(err => {
          console.error(`JSON parse error for ${geckoId}:`, err);
          throw new Error(`JSON parse error: ${err.message}`);
        });
        
        if (data && data.length > 0) {
          // Mettre à jour le cache individuel
          individualCache[geckoId] = {
            data: data[0],
            timestamp: now
          };
          
          // Sauvegarder dans localStorage
          saveToLocalStorage(localStorageKey, data[0]);
          
          return data[0];
        }
        
        // Si donnée pas trouvée, vérifier dans les fallbacks
        if (FALLBACK_PRICES[geckoId]) {
          console.log(`Using fallback price for ${geckoId}`);
          return FALLBACK_PRICES[geckoId];
        }
        
        // Si pas de fallback spécifique mais que c'est bitcoin, ethereum ou bnb, créer un fallback générique
        if (['bitcoin', 'ethereum', 'binancecoin'].includes(geckoId)) {
          return FALLBACK_PRICES[geckoId];
        }
        
        // Créer un fallback générique
        const fallbackData = createFallbackCryptoPrice(geckoId);
        return fallbackData;
      } catch (fetchError) {
        console.error(`Attempt ${retryCount + 1} failed for ${geckoId}:`, fetchError);
        retryCount++;
        
        if (retryCount >= API_OPTIONS.MAX_RETRIES) {
          console.error(`All attempts failed for ${geckoId}`);
          break;
        }
        
        // Wait before retrying
        await delay(API_OPTIONS.RETRY_DELAY * Math.pow(2, retryCount));
      }
    }
    
    // Si toutes les tentatives échouent, vérifier dans les fallbacks
    if (FALLBACK_PRICES[geckoId]) {
      console.log(`Using fallback price after error for ${geckoId}`);
      return FALLBACK_PRICES[geckoId];
    }
    
    // Try the cache even if expired
    if (cachedData) {
      console.log(`Using expired cache for ${geckoId}`);
      return cachedData.data;
    }
    
    // Si pas de fallback ni de cache, créer un fallback générique
    return createFallbackCryptoPrice(geckoId);
  } catch (error) {
    console.error(`Erreur globale lors de la récupération du prix pour ${geckoId}:`, error);
    
    // Check fallback data first
    if (FALLBACK_PRICES[geckoId]) {
      console.log(`Using fallback price after global error for ${geckoId}`);
      return FALLBACK_PRICES[geckoId];
    }
    
    // Vérifier si nous avons des données en cache même si expirées
    const cachedData = individualCache[geckoId];
    if (cachedData) {
      console.log(`Using expired cache after global error for ${geckoId}`);
      return cachedData.data;
    }
    
    // Si tout échoue, créer un fallback générique
    return createFallbackCryptoPrice(geckoId);
  }
};

// Helper function to create consistent fallback data
const createFallbackCryptoPrice = (id: string): CryptoPrice => {
  // Générer un prix pseudo-aléatoire basé sur l'ID pour être cohérent
  // Utilise la somme des codes ASCII des caractères pour une certaine stabilité
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const basePrice = (hash % 1000) + 1; // Between 1 and 1000
  
  return {
    id,
    symbol: id.substring(0, 3),
    name: id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' '),
    current_price: basePrice,
    price_change_percentage_24h: ((hash % 20) - 10) / 10, // Between -1.0 and 1.0
    image: `https://placehold.co/32x32/3b82f6/FFFFFF?text=${id.substring(0, 3)}`
  };
};

// Fonction pour obtenir le prix d'une crypto spécifique
export const getCryptoPrice = async (id: string): Promise<CryptoPrice | null> => {
  try {
    // Try localStorage first
    const localStorageKey = `crypto_price_${id}`;
    const localData = getFromLocalStorage(localStorageKey);
    if (localData) {
      return localData;
    }
    
    // Check global cache
    const prices = await fetchCryptoPrices();
    if (prices[id]) {
      return prices[id];
    }
    
    // Check individual cache
    const individualData = individualCache[id];
    if (individualData && (Date.now() - individualData.timestamp < CACHE_DURATION)) {
      return individualData.data;
    }
    
    // Fetch individual price
    const singlePrice = await fetchSingleCryptoPrice(id);
    if (singlePrice) {
      return singlePrice;
    }
    
    // Si tout échoue, créer une réponse de secours
    console.log(`Creating fallback data for ${id} as all other methods failed`);
    return createFallbackCryptoPrice(id);
  } catch (error) {
    console.error(`Erreur lors de la récupération du prix pour ${id}:`, error);
    
    // Check fallback data first
    if (FALLBACK_PRICES[id]) {
      console.log(`Using predefined fallback for ${id} after error in getCryptoPrice`);
      return FALLBACK_PRICES[id];
    }
    
    // Essayer de récupérer depuis le cache individuel
    const cachedData = individualCache[id];
    if (cachedData) {
      console.log(`Using cached data for ${id} after error in getCryptoPrice`);
      return cachedData.data;
    }
    
    // Create a minimal fallback object
    return createFallbackCryptoPrice(id);
  }
};

// Fonction pour mapper un ID de CoinMarketCap à un ID de CoinGecko
export const mapCoinMarketCapToGeckoId = (coinMarketCapId: string): string => {
  // Mappings connus
  const mappings: Record<string, string> = {
    '1': 'bitcoin',
    '1027': 'ethereum',
    '1839': 'binancecoin',
    '52': 'ripple',
    '2010': 'cardano',
    '5426': 'solana',
    '6636': 'polkadot',
    '74': 'dogecoin',
    '5994': 'shiba-inu',
    '2': 'litecoin',
    '5805': 'avalanche-2',
    '1975': 'chainlink',
    '3890': 'matic-network',
    '7083': 'uniswap',
    '3794': 'cosmos',
    // Ajout de plus de mappings
    '792.567400': 'hyperliquid',
    '792567400': 'hyperliquid',
    '421008.398037': 'arbitrum',
    '421008398037': 'arbitrum',
    '1518': 'maker',
    '18876': 'apecoin',
    '7278': 'aave',
    '11840': 'optimism',
    '3513': 'fantom',
    '2416': 'theta-token',
    '6719': 'the-graph',
    '5692': 'compound-governance-token'
  };
  
  return mappings[coinMarketCapId] || coinMarketCapId;
};

// Export des symboles communs pour faciliter l'utilisation
export const CRYPTO_SYMBOLS: Record<string, string> = {
  'bitcoin': 'BTC',
  'ethereum': 'ETH',
  'binancecoin': 'BNB',
  'ripple': 'XRP',
  'cardano': 'ADA',
  'solana': 'SOL',
  'polkadot': 'DOT',
  'dogecoin': 'DOGE',
  'shiba-inu': 'SHIB',
  'litecoin': 'LTC',
  'avalanche-2': 'AVAX',
  'chainlink': 'LINK',
  'matic-network': 'MATIC',
  'uniswap': 'UNI',
  'cosmos': 'ATOM',
  'hyperliquid': 'HYPE',
  'arbitrum': 'ARB',
  'maker': 'MKR',
  'apecoin': 'APE',
  'aave': 'AAVE',
  'optimism': 'OP',
  'fantom': 'FTM',
  'theta-token': 'THETA',
  'the-graph': 'GRT',
  'compound-governance-token': 'COMP'
}; 