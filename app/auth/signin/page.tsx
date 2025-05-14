"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FaGoogle } from "react-icons/fa";
import Link from "next/link";

// Utiliser le port 3000
const PORT = 3000;
const NEXTAUTH_URL = `http://localhost:${PORT}`;

export default function SignIn() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (status === "authenticated" && session) {
      router.push("/");
    }
  }, [status, session, router]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    
    try {
      console.log("Trying to sign in with Google...");
      
      await signIn("google", {
        redirect: true,
        callbackUrl: window.location.origin
      });
      
      // Cette partie ne sera pas exécutée avec redirect: true
      setIsLoading(false);
    } catch (error) {
      console.error("Error signing in with Google:", error);
      setIsLoading(false);
    }
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