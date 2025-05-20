import { NextRequest, NextResponse } from "next/server";
import { mapCoinMarketCapToGeckoId, FALLBACK_PRICES } from "@/lib/cryptoService";

// Cache expiration: 15 minutes (increased to reduce API calls)
const CACHE_MAX_AGE = 900;

// Fallback data for common cryptocurrencies
const FALLBACK_CRYPTO_DETAILS: Record<string, any> = {
  'bitcoin': {
    id: 'bitcoin',
    symbol: 'BTC',
    name: 'Bitcoin',
    image: {
      large: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
      small: 'https://assets.coingecko.com/coins/images/1/small/bitcoin.png',
      thumb: 'https://assets.coingecko.com/coins/images/1/thumb/bitcoin.png'
    },
    market_data: {
      current_price: { usd: 68741.00 },
      market_cap: { usd: 1324578000000 },
      total_volume: { usd: 38574000000 },
      high_24h: { usd: 69000 },
      low_24h: { usd: 67500 },
      price_change_percentage_24h: 1.2,
      price_change_percentage_7d: 5.6,
      price_change_percentage_30d: 15.3,
      price_change_percentage_1y: 120.7,
      ath: { usd: 69500 },
      ath_date: { usd: '2023-05-01T00:00:00.000Z' },
      atl: { usd: 67.81 },
      atl_date: { usd: '2013-07-06T00:00:00.000Z' },
      circulating_supply: 19400000,
      total_supply: 21000000,
      max_supply: 21000000
    },
    description: { en: 'Bitcoin is a decentralized digital currency that can be transferred on the peer-to-peer bitcoin network.' },
    categories: ['Cryptocurrency'],
    links: {
      homepage: ['https://bitcoin.org/'],
      blockchain_site: ['https://blockchair.com/bitcoin', 'https://btc.com/', 'https://btc.tokenview.io/'],
      official_forum_url: ['https://bitcointalk.org'],
      chat_url: [],
      twitter_screen_name: 'bitcoin',
      facebook_username: 'bitcoins',
      telegram_channel_identifier: '',
      subreddit_url: 'https://reddit.com/r/bitcoin'
    },
    tickers: []
  },
  'ethereum': {
    id: 'ethereum',
    symbol: 'ETH',
    name: 'Ethereum',
    image: {
      large: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
      small: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
      thumb: 'https://assets.coingecko.com/coins/images/279/thumb/ethereum.png'
    },
    market_data: {
      current_price: { usd: 3852.42 },
      market_cap: { usd: 462789000000 },
      total_volume: { usd: 23450000000 },
      high_24h: { usd: 3900 },
      low_24h: { usd: 3800 },
      price_change_percentage_24h: 2.3,
      price_change_percentage_7d: 8.7,
      price_change_percentage_30d: 18.5,
      price_change_percentage_1y: 85.2,
      ath: { usd: 4865 },
      ath_date: { usd: '2021-11-10T00:00:00.000Z' },
      atl: { usd: 0.432979 },
      atl_date: { usd: '2015-10-20T00:00:00.000Z' },
      circulating_supply: 120000000,
      total_supply: 120000000,
      max_supply: null
    },
    description: { en: 'Ethereum is a decentralized, open-source blockchain with smart contract functionality.' },
    categories: ['Smart Contract Platform'],
    links: {
      homepage: ['https://ethereum.org/'],
      blockchain_site: ['https://etherscan.io/', 'https://ethplorer.io/'],
      official_forum_url: ['https://forum.ethereum.org/'],
      chat_url: [],
      twitter_screen_name: 'ethereum',
      facebook_username: 'ethereumproject',
      telegram_channel_identifier: '',
      subreddit_url: 'https://reddit.com/r/ethereum'
    },
    tickers: []
  }
};

