"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSession } from "next-auth/react";

interface RankingUser {
  id: string;
  user_id: string;
  total_value: number;
  rank: number;
  last_updated: string;
  user: {
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

export function RankingsTable() {
  const { data: session } = useSession();
  const [rankings, setRankings] = useState<RankingUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fonction pour formater la valeur en dollars avec des séparateurs de milliers
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Récupérer les classements des utilisateurs
  useEffect(() => {
    const fetchRankings = async () => {
      try {
        const response = await fetch('/api/rankings');
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération du classement');
        }
        const data = await response.json();
        setRankings(data.rankings);
      } catch (error) {
        console.error('Erreur:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRankings();
  }, []);

  // Obtenir les initiales d'un nom pour l'avatar fallback
  const getInitials = (name: string | null) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Vérifier si l'utilisateur est dans le classement
  const isCurrentUser = (userId: string) => {
    return session?.user?.id === userId;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-center">Classement des investisseurs</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          // Afficher un état de chargement
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>Utilisateur</TableHead>
                <TableHead className="text-right">Valeur du portefeuille</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center">
                    Aucun classement disponible
                  </TableCell>
                </TableRow>
              ) : (
                rankings.map((ranking) => (
                  <TableRow 
                    key={ranking.id}
                    className={isCurrentUser(ranking.user_id) ? "bg-primary/10" : ""}
                  >
                    <TableCell className="font-medium text-center">
                      {ranking.rank <= 3 ? (
                        <Badge 
                          variant={
                            ranking.rank === 1 
                              ? "default" 
                              : ranking.rank === 2 
                                ? "secondary" 
                                : "outline"
                          }
                          className="rounded-full w-8 h-8 flex items-center justify-center"
                        >
                          {ranking.rank}
                        </Badge>
                      ) : (
                        ranking.rank
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={ranking.user.image || undefined} alt={ranking.user.name || "Utilisateur"} />
                          <AvatarFallback>
                            {getInitials(ranking.user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-semibold">
                            {ranking.user.name || "Utilisateur anonyme"}
                            {isCurrentUser(ranking.user_id) && (
                              <Badge variant="outline" className="ml-2">Vous</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {ranking.user.email && ranking.user.email.substring(0, 2)}***
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(ranking.total_value)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
} 