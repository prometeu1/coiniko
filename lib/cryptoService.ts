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
  'cosmos'
];

// Fonction pour récupérer les prix depuis CoinGecko
export const fetchCryptoPrices = async (): Promise<Record<string, CryptoPrice>> => {
  const now = Date.now();
  
  // Utiliser le cache si les données sont récentes
  if (Object.keys(priceCache).length > 0 && now - lastFetchTime < CACHE_DURATION) {
    return priceCache;
  }
  
  try {
    // Récupérer les données depuis l'API CoinGecko
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${POPULAR_CRYPTO_IDS.join(',')}&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h`,
      { next: { revalidate: 300 } } // Revalider toutes les 5 minutes
    );
    
    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des prix');
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
    
    // Retourner le cache existant en cas d'erreur
    return priceCache;
  }
};

// Fonction pour obtenir le prix d'une crypto spécifique
export const getCryptoPrice = async (id: string): Promise<CryptoPrice | null> => {
  try {
    const prices = await fetchCryptoPrices();
    return prices[id] || null;
  } catch (error) {
    console.error(`Erreur lors de la récupération du prix pour ${id}:`, error);
    return null;
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
    '3794': 'cosmos'
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
  'cosmos': 'ATOM'
}; 