import { NextResponse } from "next/server";
import axios from "axios";

const API_KEY = process.env.NEXT_PUBLIC_CMC_API_KEY;
const API_BASE_URL =
  "https://pro-api.coinmarketcap.com/v1/cryptocurrency/listings/latest";

export async function GET() {
  try {
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

    return NextResponse.json(response.data.data);
  } catch (error) {
    if (error instanceof Error) {
      console.error("Erreur dans l'API:", error.message);
    } else {
      console.error("Erreur dans l'API:", error);
    }
    return NextResponse.json({ error: "Erreur lors de la récupération des données." }, { status: 500 });
  }
}
