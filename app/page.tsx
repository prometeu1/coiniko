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
import { ArrowUpDown } from "lucide-react";
import { fetchLatestCryptocurrencyListings } from "@/lib/coinmarketcap";

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

// Table columns
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
            width={16} // Taille réduite
            height={16}
            className="w-4 h-4"
          />
          <span className="text-xs truncate">{name}</span>
        </div>
      );
    },
    size: 100, // Largeur maximale pour cette colonne
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
];

export default function Page() {
  const [cryptos, setCryptos] = React.useState<Crypto[]>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

  React.useEffect(() => {
    async function fetchData() {
      try {
        const data = await fetchLatestCryptocurrencyListings();
        const formattedData = data.map((crypto: Crypto) => ({
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

  const table = useReactTable({
    data: cryptos,
    columns,
    state: { sorting, columnFilters },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  return (
    <div className="w-full p-8 bg-gray-100 dark:bg-gray-900">
      <Input
        placeholder="Search for a cryptocurrency..."
        value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
        onChange={(e) =>
          table.getColumn("name")?.setFilterValue(e.target.value)
        }
        className="max-w-sm mb-4 shadow-md"
      />
      <div className="rounded-lg shadow-lg overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-center">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => {
                const originalName = row.original.name.toLowerCase().replace(/ /g, "-");
                const name = cryptoNameExceptions[originalName] || originalName;
                const cryptoUrl = `https://coinmarketcap.com/currencies/${name}/`;

                return (
                  <TableRow
                    key={row.id}
                    className="hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    onClick={() => window.open(cryptoUrl, "_blank")}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cell.column.id === "name" ? "align-middle" : "text-center align-middle"}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="text-center">
                  Loading data...
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
    </div>
  );
}