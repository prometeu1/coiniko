"use client";

import React, { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { 
  ArrowDownIcon, 
  ArrowUpIcon, 
  AreaChart, 
  DollarSign
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
      
      for (const holding of holdings) {
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
      }
      
      setCurrentPrices(prices);
      setIsLoading(false);
    };
    
    fetchCurrentPrices();
    
    // Refresh prices every 10 seconds
    const interval = setInterval(fetchCurrentPrices, 10000);
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
  
  // Formatter les valeurs monétaires
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  };

  // Générer des données de graphique basées sur les transactions réelles et les prix actuels
  const portfolioChartData = useMemo(() => {
    if (transactions.length === 0) {
      // Si aucune transaction, montrer la balance initiale avec une courbe plate
      const initialValue = balance;
      return [
        { date: formatDateShort(new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)), value: initialValue, formatted: formatCurrency(initialValue) },
        { date: formatDateShort(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)), value: initialValue, formatted: formatCurrency(initialValue) },
        { date: "Aujourd'hui", value: initialValue, formatted: formatCurrency(initialValue) }
      ];
    }

    // Trier les transactions par date (de la plus ancienne à la plus récente)
    const sortedTransactions = [...transactions].sort((a, b) => a.timestamp - b.timestamp);
    
    // Date de la première transaction
    const firstTransactionDate = new Date(sortedTransactions[0].timestamp);
    const currentDate = new Date();
    
    // Créer un tableau pour stocker les valeurs du portefeuille au fil du temps
    const dataPoints: ChartDataPoint[] = [];
    
    // Commencer avec la balance initiale
    const initialBalance = 100000; // Solde de départ standard
    
    // Commencer avec la balance initiale
    let runningBalance = initialBalance;
    let cryptoHoldings: Record<string, { amount: number, price: number, cryptoId: string }> = {};
    
    // Ajouter le point de départ
    dataPoints.push({ 
      date: formatDateShort(firstTransactionDate), 
      value: runningBalance,
      formatted: formatCurrency(runningBalance)
    });
    
    // Obtenir les dates des transactions (sans duplications)
    const transactionDates = Array.from(new Set(
      sortedTransactions.map(t => formatDateShort(new Date(t.timestamp)))
    ));
    
    // Ajouter les dates intermédiaires si nécessaire (pour un graphique plus fluide)
    const months = getMonthsBetween(firstTransactionDate, currentDate);
    const allDates = Array.from(new Set([...transactionDates, ...months])).sort();
    
    // Pour chaque date, calculer la valeur du portefeuille
    let lastCalculatedValue = runningBalance;
    
    allDates.forEach((dateString, index) => {
      const date = parseDate(dateString);
      
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
        if (dateString === "Aujourd'hui" || dateString === formatDateShort(currentDate)) {
          // Utiliser le prix actuel du marché
          price = currentPrices[holding.cryptoId] || holding.price;
        }
        
        return total + holding.amount * price;
      }, 0);
      
      const totalValue = runningBalance + cryptoValue;
      
      // Ajouter des points de données plus fréquemment
      if (Math.abs(totalValue - lastCalculatedValue) > 100 || 
          index === 0 || 
          index === allDates.length - 1 || 
          index % 2 === 0) {
        
        // Stocker la valeur précédente pour calculer le % de changement dans le tooltip
        const previousValue = dataPoints.length > 0 ? dataPoints[dataPoints.length - 1].value : undefined;
        
        dataPoints.push({ 
          date: dateString, 
          value: totalValue,
          previousValue,
          formatted: formatCurrency(totalValue)
        });
        lastCalculatedValue = totalValue;
      }
    });
    
    // Ajuster le dernier point pour qu'il corresponde exactement à la valeur actuelle du portefeuille
    const finalValue = balance + portfolioValue;
    
    // Ajouter le point final (aujourd'hui) avec le prix actuel réel
    const today = formatDateShort(currentDate);
    const hasToday = dataPoints.some(dp => dp.date === today || dp.date === "Aujourd'hui");
    
    if (!hasToday) {
      const previousValue = dataPoints.length > 0 ? dataPoints[dataPoints.length - 1].value : undefined;
      
      dataPoints.push({ 
        date: "Aujourd'hui", 
        value: finalValue,
        previousValue,
        formatted: formatCurrency(finalValue)
      });
    } else {
      // Mettre à jour le point d'aujourd'hui avec la valeur réelle
      const todayIndex = dataPoints.findIndex(dp => dp.date === today || dp.date === "Aujourd'hui");
      if (todayIndex !== -1) {
        dataPoints[todayIndex].value = finalValue;
        dataPoints[todayIndex].formatted = formatCurrency(finalValue);
      }
    }
    
    return dataPoints;
  }, [transactions, balance, portfolioValue, currentPrices]);
  
  // Composant personnalisé pour le tooltip du graphique
  const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload as ChartDataPoint;
      return (
        <div className="bg-background/90 backdrop-blur-sm border border-border p-2 rounded-md shadow-md">
          <p className="font-medium">{label}</p>
          <p className="text-primary font-bold">{dataPoint.formatted || formatCurrency(dataPoint.value)}</p>
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
      <h1 className="text-3xl font-bold mb-6">Mon Portefeuille</h1>

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${balance.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Fonds disponibles pour l&apos;investissement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Valeur du Portfolio</CardTitle>
            <AreaChart className="h-4 w-4 text-muted-foreground" />
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Profit/Perte</CardTitle>
            {profitLoss >= 0 ? (
              <ArrowUpIcon className="h-4 w-4 text-green-500" />
            ) : (
              <ArrowDownIcon className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${profitLoss >= 0 ? "text-green-500" : "text-red-500"}`}>
              {isLoading ? (
                <span className="inline-block w-24 h-6 bg-muted animate-pulse rounded"></span>
              ) : (
                <>{profitLoss >= 0 ? "+" : ""}{profitLoss.toLocaleString()}$ ({profitLossPercentage.toFixed(2)}%)</>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Depuis le début de vos investissements
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Performance du Portfolio</CardTitle>
          <CardDescription>
            Évolution de la valeur totale de votre portfolio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsAreaChart
                data={portfolioChartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                animationDuration={1000}
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
                />
                <YAxis 
                  tickFormatter={(value) => `$${Math.round(value / 1000)}k`}
                  domain={['auto', 'auto']}
                  allowDataOverflow={false}
                />
                <CartesianGrid strokeDasharray="3 3" />
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

      {/* Tabs for Holdings and Transactions */}
      <Tabs defaultValue="holdings" className="mb-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="holdings">Mes Cryptos</TabsTrigger>
          <TabsTrigger value="transactions">Historique</TabsTrigger>
        </TabsList>
        
        <TabsContent value="holdings">
          <Card>
            <CardHeader>
              <CardTitle>Portefeuille de Cryptomonnaies</CardTitle>
              <CardDescription>
                Vos cryptomonnaies actuelles et leur valeur
              </CardDescription>
            </CardHeader>
            <CardContent>
              {holdings.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <p>Vous n&apos;avez pas encore de cryptomonnaies.</p>
                  <Link href="/" className="text-primary hover:underline mt-2 inline-block">
                    Commencez à investir
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
        
        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Historique des Transactions</CardTitle>
              <CardDescription>
                Vos achats et ventes récents
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <p>Aucune transaction effectuée.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {transactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between border-b pb-3">
                      <div className="flex items-center">
                        <div className={`p-2 rounded-full mr-3 ${
                          transaction.type === 'buy' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                        }`}>
                          {transaction.type === 'buy' ? (
                            <ArrowDownIcon className="h-4 w-4 text-green-500 dark:text-green-300" />
                          ) : (
                            <ArrowUpIcon className="h-4 w-4 text-red-500 dark:text-red-300" />
                          )}
                        </div>
                        <div className="flex items-center">
                          <div className="relative w-8 h-8 mr-3">
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
    </div>
  );
} 