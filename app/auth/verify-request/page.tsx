"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { FaEnvelope } from "react-icons/fa";

export default function VerifyRequest() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-[350px] shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Vérifiez votre email</CardTitle>
          <CardDescription>
            Nous avons envoyé un lien de connexion à votre adresse email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="my-4 flex justify-center">
            <div className="rounded-full bg-primary/10 p-6">
              <FaEnvelope className="h-8 w-8 text-primary" />
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Cliquez sur le lien dans l&apos;email pour vous connecter à votre compte.
            Si vous ne trouvez pas l&apos;email, vérifiez votre dossier spam.
          </p>
          
          <Button 
            variant="ghost" 
            className="mt-4" 
            onClick={() => router.push("/auth/signin")}
          >
            Retour à la page de connexion
          </Button>
        </CardContent>
      </Card>
    </div>
  );
} 