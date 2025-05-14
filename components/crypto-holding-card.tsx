"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { ArrowUpIcon, ArrowDownIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface CryptoHoldingCardProps {
  id: string;
  cryptoId: string;
  name: string;
  symbol: string;
  amount: number;
  purchasePrice: number;
  totalInvested: number;
}

export function CryptoHoldingCard({
  id,
  cryptoId,
  name,
  symbol,
  amount,
  purchasePrice,
  totalInvested,
}: CryptoHoldingCardProps) {
  const [currentPrice, setCurrentPrice] = useState<number>(purchasePrice);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Simuler les variations de prix en temps réel (à remplacer par une API réelle)
  useEffect(() => {
    setIsLoading(true);
    
    // Simuler un appel API avec un délai
    const timer = setTimeout(() => {
      try {
        // Générer un prix aléatoire avec une variation de ±20% du prix d'achat
        const randomVariation = (Math.random() * 0.4) - 0.2; // -0.2 à +0.2
        const newPrice = purchasePrice * (1 + randomVariation);
        
        setCurrentPrice(newPrice);
        setPriceChange(randomVariation * 100); // Convertir en pourcentage
        setIsLoading(false);
      } catch (err) {
        setError("Erreur lors du chargement des données");
        setIsLoading(false);
      }
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [purchasePrice]);

  // Calculer la valeur actuelle et la variation
  const currentValue = amount * currentPrice;
  const profitLoss = currentValue - totalInvested;
  
  // Déterminer la couleur en fonction de la variation
  const getChangeColor = (change: number) => {
    if (change > 0) return "text-green-500";
    if (change < 0) return "text-red-500";
    return "text-gray-500";
  };

  return (
    <Card className="hover-card overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Logo de la crypto */}
            <div className="relative w-10 h-10 flex-shrink-0">
              {cryptoId ? (
                <Image
                  src={`https://s2.coinmarketcap.com/static/img/coins/64x64/${cryptoId}.png`}
                  alt={name}
                  width={40}
                  height={40}
                  className="crypto-logo"
                  onError={(e) => {
                    // Fallback if image fails to load
                    const target = e.target as HTMLImageElement;
                    target.src = "https://placehold.co/40x40/3b82f6/FFFFFF?text=" + symbol.substring(0, 3);
                  }}
                />
              ) : (
                <div className="crypto-logo bg-primary/10 flex items-center justify-center text-sm font-bold">
                  {symbol.substring(0, 3)}
                </div>
              )}
            </div>

            {/* Nom et symbole */}
            <div>
              <h3 className="font-medium text-foreground">{name}</h3>
              <p className="text-sm text-muted-foreground">{symbol}</p>
            </div>
          </div>

          {/* Quantité et valeur */}
          <div className="text-right">
            <div className="flex items-center justify-end">
              <span className="font-medium">{amount.toFixed(6)} {symbol}</span>
            </div>
            <div className="text-sm font-medium">
              ${currentValue.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Prix et variation */}
        <div className="mt-3 flex items-center justify-between text-sm">
          <div>
            <div className="text-muted-foreground">Prix d'achat: ${purchasePrice.toFixed(2)}</div>
            <div className="text-muted-foreground">Prix actuel: 
              {isLoading ? (
                <span className="ml-1 inline-block w-16 h-4 bg-muted animate-pulse rounded"></span>
              ) : (
                <span className="ml-1">${currentPrice.toFixed(2)}</span>
              )}
            </div>
          </div>
          
          {/* Variation */}
          <div className="flex flex-col items-end">
            {isLoading ? (
              <div className="h-4 w-16 bg-muted animate-pulse rounded"></div>
            ) : (
              <div className={`flex items-center ${getChangeColor(priceChange)}`}>
                {priceChange > 0 ? (
                  <ArrowUpIcon className="h-3 w-3 mr-1" />
                ) : priceChange < 0 ? (
                  <ArrowDownIcon className="h-3 w-3 mr-1" />
                ) : null}
                <span className="font-medium">{Math.abs(priceChange).toFixed(2)}%</span>
              </div>
            )}
            
            {/* Profit/Perte */}
            <div className={`text-xs font-medium ${getChangeColor(profitLoss)}`}>
              {profitLoss > 0 ? "+" : ""}{profitLoss.toFixed(2)}$
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default CryptoHoldingCard; 