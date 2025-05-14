"use client";

import Image from "next/image";
import * as React from "react";
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  getFilteredRowModel,
  ColumnFiltersState,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUpDown, Plus, Minus, Search, TrendingUp, TrendingDown, DollarSign, Zap } from "lucide-react";
import { fetchLatestCryptocurrencyListings } from "@/lib/coinmarketcap";
import { useWallet } from "@/lib/walletContext";
import { toast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

// Types for cryptocurrencies
export type Crypto = {
  id: number;
  name: string;
  symbol: string;
  cmc_rank: number;
  price: number;
  percent_change_1h: number | null;
  percent_change_24h: number | null;
  percent_change_7d: number | null;
  market_cap: number | null;
  volume_24h: number | null;
  quote?: {
    USD?: {
      price?: number;
      percent_change_1h?: number;
      percent_change_24h?: number;
      percent_change_7d?: number;
      market_cap?: number;
      volume_24h?: number;
    };
  };
};

// Disabled unused Dictionary for exceptions
/* 
const cryptoNameExceptions: Record<string, string> = {
  "bittorrent-[new]": "bittorrent",
  "dydx-(native)": "dydx-ethdydx",
  "brett-(based)": "brett",
  "pol-(ex-matic)": "polygon",
  "tether-usdt": "tether",
  "usdc": "usd-coin",
  "floki": "floki-inu",
  "bitget-token": "bitget-token-new",
  "virtuals-protocol": "virtual-protocol",
  "optimism": "optimism-ethereum",
  "ondo": "ondo-finance",
  "jasmycoin" : "jasmy",
  "starknet": "starknet-token",
};
*/

export default function Page() {
  const [cryptos, setCryptos] = React.useState<Crypto[]>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [selectedCrypto, setSelectedCrypto] = React.useState<Crypto | null>(null);
  const [isTradeModalOpen, setIsTradeModalOpen] = React.useState(false);
  const [tradeType, setTradeType] = React.useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = React.useState<string>('');
  const [totalValue, setTotalValue] = React.useState<number>(0);
  const [isLoading, setIsLoading] = React.useState(true);
  
  const { balance, buyCrypto, sellCrypto, getCryptoHolding } = useWallet();

  // Define columns including buy/sell actions
  const columns: ColumnDef<Crypto>[] = [
    {
      accessorKey: "name",
      header: "Nom",
      cell: ({ row }) => {
        const id = row.original.id;
        const name = row.original.name;
        const symbol = row.original.symbol;
        const rank = row.original.cmc_rank;

        return (
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-accent/20 rounded-full blur-sm opacity-70"></div>
              <Image
                src={`https://s2.coinmarketcap.com/static/img/coins/64x64/${id}.png`}
                alt={name}
                width={32}
                height={32}
                className="w-8 h-8 relative z-10"
              />
            </div>
            <div>
              <div className="font-medium">{name}</div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{symbol}</span>
                <Badge variant="outline" className="h-5 text-[10px] px-1 border-muted-foreground/30">
                  #{rank}
                </Badge>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "price",
      header: ({ column }) => (
        <Button 
          variant="ghost" 
          className="hover:bg-primary/10" 
          onClick={() => column.toggleSorting()}
        >
          <DollarSign className="h-4 w-4 text-primary mr-1" />
          Prix (USD)
          <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground" />
        </Button>
      ),
      cell: ({ row }) => {
        const price = row.getValue("price");
        return (
          <div className="text-right font-medium">
            ${typeof price === "number" ? price.toFixed(2) : "0.00"}
          </div>
        );
      },
    },
    {
      accessorKey: "percent_change_1h",
      header: ({ column }) => (
        <Button 
          variant="ghost" 
          className="hover:bg-primary/10" 
          onClick={() => column.toggleSorting()}
        >
          1H %
          <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground" />
        </Button>
      ),
      cell: ({ row }) => {
        const change = row.getValue("percent_change_1h");
        const isPositive = typeof change === "number" && change >= 0;

        return (
          <div className="text-right flex items-center justify-end">
            {isPositive ? (
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
            ) : (
              <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
            )}
            <span className={isPositive ? "text-green-500" : "text-red-500"}>
              {typeof change === "number" ? `${change.toFixed(2)}%` : "N/A"}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "percent_change_24h",
      header: ({ column }) => (
        <Button 
          variant="ghost" 
          className="hover:bg-primary/10" 
          onClick={() => column.toggleSorting()}
        >
          24H %
          <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground" />
        </Button>
      ),
      cell: ({ row }) => {
        const change = row.original.percent_change_24h;
        const isPositive = typeof change === "number" && change >= 0;

        return (
          <div className="text-right flex items-center justify-end">
            {isPositive ? (
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
            ) : (
              <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
            )}
            <span className={isPositive ? "text-green-500" : "text-red-500"}>
              {typeof change === "number" ? `${change.toFixed(2)}%` : "N/A"}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "percent_change_7d",
      header: ({ column }) => (
        <Button 
          variant="ghost" 
          className="hover:bg-primary/10" 
          onClick={() => column.toggleSorting()}
        >
          7J %
          <ArrowUpDown className="ml-1 h-3 w-3 text-muted-foreground" />
        </Button>
      ),
      cell: ({ row }) => {
        const change = row.original.percent_change_7d;
        const isPositive = typeof change === "number" && change >= 0;

        return (
          <div className="text-right flex items-center justify-end">
            {isPositive ? (
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
            ) : (
              <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
            )}
            <span className={isPositive ? "text-green-500" : "text-red-500"}>
              {typeof change === "number" ? `${change.toFixed(2)}%` : "N/A"}
            </span>
          </div>
        );
      },
    },
    {
      id: "holdings",
      header: "Vos Actifs",
      cell: ({ row }) => {
        const crypto = row.original;
        const holding = getCryptoHolding(crypto.id.toString());
        const [localHoldingVisible, setLocalHoldingVisible] = React.useState(!!holding);
        
        // Utiliser un effet pour garantir que l'affichage des holdings persiste
        React.useEffect(() => {
          // Mise à jour du statut d'affichage uniquement si le holding existe
          if (holding) {
            setLocalHoldingVisible(true);
          }
        }, [holding]);
        
        return (
          <div className="text-right">
            {localHoldingVisible && holding ? (
              <div>
                <div className="font-medium">{holding.amount.toFixed(6)} {crypto.symbol}</div>
                <div className="text-xs text-muted-foreground">
                  (${(holding.amount * crypto.price).toFixed(2)})
                </div>
              </div>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const crypto = row.original;
        const holding = getCryptoHolding(crypto.id);
        
        return (
          <div className="flex justify-end gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full bg-green-500/10 text-green-500 hover:bg-green-500/20 hover:text-green-600"
              onClick={() => openTradeModal('buy', crypto)}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500/20 hover:text-red-600"
              disabled={!holding}
              onClick={() => openTradeModal('sell', crypto)}
            >
              <Minus className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  React.useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const data = await fetchLatestCryptocurrencyListings();
        
        interface CryptoApiResponse {
          id: number;
          name: string;
          symbol: string;
          cmc_rank: number;
          quote?: {
            USD?: {
              price?: number;
              percent_change_1h?: number;
              percent_change_24h?: number;
              percent_change_7d?: number;
              market_cap?: number;
              volume_24h?: number;
            };
          };
        }
        
        const formattedData = data.map((crypto: CryptoApiResponse) => ({
          id: crypto.id,
          name: crypto.name,
          symbol: crypto.symbol,
          cmc_rank: crypto.cmc_rank,
          price: crypto.quote?.USD?.price ?? 0,
          percent_change_1h: crypto.quote?.USD?.percent_change_1h ?? null,
          percent_change_24h: crypto.quote?.USD?.percent_change_24h ?? null,
          percent_change_7d: crypto.quote?.USD?.percent_change_7d ?? null,
          market_cap: crypto.quote?.USD?.market_cap ?? 0,
          volume_24h: crypto.quote?.USD?.volume_24h ?? 0,
        }));
        setCryptos(formattedData);
      } catch (error) {
        console.error("Error loading cryptocurrencies:", error);
        toast({
          title: "Erreur",
          description: "Impossible de charger les cryptomonnaies",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // Open trade modal
  const openTradeModal = (type: 'buy' | 'sell', crypto: Crypto) => {
    setSelectedCrypto(crypto);
    setTradeType(type);
    setAmount('');
    setTotalValue(0);

    // Si c'est une vente, vérifier d'abord si l'utilisateur possède cette crypto
    if (type === 'sell') {
      const holding = getCryptoHolding(crypto.id.toString());
      if (!holding || holding.amount <= 0) {
        toast({
          title: "Vente impossible",
          description: `Vous ne possédez pas de ${crypto.symbol}`,
          variant: "destructive",
        });
        return;
      }
    }
    
    setIsTradeModalOpen(true);
  };

  // Calculate total value based on amount
  React.useEffect(() => {
    if (selectedCrypto && amount) {
      const numAmount = parseFloat(amount);
      if (!isNaN(numAmount) && numAmount > 0) {
        setTotalValue(numAmount * selectedCrypto.price);
      } else {
        setTotalValue(0);
      }
    } else {
      setTotalValue(0);
    }
  }, [amount, selectedCrypto]);

  // Execute trade
  const executeTrade = () => {
    if (!selectedCrypto || !amount) return;
    
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;
    
    let success = false;
    
    if (tradeType === 'buy') {
      success = buyCrypto(
        selectedCrypto.id,
        selectedCrypto.name,
        selectedCrypto.symbol,
        numAmount,
        selectedCrypto.price
      );
      
      if (success) {
        toast({
          title: "Achat réussi",
          description: `Vous avez acheté ${numAmount} ${selectedCrypto.symbol} pour $${totalValue.toFixed(2)}`,
        });
      } else {
        toast({
          title: "Achat échoué",
          description: "Fonds insuffisants pour effectuer cet achat.",
          variant: "destructive",
        });
      }
    } else {
      success = sellCrypto(
        selectedCrypto.id,
        selectedCrypto.name,
        selectedCrypto.symbol,
        numAmount,
        selectedCrypto.price
      );
      
      if (success) {
        toast({
          title: "Vente réussie",
          description: `Vous avez vendu ${numAmount} ${selectedCrypto.symbol} pour $${totalValue.toFixed(2)}`,
        });
      } else {
        toast({
          title: "Vente échouée",
          description: "Quantité insuffisante pour effectuer cette vente.",
          variant: "destructive",
        });
      }
    }
    
    if (success) {
      setIsTradeModalOpen(false);
      
      // Réinitialiser les critères de filtre et de tri du tableau
      // pour garantir que toutes les cryptos sont visibles après la transaction
      table.resetColumnFilters();
      
      // Forcer le rafraîchissement des données après un court délai
      // pour permettre au contexte du portefeuille de se mettre à jour
      setTimeout(() => {
        // Mise à jour des données des cryptos pour refléter les nouveaux actifs
        setCryptos(prevCryptos => [...prevCryptos]);
      }, 1000);
    }
  };

  const table = useReactTable({
    data: cryptos,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <div className="container mx-auto py-6 animate-fade-in">
      {/* Hero section - Improved design without balance display */}
      <div className="mb-12 relative overflow-hidden rounded-2xl bg-gradient-to-br from-background to-background/50 border border-border/30 p-8 shadow-lg">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/20 rounded-full blur-3xl -z-10 opacity-70 animate-pulse-slow"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl -z-10 opacity-70 animate-pulse-slow"></div>
        
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Marché des Cryptomonnaies
          </h1>
          <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
            Explorez, analysez et investissez dans les cryptomonnaies les plus populaires. Suivez leurs performances et optimisez votre portefeuille.
          </p>
        </div>
      </div>
      
      {/* Search and filter */}
      <div className="mb-6 glass p-4 rounded-lg animate-slide-up">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une crypto..."
              value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
              onChange={(event) =>
                table.getColumn("name")?.setFilterValue(event.target.value)
              }
              className="pl-9 bg-background/50 border-accent/20 focus-visible:ring-accent"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden md:inline">
              Affichage de {table.getRowModel().rows.length} cryptomonnaies
            </span>
          </div>
        </div>
      </div>
      
      {/* Table */}
      <div className="rounded-xl border border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden animate-slide-up transition-all shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center h-72">
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-4 border-t-primary border-r-transparent border-l-transparent border-b-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
              </div>
              <p className="mt-4 text-muted-foreground">Chargement des cryptomonnaies...</p>
            </div>
          </div>
        ) : (
          <Table className="data-table">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="hover:bg-transparent border-b border-border/50">
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id} className="py-4">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="hover:bg-primary/5 transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-4">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center"
                  >
                    Aucun résultat.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
      
      {/* Pagination */}
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className="border-accent/20 hover:bg-accent/5"
        >
          Précédent
        </Button>
        <div className="text-sm text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} sur{" "}
          {table.getPageCount()}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="border-accent/20 hover:bg-accent/5"
        >
          Suivant
        </Button>
      </div>

      {/* Trade Modal */}
      <Dialog open={isTradeModalOpen} onOpenChange={setIsTradeModalOpen}>
        <DialogContent className="sm:max-w-[425px] glass animate-fade-in">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {tradeType === 'buy' ? 'Acheter' : 'Vendre'} {selectedCrypto?.symbol}
            </DialogTitle>
            <DialogDescription>
              {tradeType === 'buy' 
                ? 'Entrez le montant que vous souhaitez acheter.'
                : 'Entrez le montant que vous souhaitez vendre.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="flex items-center gap-4 p-4 bg-card/50 rounded-lg">
              <div className="relative">
                <div className="absolute inset-0 bg-accent/20 rounded-full blur-sm opacity-70"></div>
                <Image
                  src={`https://s2.coinmarketcap.com/static/img/coins/64x64/${selectedCrypto?.id}.png`}
                  alt={selectedCrypto?.name || ''}
                  width={48}
                  height={48}
                  className="relative z-10"
                />
              </div>
              <div>
                <p className="font-medium text-lg">{selectedCrypto?.name}</p>
                <p className="text-sm text-muted-foreground flex items-center">
                  <DollarSign className="h-3 w-3 mr-1" />
                  Prix actuel: ${selectedCrypto?.price.toFixed(2)}
                </p>
              </div>
            </div>

            {tradeType === 'sell' && (
              <div className="grid grid-cols-2 items-center gap-4 p-3 bg-card/50 rounded-lg">
                <Label htmlFor="holding" className="text-muted-foreground">Vous possédez</Label>
                <div className="text-right font-medium">
                  {getCryptoHolding(selectedCrypto?.id.toString() || "0")?.amount.toFixed(6) || 0} {selectedCrypto?.symbol}
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="amount">Quantité</Label>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    if (tradeType === 'buy' && selectedCrypto) {
                      // Acheter au maximum possible avec la balance disponible
                      const maxAmount = balance / selectedCrypto.price;
                      setAmount(maxAmount.toFixed(6));
                    } else if (tradeType === 'sell' && selectedCrypto) {
                      // Vendre tout ce qu'on possède
                      const holding = getCryptoHolding(selectedCrypto.id.toString());
                      if (holding) {
                        setAmount(holding.amount.toFixed(6));
                      }
                    }
                  }}
                  className="h-8 px-2 text-xs"
                >
                  Max
                </Button>
              </div>
              <Input
                id="amount"
                type="number"
                step="0.000001"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Quantité de ${selectedCrypto?.symbol}`}
                className="border-accent/20 focus-visible:ring-accent"
              />
              
              {/* Barre de pourcentage */}
              <div className="space-y-2">
                <Label htmlFor="percentage-slider" className="text-sm text-muted-foreground">
                  Pourcentage {tradeType === 'buy' ? 'de la balance' : 'de vos actifs'}
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    id="percentage-slider"
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    className="w-full h-2 bg-accent/20 rounded-lg appearance-none cursor-pointer"
                    onChange={(e) => {
                      const percentage = parseInt(e.target.value);
                      if (tradeType === 'buy' && selectedCrypto) {
                        // Calculer le montant basé sur un pourcentage de la balance
                        const maxAmount = balance / selectedCrypto.price;
                        const calculatedAmount = (maxAmount * percentage) / 100;
                        setAmount(calculatedAmount.toFixed(6));
                      } else if (tradeType === 'sell' && selectedCrypto) {
                        // Calculer le montant basé sur un pourcentage des actifs
                        const holding = getCryptoHolding(selectedCrypto.id.toString());
                        if (holding) {
                          const calculatedAmount = (holding.amount * percentage) / 100;
                          setAmount(calculatedAmount.toFixed(6));
                        }
                      }
                    }}
                  />
                  <span className="text-sm font-medium w-8 text-right">%</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 items-center gap-4 p-3 bg-primary/5 rounded-lg">
              <Label htmlFor="total" className="text-muted-foreground">Valeur Totale</Label>
              <div className="text-right font-medium text-lg">${totalValue.toFixed(2)}</div>
            </div>

            {tradeType === 'buy' && (
              <div className="grid grid-cols-2 items-center gap-4 p-3 bg-card/50 rounded-lg">
                <Label htmlFor="balance" className="text-muted-foreground">Votre balance</Label>
                <div className="text-right font-medium">${balance.toFixed(2)}</div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTradeModalOpen(false)} className="border-accent/20">
              Annuler
            </Button>
            <Button 
              onClick={executeTrade}
              disabled={!amount || parseFloat(amount) <= 0 || totalValue <= 0}
              variant={tradeType === 'buy' ? 'default' : 'destructive'}
              className={tradeType === 'buy' ? 'bg-gradient-to-r from-primary to-accent hover:opacity-90' : ''}
            >
              {tradeType === 'buy' ? 'Acheter' : 'Vendre'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}