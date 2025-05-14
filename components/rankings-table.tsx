"use client";

import React from "react";
import Image from "next/image";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Medal } from "lucide-react";

type Ranking = {
  id: string;
  user_id: string;
  total_value: number;
  rank: number;
  last_updated: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
};

interface RankingsTableProps {
  data: Ranking[];
  currentUserId?: string;
}

export function RankingsTable({ data, currentUserId }: RankingsTableProps) {
  return (
    <div className="w-full overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Rang</TableHead>
            <TableHead>Investisseur</TableHead>
            <TableHead className="text-right">Valeur du portefeuille</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((ranking) => {
            const isCurrentUser = ranking.user_id === currentUserId;
            
            return (
              <TableRow 
                key={ranking.id}
                className={isCurrentUser ? "bg-primary/10" : ""}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center">
                    {ranking.rank === 1 ? (
                      <Medal className="h-5 w-5 mr-1 text-yellow-500" />
                    ) : ranking.rank === 2 ? (
                      <Medal className="h-5 w-5 mr-1 text-gray-400" />
                    ) : ranking.rank === 3 ? (
                      <Medal className="h-5 w-5 mr-1 text-amber-800" />
                    ) : (
                      ranking.rank
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    {ranking.user.image ? (
                      <Image
                        src={ranking.user.image}
                        alt={ranking.user.name || "Investisseur"}
                        width={32}
                        height={32}
                        className="rounded-full mr-2"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-300 mr-2" />
                    )}
                    <div>
                      <div className="font-medium">
                        {ranking.user.name || "Investisseur anonyme"}
                        {isCurrentUser && (
                          <span className="ml-2 text-xs bg-primary/20 rounded-full px-2 py-0.5">
                            Vous
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right font-medium">
                  ${Number(ranking.total_value).toLocaleString()}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export default RankingsTable; 