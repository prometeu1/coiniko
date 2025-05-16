"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowUpIcon, ArrowDownIcon, DollarSign, Wallet, BarChart3, Globe, Clock, TrendingUp, Layers, AlertTriangle } from "lucide-react";
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
  
  // Get crypto ID from route params
  const cryptoId = params?.id as string;
  
  // Fetch the detailed crypto data
  useEffect(() => {
    const fetchCryptoDetail = async () => {
      if (!cryptoId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/crypto/${cryptoId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch crypto data: ${response.status}`);
        }
        
        const data = await response.json();
        setCryptoData(data);
        
        // Set initial chart data
        if (data.chart_data?.week?.prices) {
          processChartData('week', data.chart_data.week);
        }
      } catch (err) {
        console.error("Error fetching crypto detail:", err);
        setError("Failed to load cryptocurrency data. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCryptoDetail();
  }, [cryptoId]);
  
  // Process chart data based on the selected timeframe
  const processChartData = (timeframe: 'day' | 'week' | 'month' | 'year', data: ChartData | null) => {
    if (!data || !data.prices || data.prices.length === 0) {
      setChartData([]);
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
      {/* Header with navigation */}
      <div className="mb-6">
        <Button 
          variant="ghost" 
          onClick={() => router.back()}
          className="mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour
        </Button>
      </div>
      
      {/* Crypto header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
        <div className="flex items-center">
          <div className="relative mr-4">
            <div className="absolute inset-0 bg-accent/20 rounded-full blur-sm opacity-70"></div>
            <Image
              src={cryptoData.image?.large || `https://placehold.co/96x96/3b82f6/FFFFFF?text=${cryptoData.symbol.substring(0, 3)}`}
              alt={cryptoData.name}
              width={96}
              height={96}
              className="relative z-10"
            />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{cryptoData.name}</h1>
            <div className="flex items-center space-x-2 text-muted-foreground">
              <span className="font-medium text-xl">{cryptoData.symbol}</span>
              {cryptoData.categories && cryptoData.categories.length > 0 && (
                <>
                  <span>•</span>
                  <span>{cryptoData.categories[0]}</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex mt-4 md:mt-0 space-x-2">
          <Button
            variant="outline"
            onClick={() => window.open(cryptoData.links?.homepage?.[0] || '#', '_blank')}
            disabled={!cryptoData.links?.homepage?.[0]}
          >
            <Globe className="h-4 w-4 mr-2" />
            Site Web
          </Button>
          
          <Button
            variant="default"
            onClick={() => {
              // Logic to open buy modal would go here
              // We'll implement this in a future step
              alert(`Achat de ${cryptoData.symbol} bientôt disponible!`);
            }}
          >
            <Wallet className="h-4 w-4 mr-2" />
            Acheter
          </Button>
        </div>
      </div>
      
      {/* Price and stats section */}
      <div className="grid gap-6 md:grid-cols-4 mb-8">
        <Card className="md:col-span-3">
          <CardHeader className="pb-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between">
              <div>
                <CardTitle className="text-2xl md:text-3xl font-bold">
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
          <CardContent>
            {/* TradingView Advanced Chart */}
            <div className="h-[400px] w-full mt-4">
              {/* TradingView Widget BEGIN */}
              <div className="tradingview-widget-container" style={{ height: '100%', width: '100%' }}>
                <div className="tradingview-widget-container__widget" style={{ height: 'calc(100% - 32px)', width: '100%' }}></div>
                
                <script
                  type="text/javascript"
                  dangerouslySetInnerHTML={{
                    __html: `
                      new TradingView.widget({
                        "autosize": true,
                        "symbol": "COINBASE:${cryptoData.symbol}USD",
                        "interval": "D",
                        "timezone": "Etc/UTC",
                        "theme": document.documentElement.classList.contains('dark') ? "dark" : "light",
                        "style": "1",
                        "locale": "fr",
                        "toolbar_bg": "#f1f3f6",
                        "enable_publishing": false,
                        "hide_top_toolbar": false,
                        "allow_symbol_change": true,
                        "container_id": "tradingview_chart"
                      });
                    `
                  }}
                />
                
                <div id="tradingview_chart" style={{ height: 'calc(100% - 32px)', width: '100%' }}></div>
              </div>
              {/* TradingView Widget END */}
            </div>

            {/* Fallback chart if TradingView is not available */}
            {chartData.length > 0 && (
              <div className="h-[400px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
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
                    />
                    <YAxis
                      tickFormatter={(value) => `$${Math.round(value).toLocaleString()}`}
                      domain={['auto', 'auto']}
                    />
                    <CartesianGrid strokeDasharray="3 3" />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), 'Prix']}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorValue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Stats card */}
        <Card>
          <CardHeader>
            <CardTitle>Statistiques</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Capitalisation</p>
              <p className="font-medium">{formatCurrency(cryptoData.market_data?.market_cap?.usd || 0)}</p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">Volume (24h)</p>
              <p className="font-medium">{formatCurrency(cryptoData.market_data?.total_volume?.usd || 0)}</p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">Plus haut (24h)</p>
              <p className="font-medium">{formatCurrency(cryptoData.market_data?.high_24h?.usd || 0)}</p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">Plus bas (24h)</p>
              <p className="font-medium">{formatCurrency(cryptoData.market_data?.low_24h?.usd || 0)}</p>
            </div>
            
            <Separator />
            
            <div>
              <p className="text-sm text-muted-foreground">ATH</p>
              <p className="font-medium">{formatCurrency(cryptoData.market_data?.ath?.usd || 0)}</p>
              <p className="text-xs text-muted-foreground">
                {cryptoData.market_data?.ath_date?.usd && formatDate(cryptoData.market_data.ath_date.usd)}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-muted-foreground">Supply en circulation</p>
              <p className="font-medium">{formatNumber(cryptoData.market_data?.circulating_supply || 0)} {cryptoData.symbol}</p>
            </div>
            
            {cryptoData.market_data?.max_supply && (
              <div>
                <p className="text-sm text-muted-foreground">Supply maximum</p>
                <p className="font-medium">{formatNumber(cryptoData.market_data.max_supply)} {cryptoData.symbol}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Add a script tag for TradingView */}
      <Script src="https://s3.tradingview.com/tv.js" strategy="beforeInteractive" />
      
      {/* Tabs for additional information */}
      <Tabs defaultValue="description" className="w-full mb-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="description">Description</TabsTrigger>
          <TabsTrigger value="whale-activity">Activité des Whales</TabsTrigger>
          <TabsTrigger value="links">Liens & Ressources</TabsTrigger>
        </TabsList>
        
        {/* Description tab */}
        <TabsContent value="description" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>À propos de {cryptoData.name}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              {cryptoData.description ? (
                <div 
                  dangerouslySetInnerHTML={{ __html: cryptoData.description }}
                  className="prose prose-sm dark:prose-invert max-w-none"
                />
              ) : (
                <p>Aucune description disponible pour {cryptoData.name}.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Whale Activity tab */}
        <TabsContent value="whale-activity" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Activité des Whales</CardTitle>
              <CardDescription>
                Transactions importantes des 10 derniers jours
              </CardDescription>
            </CardHeader>
            <CardContent>
              {cryptoData.whale_data && cryptoData.whale_data.length > 0 ? (
                <div className="rounded-md border">
                  <table className="w-full caption-bottom text-sm">
                    <thead>
                      <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                        <th className="h-12 px-4 text-left align-middle font-medium">Date</th>
                        <th className="h-12 px-4 text-left align-middle font-medium">Montant</th>
                        <th className="h-12 px-4 text-left align-middle font-medium">Valeur</th>
                        <th className="h-12 px-4 text-left align-middle font-medium">Type</th>
                        <th className="h-12 px-4 text-left align-middle font-medium">Destination</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cryptoData.whale_data.map((transaction, index) => (
                        <tr 
                          key={index} 
                          className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                        >
                          <td className="p-4 align-middle">{formatDate(transaction.date)}</td>
                          <td className="p-4 align-middle font-medium">
                            {formatNumber(transaction.amount)} {cryptoData.symbol}
                          </td>
                          <td className="p-4 align-middle">{formatCurrency(transaction.value_usd)}</td>
                          <td className="p-4 align-middle capitalize">{transaction.transaction_type}</td>
                          <td className="p-4 align-middle capitalize">{transaction.to_type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground/60" />
                  <p>Aucune activité de whales détectée récemment.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Links & Resources tab */}
        <TabsContent value="links" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Liens & Ressources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {/* Explorers */}
                <div>
                  <h3 className="text-lg font-medium mb-2">Explorateurs de Blockchain</h3>
                  <div className="space-y-2">
                    {cryptoData.links?.blockchain_site?.filter(Boolean).map((site, index) => (
                      <Button 
                        key={index}
                        variant="outline" 
                        className="w-full justify-start" 
                        onClick={() => window.open(site, '_blank')}
                      >
                        <Globe className="h-4 w-4 mr-2" />
                        {new URL(site).hostname}
                      </Button>
                    ))}
                    {(!cryptoData.links?.blockchain_site || 
                     !cryptoData.links.blockchain_site.some(Boolean)) && (
                      <p className="text-muted-foreground text-sm">Aucun explorateur disponible.</p>
                    )}
                  </div>
                </div>
                
                {/* Social Links */}
                <div>
                  <h3 className="text-lg font-medium mb-2">Réseaux sociaux</h3>
                  <div className="space-y-2">
                    {cryptoData.links?.twitter_screen_name && (
                      <Button 
                        variant="outline" 
                        className="w-full justify-start" 
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
                        className="w-full justify-start" 
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
                        className="w-full justify-start" 
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
                      <p className="text-muted-foreground text-sm">Aucun réseau social disponible.</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Buy/Sell section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Trader {cryptoData.name}</CardTitle>
          <CardDescription>
            Achetez et vendez {cryptoData.symbol} directement depuis votre portefeuille
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <Button 
              className="w-full h-20 text-lg"
              onClick={() => {
                // Logique pour acheter qui sera implémentée plus tard
                alert(`Achat de ${cryptoData.symbol} bientôt disponible!`);
              }}
            >
              <ArrowUpIcon className="h-5 w-5 mr-2" />
              Acheter {cryptoData.symbol}
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full h-20 text-lg"
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
              <ArrowDownIcon className="h-5 w-5 mr-2" />
              Vendre {cryptoData.symbol}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}