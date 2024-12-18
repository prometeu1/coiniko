"use client";

import * as React from "react";
import {
  ColumnDef,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
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
import { fetchLatestCryptocurrencyListings } from "@/lib/coinmarketcap";

// Types des cryptomonnaies
export type Crypto = {
  id: number;
  name: string;
  symbol: string;
  cmc_rank: number;
  price: number;
  percent_change_1h: number | null;
  market_cap: number | null;
};

// Colonnes pour la table
const columns: ColumnDef<Crypto>[] = [
  {
    accessorKey: "name",
    header: "Nom",
    cell: ({ row }) => {
      const id = row.original.id; // ID pour l'URL du logo
      const name = row.original.name;

      return (
        <div className="flex items-center gap-2">
          <img
            src={`https://s2.coinmarketcap.com/static/img/coins/64x64/${id}.png`}
            alt={name}
            className="w-6 h-6"
          />
          <span>{name}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "symbol",
    header: "Symbole",
  },
  {
    accessorKey: "cmc_rank",
    header: "Rang",
    cell: ({ row }) => `#${row.getValue("cmc_rank")}`,
  },
  {
    accessorKey: "price",
    header: "Prix (USD)",
    cell: ({ row }) => {
      const price = row.getValue("price");
      return `$${(price as number)?.toFixed(2) || "0.00"}`;
    },
  },
  {
    accessorKey: "percent_change_1h",
    header: "Variation 1H",
    cell: ({ row }) => {
      const change = row.getValue("percent_change_1h");
      const isPositive = change !== null && (change as number) >= 0;

      return (
        <span className={isPositive ? "text-green-600" : "text-red-600"}>
          {change !== null ? `${(change as number).toFixed(2)}%` : "N/A"}
        </span>
      );
    },
  },
  {
    accessorKey: "market_cap",
    header: "Capitalisation Boursière",
    cell: ({ row }) => {
      const marketCap = row.getValue("market_cap");
      return `$${marketCap?.toLocaleString() || "0"}`;
    },
  },
];

export default function Page() {
  const [cryptos, setCryptos] = React.useState<Crypto[]>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});

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
          market_cap: crypto.quote?.USD?.market_cap ?? 0,
        }));
        setCryptos(formattedData);
      } catch (error) {
        console.error("Erreur lors du chargement des cryptos:", error);
      }
    }
    fetchData();
  }, []);

  const table = useReactTable({
    data: cryptos,
    columns,
    state: {
      sorting,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="w-full p-4">
      <h1 className="text-xl font-semibold text-center mb-4">
        Liste des Cryptomonnaies
      </h1>
      <Input
        placeholder="Rechercher une crypto..."
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
                  <TableHead key={header.id}>
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
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
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
                <TableCell colSpan={columns.length} className="text-center">
                  Chargement des données...
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
          Précédent
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Suivant
        </Button>
      </div>
    </div>
  );
}
