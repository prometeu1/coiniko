"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";

export default function VerifyRequest() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Card className="w-[450px] shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Vérifiez votre email</CardTitle>
          <CardDescription>
            Un lien de connexion a été envoyé à votre adresse email
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <div className="mb-4 rounded-full bg-primary/10 p-3">
              <Mail className="h-10 w-10 text-primary" />
            </div>
            <p className="mb-2 text-lg font-medium">Consultez votre boîte de réception</p>
            <p className="text-muted-foreground">
              Nous avons envoyé un lien de connexion sécurisé à votre adresse email. Veuillez vérifier votre boîte de réception et cliquer sur le lien pour vous connecter.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Si vous ne recevez pas l&apos;email dans les prochaines minutes, vérifiez votre dossier spam ou courrier indésirable.
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link href="/auth/signin">
            <Button variant="outline">Retour à la connexion</Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
} 