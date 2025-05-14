"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import { 
  Moon, 
  Sun, 
  Wallet, 
  Home,
  Menu,
  X,
  LogIn,
  User,
  LogOut,
  Trophy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/lib/walletContext";
import { cn } from "@/lib/utils";
import { useSession, signIn, signOut } from "next-auth/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Navbar() {
  const { theme, setTheme } = useTheme();
  const { balance } = useWallet();
  const { data: session, status } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);

  // Détecter le défilement pour changer l'apparence de la barre de navigation
  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Obtenir les initiales d'un nom pour l'avatar fallback
  const getInitials = (name: string | null | undefined) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full transition-all duration-300 backdrop-blur-md",
      isScrolled 
        ? "bg-background/70 border-b border-border/40 py-2" 
        : "bg-transparent py-4"
    )}>
      <div className="container flex h-16 items-center px-4">
        {/* Conteneur principal avec 3 sections et layout amélioré */}
        <div className="flex w-full justify-between items-center">
          {/* Section gauche - Logo (plus compact) */}
          <div className="w-1/4 flex justify-start">
            <Link href="/" className="flex items-center relative group">
              <div className="absolute inset-0 bg-accent/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <Image
                src="/COINIKO.gif"
                alt="Logo"
                width={90}
                height={36}
                priority
                unoptimized
                className="object-contain relative z-10 h-auto w-auto max-h-[36px]"
                style={{ maxWidth: '90px' }}
              />
            </Link>
          </div>

          {/* Section centrale - Navigation desktop (plus large) */}
          <div className="w-2/4 hidden md:flex justify-center">
            <nav className="flex items-center justify-center w-full">
              <div className="flex bg-accent/5 rounded-lg p-1">
                <Link href="/">
                  <Button variant="ghost" className="flex items-center gap-2 rounded-lg px-4 hover:bg-primary/10">
                    <Home size={16} className="text-primary" />
                    <span>Accueil</span>
                  </Button>
                </Link>
                
                <Link href="/wallet">
                  <Button variant="ghost" className="flex items-center gap-2 rounded-lg px-4 hover:bg-primary/10">
                    <Wallet size={16} className="text-primary" />
                    <span>Portefeuille</span>
                  </Button>
                </Link>

                <Link href="/rankings">
                  <Button variant="ghost" className="flex items-center gap-2 rounded-lg px-4 hover:bg-primary/10">
                    <Trophy size={16} className="text-primary" />
                    <span>Classement</span>
                  </Button>
                </Link>
              </div>
            </nav>
          </div>

          {/* Section droite - Actions (plus compact) */}
          <div className="w-1/4 flex justify-end items-center gap-2">
            {status === "authenticated" && (
              <>
                {/* Wallet balance avec animation de pulse */}
                <Link href="/wallet">
                  <Button 
                    variant="outline" 
                    className="hidden sm:flex items-center gap-2 border border-accent/50 hover:border-accent/80 hover:bg-accent/5 neon-border"
                  >
                    <Wallet size={16} className="text-accent animate-pulse-slow" />
                    <span className="font-medium">${balance.toLocaleString()}</span>
                  </Button>
                </Link>
              </>
            )}

            {/* Bouton pour changer de thème */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="rounded-full bg-primary/5 hover:bg-primary/10"
              aria-label="Toggle theme"
            >
              <Sun className="h-5 w-5 rotate-0 scale-100 text-accent transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-5 w-5 rotate-90 scale-0 text-accent transition-all dark:rotate-0 dark:scale-100" />
            </Button>

            {/* Authentification */}
            {status === "loading" ? (
              <Button variant="ghost" size="icon" disabled className="h-9 w-9 rounded-full">
                <div className="h-5 w-5 animate-pulse bg-primary/20 rounded-full"></div>
              </Button>
            ) : status === "authenticated" ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={session.user?.image || undefined} alt={session.user?.name || "Utilisateur"} />
                      <AvatarFallback className="bg-primary/10">
                        {getInitials(session.user?.name)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <div className="flex items-center justify-start gap-2 p-2">
                    <div className="flex flex-col space-y-1 leading-none">
                      {session.user?.name && <p className="font-medium">{session.user.name}</p>}
                      {session.user?.email && (
                        <p className="w-48 truncate text-sm text-muted-foreground">
                          {session.user.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/wallet" className="cursor-pointer">
                      <Wallet className="mr-2 h-4 w-4" />
                      <span>Portefeuille</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/rankings" className="cursor-pointer">
                      <Trophy className="mr-2 h-4 w-4" />
                      <span>Classement</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer text-destructive focus:text-destructive"
                    onClick={() => signOut()}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Se déconnecter</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => signIn()}
                className="gap-1"
              >
                <LogIn className="h-4 w-4" />
                <span>Connexion</span>
              </Button>
            )}

            {/* Menu mobile */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden rounded-full bg-primary/5 hover:bg-primary/10"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="h-5 w-5 text-accent" />
              ) : (
                <Menu className="h-5 w-5 text-accent" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Menu mobile déroulant - Simplified to only Home and Wallet */}
      {isMobileMenuOpen && (
        <div className="md:hidden glass animate-fade-in">
          <nav className="flex flex-col space-y-2 p-4">
            <Link href="/" onClick={() => setIsMobileMenuOpen(false)}>
              <Button variant="ghost" className="w-full justify-start gap-2">
                <Home size={18} className="text-primary" />
                <span>Accueil</span>
              </Button>
            </Link>
            
            <Link href="/wallet" onClick={() => setIsMobileMenuOpen(false)}>
              <Button variant="ghost" className="w-full justify-start gap-2">
                <Wallet size={18} className="text-primary" />
                <span>Portefeuille</span>
                {status === "authenticated" && (
                  <span className="ml-auto text-sm font-medium text-accent">
                    ${balance.toLocaleString()}
                  </span>
                )}
              </Button>
            </Link>

            <Link href="/rankings" onClick={() => setIsMobileMenuOpen(false)}>
              <Button variant="ghost" className="w-full justify-start gap-2">
                <Trophy size={18} className="text-primary" />
                <span>Classement</span>
              </Button>
            </Link>

            {status === "unauthenticated" && (
              <Button
                variant="default"
                className="w-full justify-start gap-2 mt-2"
                onClick={() => {
                  signIn();
                  setIsMobileMenuOpen(false);
                }}
              >
                <LogIn size={18} className="text-primary-foreground" />
                <span>Connexion</span>
              </Button>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}

