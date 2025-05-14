"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { ArrowUpIcon, ArrowDownIcon, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/lib/walletContext";
import { getCryptoPrice, mapCoinMarketCapToGeckoId } from "@/lib/cryptoService";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [imageUrl, setImageUrl] = useState<string>(`https://s2.coinmarketcap.com/static/img/coins/64x64/${cryptoId}.png`);
  const [amountToSell, setAmountToSell] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const { sellCrypto } = useWallet();

  // Récupérer les données réelles de prix
  useEffect(() => {
    const fetchRealPrice = async () => {
      setIsLoading(true);
      
      try {
        // Convertir l'ID de CoinMarketCap en ID CoinGecko
        const geckoId = mapCoinMarketCapToGeckoId(cryptoId);
        
        // Récupérer les données de prix
        const priceData = await getCryptoPrice(geckoId);
        
        if (priceData) {
          setCurrentPrice(priceData.current_price);
          setPriceChange(priceData.price_change_percentage_24h);
          
          // Utiliser l'image de CoinGecko si disponible
          if (priceData.image) {
            setImageUrl(priceData.image);
          }
        } else {
          // Fallback à la simulation si l'API ne retourne pas de données
          const randomVariation = (Math.random() * 0.4) - 0.2; // -0.2 à +0.2
          const newPrice = purchasePrice * (1 + randomVariation);
          
          setCurrentPrice(newPrice);
          setPriceChange(randomVariation * 100);
        }
      } catch (err) {
        console.error("Erreur lors du chargement des données de prix:", err);
        setError("Erreur lors du chargement des données");
        
        // Fallback en cas d'erreur
        const randomVariation = (Math.random() * 0.4) - 0.2;
        const newPrice = purchasePrice * (1 + randomVariation);
        
        setCurrentPrice(newPrice);
        setPriceChange(randomVariation * 100);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchRealPrice();
    
    // Mettre à jour les prix toutes les 60 secondes
    const intervalId = setInterval(fetchRealPrice, 60000);
    
    return () => clearInterval(intervalId);
  }, [cryptoId, purchasePrice]);

  // Calculer la valeur actuelle et la variation
  const currentValue = amount * currentPrice;
  const profitLoss = currentValue - totalInvested;
  const profitLossPercentage = totalInvested > 0 
    ? (profitLoss / totalInvested) * 100 
    : 0;
  
  // Déterminer la couleur en fonction de la variation
  const getChangeColor = (change: number) => {
    if (change > 0) return "text-green-500";
    if (change < 0) return "text-red-500";
    return "text-gray-500";
  };

  // Fonction pour gérer la vente de crypto
  const handleSell = () => {
    const amountNum = parseFloat(amountToSell);
    if (isNaN(amountNum) || amountNum <= 0 || amountNum > amount) {
      return;
    }
    
    const success = sellCrypto(
      cryptoId,
      name,
      symbol,
      amountNum,
      currentPrice
    );
    
    if (success) {
      setIsDialogOpen(false);
      setAmountToSell("");
    }
  };

  // Fonction pour vendre la totalité de la crypto
  const handleSellAll = () => {
    const success = sellCrypto(
      cryptoId,
      name,
      symbol,
      amount,
      currentPrice
    );
    
    if (success) {
      setIsDialogOpen(false);
    }
  };

  return (
    <Card className="hover-card overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* Logo de la crypto */}
            <div className="relative w-10 h-10 flex-shrink-0">
              <Image
                src={imageUrl}
                alt={name}
                width={40}
                height={40}
                className="crypto-logo"
                onError={(e) => {
                  // Fallback if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.src = `https://placehold.co/40x40/3b82f6/FFFFFF?text=${symbol.substring(0, 3)}`;
                }}
              />
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
            <div className="text-muted-foreground flex items-center">
              Prix actuel: 
              {isLoading ? (
                <span className="ml-1 inline-block w-16 h-4 bg-muted animate-pulse rounded"></span>
              ) : (
                <span className="ml-1">${currentPrice.toFixed(2)}</span>
              )}
              {!isLoading && (
                <RefreshCw 
                  size={12} 
                  className="ml-1 text-muted-foreground cursor-pointer hover:text-primary" 
                  onClick={() => setIsLoading(true)}
                />
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
              {profitLoss > 0 ? "+" : ""}{profitLossPercentage.toFixed(2)}% (${profitLoss.toFixed(2)})
            </div>
          </div>
        </div>

        {/* Boutons de vente */}
        <div className="mt-4 flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1">
                Vendre
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Vendre {symbol}</DialogTitle>
                <DialogDescription>
                  Prix actuel: ${currentPrice.toFixed(2)}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="amount" className="text-right">
                    Quantité
                  </Label>
                  <div className="col-span-3 flex gap-2">
                    <Input
                      id="amount"
                      type="number"
                      placeholder={`Max: ${amount.toFixed(6)}`}
                      value={amountToSell}
                      onChange={(e) => setAmountToSell(e.target.value)}
                      className="flex-1"
                      step="0.000001"
                      min="0.000001"
                      max={amount}
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => setAmountToSell(amount.toFixed(6))}
                      className="whitespace-nowrap"
                    >
                      Max
                    </Button>
                  </div>
                </div>
                
                {/* Barre de pourcentage */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="percentage-slider" className="text-right text-sm">
                    Pourcentage
                  </Label>
                  <div className="col-span-3 flex items-center gap-2">
                    <input
                      id="percentage-slider"
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      className="flex-1 h-2 bg-accent/20 rounded-lg appearance-none cursor-pointer"
                      onChange={(e) => {
                        const percentage = parseInt(e.target.value);
                        const calculatedAmount = (amount * percentage) / 100;
                        setAmountToSell(calculatedAmount.toFixed(6));
                      }}
                    />
                    <span className="text-sm font-medium w-8 text-right">%</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="value" className="text-right">
                    Valeur
                  </Label>
                  <div id="value" className="col-span-3">
                    ${(parseFloat(amountToSell || "0") * currentPrice).toFixed(2)}
                  </div>
                </div>
              </div>
              <DialogFooter className="flex flex-col sm:flex-row gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleSellAll} 
                  className="sm:order-1"
                >
                  Tout Vendre ({amount.toFixed(6)} {symbol})
                </Button>
                <Button 
                  type="submit" 
                  onClick={handleSell}
                  disabled={!amountToSell || parseFloat(amountToSell) <= 0 || parseFloat(amountToSell) > amount}
                  className="sm:order-2"
                >
                  Vendre
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button 
            variant="destructive" 
            size="sm" 
            className="flex-1"
            onClick={handleSellAll}
          >
            Tout Vendre
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default CryptoHoldingCard; 