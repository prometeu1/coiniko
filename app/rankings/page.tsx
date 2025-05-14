"use client";

import { useEffect, useState } from "react";
import RankingsTable from "@/components/rankings-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useSession } from "next-auth/react";

export default function RankingsPage() {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [rankings, setRankings] = useState([]);

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/rankings');
        
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des classements');
        }
        
        const data = await response.json();
        setRankings(data);
      } catch (error) {
        console.error('Erreur lors du chargement des classements:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRankings();
  }, []);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Classement des investisseurs</h1>
      
      <Card className="w-full shadow-md">
        <CardHeader>
          <CardTitle>Classement global</CardTitle>
          <CardDescription>
            Classement des investisseurs en fonction de la valeur totale de leur portefeuille
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center p-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : rankings.length > 0 ? (
            <RankingsTable data={rankings} currentUserId={session?.user?.id} />
          ) : (
            <div className="text-center p-8 text-gray-500">
              Aucun classement disponible pour le moment.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 