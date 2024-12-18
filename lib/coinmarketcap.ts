export async function fetchLatestCryptocurrencyListings() {
  try {
    const response = await fetch("/api/coinmarketcap");
    if (!response.ok) throw new Error("Erreur lors du chargement des données");
    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      console.error("Erreur lors de la récupération des cryptos:", error.message);
    } else {
      console.error("Erreur lors de la récupération des cryptos:", error);
    }
    throw error;
  }
}
