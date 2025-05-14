"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FaGoogle, FaExclamationTriangle, FaInfoCircle } from "react-icons/fa";
import Link from "next/link";

// Utiliser le port 3004 (celui qui est actuellement utilisé)
const PORT = 3000;
const NEXTAUTH_URL = `http://localhost:${PORT}`;

export default function SignIn() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [debugInfo, setDebugInfo] = useState("");
  const [showTechInfo, setShowTechInfo] = useState(false);

  // Check if there's an error from NextAuth
  useEffect(() => {
    const errorParam = searchParams?.get("error");
    if (errorParam) {
      if (errorParam === "OAuthCallback") {
        setError("Erreur d'authentification Google. Vérifiez que vos identifiants OAuth sont correctement configurés.");
        setDebugInfo("Erreur détectée: OAuthCallback - Vérifiez votre configuration Google Cloud Console.");
      } else {
        setError(`Erreur lors de la connexion: ${errorParam}`);
      }
    }
  }, [searchParams]);

  // Redirect if already authenticated
  useEffect(() => {
    if (status === "authenticated" && session) {
      router.push("/");
    }
  }, [status, session, router]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError("");
    setDebugInfo("Début de l'authentification Google...");
    
    try {
      console.log("Trying to sign in with Google...");
      
      // On utilise une URL absolue avec le port 3000
      const currentPort = window.location.port || '3000';
      console.log(`Current port: ${currentPort}`);
      
      // Mode de connexion direct (sans redirection)
      setDebugInfo(`Tentative de connexion directe (sans redirection)...`);
      await signIn("google", {
        redirect: true,
        callbackUrl: window.location.origin
      });
      
      // Cette partie ne sera pas exécutée avec redirect: true
      setIsLoading(false);
    } catch (error) {
      console.error("Error signing in with Google:", error);
      setError("Une erreur s'est produite lors de la connexion avec Google.");
      setDebugInfo(`Erreur complète: ${JSON.stringify(error)}`);
      setIsLoading(false);
    }
  };

  // Récupérer des infos de debug
  const showDebugInfo = () => {
    const info = {
      current_url: window.location.href,
      origin: window.location.origin,
      port: window.location.port || 'default (80/443)',
      hostname: window.location.hostname,
      protocol: window.location.protocol,
      next_url: process.env.NEXT_PUBLIC_NEXTAUTH_URL || 'Non défini'
    };
    
    setShowTechInfo(!showTechInfo);
    setDebugInfo(JSON.stringify(info, null, 2));
  };

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-[450px] shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Se connecter</CardTitle>
          <CardDescription>
            Connectez-vous à votre compte pour accéder à votre portefeuille
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Informations sur la connexion à la base de données */}
          <div className="p-3 text-sm bg-yellow-100 border border-yellow-300 text-yellow-800 rounded-md">
            <div className="flex items-center gap-2 mb-1">
              <FaExclamationTriangle className="text-yellow-600" />
              <span className="font-semibold">Supabase connecté mais authentification indisponible</span>
            </div>
            <p>
              Supabase semble fonctionner d'après votre dashboard, mais il y a encore des erreurs de connexion à la base de données.
              L'erreur suggère un problème avec les identifiants de connexion.
            </p>
          </div>
          
          {/* Instructions pour corriger Google OAuth */}
          <div className="p-3 text-sm bg-blue-100 border border-blue-300 text-blue-800 rounded-md">
            <div className="flex items-center gap-2 mb-1">
              <FaInfoCircle className="text-blue-600" />
              <span className="font-semibold">Pour corriger l'erreur Google OAuth (invalid_client)</span>
            </div>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Accédez à la <a href="https://console.cloud.google.com/" target="_blank" className="underline">Console Google Cloud</a></li>
              <li>Sélectionnez votre projet</li>
              <li>Allez dans "APIs & Services" > "Credentials"</li>
              <li>Éditez votre Client ID OAuth 2.0</li>
              <li>Assurez-vous que les URIs suivants sont configurés:
                <ul className="list-disc pl-5 mt-1">
                  <li><code className="bg-gray-100 px-1">http://localhost:3000</code> (Origines JavaScript autorisées)</li>
                  <li><code className="bg-gray-100 px-1">http://localhost:3000/api/auth/callback/google</code> (URIs de redirection autorisés)</li>
                </ul>
              </li>
            </ol>
            
            <div className="mt-2">
              <button 
                onClick={showDebugInfo}
                className="text-blue-700 hover:text-blue-900 underline text-xs"
              >
                {showTechInfo ? "Masquer les infos techniques" : "Afficher les infos techniques"}
              </button>
            </div>
          </div>
          
          {error && (
            <div className="p-3 text-sm bg-red-100 border border-red-300 text-red-600 rounded-md">
              {error}
            </div>
          )}
          
          {debugInfo && showTechInfo && (
            <div className="p-3 text-sm bg-blue-100 border border-blue-300 text-blue-600 rounded-md overflow-auto max-h-40">
              <pre className="whitespace-pre-wrap">{debugInfo}</pre>
            </div>
          )}
          
          <Button
            variant="default"
            type="button"
            className="w-full flex items-center justify-center gap-2"
            onClick={handleGoogleSignIn}
            disabled={isLoading || status === "loading"}
          >
            <FaGoogle className="h-4 w-4" />
            {isLoading ? "Chargement..." : "Continuer avec Google"}
          </Button>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-500">ou</span>
            </div>
          </div>
          
          <Button
            variant="outline"
            type="button"
            className="w-full flex items-center justify-center gap-2 text-sm"
            onClick={() => window.location.href = '/api/auth/signin/google'}
            disabled={isLoading || status === "loading"}
          >
            <FaGoogle className="h-4 w-4" />
            Méthode alternative
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col items-center">
          <p className="text-center text-sm text-muted-foreground mt-2">
            En vous connectant, vous acceptez nos{" "}
            <a href="#" className="underline underline-offset-4 hover:text-primary">
              Conditions d&apos;utilisation
            </a>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
} 