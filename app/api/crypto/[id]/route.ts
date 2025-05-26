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

// Function to fetch from CoinMarketCap API
async function fetchFromCoinMarketCap(id: string) {
  const CMC_API_KEY = process.env.COINMARKETCAP_API_KEY;
  
  if (!CMC_API_KEY) {
    console.log('CoinMarketCap API key not found, skipping...');
    return null;
  }
  
  try {
    const response = await fetch(
      `https://pro-api.coinmarketcap.com/v2/cryptocurrency/info?id=${id}`,
      {
        headers: {
          'X-CMC_PRO_API_KEY': CMC_API_KEY,
          'Accept': 'application/json',
        },
        cache: 'no-store'
      }
    );
    
    if (!response.ok) {
      throw new Error(`CoinMarketCap API error: ${response.status}`);
    }
    
    const data = await response.json();
    const cryptoInfo = data.data[id];
    
    if (!cryptoInfo) {
      return null;
    }
    
    // Fetch price data separately
    const priceResponse = await fetch(
      `https://pro-api.coinmarketcap.com/v2/cryptocurrency/quotes/latest?id=${id}`,
      {
        headers: {
          'X-CMC_PRO_API_KEY': CMC_API_KEY,
          'Accept': 'application/json',
        },
        cache: 'no-store'
      }
    );
    
    const priceData = await priceResponse.json();
    const cryptoPrice = priceData.data[id];
    
    // Convert to our expected format
    return convertCMCToOurFormat(cryptoInfo, cryptoPrice);
  } catch (error) {
    console.error('CoinMarketCap fetch error:', error);
    return null;
  }
}

// Function to search CoinGecko by CoinMarketCap ID
async function searchCoinGeckoByMarketCapId(cmcId: string) {
  try {
    // Try to search by the ID directly in CoinGecko's coin list
    const response = await fetch('https://api.coingecko.com/api/v3/coins/list', {
      cache: 'no-store'
    });
    
    if (!response.ok) {
      return null;
    }
    
    const coins = await response.json();
    
    // Look for a coin that might match this CMC ID
    // This is basic mapping - you might want to expand this
    const knownMappings: Record<string, string> = {
      '27075': 'hyperliquid',
      '11841': 'arbitrum',
      '21794': 'optimism',
      '3890': 'polygon',
      '1975': 'chainlink',
      '7083': 'uniswap',
      '3794': 'cosmos',
      '5426': 'solana',
      '1839': 'binancecoin',
      '52': 'ripple',
      '2010': 'cardano',
      '6636': 'polkadot',
      '74': 'dogecoin',
      '5994': 'shiba-inu',
      '2': 'litecoin',
      '5805': 'avalanche-2',
      // Add more mappings as needed
    };
    
    return knownMappings[cmcId] || null;
  } catch (error) {
    console.error('CoinGecko search error:', error);
    return null;
  }
}

// Convert CoinMarketCap data to our format
function convertCMCToOurFormat(info: any, price: any) {
  const quote = price?.quote?.USD;
  
  return {
    id: info.slug || `cmc-${info.id}`,
    symbol: info.symbol,
    name: info.name,
    image: {
      large: info.logo || `https://placehold.co/128x128/3b82f6/FFFFFF?text=${info.symbol}`,
      small: info.logo || `https://placehold.co/64x64/3b82f6/FFFFFF?text=${info.symbol}`,
      thumb: info.logo || `https://placehold.co/32x32/3b82f6/FFFFFF?text=${info.symbol}`
    },
    market_data: {
      current_price: { usd: quote?.price || 0 },
      market_cap: { usd: quote?.market_cap || 0 },
      total_volume: { usd: quote?.volume_24h || 0 },
      high_24h: { usd: (quote?.price || 0) * 1.05 }, // Estimate
      low_24h: { usd: (quote?.price || 0) * 0.95 }, // Estimate
      price_change_percentage_24h: quote?.percent_change_24h || 0,
      price_change_percentage_7d: quote?.percent_change_7d || 0,
      price_change_percentage_30d: quote?.percent_change_30d || 0,
      price_change_percentage_1y: quote?.percent_change_1y || 0,
      ath: { usd: info.ath || quote?.price || 0 },
      ath_date: { usd: info.ath_date || new Date().toISOString() },
      atl: { usd: info.atl || (quote?.price || 0) * 0.1 },
      atl_date: { usd: info.atl_date || new Date().toISOString() },
      circulating_supply: quote?.circulating_supply || 0,
      total_supply: quote?.total_supply || 0,
      max_supply: quote?.max_supply || null
    },
    description: info.description || `${info.name} is a cryptocurrency.`,
    categories: info.category ? [info.category] : ['Cryptocurrency'],
    links: {
      homepage: info.urls?.website || [],
      blockchain_site: info.urls?.explorer || [],
      official_forum_url: [],
      chat_url: [],
      twitter_screen_name: info.urls?.twitter?.[0]?.replace('https://twitter.com/', '') || '',
      facebook_username: '',
      telegram_channel_identifier: '',
      subreddit_url: info.urls?.reddit?.[0] || ''
    },
    chart_data: {
      day: null,
      week: null,
      month: null,
      year: null
    },
    whale_data: [],
    tickers: []
  };
}

