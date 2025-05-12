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
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/lib/walletContext";
import { cn } from "@/lib/utils";

export function NavigationMenuDemo() {
  const { theme, setTheme } = useTheme();
  const { balance } = useWallet();
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

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full transition-all duration-300 backdrop-blur-md",
      isScrolled 
        ? "bg-background/70 border-b border-border/40 py-2" 
        : "bg-transparent py-4"
    )}>
      <div className="container flex h-16 items-center px-4">
        {/* Conteneur principal avec 3 sections de taille égale et centrées */}
        <div className="flex w-full justify-between items-center">
          {/* Section gauche - Logo */}
          <div className="w-1/3 flex justify-start">
            <Link href="/" className="flex items-center relative group">
              <div className="absolute inset-0 bg-accent/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <Image
                src="/COINIKO.gif"
                alt="Logo"
                width={150}
                height={60}
                priority
                className="object-contain relative z-10"
              />
            </Link>
          </div>

          {/* Section centrale - Navigation desktop */}
          <div className="w-1/3 hidden md:flex justify-center">
            <nav className="flex items-center space-x-1">
              <Link href="/">
                <Button variant="ghost" className="flex items-center gap-2 rounded-lg px-5 hover:bg-primary/10">
                  <Home size={18} className="text-primary" />
                  <span>Accueil</span>
                </Button>
              </Link>
              
              <Link href="/wallet">
                <Button variant="ghost" className="flex items-center gap-2 rounded-lg px-5 hover:bg-primary/10">
                  <Wallet size={18} className="text-primary" />
                  <span>Portefeuille</span>
                </Button>
              </Link>
            </nav>
          </div>

          {/* Section droite - Actions */}
          <div className="w-1/3 flex justify-end items-center gap-3">
            {/* Wallet balance avec animation de pulse */}
            <Link href="/wallet">
              <Button 
                variant="outline" 
                className="hidden sm:flex items-center gap-2 border border-accent/50 hover:border-accent/80 hover:bg-accent/5 neon-border"
              >
                <Wallet size={18} className="text-accent animate-pulse-slow" />
                <span className="font-medium">${balance.toLocaleString()}</span>
              </Button>
            </Link>

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
                <span className="ml-auto text-sm font-medium text-accent">
                  ${balance.toLocaleString()}
                </span>
              </Button>
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

