"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowUp, ArrowDown, DollarSign, Wallet, BarChart3, Globe, Clock, TrendingUp, Layers, AlertTriangle, Users, Link2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useWallet } from "@/lib/walletContext";
import { mapCoinMarketCapToGeckoId } from "@/lib/cryptoService";
import {
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Bar,
  BarChart,
} from "recharts";
import Script from "next/script";
import { Badge } from "@/components/ui/badge";

// Add TradingView type declaration
declare global {
  interface Window {
    TradingView: {
      widget: new (config: any) => any;
    };
  }
}

// Définir un composant personnalisé pour l'icône Whale car elle n'existe pas dans lucide-react
const Whale = ({ className, size }: { className?: string, size?: number }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg"
    width={size || 24}
    height={size || 24}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M22 10.5c0 2.5-2 4.5-4.5 4.5S13 13 13 10.5 15 6 17.5 6 22 8 22 10.5zM5.5 20a3.5 3.5 0 0 1 0-7H9a3.5 3.5 0 0 0 0 7v-7h5" />
    <path d="M5.5 17H3c0-4.4 4.5-8 10-8 2 0 3.9.6 5.5 1.5" />
  </svg>
);

// Types for the cryptocurrency data
interface CryptoDetail {
  id: string;
  symbol: string;
  name: string;
  image: {
    large: string;
    small: string;
    thumb: string;
  };
  market_data: {
    current_price: { 
      usd: number; 
    };
    market_cap: { 
      usd: number; 
    };
    total_volume: { 
      usd: number; 
    };
    high_24h: { 
      usd: number; 
    };
    low_24h: { 
      usd: number; 
    };
    price_change_percentage_24h: number;
    price_change_percentage_7d: number;
    price_change_percentage_30d: number;
    price_change_percentage_1y: number;
    ath: { 
      usd: number; 
    };
    ath_date: { 
      usd: string; 
    };
    atl: { 
      usd: number; 
    };
    atl_date: { 
      usd: string; 
    };
    circulating_supply: number;
    total_supply: number;
    max_supply: number;
  };
  chart_data: {
    day: ChartData | null;
    week: ChartData | null;
    month: ChartData | null;
    year: ChartData | null;
  };
  whale_data: WhaleTransaction[];
  links: {
    homepage: string[];
    blockchain_site: string[];
    official_forum_url: string[];
    chat_url: string[];
    twitter_screen_name: string;
    facebook_username: string;
    telegram_channel_identifier: string;
    subreddit_url: string;
  };
  description: string;
  categories: string[];
  tickers: any[];
}

interface ChartData {
  prices: [number, number][];
  market_caps: [number, number][];
  total_volumes: [number, number][];
}

interface WhaleTransaction {
  date: string;
  amount: number;
  value_usd: number;
  transaction_type: string;
  from_type: string;
  to_type: string;
  blockchain: string;
}

interface ChartPoint {
  timestamp: number;
  date: string;
  value: number;
}

