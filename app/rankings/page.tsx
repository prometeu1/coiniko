"use client";

import { useEffect, useState } from "react";
import RankingsTable from "@/components/rankings-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useSession } from "next-auth/react";
import { RefreshCw } from "lucide-react";

export default function RankingsPage() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [rankings, setRankings] = useState([]);
  const [error, setError] = useState(null);

  const fetchRankings = async () => {
    try {
      setError(null);
      
      const response = await fetch('/api/rankings');
      
      if (!response.ok) {
        setError('Impossible de charger les classements pour le moment.');
        return;
      }
      
      const data = await response.json();
      setRankings(data);
    } catch (error) {
      console.error('Erreur lors du chargement des classements:', error);
      setError('Problème lors du chargement des classements.');
    }
  };

  const handleRefresh = async () => {
    if (!session?.user?.id) {
      setError('Vous devez être connecté pour actualiser les classements.');
      return;
    }

    try {
      setIsRefreshing(true);
      setError(null);
      
      // Trigger recalculation
      const recalcResponse = await fetch('/api/rankings/recalculate', {
        method: 'POST',
      });
      
      if (!recalcResponse.ok) {
        throw new Error('Échec du recalcul des classements');
      }
      
      // Fetch updated rankings
      await fetchRankings();
    } catch (error) {
      console.error('Erreur lors de l\'actualisation:', error);
      setError('Impossible d\'actualiser les classements. Veuillez réessayer.');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const loadRankings = async () => {
      setIsLoading(true);
      await fetchRankings();
      setIsLoading(false);
    };

    loadRankings();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Classement des investisseurs</h1>
        {session?.user?.id && (
          <Button 
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Actualisation...' : 'Actualiser'}
          </Button>
        )}
      </div>
      
      <Card className="w-full shadow-md">
        <CardHeader>
          <CardTitle>Classement global</CardTitle>
          <CardDescription>
            Classement des investisseurs en fonction de la valeur totale de leur portefeuille
            {session?.user?.id && (
              <span className="block mt-2 text-sm text-muted-foreground">
                Cliquez sur "Actualiser" pour mettre à jour les classements avec les prix actuels des cryptomonnaies.
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="text-center p-8 text-amber-500">
              {error} 
              {session?.user?.id && (
                <Button 
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  variant="outline"
                  className="ml-4"
                >
                  Réessayer
                </Button>
              )}
            </div>
          ) : rankings.length > 0 ? (
            <RankingsTable data={rankings} currentUserId={session?.user?.id} />
          ) : (
            <div className="text-center p-8 text-gray-500">
              Aucun classement disponible pour le moment.
              {session?.user?.id && (
                <Button 
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  variant="outline"
                  className="ml-4"
                >
                  Actualiser
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 