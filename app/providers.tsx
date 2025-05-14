"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/toaster";
import { WalletProvider } from "@/lib/walletContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <WalletProvider>
          {children}
          <Toaster />
        </WalletProvider>
      </ThemeProvider>
    </SessionProvider>
  );
} 