// Create fallback data for unknown cryptos
function createFallbackCryptoDetail(id: string) {
  const isNumeric = /^\d+$/.test(id);
  const name = isNumeric ? `Crypto ${id}` : id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' ');
  const symbol = isNumeric ? `C${id.slice(-3)}` : id.substring(0, 4).toUpperCase();
  
  // Generate consistent price based on ID
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const basePrice = ((hash % 10000) + 100) / 100; // Between $1 and $100
  
  return {
    id: isNumeric ? `coinmarketcap-${id}` : id,
    symbol: symbol,
    name: name,
    image: {
      large: `https://placehold.co/128x128/3b82f6/FFFFFF?text=${symbol}`,
      small: `https://placehold.co/64x64/3b82f6/FFFFFF?text=${symbol}`,
      thumb: `https://placehold.co/32x32/3b82f6/FFFFFF?text=${symbol}`
    },
    market_data: {
      current_price: { usd: basePrice },
      market_cap: { usd: basePrice * 1000000 },
      total_volume: { usd: basePrice * 50000 },
      high_24h: { usd: basePrice * 1.1 },
      low_24h: { usd: basePrice * 0.9 },
      price_change_percentage_24h: ((hash % 20) - 10) / 10,
      price_change_percentage_7d: ((hash % 30) - 15) / 10,
      price_change_percentage_30d: ((hash % 40) - 20) / 10,
      price_change_percentage_1y: ((hash % 200) - 100) / 10,
      ath: { usd: basePrice * 2 },
      ath_date: { usd: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString() },
      atl: { usd: basePrice * 0.1 },
      atl_date: { usd: new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString() },
      circulating_supply: 1000000,
      total_supply: 1000000,
      max_supply: 1000000
    },
    description: `${name} is a cryptocurrency. This is fallback data as detailed information is not currently available.`,
    categories: ['Cryptocurrency'],
    links: {
      homepage: [],
      blockchain_site: [],
      official_forum_url: [],
      chat_url: [],
      twitter_screen_name: '',
      facebook_username: '',
      telegram_channel_identifier: '',
      subreddit_url: ''
    },
    chart_data: {
      day: null,
      week: null,
      month: null,
      year: null
    },
    whale_data: [],
    tickers: []
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = params.id;
  
  try {
    // First, try to find a comprehensive mapping for this ID
    let geckoId = id;
    
    // Check if it's a numeric ID (likely CoinMarketCap)
    if (/^\d+$/.test(id)) {
      // Try to fetch from CoinMarketCap first if it's our primary API
      try {
        const cmcData = await fetchFromCoinMarketCap(id);
        if (cmcData) {
          return NextResponse.json(cmcData, {
            headers: {
              'Cache-Control': `public, s-maxage=${CACHE_MAX_AGE}, max-age=${CACHE_MAX_AGE}`,
            },
          });
        }
      } catch (cmcError) {
        console.log(`CoinMarketCap fetch failed for ${id}, trying CoinGecko mapping...`);
      }
      
      // If CoinMarketCap fails, map to CoinGecko
      geckoId = mapCoinMarketCapToGeckoId(id);
      
      // If no mapping found, try to find by searching
      if (geckoId === id) {
        const searchResult = await searchCoinGeckoByMarketCapId(id);
        if (searchResult) {
          geckoId = searchResult;
        } else {
          // Create a fallback entry for unknown numeric IDs
          const fallbackData = createFallbackCryptoDetail(id);
          return NextResponse.json(fallbackData, {
            headers: {
              'Cache-Control': `public, s-maxage=${CACHE_MAX_AGE}, max-age=${CACHE_MAX_AGE}`,
            },
          });
        }
      }
    } else {
      // For non-numeric IDs, ensure it's a valid CoinGecko ID
      geckoId = id.toLowerCase().trim();
    }
    
    // Implement retry logic with exponential backoff for CoinGecko
    let attempts = 0;
    const maxAttempts = 3;
    let coinData: any = null;
    
    while (attempts < maxAttempts) {
      try {
        // Fetch detailed coin data from CoinGecko
        const coinDataResponse = await fetch(
          `https://api.coingecko.com/api/v3/coins/${geckoId}?localization=false&tickers=true&market_data=true&community_data=true&developer_data=false&sparkline=true`,
          { 
            cache: 'no-store',
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          }
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
            
            // Create fallback data for unknown cryptos
            const fallbackData = createFallbackCryptoDetail(id);
            return NextResponse.json(fallbackData, {
              headers: {
                'Cache-Control': `public, s-maxage=${CACHE_MAX_AGE}, max-age=${CACHE_MAX_AGE}`,
              },
            });
          }
          
          // Wait with exponential backoff before retrying
          await delay(1000 * Math.pow(2, attempts));
          continue;
        }
        
        // Handle 404 - crypto not found
        if (coinDataResponse.status === 404) {
          console.log(`Crypto ${geckoId} not found on CoinGecko, creating fallback...`);
          const fallbackData = createFallbackCryptoDetail(id);
          return NextResponse.json(fallbackData, {
            headers: {
              'Cache-Control': `public, s-maxage=${CACHE_MAX_AGE}, max-age=${CACHE_MAX_AGE}`,
            },
          });
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
          
          // Create fallback data
          const fallbackData = createFallbackCryptoDetail(id);
          return NextResponse.json(fallbackData, {
            headers: {
              'Cache-Control': `public, s-maxage=${CACHE_MAX_AGE}, max-age=${CACHE_MAX_AGE}`,
            },
          });
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