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

// Données de fallback pour assurer le fonctionnement de l'application en cas d'erreur API
const FALLBACK_PRICES: Record<string, CryptoPrice> = {
  'bitcoin': {
    id: 'bitcoin',
    symbol: 'btc',
    name: 'Bitcoin',
    current_price: 103771.00,
    price_change_percentage_24h: 1.53,
    image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png'
  },
  'ethereum': {
    id: 'ethereum',
    symbol: 'eth',
    name: 'Ethereum',
    current_price: 3256.42,
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
  }
};

// Fonction pour récupérer les prix depuis CoinGecko
export const fetchCryptoPrices = async (): Promise<Record<string, CryptoPrice>> => {
  const now = Date.now();
  
  // Utiliser le cache si les données sont récentes
  if (Object.keys(priceCache).length > 0 && now - lastFetchTime < CACHE_DURATION) {
    return priceCache;
  }
  
  try {
    // Tenter de récupérer les données depuis l'API CoinGecko avec un timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // Timeout de 8 secondes
    
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
    );
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data: CryptoPrice[] = await response.json();
    
    // Mettre à jour le cache
    const newCache: Record<string, CryptoPrice> = {};
    data.forEach(crypto => {
      newCache[crypto.id] = crypto;
    });
    
    priceCache = newCache;
    lastFetchTime = now;
    
    return priceCache;
  } catch (error) {
    console.error('Erreur de récupération des prix:', error);
    
    // Si nous avons un cache, l'utiliser même si expiré
    if (Object.keys(priceCache).length > 0) {
      return priceCache;
    }
    
    // Si vraiment rien, renvoyer les données de fallback
    console.log('Using fallback price data');
    return FALLBACK_PRICES;
  }
};

// Fonction pour obtenir le prix d'une seule crypto directement
const fetchSingleCryptoPrice = async (geckoId: string): Promise<CryptoPrice | null> => {
  try {
    // Vérifier si nous avons des données en cache récentes
    const cachedData = individualCache[geckoId];
    const now = Date.now();
    
    if (cachedData && (now - cachedData.timestamp) < CACHE_DURATION) {
      return cachedData.data;
    }
    
    // Si pas de cache ou expiré, faire une requête spécifique pour cette crypto avec timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // Timeout de 8 secondes
    
    try {
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
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        // Mettre à jour le cache individuel
        individualCache[geckoId] = {
          data: data[0],
          timestamp: now
        };
        
        return data[0];
      }
      
      // Si donnée pas trouvée, vérifier dans les fallbacks
      if (FALLBACK_PRICES[geckoId]) {
        return FALLBACK_PRICES[geckoId];
      }
      
      return null;
    } catch (fetchError) {
      console.error(`Erreur lors de la récupération du prix pour ${geckoId}:`, fetchError);
      
      // Check if we have fallback data
      if (FALLBACK_PRICES[geckoId]) {
        return FALLBACK_PRICES[geckoId];
      }
      
      // Try the cache even if expired
      if (cachedData) {
        return cachedData.data;
      }
      
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    console.error(`Erreur lors de la récupération du prix pour ${geckoId}:`, error);
    
    // Check fallback data first
    if (FALLBACK_PRICES[geckoId]) {
      return FALLBACK_PRICES[geckoId];
    }
    
    // Vérifier si nous avons des données en cache même si expirées
    const cachedData = individualCache[geckoId];
    if (cachedData) {
      return cachedData.data;
    }
    
    return null;
  }
};

// Fonction pour obtenir le prix d'une crypto spécifique
export const getCryptoPrice = async (id: string): Promise<CryptoPrice | null> => {
  try {
    // D'abord, vérifier dans le cache global
    const prices = await fetchCryptoPrices();
    if (prices[id]) {
      return prices[id];
    }
    
    // Si pas trouvé dans le cache global, essayer de récupérer individuellement
    return await fetchSingleCryptoPrice(id);
  } catch (error) {
    console.error(`Erreur lors de la récupération du prix pour ${id}:`, error);
    
    // Check fallback data first
    if (FALLBACK_PRICES[id]) {
      return FALLBACK_PRICES[id];
    }
    
    // Essayer de récupérer depuis le cache individuel
    const cachedData = individualCache[id];
    if (cachedData) {
      return cachedData.data;
    }
    
    // Create a minimal fallback object
    return {
      id,
      symbol: id.substring(0, 3),
      name: id.charAt(0).toUpperCase() + id.slice(1),
      current_price: 100,
      price_change_percentage_24h: 0,
      image: `https://placehold.co/32x32/3b82f6/FFFFFF?text=${id.substring(0, 3)}`
    };
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