"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FaGoogle } from "react-icons/fa";
import Link from "next/link";
import Image from "next/image";

// Animation effect with glowing element
const GlowingEffect = () => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-primary/30 rounded-full filter blur-3xl opacity-20 animate-pulse-slow"></div>
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-accent/30 rounded-full filter blur-3xl opacity-20 animate-pulse-slow animation-delay-2000"></div>
    </div>
  );
};

// Loading component for Suspense fallback
function SignInLoading() {
  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center bg-gradient-to-b from-background to-background/90 overflow-hidden">
      <GlowingEffect />
      <div className="mb-12 relative z-10">
        <Image
          src="/COINIKO.gif"
          alt="Logo"
          width={200}
          height={80}
          priority
          unoptimized
          className="object-contain relative z-10 h-auto w-auto max-h-[80px]"
          style={{ maxWidth: '200px' }}
        />
      </div>
      <Card className="w-[400px] relative z-10 border border-border/50 bg-background/80 backdrop-blur-md shadow-xl overflow-hidden">
        <CardHeader className="space-y-2 relative z-10">
          <CardTitle className="text-3xl font-bold text-center">Chargement...</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 relative z-10">
          <div className="flex items-center justify-center h-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SignInContent() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Get error from URL if present
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(`Erreur d'authentification: ${errorParam}`);
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
    setError(null);
    
    try {
      console.log("Tentative de connexion avec Google...");
      
      await signIn("google", {
        redirect: true,
        callbackUrl: "/"
      });
      
      // Cette partie ne sera pas exécutée avec redirect: true
      setIsLoading(false);
    } catch (error) {
      console.error("Erreur lors de la connexion avec Google:", error);
      setError("Erreur de connexion. Veuillez réessayer.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center bg-gradient-to-b from-background to-background/90 overflow-hidden">
      {/* Glowing effect */}
      <GlowingEffect />
      
      {/* Logo */}
      <div className="mb-12 relative z-10">
        <Image
          src="/COINIKO.gif"
          alt="Logo"
          width={200}
          height={80}
          priority
          unoptimized
          className="object-contain relative z-10 h-auto w-auto max-h-[80px]"
          style={{ maxWidth: '200px' }}
        />
      </div>
      
      {/* Card */}
      <Card className="w-[400px] relative z-10 border border-border/50 bg-background/80 backdrop-blur-md shadow-xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 opacity-50"></div>
        
        <CardHeader className="space-y-2 relative z-10">
          <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Bienvenue
          </CardTitle>
          <CardDescription className="text-center text-base">
            Connectez-vous pour accéder à votre portefeuille crypto
          </CardDescription>
          
          {error && (
            <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-md text-sm">
              {error}
            </div>
          )}
        </CardHeader>
        
        <CardContent className="space-y-6 relative z-10">
          <div className="space-y-4">
            <Button
              variant="default"
              type="button"
              className="w-full flex items-center justify-center gap-3 h-12 text-base relative overflow-hidden group transition-all bg-primary hover:bg-primary/90"
              onClick={handleGoogleSignIn}
              disabled={isLoading || status === "loading"}
            >
              <div className="absolute -inset-full top-0 block w-1/2 h-full z-5 transform -skew-x-20 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-shine"></div>
              <FaGoogle className="h-5 w-5" />
              {isLoading ? "Connexion en cours..." : "Se connecter avec Google"}
            </Button>
          </div>
          
          <div className="relative flex items-center">
            <div className="flex-grow border-t border-border/30"></div>
            <div className="flex-grow border-t border-border/30"></div>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col items-center text-center pb-6 relative z-10">
          <p className="text-xs text-muted-foreground mt-4">
            Investissez virtuellement dans les crypto-monnaies,<br /> suivez le marché et mesurez votre performance
          </p>
        </CardFooter>
      </Card>
      
      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mt-16 px-4 relative z-10">
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
          <h3 className="font-medium mb-2">Capital Virtuel</h3>
          <p className="text-sm text-muted-foreground">Commencez avec 100 000$ virtuels pour construire votre portefeuille</p>
        </div>
        
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
              <path d="M12 20V10"></path>
              <path d="M18 20V4"></path>
              <path d="M6 20v-6"></path>
            </svg>
          </div>
          <h3 className="font-medium mb-2">Données En Temps Réel</h3>
          <p className="text-sm text-muted-foreground">Suivez la valeur de votre portefeuille avec des données actualisées</p>
        </div>
        
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
              <circle cx="12" cy="8" r="6"></circle>
              <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"></path>
            </svg>
          </div>
          <h3 className="font-medium mb-2">Classement Mondial</h3>
          <p className="text-sm text-muted-foreground">Comparez vos performances et montez dans le classement des investisseurs</p>
        </div>
      </div>
    </div>
  );
}

export default function SignIn() {
  return (
    <Suspense fallback={<SignInLoading />}>
      <SignInContent />
    </Suspense>
  );
} 