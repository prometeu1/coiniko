"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Medal, User } from "lucide-react";

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
    email?: string | null;
  };
};

type RankingsTableProps = {
  data: Ranking[];
  currentUserId?: string;
};

export function RankingsTable({ data, currentUserId }: RankingsTableProps) {
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const handleImageError = (userId: string) => {
    setImageErrors(prev => ({ ...prev, [userId]: true }));
  };

  const getProfileImage = (user: Ranking['user']) => {
    // Si on a déjà eu une erreur avec cette image, utiliser le fallback
    if (imageErrors[user.id]) {
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`;
    }

    // Si l'utilisateur a une image
    if (user.image) {
      return user.image;
    }

    // Image par défaut basée sur l'ID de l'utilisateur
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`;
  };

  const getUserDisplayName = (user: Ranking['user']) => {
    if (user.name) {
      return user.name;
    }
    if (user.email) {
      // Prendre la partie avant @ si pas de nom
      return user.email.split('@')[0];
    }
    return "Investisseur anonyme";
  };

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
                      <span className="mr-1">{ranking.rank}</span>
                    )}
                  </div>
                </TableCell>
                
                <TableCell>
                  <div className="flex items-center">
                    <div className="relative w-8 h-8 mr-2">
                      {!imageErrors[ranking.user.id] ? (
                        <Image
                          src={getProfileImage(ranking.user)}
                          alt={getUserDisplayName(ranking.user)}
                          width={32}
                          height={32}
                          className="rounded-full object-cover"
                          onError={() => handleImageError(ranking.user.id)}
                          unoptimized={getProfileImage(ranking.user).includes('dicebear')}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                          <User className="h-4 w-4 text-white" />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="font-medium">
                        {getUserDisplayName(ranking.user)}
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