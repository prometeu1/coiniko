import { NextResponse } from "next/server";
import axios from "axios";
import { fallbackCryptoData } from "@/lib/fallbackCryptoData";

// CoinGecko API est gratuite sans clé API (limitée en requêtes)
const COINGECKO_API_URL = "https://api.coingecko.com/api/v3/coins/markets";

// Cache expiration: 5 minutes
const CACHE_MAX_AGE = 300;

// Convertir les données CoinGecko au format CoinMarketCap pour maintenir la compatibilité
function convertToCMCFormat(data: any[]) {
  return data.map(coin => ({
    id: coin.id,
    name: coin.name,
    symbol: coin.symbol.toUpperCase(),
    slug: coin.id,
    quote: {
      USD: {
        price: coin.current_price,
        percent_change_1h: coin.price_change_percentage_1h_in_currency || 0,
        percent_change_24h: coin.price_change_percentage_24h || 0,
        percent_change_7d: coin.price_change_percentage_7d_in_currency || 0,
        market_cap: coin.market_cap || 0,
        volume_24h: coin.total_volume || 0,
      }
    }
  }));
}

export async function GET() {
  try {
    console.log("Tentative de récupération des données depuis CoinGecko");
    
    // Tenter d'utiliser l'API CoinGecko (pas besoin de clé API)
    const response = await axios.get(COINGECKO_API_URL, {
      params: {
        vs_currency: "usd",
        order: "market_cap_desc",
        per_page: 100,
        page: 1,
        sparkline: false,
        price_change_percentage: "1h,24h,7d",
      },
      // Délai d'attente court pour ne pas bloquer longtemps si API lente
      timeout: 5000,
    });

    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      // Convertir au format compatible avec l'API CoinMarketCap
      const formattedData = convertToCMCFormat(response.data);
      
      // Ajouter des en-têtes de cache
      return NextResponse.json(formattedData, {
        headers: {
          'Cache-Control': `public, s-maxage=${CACHE_MAX_AGE}, stale-while-revalidate=${CACHE_MAX_AGE * 2}`,
        },
      });
    } else {
      throw new Error("Données CoinGecko invalides");
    }
  } catch (error) {
    console.error("Erreur API CoinGecko:", error);
    console.log("Utilisation des données de fallback");
    
    // En cas d'erreur, utiliser les données statiques de fallback
    return NextResponse.json(fallbackCryptoData, {
      headers: {
        'Cache-Control': `public, s-maxage=${CACHE_MAX_AGE}, stale-while-revalidate=${CACHE_MAX_AGE * 2}`,
      },
    });
  }
} 