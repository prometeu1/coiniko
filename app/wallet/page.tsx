"use client";

import React from "react";
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
import {
  Area,
  AreaChart as RechartsAreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import CryptoHoldingCard from "@/components/crypto-holding-card";

export default function WalletPage() {
  const { balance, holdings, transactions } = useWallet();
  
  // Calculate total portfolio value
  const portfolioValue = holdings.reduce(
    (total, holding) => total + holding.amount * holding.purchasePrice,
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

  // Generate mock chart data (this would be replaced with real data from your API)
  const portfolioChartData = [
    { date: "2023-01", value: 10000 },
    { date: "2023-02", value: 10500 },
    { date: "2023-03", value: 11200 },
    { date: "2023-04", value: 10800 },
    { date: "2023-05", value: 12000 },
    { date: "2023-06", value: 12500 },
    { date: "2023-07", value: 13000 },
    { date: "2023-08", value: 13500 },
    { date: "2023-09", value: 14000 },
    { date: "2023-10", value: balance + portfolioValue },
  ];

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
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
            <div className="text-2xl font-bold">${portfolioValue.toLocaleString()}</div>
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
              {profitLoss >= 0 ? "+" : ""}{profitLoss.toLocaleString()}$ ({profitLossPercentage.toFixed(2)}%)
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
              >
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" />
                <YAxis />
                <CartesianGrid strokeDasharray="3 3" />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  fillOpacity={1}
                  fill="url(#colorValue)"
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