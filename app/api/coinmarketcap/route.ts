import { NextResponse } from "next/server";
import axios from "axios";

// Correction de la variable d'environnement
const API_KEY = process.env.PUBLIC_CMC_API_KEY || process.env.NEXT_PUBLIC_CMC_API_KEY;
const API_BASE_URL =
  "https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest";

// Cache expiration: 5 minutes
const CACHE_MAX_AGE = 300;

export async function GET() {
  // Vérifier si la clé API est disponible
  if (!API_KEY) {
    console.error("Erreur: Clé API CoinMarketCap manquante");
    return NextResponse.json(
      { error: "Configuration de l'API manquante. Veuillez configurer votre clé API." },
      { status: 500 }
    );
  }

  try {
    console.log("Utilisation de la clé API:", API_KEY ? "Clé disponible" : "Clé manquante");
    
    const response = await axios.get(API_BASE_URL, {
      headers: {
        "X-CMC_PRO_API_KEY": API_KEY,
      },
      params: {
        start: 1,
        limit: 100,
        convert: "USD",
      },
    });

    // Vérifier si la réponse est valide
    if (!response.data || !response.data.data) {
      throw new Error("Format de réponse API invalide");
    }
    
    // Ajouter des en-têtes de cache
    return NextResponse.json(response.data.data, {
      headers: {
        'Cache-Control': `public, s-maxage=${CACHE_MAX_AGE}, stale-while-revalidate=${CACHE_MAX_AGE * 2}`,
      },
    });
  } catch (error) {
    console.error("Erreur API CoinMarketCap:", error);
    
    if (axios.isAxiosError(error)) {
      const statusCode = error.response?.status || 500;
      const message = error.response?.data?.status?.error_message || error.message;
      
      return NextResponse.json(
        { error: `Erreur lors de la récupération des données: ${message}` }, 
        { status: statusCode }
      );
    }
    
    return NextResponse.json(
      { error: "Erreur lors de la récupération des données." }, 
      { status: 500 }
    );
  }
}
