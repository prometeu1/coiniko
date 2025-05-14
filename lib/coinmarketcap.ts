"use client";

// Gestion des types
export interface CryptoData {
  id: number | string;
  name: string;
  symbol: string;
  slug: string;
  quote: {
    USD: {
      price: number;
      percent_change_1h: number;
      percent_change_24h: number;
      percent_change_7d: number;
      market_cap: number;
      volume_24h: number;
    };
  };
}

// Cache des résultats
let cachedData: CryptoData[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes en ms

export async function fetchLatestCryptocurrencyListings(): Promise<CryptoData[]> {
  // Vérifier si le cache est valide
  const now = Date.now();
  if (cachedData && now - cacheTimestamp < CACHE_DURATION) {
    console.log("Utilisation des données en cache");
    return cachedData;
  }

  // Essayer d'abord l'API CoinMarketCap
  try {
    const response = await fetch("/api/coinmarketcap", {
      next: { revalidate: 300 } // 5 minutes
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log("Données récupérées depuis CoinMarketCap");
      
      // Mettre à jour le cache
      cachedData = data;
      cacheTimestamp = now;
      
      return data;
    } else {
      console.warn("Échec de CoinMarketCap, tentative avec API alternative");
      throw new Error(`Erreur API CoinMarketCap: ${response.status}`);
    }
  } catch (error) {
    console.error("Erreur lors de la récupération depuis CoinMarketCap:", error);
    
    // Essayer l'API alternative
    try {
      console.log("Tentative avec l'API alternative (CoinGecko)");
      const response = await fetch("/api/crypto", {
        next: { revalidate: 300 }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("Données récupérées depuis l'API alternative");
        
        // Mettre à jour le cache
        cachedData = data;
        cacheTimestamp = now;
        
        return data;
      } else {
        throw new Error(`Erreur API alternative: ${response.status}`);
      }
    } catch (secondError) {
      console.error("Erreur lors de la récupération depuis l'API alternative:", secondError);
      
      // Si nous avons des données en cache, retournons-les malgré les erreurs
      if (cachedData) {
        console.info("Utilisation des données en cache suite aux erreurs");
        return cachedData;
      }
      
      // Si tout échoue, retourner un tableau vide ou laisser propager l'erreur
      console.error("Toutes les tentatives de récupération ont échoué");
      return []; // Retourner un tableau vide pour éviter les erreurs dans l'UI
    }
  }
}