// Add a few more common cryptos to the fallback data
FALLBACK_CRYPTO_DETAILS['binancecoin'] = {
  id: 'binancecoin',
  symbol: 'BNB',
  name: 'Binance Coin',
  image: {
    large: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png',
    small: 'https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png',
    thumb: 'https://assets.coingecko.com/coins/images/825/thumb/bnb-icon2_2x.png'
  },
  market_data: {
    current_price: { usd: 572.45 },
    market_cap: { usd: 87695000000 },
    total_volume: { usd: 2345000000 },
    high_24h: { usd: 585 },
    low_24h: { usd: 565 },
    price_change_percentage_24h: -1.2,
    price_change_percentage_7d: 3.4,
    price_change_percentage_30d: 8.1,
    price_change_percentage_1y: 25.7,
    ath: { usd: 690 },
    ath_date: { usd: '2021-05-10T00:00:00.000Z' },
    atl: { usd: 0.0398177 },
    atl_date: { usd: '2017-10-19T00:00:00.000Z' },
    circulating_supply: 153856150,
    total_supply: 153856150,
    max_supply: 165116760
  },
  description: { en: 'Binance Coin (BNB) is an exchange-based token created and issued by the cryptocurrency exchange Binance.' },
  categories: ['Centralized Exchange Token'],
  links: {
    homepage: ['https://www.binance.com/'],
    blockchain_site: ['https://explorer.binance.org/'],
    official_forum_url: ['https://community.binance.org/'],
    chat_url: [],
    twitter_screen_name: 'binance',
    facebook_username: 'binance',
    telegram_channel_identifier: 'binanceexchange',
    subreddit_url: 'https://reddit.com/r/binance'
  },
  tickers: []
};

// Helper function to add delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  
  try {
    // Map the ID to a CoinGecko ID if it's a CoinMarketCap ID
    const geckoId = mapCoinMarketCapToGeckoId(id);
    
    // Implement retry logic with exponential backoff
    let attempts = 0;
    const maxAttempts = 3;
    let coinData: any = null;
    
    while (attempts < maxAttempts) {
      try {
        // Fetch detailed coin data
        const coinDataResponse = await fetch(
          `https://api.coingecko.com/api/v3/coins/${geckoId}?localization=false&tickers=true&market_data=true&community_data=true&developer_data=false&sparkline=true`,
          { cache: 'no-store' }
        );
        
        // Rate limited - handle 429 response specifically
        if (coinDataResponse.status === 429) {
          console.warn(`Rate limited (429) for ${geckoId}, attempt ${attempts + 1}`);
          attempts++;
          
          if (attempts >= maxAttempts) {
            // If we have fallback data, use it
            if (FALLBACK_CRYPTO_DETAILS[geckoId]) {
              console.log(`Using fallback data for ${geckoId} after rate limit`);
              coinData = FALLBACK_CRYPTO_DETAILS[geckoId];
              break;
            }
            
            return NextResponse.json(
              { error: "Rate limited by CoinGecko API", fallback: true },
              { status: 429 }
            );
          }
          
          // Wait with exponential backoff before retrying
          await delay(1000 * Math.pow(2, attempts));
          continue;
        }
        
        // Handle other errors
        if (!coinDataResponse.ok) {
          console.error(`Failed API response for ${geckoId}: ${coinDataResponse.status}`);
          
          // If we have fallback data, use it
          if (FALLBACK_CRYPTO_DETAILS[geckoId]) {
            console.log(`Using fallback data for ${geckoId} after error`);
            coinData = FALLBACK_CRYPTO_DETAILS[geckoId];
            break;
          }
          
          return NextResponse.json(
            { error: `Failed to fetch coin data: ${coinDataResponse.status}` },
            { status: coinDataResponse.status }
          );
        }
        
        // Successfully got data
        coinData = await coinDataResponse.json();
        break;
      } catch (fetchError) {
        console.error(`Error fetching data for ${geckoId}, attempt ${attempts + 1}:`, fetchError);
        attempts++;
        
        if (attempts >= maxAttempts) {
          // If we have fallback data, use it
          if (FALLBACK_CRYPTO_DETAILS[geckoId]) {
            console.log(`Using fallback data for ${geckoId} after fetch error`);
            coinData = FALLBACK_CRYPTO_DETAILS[geckoId];
            break;
          }
          
          throw fetchError;
        }
        
        // Wait with exponential backoff before retrying
        await delay(1000 * Math.pow(2, attempts));
      }
    }
    
    // If we don't have data by now, use fallback or fail
    if (!coinData) {
      if (FALLBACK_CRYPTO_DETAILS[geckoId]) {
        console.log(`Using fallback data for ${geckoId} as last resort`);
        coinData = FALLBACK_CRYPTO_DETAILS[geckoId];
      } else {
        return NextResponse.json(
          { error: "Failed to fetch cryptocurrency data after multiple attempts" },
          { status: 500 }
        );
      }
    }
    
    // Get chart data - handle this separately so we can still return partial data
    let chartData = {
      day: null,
      week: null,
      month: null,
      year: null
    };
    
    try {
      // Fetch market chart data for different time periods
      // Use Promise.allSettled to handle partial failures
      const chartResults = await Promise.allSettled([
        fetchMarketChart(geckoId, 1),
        fetchMarketChart(geckoId, 7),
        fetchMarketChart(geckoId, 30),
        fetchMarketChart(geckoId, 365)
      ]);
      
      // Process results, keeping nulls for failed requests
      chartData = {
        day: chartResults[0].status === 'fulfilled' ? chartResults[0].value : null,
        week: chartResults[1].status === 'fulfilled' ? chartResults[1].value : null,
        month: chartResults[2].status === 'fulfilled' ? chartResults[2].value : null,
        year: chartResults[3].status === 'fulfilled' ? chartResults[3].value : null
      };
    } catch (chartError) {
      console.error(`Error fetching chart data for ${geckoId}:`, chartError);
      // Continue with null chart data
    }
    
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
      chart_data: chartData,
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
    
    // Try to use fallback data as a last resort
    const geckoId = mapCoinMarketCapToGeckoId(id);
    if (FALLBACK_CRYPTO_DETAILS[geckoId]) {
      console.log(`Using fallback data for ${geckoId} after critical error`);
      const fallbackCoinData = FALLBACK_CRYPTO_DETAILS[geckoId];
      
      return NextResponse.json({
        id: fallbackCoinData.id,
        symbol: fallbackCoinData.symbol,
        name: fallbackCoinData.name,
        image: fallbackCoinData.image,
        market_data: fallbackCoinData.market_data,
        chart_data: {
          day: null,
          week: null,
          month: null,
          year: null
        },
        whale_data: await fetchWhaleData(geckoId),
        links: fallbackCoinData.links,
        description: fallbackCoinData.description?.en,
        categories: fallbackCoinData.categories,
        tickers: fallbackCoinData.tickers || [],
        is_fallback: true
      }, {
        headers: {
          'Cache-Control': `max-age=${CACHE_MAX_AGE}`,
        }
      });
    }
    
    return NextResponse.json(
      { error: "Failed to fetch cryptocurrency data" },
      { status: 500 }
    );
  }
}

