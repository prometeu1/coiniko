"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { Suspense } from "react";

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  let errorMessage = "Une erreur s'est produite lors de l'authentification.";
  let errorDescription = "Veuillez réessayer ou contacter le support si le problème persiste.";

  // Personnaliser le message d'erreur en fonction du code d'erreur
  switch (error) {
    case "Configuration":
      errorMessage = "Erreur de configuration";
      errorDescription = "Il y a un problème avec la configuration du serveur d'authentification.";
      break;
    case "AccessDenied":
      errorMessage = "Accès refusé";
      errorDescription = "Vous n'avez pas l'autorisation d'accéder à cette ressource.";
      break;
    case "Verification":
      errorMessage = "Erreur de vérification";
      errorDescription = "Le lien de vérification est invalide ou a expiré.";
      break;
    case "OAuthSignin":
      errorMessage = "Erreur de connexion OAuth";
      errorDescription = "Une erreur s'est produite lors de la tentative de connexion avec un fournisseur OAuth.";
      break;
    case "OAuthCallback":
      errorMessage = "Erreur de callback OAuth";
      errorDescription = "Une erreur s'est produite lors du traitement de la réponse du fournisseur OAuth.";
      break;
    case "EmailSignin":
      errorMessage = "Erreur d'envoi d'email";
      errorDescription = "L'email de connexion n'a pas pu être envoyé. Veuillez vérifier votre adresse email.";
      break;
    default:
      // Message par défaut déjà défini
      break;
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-[450px] shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-destructive">{errorMessage}</CardTitle>
          <CardDescription>
            Nous avons rencontré un problème lors de votre authentification
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <div className="mb-4 rounded-full bg-destructive/10 p-3">
              <AlertTriangle className="h-10 w-10 text-destructive" />
            </div>
            <p className="text-muted-foreground">
              {errorDescription}
            </p>
            {error && (
              <p className="mt-4 text-xs text-muted-foreground">
                Code d'erreur: {error}
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link href="/auth/signin">
            <Button>Retour à la page de connexion</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function ErrorPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-[450px] shadow-lg">
          <CardHeader>
            <CardTitle>Chargement...</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Veuillez patienter pendant le chargement des informations d'erreur.</p>
          </CardContent>
        </Card>
      </div>
    }>
      <ErrorContent />
    </Suspense>
  );
} 