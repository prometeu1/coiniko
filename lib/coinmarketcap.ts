import axios from 'axios';

const API_KEY = process.env.NEXT_PUBLIC_CMC_API_KEY;  // Utilisation de la clé depuis les variables d'environnement
const API_BASE_URL = 'https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest';

interface Cryptocurrency {
  id: number;
  name: string;
  symbol: string;
  quote: {
    USD: {
      price: number;
    };
  };
}

export async function fetchLatestCryptocurrencyListings(): Promise<Cryptocurrency[]> {
  try {
    const response = await axios.get(API_BASE_URL, {
      headers: {
        'X-CMC_PRO_API_KEY': API_KEY
      },
      params: {
        start: 1,
        limit: 100, // Nombre de cryptomonnaies à récupérer
        convert: 'USD' // Convertir les prix en dollars US
      }
    });

    return response.data.data;
  } catch (error) {
    console.error('Erreur lors de la récupération des données :', error);
    throw error;
  }
}
