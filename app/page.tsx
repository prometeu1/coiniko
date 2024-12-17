// page.tsx
import { fetchLatestCryptocurrencyListings } from '@/lib/coinmarketcap';

export default async function Page() {
  // Récupération des données côté serveur
  const cryptocurrencies = await fetchLatestCryptocurrencyListings();

  return (
    <div>
      <h1>Liste des cryptomonnaies</h1>
      <ul>
        {cryptocurrencies.map((crypto: any) => (
          <li key={crypto.id}>
            {crypto.name} ({crypto.symbol}) - ${crypto.quote.USD.price.toFixed(2)}
          </li>
        ))}
      </ul>
    </div>
  );
}
