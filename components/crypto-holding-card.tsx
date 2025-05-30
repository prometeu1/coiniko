"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { ArrowUp, ArrowDown, RefreshCw, AreaChart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/lib/walletContext";
import { getCryptoPrice, mapCoinMarketCapToGeckoId, fetchCryptoPrices } from "@/lib/cryptoService";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";

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
    let isMounted = true;
    let retryTimeout: NodeJS.Timeout;
    
    const fetchRealPrice = async () => {
      if (!isMounted) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        console.log(`🔍 Fetching price for ${name} (${symbol}) - ID: ${cryptoId}`);
        
        // CORRECTION CRITIQUE: Utiliser EXACTEMENT la même source de données que la page d'accueil
        // pour garantir la cohérence des prix affichés
        const globalPrices = await fetchCryptoPrices();
        const geckoId = mapCoinMarketCapToGeckoId(cryptoId);
        
        if (globalPrices && globalPrices[geckoId]) {
          if (!isMounted) return;
          
          const priceData = globalPrices[geckoId];
          console.log(`✅ Found global price for ${name}: $${priceData.current_price}`);
          
          // CORRECTION: Appliquer directement le prix global sans aucune modification
          setCurrentPrice(priceData.current_price);
          setPriceChange(priceData.price_change_percentage_24h || 0);
          
          if (priceData.image) {
            setImageUrl(priceData.image);
          }
        } else {
          // Si on n'a pas de prix global, essayer de récupérer le prix individuel
          console.log(`⚠️ No global price for ${name}, trying individual fetch...`);
          
          // ID spécial pour Pi Network qu'on sait être à $0.74
          if (cryptoId === '24478' || symbol.toLowerCase() === 'pi') {
            console.log(`🪙 Setting fixed price for Pi Network: $0.74`);
            setCurrentPrice(0.74);
            setPriceChange(0);
          } else {
            const priceData = await getCryptoPrice(geckoId);
            
            if (priceData) {
              console.log(`✅ Found individual price for ${name}: $${priceData.current_price}`);
              setCurrentPrice(priceData.current_price);
              setPriceChange(priceData.price_change_percentage_24h || 0);
              
              if (priceData.image) {
                setImageUrl(priceData.image);
              }
            } else {
              // CORRECTION: Uniquement si AUCUN prix n'est disponible, utiliser le prix d'achat
              console.log(`❌ No price data found for ${name}, using purchase price: $${purchasePrice}`);
              setCurrentPrice(purchasePrice);
            }
          }
        }
      } catch (err) {
        console.error(`❌ Error fetching price for ${name}:`, err);
        
        if (!isMounted) return;
        
        setError(`Erreur de chargement: ${err.message}`);
        
        // CORRECTION: En cas d'échec total, utiliser le prix d'achat
        setCurrentPrice(purchasePrice);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    // Exécuter immédiatement pour avoir un prix
    fetchRealPrice();
    
    // Actualiser toutes les 30 secondes
    const intervalId = setInterval(() => {
      if (isMounted) {
        fetchRealPrice();
      }
    }, 30000); // 30 secondes
    
    // Nettoyage
    return () => {
      isMounted = false;
      clearInterval(intervalId);
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [cryptoId, name, purchasePrice, symbol]);

  // Calculer la valeur actuelle et la variation
  const currentValue = amount * currentPrice;
  const profitLoss = currentValue - totalInvested;
  const profitLossPercentage = totalInvested > 0 
    ? (profitLoss / totalInvested) * 100 
    : 0;
  const isProfitable = profitLoss >= 0;
  
  // Déterminer la couleur en fonction de la variation
  const getChangeColor = (change: number) => {
    if (change > 0) return "text-green-500";
    if (change < 0) return "text-red-500";
    return "text-gray-500";
  };

  // Fonction pour gérer la vente de crypto
  const handleSell = () => {
    const sellAmountFloat = parseFloat(amountToSell);
    if (sellAmountFloat <= 0 || sellAmountFloat > amount) return;
    
    // Appel à la fonction de vente du contexte wallet
    const success = sellCrypto(
      cryptoId,
      name,
      symbol,
      sellAmountFloat,
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
      setAmountToSell("");
    }
  };

  return (
    <Card className="overflow-hidden border-border/30 bg-card/60 backdrop-blur-sm shadow-md transition-all duration-300 hover:shadow-lg hover:bg-card/80 hover:border-primary/20">
      <CardContent className="p-5 relative">
        {/* Background gradient effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
        
        <div className="flex items-center justify-between cursor-pointer group" onClick={() => window.location.href = `/crypto/${cryptoId}`}>
          <div className="flex items-center space-x-3">
            {/* Logo with better styling */}
            <div className="relative w-12 h-12 flex-shrink-0 rounded-full overflow-hidden bg-gradient-to-br from-background to-muted p-0.5">
              <div className="absolute inset-0 bg-primary/5 rounded-full animate-pulse-slow pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <Image
                src={imageUrl}
                alt={name}
                width={48}
                height={48}
                className="rounded-full transition-transform duration-300 group-hover:scale-110"
                onError={(e) => {
                  // Fallback if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.src = `https://placehold.co/48x48/3b82f6/FFFFFF?text=${symbol.substring(0, 3)}`;
                }}
              />
            </div>

            {/* Nom et symbole */}
            <div className="overflow-hidden">
              <h3 className="font-medium text-foreground group-hover:text-primary transition-colors duration-300">{name}</h3>
              <div className="flex items-center space-x-2">
                <p className="text-sm text-muted-foreground">{symbol}</p>
                {/* Price change indicator */}
                {!isLoading && (
                  <div className={`text-xs px-2 py-0.5 rounded-full ${priceChange > 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                    {priceChange > 0 ? '+' : ''}{priceChange.toFixed(2)}%
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Quantité et valeur */}
          <div className="text-right">
            <div className="flex items-center justify-end">
              <span className="font-medium">{amount.toFixed(6)} {symbol}</span>
            </div>
            <div className="text-sm font-bold text-primary">
              ${currentValue.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Price info with improved visualization */}
        <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-border/30">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm text-muted-foreground">Prix d'achat</div>
            <div className="font-medium">${purchasePrice.toFixed(2)}</div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground flex items-center">
              Prix actuel
              {isLoading && (
                <div className="ml-2 h-4 w-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin"></div>
              )}
            </div>
            <div className="font-medium flex items-center">
              ${currentPrice.toFixed(2)}
              {!isLoading && (
                <RefreshCw 
                  size={14} 
                  className="ml-2 text-muted-foreground cursor-pointer hover:text-primary transition-colors" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLoading(true);
                  }}
                />
              )}
            </div>
          </div>
          
          {/* Progress bar for profit/loss visualization */}
          <div className="mt-3 w-full h-1.5 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full ${profitLoss >= 0 ? 'bg-green-500' : 'bg-red-500'} transition-all duration-500 ease-out`}
              style={{ width: `${Math.min(Math.max(50 + Math.min(profitLossPercentage, 200)/2, 5), 95)}%` }}
            ></div>
          </div>
          
          {/* Profit/Loss with improved styling */}
          <div className="mt-2 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">Profit/Perte</div>
            <div className={`text-sm font-medium flex items-center ${getChangeColor(profitLoss)}`}>
              {profitLoss > 0 ? (
                <ArrowUp className="h-3 w-3 mr-1" />
              ) : profitLoss < 0 ? (
                <ArrowDown className="h-3 w-3 mr-1" />
              ) : null}
              {profitLoss > 0 ? "+" : ""}{profitLossPercentage.toFixed(2)}% (${profitLoss.toFixed(2)})
            </div>
          </div>
        </div>

        {/* Action buttons with improved styling */}
        <div className="mt-4 flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setAmountToSell("");
            }
          }}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full bg-gradient-to-r from-background to-muted border-accent/20 hover:border-red-500/30 hover:text-red-500 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDialogOpen(true);
                }}
              >
                <ArrowDown className="h-4 w-4 mr-2" />
                Vendre
              </Button>
            </DialogTrigger>
            <DialogContent className="border-border/30 bg-card/80 backdrop-blur-sm">
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
                  <div className="col-span-3">
                    <Input
                      id="amount"
                      type="number"
                      placeholder={`Max: ${amount.toFixed(6)}`}
                      value={amountToSell}
                      onChange={(e) => {
                        setAmountToSell(e.target.value);
                      }}
                      className="w-full border-accent/20 focus-visible:ring-accent"
                      step="0.000001"
                      min="0.000001"
                      max={amount}
                    />
                    
                    {/* Boutons de pourcentage rapides */}
                    <div className="flex gap-2 mt-3">
                      {[25, 50, 75, 100].map((percent) => (
                        <Button
                          key={percent}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs hover:bg-primary hover:text-primary-foreground transition-all"
                          onClick={() => {
                            const calculatedAmount = (amount * percent) / 100;
                            setAmountToSell(calculatedAmount.toFixed(6));
                          }}
                        >
                          {percent}%
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="value" className="text-right">
                    Valeur
                  </Label>
                  <div id="value" className="col-span-3 p-2 rounded bg-muted/20 font-medium">
                    ${(parseFloat(amountToSell || "0") * currentPrice).toFixed(2)}
                  </div>
                </div>
              </div>
              <DialogFooter className="flex flex-col sm:flex-row gap-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleSellAll} 
                  className="sm:order-1 border-accent/20 bg-red-500/10 text-red-600 hover:bg-red-500 hover:text-white"
                >
                  Tout Vendre ({amount.toFixed(6)} {symbol})
                </Button>
                <Button 
                  type="submit" 
                  onClick={handleSell}
                  disabled={!amountToSell || parseFloat(amountToSell) <= 0 || parseFloat(amountToSell) > amount}
                  className="sm:order-2 bg-gradient-to-r from-primary to-accent hover:opacity-90"
                >
                  Vendre
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}

export default CryptoHoldingCard; 