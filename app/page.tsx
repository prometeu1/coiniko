// page.tsx
import { fetchLatestCryptocurrencyListings } from '@/lib/coinmarketcap';

interface ICrypto {
  id: number;
  name: string;
  symbol: string;
  cmc_rank: number;
  quote: {
    USD: {
      price: number;
      percent_change_1h: number;
      percent_change_24h: number;
      percent_change_7d: number;
      market_cap: number;
    };
  };
}

export default async function Page() {
  const cryptocurrencies = await fetchLatestCryptocurrencyListings();

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-7xl rounded-md border bg-card shadow-md p-4">
        <h1 className="text-xl font-normal mb-4 text-center">Liste des Cryptomonnaies</h1>

        <table className="w-full table-auto border-collapse text-sm">
          <thead className="bg-muted text-left">
            <tr>
              <th className="p-2">Logo</th>
              <th className="p-2">Nom</th>
              <th className="p-2">Symbole</th>
              <th className="p-2">Rang</th>
              <th className="p-2">Prix (USD)</th>
              <th className="p-2">Variation 1H</th>
              <th className="p-2">Capitalisation Boursière</th>
              <th className="p-2">Variation 24H</th>
              <th className="p-2">Variation 7J</th>
            </tr>
          </thead>
          <tbody>
            {cryptocurrencies.map((crypto: ICrypto) => (
              <tr key={crypto.id} className="even:bg-muted/50">
                <td className="p-2">
                  <img
                    src={`https://s2.coinmarketcap.com/static/img/coins/64x64/${crypto.id}.png`}
                    alt={crypto.name}
                    className="w-10 h-10"
                  />
                </td>
                <td className="p-2">{crypto.name}</td>
                <td className="p-2">{crypto.symbol}</td>
                <td className="p-2">#{crypto.cmc_rank}</td>
                <td className="p-2">${crypto.quote.USD.price.toFixed(2)}</td>
                <td
                  className={`p-2 ${
                    crypto.quote.USD.percent_change_1h >= 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {crypto.quote.USD.percent_change_1h.toFixed(2)}%
                </td>
                <td className="p-2">${crypto.quote.USD.market_cap.toLocaleString()}</td>
                <td
                  className={`p-2 ${
                    crypto.quote.USD.percent_change_24h >= 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {crypto.quote.USD.percent_change_24h.toFixed(2)}%
                </td>
                <td
                  className={`p-2 ${
                    crypto.quote.USD.percent_change_7d >= 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {crypto.quote.USD.percent_change_7d.toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
