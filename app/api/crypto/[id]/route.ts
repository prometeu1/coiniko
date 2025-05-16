import { NextRequest, NextResponse } from "next/server";
import { mapCoinMarketCapToGeckoId } from "@/lib/cryptoService";

// Cache expiration: 2 minutes
const CACHE_MAX_AGE = 120;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  
  try {
    // Map the ID to a CoinGecko ID if it's a CoinMarketCap ID
    const geckoId = mapCoinMarketCapToGeckoId(id);
    
    // Fetch detailed coin data
    const coinDataResponse = await fetch(
      `https://api.coingecko.com/api/v3/coins/${geckoId}?localization=false&tickers=true&market_data=true&community_data=true&developer_data=false&sparkline=true`,
      { cache: 'no-store' }
    );
    
    if (!coinDataResponse.ok) {
      return NextResponse.json(
        { error: "Failed to fetch coin data" },
        { status: coinDataResponse.status }
      );
    }
    
    const coinData = await coinDataResponse.json();
    
    // Fetch market chart data for different time periods
    const [day, week, month, year] = await Promise.all([
      fetchMarketChart(geckoId, 1),
      fetchMarketChart(geckoId, 7),
      fetchMarketChart(geckoId, 30),
      fetchMarketChart(geckoId, 365)
    ]);
    
    // Fetch whale data (large transactions)
    const whaleData = await fetchWhaleData(geckoId);
    
    // Format and return the data
    return NextResponse.json({
      id: coinData.id,
      symbol: coinData.symbol.toUpperCase(),
      name: coinData.name,
      image: coinData.image,
      market_data: {
        current_price: coinData.market_data.current_price,
        market_cap: coinData.market_data.market_cap,
        total_volume: coinData.market_data.total_volume,
        high_24h: coinData.market_data.high_24h,
        low_24h: coinData.market_data.low_24h,
        price_change_percentage_24h: coinData.market_data.price_change_percentage_24h,
        price_change_percentage_7d: coinData.market_data.price_change_percentage_7d,
        price_change_percentage_30d: coinData.market_data.price_change_percentage_30d,
        price_change_percentage_1y: coinData.market_data.price_change_percentage_1y,
        ath: coinData.market_data.ath,
        ath_date: coinData.market_data.ath_date,
        atl: coinData.market_data.atl,
        atl_date: coinData.market_data.atl_date,
        circulating_supply: coinData.market_data.circulating_supply,
        total_supply: coinData.market_data.total_supply,
        max_supply: coinData.market_data.max_supply,
      },
      chart_data: {
        day,
        week,
        month,
        year
      },
      whale_data: whaleData,
      links: coinData.links,
      description: coinData.description?.en,
      categories: coinData.categories,
      tickers: coinData.tickers?.slice(0, 10) // First 10 tickers for simplicity
    }, {
      headers: {
        'Cache-Control': `max-age=${CACHE_MAX_AGE}`,
      }
    });
  } catch (error) {
    console.error(`Error fetching data for crypto ${id}:`, error);
    return NextResponse.json(
      { error: "Failed to fetch cryptocurrency data" },
      { status: 500 }
    );
  }
}

// Helper function to fetch market chart data for a given time period
async function fetchMarketChart(geckoId: string, days: number) {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${geckoId}/market_chart?vs_currency=usd&days=${days}`,
      { cache: 'no-store' }
    );
    
    if (!response.ok) {
      console.error(`Failed to fetch ${days} day chart for ${geckoId}`);
      return null;
    }
    
    const data = await response.json();
    
    // Process the data to make it easier to use
    // Format: [timestamp, price]
    return {
      prices: data.prices,
      market_caps: data.market_caps,
      total_volumes: data.total_volumes
    };
  } catch (error) {
    console.error(`Error fetching ${days} day chart for ${geckoId}:`, error);
    return null;
  }
}

// Helper function to fetch whale transaction data (simulated)
async function fetchWhaleData(geckoId: string) {
  // In a real application, this would fetch from a whale alert API or blockchain explorer
  // For this demonstration, we'll return simulated data
  
  // Last 10 days
  const today = new Date();
  const whaleTransactions = [];
  
  // Generate some random whale transactions
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - Math.floor(Math.random() * 10));
    
    whaleTransactions.push({
      date: date.toISOString(),
      amount: Math.round(Math.random() * 1000 + 100),
      value_usd: Math.round(Math.random() * 5000000 + 1000000),
      transaction_type: Math.random() > 0.5 ? 'transfer' : 'exchange',
      from_type: 'unknown',
      to_type: Math.random() > 0.6 ? 'exchange' : 'unknown',
      blockchain: geckoId.includes('eth') ? 'ethereum' : 'bitcoin',
    });
  }
  
  // Sort by date, most recent first
  return whaleTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
} 