"use client";

import React, { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  ArrowDown, 
  ArrowUp, 
  AreaChart, 
  DollarSign,
  Clock
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWallet } from "@/lib/walletContext";
import { getCryptoPrice, mapCoinMarketCapToGeckoId } from "@/lib/cryptoService";
import {
  Area,
  AreaChart as RechartsAreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  TooltipProps
} from "recharts";
import CryptoHoldingCard from "@/components/crypto-holding-card";
import { Button } from "@/components/ui/button";

// Interface pour le format des données du graphique
interface ChartDataPoint {
  date: string;
  value: number;
  previousValue?: number;
  formatted?: string;
}

export default function WalletPage() {
  const { balance, holdings, transactions } = useWallet();
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch current prices for all holdings
  useEffect(() => {
    const fetchCurrentPrices = async () => {
      setIsLoading(true);
      const prices: Record<string, number> = {};
      
      // Try from localStorage first to reduce API calls
      if (typeof window !== 'undefined') {
        try {
          const cachedPrices = localStorage.getItem('wallet_prices');
          const cacheTimestamp = localStorage.getItem('wallet_prices_timestamp');
          
          if (cachedPrices && cacheTimestamp) {
            const cachedTime = parseInt(cacheTimestamp);
            
            // Use cache if less than 10 minutes old
            if (Date.now() - cachedTime < 10 * 60 * 1000) {
              const parsedPrices = JSON.parse(cachedPrices);
              
              // Only use cached prices if we have prices for all current holdings
              const hasAllHoldings = holdings.every(h => parsedPrices[h.cryptoId]);
              
              if (hasAllHoldings) {
                setCurrentPrices(parsedPrices);
                setIsLoading(false);
                return;
              }
            }
          }
        } catch (err) {
          console.error("Error reading from localStorage:", err);
        }
      }
      
      // Set a limit to avoid too many concurrent API calls (which often causes rate limit issues)
      const fetchBatchSize = 3;
      
      for (let i = 0; i < holdings.length; i += fetchBatchSize) {
        const batchHoldings = holdings.slice(i, i + fetchBatchSize);
        
        await Promise.all(
          batchHoldings.map(async (holding) => {
            try {
              const geckoId = mapCoinMarketCapToGeckoId(holding.cryptoId);
              
              // Récupérer le prix réel sans limitation
              const priceData = await getCryptoPrice(geckoId);
              
              if (priceData) {
                // Utiliser le prix réel du marché sans aucune limitation
                prices[holding.cryptoId] = priceData.current_price;
              } else {
                // Si pas de prix disponible, utiliser le prix d'achat
                prices[holding.cryptoId] = holding.purchasePrice;
              }
            } catch (err) {
              console.error(`Error fetching price for ${holding.name}:`, err);
              // En cas d'erreur, utiliser le prix d'achat
              prices[holding.cryptoId] = holding.purchasePrice;
            }
          })
        );
        
        // Small delay between batches to avoid rate limiting
        if (i + fetchBatchSize < holdings.length) {
          await new Promise(r => setTimeout(r, 500));
        }
      }
      
      setCurrentPrices(prices);
      setIsLoading(false);
      
      // Save to localStorage
      if (typeof window !== 'undefined' && Object.keys(prices).length > 0) {
        try {
          localStorage.setItem('wallet_prices', JSON.stringify(prices));
          localStorage.setItem('wallet_prices_timestamp', Date.now().toString());
        } catch (err) {
          console.error("Error saving to localStorage:", err);
        }
      }
    };
    
    fetchCurrentPrices();
    
    // Refresh prices every 30 seconds instead of 10 to reduce API calls
    const interval = setInterval(fetchCurrentPrices, 30000);
    return () => clearInterval(interval);
  }, [holdings]);
  
  // Calculate total portfolio value using current prices
  const portfolioValue = holdings.reduce(
    (total, holding) => {
      const currentPrice = currentPrices[holding.cryptoId] || holding.purchasePrice;
      return total + holding.amount * currentPrice;
    },
    0
  );

  // Calculate total invested amount
  const totalInvested = holdings.reduce(
    (total, holding) => total + holding.totalInvested,
    0
  );

  // Calculate profit/loss
  const profitLoss = portfolioValue - totalInvested;
  const profitLossPercentage = totalInvested > 0 
    ? (profitLoss / totalInvested) * 100 
    : 0;

  // Get color based on value (positive/negative)
  const getChangeColor = (change: number) => {
    if (change > 0) return "text-green-500";
    if (change < 0) return "text-red-500";
    return "text-gray-500";
  };
  
  // Format date - Définir toutes les fonctions utilitaires avant de les utiliser
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };
  
  // Format date court (pour le graphique)
  const formatDateShort = (date: Date) => {
    return date.toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "short",
    });
  };
  
  // Parser la date depuis le format court
  const parseDate = (dateString: string) => {
    // Si c'est "Aujourd'hui", retourner la date actuelle
    if (dateString === "Aujourd'hui") {
      return new Date();
    }
    
    // Sinon, essayer de parser le format "mmm. yyyy"
    const parts = dateString.split(' ');
    if (parts.length === 2) {
      const monthStr = parts[0].replace('.', '');
      const year = parseInt(parts[1]);
      
      const months = ['janv', 'févr', 'mars', 'avr', 'mai', 'juin', 'juil', 'août', 'sept', 'oct', 'nov', 'déc'];
      const monthIndex = months.findIndex(m => monthStr.startsWith(m));
      
      if (monthIndex !== -1 && !isNaN(year)) {
        return new Date(year, monthIndex, 1);
      }
    }
    
    // Fallback: retourner la date actuelle
    return new Date();
  };
  
  // Obtenir tous les mois entre deux dates
  const getMonthsBetween = (startDate: Date, endDate: Date) => {
    const months = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      months.push(formatDateShort(currentDate));
      currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    return months;
  };
  
  // Format currency with proper locale - fixing the display format
  const formatCurrencyDisplay = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
      minimumFractionDigits: 0
    }).format(value);
  };

  // Generate a smoother chart with fewer points to reduce visual glitches
  const portfolioChartData = useMemo(() => {
    if (transactions.length === 0) {
      // Si aucune transaction, montrer la balance initiale avec une courbe plate
      const initialValue = balance;
      return [
        { date: formatDateShort(new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)), value: initialValue, formatted: formatCurrencyDisplay(initialValue) },
        { date: formatDateShort(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)), value: initialValue, formatted: formatCurrencyDisplay(initialValue) },
        { date: "Aujourd'hui", value: initialValue, formatted: formatCurrencyDisplay(initialValue) }
      ];
    }

    // Trier les transactions par date (de la plus ancienne à la plus récente)
    const sortedTransactions = [...transactions].sort((a, b) => a.timestamp - b.timestamp);
    
    // Date de la première transaction
    const firstTransactionDate = new Date(sortedTransactions[0].timestamp);
    // S'assurer que la première date est au moins d'une semaine avant aujourd'hui pour un graphique plus lisible
    const minStartDate = new Date();
    minStartDate.setDate(minStartDate.getDate() - 7);
    const startDate = firstTransactionDate < minStartDate ? firstTransactionDate : minStartDate;
    
    const currentDate = new Date();
    
    // Créer un tableau pour stocker les valeurs du portefeuille au fil du temps
    const dataPoints: ChartDataPoint[] = [];
    
    // Commencer avec la balance initiale
    const initialBalance = 100000; // Solde de départ standard
    
    // Ajouter le point de départ
    dataPoints.push({ 
      date: formatDateShort(startDate), 
      value: initialBalance,
      formatted: formatCurrencyDisplay(initialBalance)
    });
    
    // Générer des points de données pour chaque semaine entre le début et aujourd'hui
    // Cela donne une courbe plus lisse avec moins de points
    const weeklyDates: Date[] = [];
    let currentWeek = new Date(startDate);
    
    // Generate weekly points
    while (currentWeek < currentDate) {
      weeklyDates.push(new Date(currentWeek));
      // Add 7 days
      currentWeek.setDate(currentWeek.getDate() + 7);
    }
    
    // Add today's date if it's not already in the list
    const today = new Date(currentDate);
    today.setHours(0, 0, 0, 0);
    
    if (weeklyDates.length === 0 || 
        weeklyDates[weeklyDates.length - 1].getTime() !== today.getTime()) {
      weeklyDates.push(today);
    }
    
    // Calculer la valeur du portefeuille pour chaque date
    weeklyDates.forEach((date, index) => {
      // Réinitialiser les valeurs pour le calcul
      let runningBalance = initialBalance;
      let cryptoHoldings: Record<string, { amount: number, price: number, cryptoId: string }> = {};
      
      // Appliquer toutes les transactions jusqu'à cette date
      sortedTransactions.forEach(transaction => {
        const transactionDate = new Date(transaction.timestamp);
        
        if (transactionDate <= date && transaction.type) {
          // Mettre à jour la balance en fonction du type de transaction
          if (transaction.type === 'buy') {
            runningBalance -= transaction.amount * transaction.price;
            
            // Ajouter à nos avoirs crypto
            if (!cryptoHoldings[transaction.cryptoId]) {
              cryptoHoldings[transaction.cryptoId] = { 
                amount: 0, 
                price: transaction.price,
                cryptoId: transaction.cryptoId
              };
            }
            cryptoHoldings[transaction.cryptoId].amount += transaction.amount;
          } else if (transaction.type === 'sell') {
            runningBalance += transaction.amount * transaction.price;
            
            // Soustraire de nos avoirs crypto
            if (cryptoHoldings[transaction.cryptoId]) {
              cryptoHoldings[transaction.cryptoId].amount -= transaction.amount;
            }
          }
        }
      });
      
      // Calculer la valeur totale (balance + valeur des cryptos détenues) avec les prix réels
      const cryptoValue = Object.values(cryptoHoldings).reduce((total, holding) => {
        if (holding.amount <= 0) return total;
        
        // Pour la date d'aujourd'hui, utiliser le prix actuel si disponible
        let price = holding.price;
        
        // Si c'est la dernière date (aujourd'hui), utiliser les prix actuels
        if (index === weeklyDates.length - 1) {
          price = currentPrices[holding.cryptoId] || holding.price;
        }
        
        return total + holding.amount * price;
      }, 0);
      
      // Éviter les valeurs négatives dans le graphique
      const totalValue = Math.max(0, runningBalance) + cryptoValue;
      
      // Store previous value for tooltip
      const previousValue = dataPoints.length > 0 ? dataPoints[dataPoints.length - 1].value : undefined;
      
      // Format the date
      const formattedDate = index === weeklyDates.length - 1 
        ? "Aujourd'hui" 
        : formatDateShort(date);
      
      // Add data point
      dataPoints.push({ 
        date: formattedDate, 
        value: totalValue,
        previousValue,
        formatted: formatCurrencyDisplay(totalValue)
      });
    });
    
    return dataPoints;
  }, [transactions, balance, portfolioValue, currentPrices, formatCurrencyDisplay, formatDateShort]);
  
  // Composant personnalisé pour le tooltip du graphique
  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload as ChartDataPoint;
      return (
        <div className="bg-background/90 backdrop-blur-sm border border-border p-2 rounded-md shadow-md">
          <p className="font-medium">{label}</p>
          <p className="text-primary font-bold">{dataPoint.formatted || formatCurrencyDisplay(dataPoint.value)}</p>
          {payload[0].value !== undefined && dataPoint.previousValue !== undefined && (
            <p className={payload[0].value > dataPoint.previousValue ? "text-green-500" : "text-red-500"}>
              {payload[0].value > dataPoint.previousValue ? "+" : ""}
              {((payload[0].value / dataPoint.previousValue - 1) * 100).toFixed(2)}%
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="container mx-auto max-w-6xl">
      <h1 className="text-3xl font-bold mb-6 page-title page-title-gradient">Mon Portefeuille</h1>

      <div className="relative mb-10">
        {/* Background decorative elements */}
        <div className="absolute top-10 left-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl -z-10"></div>
        <div className="absolute bottom-10 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl -z-10"></div>
        
        {/* Overview Cards with enhanced styling */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card className="overflow-hidden border-border/30 bg-card/60 backdrop-blur-sm shadow-lg transition-all hover:shadow-md hover:bg-card/80">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Balance</CardTitle>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${balance.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Fonds disponibles pour l&apos;investissement
              </p>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-border/30 bg-card/60 backdrop-blur-sm shadow-lg transition-all hover:shadow-md hover:bg-card/80">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Valeur du Portfolio</CardTitle>
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <AreaChart className="h-4 w-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? (
                  <span className="inline-block w-24 h-6 bg-muted animate-pulse rounded"></span>
                ) : (
                  `$${portfolioValue.toLocaleString()}`
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Valeur totale de vos investissements
              </p>
            </CardContent>
          </Card>

          <Card className={`overflow-hidden border-border/30 bg-card/60 backdrop-blur-sm shadow-lg transition-all hover:shadow-md hover:bg-card/80 ${profitLoss >= 0 ? 'hover:border-green-500/20' : 'hover:border-red-500/20'}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Profit/Perte</CardTitle>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${profitLoss >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                {profitLoss >= 0 ? (
                  <ArrowUp className="h-4 w-4 text-green-500" />
                ) : (
                  <ArrowDown className="h-4 w-4 text-red-500" />
                )}
              </div>
            </CardHeader>
            <CardContent>
                            <div className={`text-2xl font-bold ${profitLoss >= 0 ? "text-green-500" : "text-red-500"}`}>
                {isLoading ? (
                  <span className="inline-block w-24 h-6 bg-muted animate-pulse rounded"></span>
                ) : (
                  <>{profitLoss >= 0 ? "+" : ""}{formatCurrencyDisplay(profitLoss)} ({profitLossPercentage.toFixed(2)}%)</>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Depuis le début de vos investissements
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Performance Chart with enhanced styling */}
        <Card className="mb-8 overflow-hidden border-border/30 bg-card/60 backdrop-blur-sm shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Performance du Portfolio</CardTitle>
                <CardDescription>
                  Évolution de la valeur totale de votre portfolio
                </CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`text-sm font-medium ${getChangeColor(portfolioValue - (portfolioChartData[0]?.value || portfolioValue))}`}>
                  {portfolioValue > (portfolioChartData[0]?.value || portfolioValue) ? '+' : ''}
                  {((portfolioValue / Math.max((portfolioChartData[0]?.value || portfolioValue), 1) - 1) * 100).toFixed(2)}%
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsAreaChart
                  data={portfolioChartData}
                  margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
                  animationDuration={1500}
                  animationEasing="ease-in-out"
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
                    tickFormatter={(value) => value === "Aujourd'hui" ? value : value.split(' ')[0]}
                    stroke="hsl(var(--muted-foreground))"
                    dy={10}
                  />
                  <YAxis 
                    tickFormatter={(value) => `$${Math.round(value / 1000)}k`}
                    domain={['auto', 'auto']}
                    allowDataOverflow={false}
                    stroke="hsl(var(--muted-foreground))"
                    dx={-10}
                  />
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted-foreground)/0.2)" />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorValue)"
                    isAnimationActive={true}
                  />
                </RechartsAreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Holdings and Transactions with enhanced styling */}
      <Tabs defaultValue="holdings" className="mb-8">
        <TabsList className="grid w-full grid-cols-2 p-1 bg-muted/30 backdrop-blur-sm">
          <TabsTrigger value="holdings" className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Mes Cryptos</TabsTrigger>
          <TabsTrigger value="transactions" className="rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Historique</TabsTrigger>
        </TabsList>
        
        <TabsContent value="holdings" className="mt-6">
          <Card className="overflow-hidden border-border/30 bg-card/60 backdrop-blur-sm shadow-lg">
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <CardTitle>Portefeuille de Cryptomonnaies</CardTitle>
                  <CardDescription>
                    Vos cryptomonnaies actuelles et leur valeur
                  </CardDescription>
                </div>
                <Button variant="outline" className="bg-primary/10 border-primary/20">Acheter une nouvelle crypto</Button>
              </div>
            </CardHeader>
            <CardContent>
              {holdings.length === 0 ? (
                <div className="text-center py-16 bg-muted/10 rounded-lg border border-dashed border-muted">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                    <AreaChart className="h-8 w-8 text-primary/60" />
                  </div>
                  <h3 className="text-xl font-medium mb-2">Portefeuille vide</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Vous n&apos;avez pas encore de cryptomonnaies dans votre portefeuille. 
                    Commencez à investir pour diversifier vos actifs.
                  </p>
                  <Link href="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                    Explorer le marché
                  </Link>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {holdings.map((holding) => (
                    <CryptoHoldingCard
                      key={holding.id}
                      id={holding.id}
                      cryptoId={holding.cryptoId}
                      name={holding.name}
                      symbol={holding.symbol}
                      amount={holding.amount}
                      purchasePrice={holding.purchasePrice}
                      totalInvested={holding.totalInvested}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="transactions" className="mt-6">
          <Card className="overflow-hidden border-border/30 bg-card/60 backdrop-blur-sm shadow-lg">
            <CardHeader>
              <CardTitle>Historique des Transactions</CardTitle>
              <CardDescription>
                Vos achats et ventes récents
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-16 bg-muted/10 rounded-lg border border-dashed border-muted">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                    <Clock className="h-8 w-8 text-primary/60" />
                  </div>
                  <h3 className="text-xl font-medium mb-2">Aucune transaction</h3>
                  <p className="text-muted-foreground mb-4">
                    Vous n&apos;avez pas encore effectué de transaction.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between border-b pb-4 mb-4 last:border-0 last:mb-0 last:pb-0 hover:bg-muted/5 p-2 rounded-lg transition-colors">
                      <div className="flex items-center">
                        <div className={`relative w-10 h-10 mr-3 rounded-full flex items-center justify-center ${transaction.type === 'buy' ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                          <Image
                            src={`https://s2.coinmarketcap.com/static/img/coins/64x64/${transaction.cryptoId}.png`}
                            alt={transaction.cryptoName}
                            width={32}
                            height={32}
                            className="crypto-logo"
                            onError={(e) => {
                              // Fallback if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.src = `https://placehold.co/32x32/3b82f6/FFFFFF?text=${transaction.cryptoSymbol.substring(0, 3)}`;
                            }}
                          />
                        </div>
                        <div>
                          <h3 className="font-medium">
                            {transaction.type === 'buy' ? 'Achat' : 'Vente'} de {transaction.cryptoSymbol}
                          </h3>
                          <p className="text-sm text-muted-foreground">{formatDate(transaction.timestamp)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{transaction.amount.toFixed(6)} {transaction.cryptoSymbol}</p>
                        <p className={`text-sm ${transaction.type === 'buy' ? 'text-red-500 dark:text-red-300' : 'text-green-500 dark:text-green-300'}`}>
                          {transaction.type === 'buy' ? '-' : '+'}${(transaction.amount * transaction.price).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Additional recommended section */}
      <div className="mb-10">
        <h2 className="text-2xl font-bold mb-6">Recommandations pour vous</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="overflow-hidden border-border/30 bg-card/60 backdrop-blur-sm shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Diversifiez votre portefeuille</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Les experts recommandent de diversifier vos investissements entre plusieurs cryptomonnaies pour réduire les risques.
              </p>
              <Link href="/" className="text-primary text-sm hover:underline inline-flex items-center">
                Explorer plus de cryptos
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </Link>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-border/30 bg-card/60 backdrop-blur-sm shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Configurer des alertes de prix</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Recevez des notifications lorsque vos cryptos atteignent certains seuils de prix pour ne jamais manquer une opportunité.
              </p>
              <Button variant="outline" className="text-sm" disabled>
                Bientôt disponible
              </Button>
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-border/30 bg-card/60 backdrop-blur-sm shadow-lg transition-all hover:scale-[1.02] hover:shadow-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Analyser votre performance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Consultez des statistiques détaillées sur vos investissements et découvrez comment optimiser votre stratégie.
              </p>
              <Button variant="outline" className="text-sm" disabled>
                Bientôt disponible
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Market trends section */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-6">Tendances du marché</h2>
        <Card className="overflow-hidden border-border/30 bg-card/60 backdrop-blur-sm shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium">Mouvements notables</h3>
              <Button variant="ghost" size="sm" className="text-primary">
                Voir plus
              </Button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-muted/20 flex flex-col">
                <span className="text-sm text-muted-foreground mb-1">Bitcoin</span>
                <span className="text-lg font-medium mb-1">$43,567.89</span>
                <span className="text-sm text-green-500">+2.45%</span>
              </div>
              <div className="p-4 rounded-lg bg-muted/20 flex flex-col">
                <span className="text-sm text-muted-foreground mb-1">Ethereum</span>
                <span className="text-lg font-medium mb-1">$3,256.42</span>
                <span className="text-sm text-green-500">+1.87%</span>
              </div>
              <div className="p-4 rounded-lg bg-muted/20 flex flex-col">
                <span className="text-sm text-muted-foreground mb-1">Solana</span>
                <span className="text-lg font-medium mb-1">$123.78</span>
                <span className="text-sm text-red-500">-0.63%</span>
              </div>
              <div className="p-4 rounded-lg bg-muted/20 flex flex-col">
                <span className="text-sm text-muted-foreground mb-1">Cardano</span>
                <span className="text-lg font-medium mb-1">$0.5489</span>
                <span className="text-sm text-green-500">+4.12%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 