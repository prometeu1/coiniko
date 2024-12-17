// coinmarketcap.ts
import axios from 'axios';

const API_KEY = process.env.NEXT_PUBLIC_CMC_API_KEY;
const API_BASE_URL = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest';

interface Cryptocurrency {
  id: number;
  name: string;
  symbol: string;
  cmc_rank: number;
  quote: {
    USD: {
      price: number;
      percent_change_1h: number;
      percent_change_24h: number;
      percent_change_7d: number; // Ajout de la variation sur 7 jours
      market_cap: number;
    };
  };
}

export async function fetchLatestCryptocurrencyListings(): Promise<Cryptocurrency[]> {
  try {
    const response = await axios.get(API_BASE_URL, {
      headers: {
        'X-CMC_PRO_API_KEY': API_KEY,
      },
      params: {
        start: 1,
        limit: 100,
        convert: 'USD',
      },
    });

    return response.data.data;
  } catch (error) {
    console.error('Erreur lors de la récupération des données :', error);
    throw error;
  }
}