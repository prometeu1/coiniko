"use client";

import Link from "next/link";
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
        <div className="flex items-center gap-2">
          <Image
            src={`https://s2.coinmarketcap.com/static/img/coins/64x64/${id}.png`}
            alt={name}
            width={24}
            height={24}
            className="w-6 h-6"
          />
          <span>{name}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "symbol",
    header: "Symbol",
    cell: ({ row }) => (
      <div className="text-center">{row.getValue("symbol")}</div>
    ),
  },
  {
    accessorKey: "cmc_rank",
    header: "Rank",
    cell: ({ row }) => (
      <div className="text-center">#{row.getValue("cmc_rank")}</div>
    ),
  },
  {
    accessorKey: "price",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting()}
      >
        Price (USD)
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const price = row.getValue("price");
      return (
        <div className="text-center">
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
        onClick={() => column.toggleSorting()}
      >
        1H Change
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const change = row.getValue("percent_change_1h");
      const isPositive = typeof change === "number" && change >= 0;

      return (
        <div className="text-center">
          <span className={isPositive ? "text-green-600" : "text-red-600"}>
            {typeof change === "number" ? `${change.toFixed(2)}%` : "N/A"}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "market_cap",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting()}
      >
        Market Cap
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-center">
        ${row.getValue("market_cap")?.toLocaleString() || "0"}
      </div>
    ),
  },
  {
    accessorKey: "volume_24h",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting()}
      >
        24H Volume
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-center">
        ${row.getValue("volume_24h")?.toLocaleString() || "0"}
      </div>
    ),
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
    <div className="w-full p-4">
      <Input
        placeholder="Search for a cryptocurrency..."
        value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
        onChange={(e) =>
          table.getColumn("name")?.setFilterValue(e.target.value)
        }
        className="max-w-sm mb-4"
      />
      <div className="rounded-md border">
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
                    className="hover:bg-gray-100 cursor-pointer"
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
    </div>
  );
}
