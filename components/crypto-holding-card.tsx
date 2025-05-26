"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { ArrowUp, ArrowDown, RefreshCw, AreaChart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/lib/walletContext";
import { getCryptoPrice, mapCoinMarketCapToGeckoId } from "@/lib/cryptoService";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

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

  // État pour afficher le modal de vente
  const [showSellModal, setShowSellModal] = useState(false);
  // État pour stocker le montant à vendre
  const [sellAmount, setSellAmount] = useState(0);

  // Récupérer les données réelles de prix
  useEffect(() => {
    let isMounted = true;
    let retryTimeout: NodeJS.Timeout;
    
    const fetchRealPrice = async () => {
      if (!isMounted) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Convertir l'ID de CoinMarketCap en ID CoinGecko
        const geckoId = mapCoinMarketCapToGeckoId(cryptoId);
        
        // Récupérer les données de prix réelles
        const priceData = await getCryptoPrice(geckoId);
        
        // Ensure the component is still mounted before updating state
        if (!isMounted) return;
        
        // Utiliser les prix réels sans aucune limitation
        if (priceData) {
          setCurrentPrice(priceData.current_price);
          setPriceChange(priceData.price_change_percentage_24h || 0);
          
          // Utiliser l'image de CoinGecko si disponible
          if (priceData.image) {
            setImageUrl(priceData.image);
          }
        } else {
          console.log(`Pas de données de prix pour ${name}, conservation du prix d'achat`);
          // Si pas de données, on garde le prix actuel ou le prix d'achat
          setCurrentPrice(prevPrice => prevPrice || purchasePrice);
        }
      } catch (err) {
        console.error("Erreur lors du chargement des données de prix:", err);
        
        if (!isMounted) return;
        
        setError("Erreur lors du chargement des données");
        
        // En cas d'erreur, on garde le prix actuel ou le prix d'achat
        setCurrentPrice(prevPrice => prevPrice || purchasePrice);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    fetchRealPrice();
    
    // Instead of continuous polling, use an increasing backoff on errors
    let failedAttempts = 0;
    
    const scheduleNextUpdate = () => {
      // Clear any existing timeouts
      if (retryTimeout) clearTimeout(retryTimeout);
      
      // Base delay is 10 seconds, but increases with failures
      const baseDelay = 10000;
      // If we've had failures, add exponential backoff (up to 60 seconds max)
      const backoffDelay = Math.min(Math.pow(2, failedAttempts) * 1000, 50000);
      const delay = baseDelay + backoffDelay;
      
      retryTimeout = setTimeout(() => {
        fetchRealPrice().catch(err => {
          console.error("Error in scheduled price update:", err);
          failedAttempts++; // Increment failures for next backoff
          
          // Reschedule next attempt
          if (isMounted) {
            scheduleNextUpdate();
          }
        });
      }, delay);
    };
    
    // Schedule the next update
    scheduleNextUpdate();
    
    // Cleanup function
    return () => {
      isMounted = false;
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
    };
  }, [cryptoId, purchasePrice, name]);

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
    if (sellAmount <= 0 || sellAmount > amount) return;
    
    // Appel à la fonction de vente du contexte wallet
    const success = sellCrypto(
      cryptoId,
      name,
      symbol,
      sellAmount,
      currentPrice
    );
    
    if (success) {
      setIsDialogOpen(false);
      setAmountToSell("");
      setShowSellModal(false);
      setSellAmount(0);
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
      setShowSellModal(false);
      setSellAmount(0);
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
            setAmountToSell("");
            
            // Réinitialiser les affichages si la fenêtre s'ouvre
            if (open) {
              setTimeout(() => {
                const percentageDisplay = document.getElementById('percentage-display-dialog');
                if (percentageDisplay) percentageDisplay.textContent = '0%';
                
                const slider = document.getElementById('percentage-slider-dialog') as HTMLInputElement;
                if (slider) slider.value = '0';
                
                // Réinitialiser l'état actif des boutons
                document.querySelectorAll('.percentage-button-dialog').forEach(btn => {
                  btn.classList.remove('active');
                });
              }, 50);
            }
          }}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full bg-gradient-to-r from-background to-muted border-accent/20 hover:border-red-500/30 hover:text-red-500 transition-colors"
                onClick={(e) => e.stopPropagation()}
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
                        
                        // Mettre à jour le slider en fonction du montant saisi
                        const inputAmount = parseFloat(e.target.value) || 0;
                        const percentage = Math.min(100, (inputAmount / amount) * 100);
                        
                        const slider = document.getElementById('percentage-slider-dialog') as HTMLInputElement;
                        if (slider) slider.value = percentage.toString();
                        
                        // Mettre à jour l'affichage du pourcentage
                        const percentageDisplay = document.getElementById('percentage-display-dialog');
                        if (percentageDisplay) percentageDisplay.textContent = `${Math.round(percentage)}%`;
                      }}
                      className="w-full border-accent/20 focus-visible:ring-accent"
                      step="0.000001"
                      min="0.000001"
                      max={amount}
                    />
                  </div>
                </div>
                
                {/* Barre de pourcentage */}
                <div className="grid grid-cols-4 items-center gap-4">
                  <div className="text-right text-sm flex flex-col items-end">
                    <Label htmlFor="percentage-slider-dialog" className="text-right text-sm mb-1">
                      Pourcentage
                    </Label>
                    <span id="percentage-display-dialog" className="percentage-display">0%</span>
                  </div>
                  <div className="col-span-3">
                    <input
                      id="percentage-slider-dialog"
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                      onChange={(e) => {
                        const percentage = parseInt(e.target.value);
                        const calculatedAmount = (amount * percentage) / 100;
                        setAmountToSell(calculatedAmount.toFixed(6));
                        
                        // Mettre à jour l'affichage du pourcentage
                        const percentageDisplay = document.getElementById('percentage-display-dialog');
                        if (percentageDisplay) percentageDisplay.textContent = `${percentage}%`;
                        
                        // Réinitialiser l'état actif des boutons
                        document.querySelectorAll('.percentage-button-dialog').forEach(btn => {
                          btn.classList.remove('active');
                        });
                      }}
                    />
                    
                    {/* Boutons de pourcentage prédéfinis */}
                    <div className="percentage-button-container">
                      {[10, 25, 50, 100].map((percent) => (
                        <Button
                          key={percent}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="percentage-button percentage-button-dialog"
                          onClick={() => {
                            // Calculer le montant
                            const calculatedAmount = (amount * percent) / 100;
                            setAmountToSell(calculatedAmount.toFixed(6));
                            
                            // Mettre à jour le slider
                            const slider = document.getElementById('percentage-slider-dialog') as HTMLInputElement;
                            if (slider) slider.value = percent.toString();
                            
                            // Mettre à jour l'affichage du pourcentage
                            const percentageDisplay = document.getElementById('percentage-display-dialog');
                            if (percentageDisplay) percentageDisplay.textContent = `${percent}%`;
                            
                            // Ajouter la classe active au bouton cliqué et la retirer des autres
                            document.querySelectorAll('.percentage-button-dialog').forEach(btn => {
                              btn.classList.remove('active');
                            });
                            (document.activeElement as HTMLElement).classList.add('active');
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
                  className="sm:order-1 border-accent/20 bg-primary/5"
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

        {/* Modal de vente */}
        {showSellModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card p-6 rounded-lg shadow-lg max-w-md w-full">
              <h3 className="text-xl font-bold mb-4">Vendre {symbol.toUpperCase()}</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Montant à vendre</label>
                <div className="flex space-x-2">
                  <input
                    type="number"
                    value={sellAmount}
                    onChange={(e) => setSellAmount(Math.min(Number(e.target.value), amount))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    placeholder={`0.0 ${symbol.toUpperCase()}`}
                    max={amount}
                    min={0}
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => setSellAmount(amount)}
                    className="whitespace-nowrap"
                  >
                    Max
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Valeur: ${(sellAmount * currentPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              
              <div className="flex justify-between mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowSellModal(false);
                    setSellAmount(0);
                  }}
                >
                  Annuler
                </Button>
                <Button 
                  variant="destructive"
                  onClick={handleSell}
                  disabled={sellAmount <= 0 || sellAmount > amount}
                >
                  Confirmer la vente
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CryptoHoldingCard; 