// Helper function to fetch market chart data for a given time period
async function fetchMarketChart(geckoId: string, days: number) {
  try {
    // Add retry logic with a simple 1-time retry
    let attempts = 0;
    const maxAttempts = 2;
    
    while (attempts < maxAttempts) {
      try {
        const response = await fetch(
          `https://api.coingecko.com/api/v3/coins/${geckoId}/market_chart?vs_currency=usd&days=${days}`,
          { cache: 'no-store' }
        );
        
        // Handle rate limit specifically
        if (response.status === 429) {
          console.warn(`Rate limited (429) for ${geckoId} chart data (${days} days), attempt ${attempts + 1}`);
          attempts++;
          
          if (attempts >= maxAttempts) {
            console.error(`Rate limit persisted for ${geckoId} chart data`);
            return null;
          }
          
          // Wait before retrying
          await delay(2000);
          continue;
        }
        
        if (!response.ok) {
          console.error(`Failed to fetch ${days} day chart for ${geckoId}: ${response.status}`);
          return null;
        }
        
        const data = await response.json();
        
        // Process the data to make it easier to use
        return {
          prices: data.prices,
          market_caps: data.market_caps,
          total_volumes: data.total_volumes
        };
      } catch (error) {
        console.error(`Error in attempt ${attempts + 1} fetching ${days} day chart for ${geckoId}:`, error);
        attempts++;
        
        if (attempts >= maxAttempts) {
          console.error(`All attempts failed for ${geckoId} chart data`);
          return null;
        }
        
        // Wait before retrying
        await delay(2000);
      }
    }
    
    // Should never get here, but just in case
    return null;
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