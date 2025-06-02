"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Cloud,
  CloudOff,
  CreditCard,
  LogOut,
  PlusCircle,
  Settings,
  User,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWallet } from "@/lib/walletContext";
import { useToast } from "./use-toast";

interface UserNavProps {
  user: {
    name?: string | null;
    image?: string | null;
    email?: string | null;
  } | null;
}

export default function UserNav({ user }: UserNavProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { isOfflineMode, toggleOfflineMode } = useWallet();

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    toast({
      title: "Déconnexion réussie",
      description: "Vous avez été déconnecté avec succès",
    });
    router.push("/");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage
              src={user?.image || ""}
              alt={user?.name || "User"}
            />
            <AvatarFallback>{user?.name?.[0] || "U"}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user?.name || "Utilisateur"}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user?.email || ""}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/profile">
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/wallet">
              <CreditCard className="mr-2 h-4 w-4" />
              <span>Portefeuille</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => toggleOfflineMode()}
            className="cursor-pointer"
          >
            {isOfflineMode ? (
              <>
                <Cloud className="mr-2 h-4 w-4" />
                <span>Activer le mode en ligne</span>
              </>
            ) : (
              <>
                <CloudOff className="mr-2 h-4 w-4" />
                <span>Activer le mode hors ligne</span>
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <Settings className="mr-2 h-4 w-4" />
              <span>Paramètres</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Se déconnecter</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 