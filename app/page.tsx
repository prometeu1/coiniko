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
import { ArrowUpDown, Plus, Minus } from "lucide-react";
import { fetchLatestCryptocurrencyListings } from "@/lib/coinmarketcap";
import { useWallet } from "@/lib/walletContext";
import { toast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

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

// Dictionary for exceptions
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

export default function Page() {
  const [cryptos, setCryptos] = React.useState<Crypto[]>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [selectedCrypto, setSelectedCrypto] = React.useState<Crypto | null>(null);
  const [isTradeModalOpen, setIsTradeModalOpen] = React.useState(false);
  const [tradeType, setTradeType] = React.useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = React.useState<string>('');
  const [totalValue, setTotalValue] = React.useState<number>(0);
  
  const { balance, buyCrypto, sellCrypto, getCryptoHolding } = useWallet();

  // Define columns including buy/sell actions
  const columns: ColumnDef<Crypto>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        const id = row.original.id;
        const name = row.original.name;

        return (
          <div className="flex items-center gap-1">
            <Image
              src={`https://s2.coinmarketcap.com/static/img/coins/64x64/${id}.png`}
              alt={name}
              width={16}
              height={16}
              className="w-4 h-4"
            />
            <span className="text-xs truncate">{name}</span>
          </div>
        );
      },
      size: 100,
    },
    {
      accessorKey: "symbol",
      header: "Symbol",
      cell: ({ row }) => (
        <div className="text-center text-xs">{row.getValue("symbol")}</div>
      ),
      size: 60,
    },
    {
      accessorKey: "cmc_rank",
      header: "Rank",
      cell: ({ row }) => (
        <div className="text-center text-xs">#{row.getValue("cmc_rank")}</div>
      ),
      size: 60,
    },
    {
      accessorKey: "price",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting()}>
          Price (USD)
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const price = row.getValue("price");
        return (
          <div className="text-center text-xs">
            ${typeof price === "number" ? price.toFixed(2) : "0.00"}
          </div>
        );
      },
      size: 100,
    },
    {
      accessorKey: "percent_change_1h",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting()}>
          1H %
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const change = row.getValue("percent_change_1h");
        const isPositive = typeof change === "number" && change >= 0;

        return (
          <div className="text-center text-xs">
            <span className={isPositive ? "text-green-600" : "text-red-600"}>
              {typeof change === "number" ? `${change.toFixed(2)}%` : "N/A"}
            </span>
          </div>
        );
      },
      size: 80,
    },
    {
      accessorKey: "percent_change_24h",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting()}>
          24H %
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const change = row.original.percent_change_24h;
        const isPositive = typeof change === "number" && change >= 0;

        return (
          <div className="text-center text-xs">
            <span className={isPositive ? "text-green-600" : "text-red-600"}>
              {typeof change === "number" ? `${change.toFixed(2)}%` : "N/A"}
            </span>
          </div>
        );
      },
      size: 80,
    },
    {
      accessorKey: "percent_change_7d",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting()}>
          7D %
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => {
        const change = row.original.percent_change_7d;
        const isPositive = typeof change === "number" && change >= 0;

        return (
          <div className="text-center text-xs">
            <span className={isPositive ? "text-green-600" : "text-red-600"}>
              {typeof change === "number" ? `${change.toFixed(2)}%` : "N/A"}
            </span>
          </div>
        );
      },
      size: 80,
    },
    {
      accessorKey: "market_cap",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting()}>
          Mkt Cap
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-center text-xs">
          ${row.getValue("market_cap")?.toLocaleString() || "0"}
        </div>
      ),
      size: 100,
    },
    {
      accessorKey: "volume_24h",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting()}>
          24H Vol
          <ArrowUpDown className="ml-1 h-3 w-3" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="text-center text-xs">
          ${row.getValue("volume_24h")?.toLocaleString() || "0"}
        </div>
      ),
      size: 100,
    },
    {
      id: "holdings",
      header: "Holdings",
      cell: ({ row }) => {
        const crypto = row.original;
        const holding = getCryptoHolding(crypto.id);
        return (
          <div className="text-center text-xs">
            {holding ? `${holding.amount.toFixed(6)} ${crypto.symbol}` : "-"}
          </div>
        );
      },
      size: 100,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const crypto = row.original;
        return (
          <div className="flex justify-center space-x-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-green-600"
              onClick={() => openTradeModal('buy', crypto)}
            >
              <Plus className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-red-600"
              disabled={!getCryptoHolding(crypto.id)}
              onClick={() => openTradeModal('sell', crypto)}
            >
              <Minus className="h-4 w-4" />
            </Button>
          </div>
        );
      },
      size: 80,
    },
  ];

  React.useEffect(() => {
    async function fetchData() {
      try {
        const data = await fetchLatestCryptocurrencyListings();
        const formattedData = data.map((crypto: any) => ({
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
  });

  return (
    <div className="container mx-auto py-4">
      <h1 className="text-2xl font-bold mb-4">Cryptomonnaies</h1>
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex w-full max-w-sm items-center space-x-2">
          <Input
            placeholder="Rechercher une crypto..."
            value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
            onChange={(event) =>
              table.getColumn("name")?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
        </div>
        <div className="text-sm text-muted-foreground">
          Balance: <span className="font-medium">${balance.toLocaleString()}</span>
        </div>
      </div>
      
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} style={{ width: `${header.getSize()}px` }}>
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
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
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
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>

      {/* Trade Modal */}
      <Dialog open={isTradeModalOpen} onOpenChange={setIsTradeModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {tradeType === 'buy' ? 'Acheter' : 'Vendre'} {selectedCrypto?.symbol}
            </DialogTitle>
            <DialogDescription>
              {tradeType === 'buy' 
                ? 'Entrez le montant que vous souhaitez acheter.'
                : 'Entrez le montant que vous souhaitez vendre.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex items-center gap-4">
              <Image
                src={`https://s2.coinmarketcap.com/static/img/coins/64x64/${selectedCrypto?.id}.png`}
                alt={selectedCrypto?.name || ''}
                width={32}
                height={32}
                className="mr-2"
              />
              <div>
                <p className="font-medium">{selectedCrypto?.name}</p>
                <p className="text-sm text-muted-foreground">
                  Prix actuel: ${selectedCrypto?.price.toFixed(2)}
                </p>
              </div>
            </div>

            {tradeType === 'sell' && (
              <div className="grid grid-cols-2 items-center gap-4">
                <Label htmlFor="holding">Vous possédez</Label>
                <div className="text-right">
                  {getCryptoHolding(selectedCrypto?.id || 0)?.amount.toFixed(6) || 0} {selectedCrypto?.symbol}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 items-center gap-4">
              <Label htmlFor="amount">Quantité</Label>
              <Input
                id="amount"
                type="number"
                step="0.000001"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Quantité de ${selectedCrypto?.symbol}`}
              />
            </div>

            <div className="grid grid-cols-2 items-center gap-4">
              <Label htmlFor="total">Valeur Totale</Label>
              <div className="text-right font-medium">${totalValue.toFixed(2)}</div>
            </div>

            {tradeType === 'buy' && (
              <div className="grid grid-cols-2 items-center gap-4">
                <Label htmlFor="balance">Votre balance</Label>
                <div className="text-right">${balance.toFixed(2)}</div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTradeModalOpen(false)}>
              Annuler
            </Button>
            <Button 
              onClick={executeTrade}
              disabled={!amount || parseFloat(amount) <= 0 || totalValue <= 0}
              variant={tradeType === 'buy' ? 'default' : 'destructive'}
            >
              {tradeType === 'buy' ? 'Acheter' : 'Vendre'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}