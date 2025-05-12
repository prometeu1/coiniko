"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Moon, Sun, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/lib/walletContext";

export function NavigationMenuDemo() {
  const { theme, setTheme } = useTheme();
  const { balance } = useWallet();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center">
          <Image
            src="/COINIKO.gif"
            alt="Logo"
            width={150}
            height={60}
            priority
            className="object-contain"
          />
        </Link>

        {/* Navigation */}
        <div className="flex items-center gap-4">
          {/* Wallet Button */}
          <Link href="/wallet">
            <Button variant="outline" className="flex items-center gap-2">
              <Wallet size={18} />
              <span className="hidden sm:inline">${balance.toLocaleString()}</span>
            </Button>
          </Link>

          {/* Theme Switcher */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-full"
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