export default function CryptoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [cryptoData, setCryptoData] = useState<CryptoDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [chartTimeframe, setChartTimeframe] = useState<'day' | 'week' | 'month' | 'year'>('week');
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const { balance, buyCrypto, getCryptoHolding } = useWallet();
  const [tradingViewLoaded, setTradingViewLoaded] = useState<boolean>(false);
  
  // Get crypto ID from route params
  const cryptoId = params?.id as string;
  
  // Initialize TradingView widget when the data is loaded
  useEffect(() => {
    if (cryptoData && typeof window !== 'undefined' && window.TradingView) {
      try {
        // Clear previous widget if it exists
        const container = document.getElementById('tradingview_chart');
        if (container) container.innerHTML = '';
        
        const widget = new window.TradingView.widget({
          autosize: false,
          symbol: `COINBASE:${cryptoData.symbol.toUpperCase()}USD`,
          interval: "D",
          timezone: "Etc/UTC",
          theme: document.documentElement.classList.contains('dark') ? "dark" : "light",
          style: "1",
          locale: "fr",
          toolbar_bg: "#00000000", // Transparent toolbar
          enable_publishing: false,
          hide_top_toolbar: false,
          hide_legend: false,
          allow_symbol_change: true,
          container_id: "tradingview_chart",
          height: 450,
          width: container ? container.clientWidth : 800,
          withdateranges: true,
          save_image: false,
        });
        
        // Add onChartReady handler to ensure chart is properly loaded
        widget.onChartReady(() => {
          console.log('TradingView chart loaded successfully');
          setTradingViewLoaded(true);
        });
      } catch (error) {
        console.error('Error initializing TradingView widget:', error);
        setTradingViewLoaded(false);
      }
    }
  }, [cryptoData]);
  
  // Fetch the detailed crypto data
  useEffect(() => {
    const fetchCryptoDetail = async () => {
      if (!cryptoId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Try to get from local storage first to reduce API calls
        const cachedData = localStorage.getItem(`crypto_detail_${cryptoId}`);
        const cacheTimestamp = localStorage.getItem(`crypto_detail_${cryptoId}_timestamp`);
        
        // Use cache if available and less than 15 minutes old
        if (cachedData && cacheTimestamp) {
          const cachedTime = parseInt(cacheTimestamp);
          if (Date.now() - cachedTime < 15 * 60 * 1000) { // 15 minutes
            console.log(`Using cached data for ${cryptoId}`);
            const parsedData = JSON.parse(cachedData);
            setCryptoData(parsedData);
            
            // Set initial chart data
            if (parsedData.chart_data?.week?.prices) {
              processChartData('week', parsedData.chart_data.week);
            }
            
            setIsLoading(false);
            return;
          }
        }
        
        // API fetch with retry logic
        let attempts = 0;
        const maxAttempts = 3;
        
        while (attempts < maxAttempts) {
          try {
            const response = await fetch(`/api/crypto/${cryptoId}`);
            
            if (response.status === 429) {
              // Rate limited, wait longer before retry
              attempts++;
              console.log(`Rate limited (429), attempt ${attempts} of ${maxAttempts}`);
              
              if (attempts < maxAttempts) {
                // Exponential backoff: wait longer with each attempt
                await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempts)));
                continue;
              } else {
                throw new Error(`Rate limited (429). Too many requests to the API.`);
              }
            }
            
            if (!response.ok) {
              throw new Error(`Failed to fetch crypto data: ${response.status}`);
            }
            
            const data = await response.json();
            setCryptoData(data);
            
            // Cache the data
            localStorage.setItem(`crypto_detail_${cryptoId}`, JSON.stringify(data));
            localStorage.setItem(`crypto_detail_${cryptoId}_timestamp`, Date.now().toString());
            
            // Set initial chart data
            if (data.chart_data?.week?.prices) {
              processChartData('week', data.chart_data.week);
            }
            
            // Successfully got data, break the retry loop
            break;
          } catch (retryError) {
            attempts++;
            console.error(`Attempt ${attempts} failed:`, retryError);
            
            if (attempts >= maxAttempts) {
              throw retryError;
            }
            
            // Wait longer with each retry (exponential backoff)
            await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempts)));
          }
        }
      } catch (err) {
        console.error("Error fetching crypto detail:", err);
        
        // Check if we have cached data we can use even if it's old
        const cachedData = localStorage.getItem(`crypto_detail_${cryptoId}`);
        if (cachedData) {
          console.log(`Using expired cached data for ${cryptoId} after error`);
          const parsedData = JSON.parse(cachedData);
          setCryptoData(parsedData);
          
          // Set chart data
          if (parsedData.chart_data?.week?.prices) {
            processChartData('week', parsedData.chart_data.week);
          }
          
          setError("Using cached data. Couldn't refresh from API: " + err.message);
        } else {
          // If no cached data, use fallback for common cryptos or show error
          const fallbackData = createFallbackCryptoData(cryptoId);
          if (fallbackData) {
            console.log(`Using fallback data for ${cryptoId}`);
            setCryptoData(fallbackData);
            setError("Using simplified data. API is currently unavailable.");
          } else {
            setError("Failed to load cryptocurrency data. Please try again later.");
          }
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCryptoDetail();
  }, [cryptoId]);
  
  // Create fallback data for common cryptocurrencies
  const createFallbackCryptoData = (id: string): CryptoDetail | null => {
    const commonCryptos: Record<string, Partial<CryptoDetail>> = {
      'bitcoin': {
        id: 'bitcoin',
        name: 'Bitcoin',
        symbol: 'btc',
        image: { large: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png', small: '', thumb: '' },
        market_data: {
          current_price: { usd: 68000 },
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
        description: 'Bitcoin is a decentralized digital currency that can be transferred on the peer-to-peer bitcoin network.',
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
        chart_data: {
          day: null,
          week: null,
          month: null,
          year: null
        },
        whale_data: []
      },
      'ethereum': {
        id: 'ethereum',
        name: 'Ethereum',
        symbol: 'eth',
        image: { large: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png', small: '', thumb: '' },
        market_data: {
          current_price: { usd: 3850 },
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
        description: 'Ethereum is a decentralized, open-source blockchain with smart contract functionality.',
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
        chart_data: {
          day: null,
          week: null,
          month: null,
          year: null
        },
        whale_data: []
      }
    };
    
    // Add a few more common cryptos
    commonCryptos['binancecoin'] = { 
      id: 'binancecoin', 
      name: 'BNB', 
      symbol: 'bnb', 
      image: { large: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png', small: '', thumb: '' },
      market_data: {
        current_price: { usd: 570 },
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
      description: 'Binance Coin (BNB) is an exchange-based token created and issued by the cryptocurrency exchange Binance.'
    };
    
    commonCryptos['ripple'] = { 
      id: 'ripple', 
      name: 'XRP', 
      symbol: 'xrp', 
      image: { large: 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png', small: '', thumb: '' },
      market_data: {
        current_price: { usd: 0.55 },
        market_cap: { usd: 29540000000 },
        total_volume: { usd: 1245000000 },
        high_24h: { usd: 0.57 },
        low_24h: { usd: 0.53 },
        price_change_percentage_24h: 1.8,
        price_change_percentage_7d: 5.2,
        price_change_percentage_30d: 12.3,
        price_change_percentage_1y: 45.6,
        ath: { usd: 3.4 },
        ath_date: { usd: '2018-01-07T00:00:00.000Z' },
        atl: { usd: 0.00268621 },
        atl_date: { usd: '2014-05-22T00:00:00.000Z' },
        circulating_supply: 53456789012,
        total_supply: 100000000000,
        max_supply: 100000000000
      },
      description: 'XRP is the native cryptocurrency of the XRP Ledger, which is an open-source, permissionless and decentralized blockchain technology.'
    };
    
    commonCryptos['cardano'] = { 
      id: 'cardano', 
      name: 'Cardano', 
      symbol: 'ada', 
      image: { large: 'https://assets.coingecko.com/coins/images/975/large/cardano.png', small: '', thumb: '' },
      market_data: {
        current_price: { usd: 0.45 },
        market_cap: { usd: 15740000000 },
        total_volume: { usd: 845000000 },
        high_24h: { usd: 0.47 },
        low_24h: { usd: 0.44 },
        price_change_percentage_24h: 2.1,
        price_change_percentage_7d: 6.7,
        price_change_percentage_30d: 14.2,
        price_change_percentage_1y: 35.8,
        ath: { usd: 3.09 },
        ath_date: { usd: '2021-09-02T00:00:00.000Z' },
        atl: { usd: 0.01925275 },
        atl_date: { usd: '2020-03-13T00:00:00.000Z' },
        circulating_supply: 35045020830,
        total_supply: 45000000000,
        max_supply: 45000000000
      },
      description: 'Cardano is a proof-of-stake blockchain platform that says its goal is to allow "changemakers, innovators and visionaries" to bring about positive global change.'
    };
    
    commonCryptos['solana'] = { 
      id: 'solana', 
      name: 'Solana', 
      symbol: 'sol', 
      image: { large: 'https://assets.coingecko.com/coins/images/4128/large/solana.png', small: '', thumb: '' },
      market_data: {
        current_price: { usd: 145 },
        market_cap: { usd: 63740000000 },
        total_volume: { usd: 2845000000 },
        high_24h: { usd: 150 },
        low_24h: { usd: 142 },
        price_change_percentage_24h: 3.1,
        price_change_percentage_7d: 9.7,
        price_change_percentage_30d: 18.2,
        price_change_percentage_1y: 155.8,
        ath: { usd: 260 },
        ath_date: { usd: '2021-11-06T00:00:00.000Z' },
        atl: { usd: 0.5 },
        atl_date: { usd: '2020-05-11T00:00:00.000Z' },
        circulating_supply: 440115596,
        total_supply: 540115596,
        max_supply: null
      },
      description: 'Solana is a high-performance blockchain supporting builders around the world creating crypto apps that scale.'
    };
    
    return commonCryptos[id] as CryptoDetail || null;
  };
  
  // Process chart data based on the selected timeframe
  const processChartData = (timeframe: 'day' | 'week' | 'month' | 'year', data: ChartData | null) => {
    if (!data || !data.prices || data.prices.length === 0) {
      // Create synthetic data if no real data is available
      const now = Date.now();
      const syntheticData = [];
      const basePrice = cryptoData?.market_data?.current_price?.usd || 1000;
      
      // Generate random data points for the chosen timeframe
      const points = timeframe === 'day' ? 24 : 
                    timeframe === 'week' ? 7 : 
                    timeframe === 'month' ? 30 : 365;
      
      for (let i = points; i >= 0; i--) {
        // Create a slightly fluctuating price based on the base price
        const randomFactor = 0.98 + (Math.random() * 0.04); // ±2% fluctuation
        const timestamp = now - (i * 86400000 / (timeframe === 'day' ? 24 : 1));
        
        syntheticData.push({
          timestamp: timestamp,
          date: new Date(timestamp).toLocaleDateString(),
          value: basePrice * randomFactor
        });
      }
      
      setChartData(syntheticData);
      setChartTimeframe(timeframe);
      return;
    }
    
    const formatted = data.prices.map(([timestamp, price]) => ({
      timestamp,
      date: new Date(timestamp).toLocaleDateString(),
      value: price
    }));
    
    setChartData(formatted);
    setChartTimeframe(timeframe);
  };
  
  // Format large numbers with commas
  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };
  
  // Format as currency
  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: num < 1 ? 4 : 2,
      maximumFractionDigits: num < 1 ? 6 : 2
    }).format(num);
  };
  
  // Format percentage
  const formatPercentage = (num: number) => {
    return `${num > 0 ? '+' : ''}${num.toFixed(2)}%`;
  };
  
  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Get color based on value (positive/negative)
  const getChangeColor = (change: number) => {
    if (change > 0) return "text-green-500";
    if (change < 0) return "text-red-500";
    return "text-gray-500";
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 animate-fade-in">
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="h-16 w-16 rounded-full border-4 border-t-primary border-r-transparent border-l-transparent border-b-transparent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
            </div>
            <p className="mt-4 text-muted-foreground">Chargement des données de la cryptomonnaie...</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="container mx-auto py-8 animate-fade-in">
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Erreur</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={() => router.back()}>Retour</Button>
        </div>
      </div>
    );
  }
  
  // Return null if no data
  if (!cryptoData) return null;
  
  return (
    <div className="container mx-auto py-6 animate-fade-in">
      {/* Background decorative elements */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-20 right-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 left-20 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute top-40 left-60 w-72 h-72 bg-purple-500/5 rounded-full blur-3xl"></div>
      </div>
      
      {/* Add TradingView script at the top level, outside of any conditional rendering */}
      <Script 
        src="https://s3.tradingview.com/tv.js" 
        strategy="beforeInteractive"
        onLoad={() => {
          console.log("TradingView script loaded successfully");
        }}
        onError={(e) => {
          console.error("TradingView script failed to load:", e);
        }}
      />
      
      {/* Header with navigation */}
      <div className="mb-8">
        <Button 
          variant="ghost" 
          onClick={() => router.back()}
          className="mb-4 group"
        >
          <ArrowLeft className="h-4 w-4 mr-2 transition-transform group-hover:-translate-x-1" />
          <span className="relative">
            Retour
            <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></span>
          </span>
        </Button>
      </div>
      
      {/* Crypto header with improved design */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 relative">
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary/5 to-transparent rounded-xl opacity-30"></div>
        
        <div className="flex items-center p-6">
          <div className="relative mr-6">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-blue-500/20 rounded-full blur-sm opacity-80"></div>
            <div className="absolute inset-0 rounded-full border border-primary/20 animate-ping-slow opacity-20"></div>
            <Image
              src={cryptoData.image?.large || `https://placehold.co/128x128/3b82f6/FFFFFF?text=${cryptoData.symbol.substring(0, 3)}`}
              alt={cryptoData.name}
              width={128}
              height={128}
              className="relative z-10 rounded-full p-1 bg-card/30 backdrop-blur-sm border border-border/30"
            />
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">{cryptoData.name}</h1>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${getChangeColor(cryptoData.market_data?.price_change_percentage_24h || 0)}`}>
                {formatPercentage(cryptoData.market_data?.price_change_percentage_24h || 0)}
              </div>
            </div>
            <div className="flex items-center space-x-2 text-muted-foreground mt-1">
              <span className="font-medium text-xl bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">{cryptoData.symbol.toUpperCase()}</span>
              {cryptoData.categories && cryptoData.categories.length > 0 && (
                <>
                  <span>•</span>
                  <span>{cryptoData.categories[0]}</span>
                </>
              )}
            </div>
            <div className="mt-3 text-3xl font-bold">
              {formatCurrency(cryptoData.market_data?.current_price?.usd || 0)}
            </div>
          </div>
        </div>
        
        <div className="flex mt-4 md:mt-0 space-x-3 p-6">
          <Button
            variant="outline"
            onClick={() => window.open(cryptoData.links?.homepage?.[0] || '#', '_blank')}
            disabled={!cryptoData.links?.homepage?.[0]}
            className="border-primary/20 bg-primary/5 hover:bg-primary/10"
          >
            <Globe className="h-4 w-4 mr-2" />
            Site Web
          </Button>
          
          <Button
            variant="default"
            onClick={() => {
              // Logic to open buy modal would go here
              alert(`Achat de ${cryptoData.symbol} bientôt disponible!`);
            }}
            className="bg-gradient-to-r from-primary to-blue-500 hover:opacity-90"
          >
            <Wallet className="h-4 w-4 mr-2" />
            Acheter
          </Button>
        </div>
      </div>
      
      {/* Price and stats section */}
      <div className="grid gap-6 md:grid-cols-4 mb-10">
        <Card className="md:col-span-3 overflow-hidden border-border/30 bg-card/60 backdrop-blur-sm shadow-lg">
          <CardHeader className="pb-2 border-b border-border/20">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div>
                <CardTitle className="text-2xl md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">
                  {formatCurrency(cryptoData.market_data?.current_price?.usd || 0)}
                </CardTitle>
                <CardDescription className={`text-lg font-medium ${getChangeColor(cryptoData.market_data?.price_change_percentage_24h || 0)}`}>
                  {formatPercentage(cryptoData.market_data?.price_change_percentage_24h || 0)} (24h)
                </CardDescription>
              </div>
              
              <div className="flex space-x-2 mt-4 md:mt-0">
                <Button
                  variant={chartTimeframe === 'day' ? 'default' : 'outline'}
                  size="sm"
                  className={chartTimeframe === 'day' ? 'bg-primary text-primary-foreground' : 'border-primary/20 bg-primary/5 hover:bg-primary/10'}
                  onClick={() => {
                    if (cryptoData.chart_data?.day) {
                      processChartData('day', cryptoData.chart_data.day);
                    }
                  }}
                >
                  24h
                </Button>
                <Button
                  variant={chartTimeframe === 'week' ? 'default' : 'outline'}
                  size="sm"
                  className={chartTimeframe === 'week' ? 'bg-primary text-primary-foreground' : 'border-primary/20 bg-primary/5 hover:bg-primary/10'}
                  onClick={() => {
                    if (cryptoData.chart_data?.week) {
                      processChartData('week', cryptoData.chart_data.week);
                    }
                  }}
                >
                  7j
                </Button>
                <Button
                  variant={chartTimeframe === 'month' ? 'default' : 'outline'}
                  size="sm"
                  className={chartTimeframe === 'month' ? 'bg-primary text-primary-foreground' : 'border-primary/20 bg-primary/5 hover:bg-primary/10'}
                  onClick={() => {
                    if (cryptoData.chart_data?.month) {
                      processChartData('month', cryptoData.chart_data.month);
                    }
                  }}
                >
                  30j
                </Button>
                <Button
                  variant={chartTimeframe === 'year' ? 'default' : 'outline'}
                  size="sm"
                  className={chartTimeframe === 'year' ? 'bg-primary text-primary-foreground' : 'border-primary/20 bg-primary/5 hover:bg-primary/10'}
                  onClick={() => {
                    if (cryptoData.chart_data?.year) {
                      processChartData('year', cryptoData.chart_data.year);
                    }
                  }}
                >
                  1a
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {/* TradingView Advanced Chart with clean styling */}
            <div 
              id="tradingview_chart" 
              className="w-full relative mt-8" 
              style={{ 
                height: '450px', 
                width: '100%', 
                margin: '0 auto',
                display: 'block',
                backgroundColor: 'transparent',
                paddingTop: '30px',
                position: 'relative',
                zIndex: 10
              }}
            ></div>

            {/* Fallback chart only shown if TradingView is not available */}
            {!tradingViewLoaded && chartData.length > 0 && (
              <div className="h-[450px] w-full absolute top-0 left-0 pt-8" id="fallback-chart">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
                  >
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => value}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <YAxis
                      tickFormatter={(value) => `$${Math.round(value).toLocaleString()}`}
                      domain={['auto', 'auto']}
                      stroke="hsl(var(--muted-foreground))"
                    />
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground)/0.1)" />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), 'Prix']}
                      labelFormatter={(label) => `Date: ${label}`}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '0.5rem',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorValue)"
                      animationDuration={1500}
                      animationEasing="ease-out"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Stats card with improved design */}
        <Card className="overflow-hidden border-border/30 bg-card/60 backdrop-blur-sm shadow-lg">
          <CardHeader className="pb-2 border-b border-border/20">
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-primary" />
              Statistiques
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
              <p className="text-sm text-muted-foreground">Capitalisation</p>
              <p className="font-medium text-lg">{formatCurrency(cryptoData.market_data?.market_cap?.usd || 0)}</p>
            </div>
            
            <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
              <p className="text-sm text-muted-foreground">Volume (24h)</p>
              <p className="font-medium text-lg">{formatCurrency(cryptoData.market_data?.total_volume?.usd || 0)}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                <p className="text-sm text-muted-foreground">Plus haut (24h)</p>
                <p className="font-medium">{formatCurrency(cryptoData.market_data?.high_24h?.usd || 0)}</p>
              </div>
              
              <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                <p className="text-sm text-muted-foreground">Plus bas (24h)</p>
                <p className="font-medium">{formatCurrency(cryptoData.market_data?.low_24h?.usd || 0)}</p>
              </div>
            </div>
            
            <Separator className="bg-border/30" />
            
            <div className="p-3 rounded-lg bg-gradient-to-r from-primary/5 to-transparent border border-primary/20">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">ATH</p>
                <p className="text-xs text-primary">
                  {cryptoData.market_data?.ath_date?.usd && formatDate(cryptoData.market_data.ath_date.usd)}
                </p>
              </div>
              <p className="font-medium text-lg mt-1">{formatCurrency(cryptoData.market_data?.ath?.usd || 0)}</p>
            </div>
            
            <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
              <p className="text-sm text-muted-foreground">Supply en circulation</p>
              <p className="font-medium">{formatNumber(cryptoData.market_data?.circulating_supply || 0)} {cryptoData.symbol}</p>
              
              {/* Progress bar for supply */}
              {cryptoData.market_data?.max_supply && (
                <div className="mt-2">
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-1000 ease-out"
                      style={{ width: `${(cryptoData.market_data.circulating_supply / cryptoData.market_data.max_supply) * 100}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                    <span>Circulating</span>
                    <span>{((cryptoData.market_data.circulating_supply / cryptoData.market_data.max_supply) * 100).toFixed(1)}%</span>
                  </div>
                </div>
              )}
            </div>
            
            {cryptoData.market_data?.max_supply && (
              <div className="p-3 rounded-lg bg-muted/20 border border-border/30">
                <p className="text-sm text-muted-foreground">Supply maximum</p>
                <p className="font-medium">{formatNumber(cryptoData.market_data.max_supply)} {cryptoData.symbol}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Tabs for additional information with enhanced styling */}
      <Tabs defaultValue="description" className="w-full mb-10">
        <TabsList className="grid w-full grid-cols-3 p-1 bg-muted/30 backdrop-blur-sm">
          <TabsTrigger value="description" className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Description</TabsTrigger>
          <TabsTrigger value="whale-activity" className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Activité des Whales</TabsTrigger>
          <TabsTrigger value="links" className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Liens & Ressources</TabsTrigger>
        </TabsList>
        
        {/* Description tab */}
        <TabsContent value="description" className="mt-6">
          <Card className="overflow-hidden border-border/30 bg-card/60 backdrop-blur-sm shadow-lg">
            <CardHeader className="border-b border-border/20">
              <CardTitle className="flex items-center">
                <Globe className="h-5 w-5 mr-2 text-primary" />
                À propos de {cryptoData.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground p-6">
              {cryptoData.description ? (
                <div 
                  dangerouslySetInnerHTML={{ __html: cryptoData.description }}
                  className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-a:text-primary"
                />
              ) : (
                <div className="text-center py-10 bg-muted/10 rounded-lg border border-dashed border-muted">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                    <AlertTriangle className="h-8 w-8 text-primary/60" />
                  </div>
                  <h3 className="text-xl font-medium mb-2">Pas de description</h3>
                  <p>Aucune description disponible pour {cryptoData.name}.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Whale Activity tab */}
        <TabsContent value="whale-activity" className="mt-6">
          <Card className="overflow-hidden border-border/30 bg-card/60 backdrop-blur-sm shadow-lg">
            <CardHeader className="border-b border-border/20">
              <CardTitle className="flex items-center">
                <Whale className="h-5 w-5 mr-2 text-primary" />
                Activité des Whales
              </CardTitle>
              <CardDescription>
                Transactions importantes des 10 derniers jours
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {cryptoData.whale_data && cryptoData.whale_data.length > 0 ? (
                <div className="rounded-md border border-border/30 overflow-hidden">
                  <table className="w-full caption-bottom text-sm">
                    <thead>
                      <tr className="bg-muted/30">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Montant</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Valeur</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Type</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Destination</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cryptoData.whale_data.map((transaction, index) => (
                        <tr 
                          key={index} 
                          className="border-b border-border/30 transition-colors hover:bg-muted/20"
                        >
                          <td className="p-4 align-middle">{formatDate(transaction.date)}</td>
                          <td className="p-4 align-middle font-medium">
                            {formatNumber(transaction.amount)} {cryptoData.symbol}
                          </td>
                          <td className="p-4 align-middle">{formatCurrency(transaction.value_usd)}</td>
                          <td className="p-4 align-middle">
                            <Badge variant={transaction.transaction_type === 'buy' ? 'default' : 'secondary'} className="capitalize">
                              {transaction.transaction_type}
                            </Badge>
                          </td>
                          <td className="p-4 align-middle capitalize">{transaction.to_type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-10 bg-muted/10 rounded-lg border border-dashed border-muted">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                    <AlertTriangle className="h-8 w-8 text-primary/60" />
                  </div>
                  <h3 className="text-xl font-medium mb-2">Aucune activité</h3>
                  <p className="text-muted-foreground">Aucune activité de whales détectée récemment.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Links & Resources tab */}
        <TabsContent value="links" className="mt-6">
          <Card className="overflow-hidden border-border/30 bg-card/60 backdrop-blur-sm shadow-lg">
            <CardHeader className="border-b border-border/20">
              <CardTitle className="flex items-center">
                <Link2 className="h-5 w-5 mr-2 text-primary" />
                Liens & Ressources
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Explorers */}
                <div>
                  <h3 className="text-lg font-medium mb-4 flex items-center">
                    <Layers className="h-4 w-4 mr-2 text-primary" />
                    Explorateurs de Blockchain
                  </h3>
                  <div className="space-y-2">
                    {cryptoData.links?.blockchain_site?.filter(Boolean).map((site, index) => (
                      <Button 
                        key={index}
                        variant="outline" 
                        className="w-full justify-start border-primary/20 hover:bg-primary/5 transition-all" 
                        onClick={() => window.open(site, '_blank')}
                      >
                        <Globe className="h-4 w-4 mr-2 text-primary" />
                        {new URL(site).hostname}
                      </Button>
                    ))}
                    {(!cryptoData.links?.blockchain_site || 
                     !cryptoData.links.blockchain_site.some(Boolean)) && (
                      <div className="p-4 rounded-lg bg-muted/10 border border-dashed border-muted">
                        <p className="text-muted-foreground text-sm">Aucun explorateur disponible.</p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Social Links */}
                <div>
                  <h3 className="text-lg font-medium mb-4 flex items-center">
                    <Users className="h-4 w-4 mr-2 text-primary" />
                    Réseaux sociaux
                  </h3>
                  <div className="space-y-2">
                    {cryptoData.links?.twitter_screen_name && (
                      <Button 
                        variant="outline" 
                        className="w-full justify-start border-primary/20 hover:bg-blue-500/10 hover:text-blue-500 hover:border-blue-500/30 transition-all" 
                        onClick={() => window.open(`https://twitter.com/${cryptoData.links.twitter_screen_name}`, '_blank')}
                      >
                        <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                        </svg>
                        Twitter
                      </Button>
                    )}
                    
                    {cryptoData.links?.subreddit_url && (
                      <Button 
                        variant="outline" 
                        className="w-full justify-start border-primary/20 hover:bg-orange-500/10 hover:text-orange-500 hover:border-orange-500/30 transition-all" 
                        onClick={() => window.open(cryptoData.links.subreddit_url, '_blank')}
                      >
                        <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
                        </svg>
                        Reddit
                      </Button>
                    )}
                    
                    {cryptoData.links?.telegram_channel_identifier && (
                      <Button 
                        variant="outline" 
                        className="w-full justify-start border-primary/20 hover:bg-blue-400/10 hover:text-blue-400 hover:border-blue-400/30 transition-all" 
                        onClick={() => window.open(`https://t.me/${cryptoData.links.telegram_channel_identifier}`, '_blank')}
                      >
                        <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 11.944 0Zm0 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10A10 10 0 0 1 2 12 10 10 0 0 1 11.944 2ZM8.5 14.5c-1.9-1.9-2.3-4.2-2.3-4.2l4.2-2.3c1.5-.8 5.3-2.1 5.3-2.1s.7-.3.6.3c0 .2-.1.9-.2 1.7A116.2 116.2 0 0 1 14.7 15c-.1.7-.5 1-1 1-.9 0-1.5-.7-2-1.4a44.5 44.5 0 0 0-3.2-2.9Z"/>
                        </svg>
                        Telegram
                      </Button>
                    )}
                    
                    {(!cryptoData.links?.twitter_screen_name && 
                      !cryptoData.links?.subreddit_url && 
                      !cryptoData.links?.telegram_channel_identifier) && (
                      <div className="p-4 rounded-lg bg-muted/10 border border-dashed border-muted">
                        <p className="text-muted-foreground text-sm">Aucun réseau social disponible.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Buy/Sell section with improved design */}
      <Card className="mb-10 overflow-hidden border-border/30 bg-card/60 backdrop-blur-sm shadow-lg">
        <CardHeader className="border-b border-border/20">
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-primary" />
            Trader {cryptoData.name}
          </CardTitle>
          <CardDescription>
            Achetez et vendez {cryptoData.symbol} directement depuis votre portefeuille
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-6 rounded-lg bg-gradient-to-r from-green-500/10 to-primary/5 border border-green-500/20 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              
              <h3 className="text-xl font-bold mb-3 flex items-center">
                <ArrowUp className="h-5 w-5 mr-2 text-green-500" />
                Acheter {cryptoData.symbol}
              </h3>
              
              <p className="text-muted-foreground mb-4">
                Ajoutez {cryptoData.symbol} à votre portefeuille et diversifiez vos investissements en cryptomonnaies.
              </p>
              
              <Button 
                className="w-full bg-gradient-to-r from-green-500 to-primary group-hover:opacity-90 transition-opacity"
                onClick={() => {
                  // Logique pour acheter qui sera implémentée plus tard
                  alert(`Achat de ${cryptoData.symbol} bientôt disponible!`);
                }}
              >
                <ArrowUp className="h-4 w-4 mr-2" />
                Acheter {cryptoData.symbol}
              </Button>
            </div>
            
            <div className="p-6 rounded-lg bg-gradient-to-r from-red-500/10 to-primary/5 border border-red-500/20 relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              
              <h3 className="text-xl font-bold mb-3 flex items-center">
                <ArrowDown className="h-5 w-5 mr-2 text-red-500" />
                Vendre {cryptoData.symbol}
              </h3>
              
              <p className="text-muted-foreground mb-4">
                {getCryptoHolding(cryptoId) 
                  ? `Vous possédez ${getCryptoHolding(cryptoId)?.amount.toFixed(6)} ${cryptoData.symbol} dans votre portefeuille.`
                  : `Vous ne possédez pas de ${cryptoData.symbol} dans votre portefeuille actuellement.`
                }
              </p>
              
              <Button 
                variant="outline" 
                className="w-full border-red-500/30 text-red-500 hover:bg-red-500/10 group-hover:border-red-500/50 transition-all"
                disabled={!getCryptoHolding(cryptoId) || getCryptoHolding(cryptoId)?.amount <= 0}
                onClick={() => {
                  // Logique pour vendre qui sera implémentée plus tard
                  const holding = getCryptoHolding(cryptoId);
                  if (!holding || holding.amount <= 0) {
                    alert(`Vous ne possédez pas de ${cryptoData.symbol} dans votre portefeuille.`);
                  } else {
                    alert(`Vente de ${cryptoData.symbol} bientôt disponible!`);
                  }
                }}
              >
                <ArrowDown className="h-4 w-4 mr-2" />
                Vendre {cryptoData.symbol}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}