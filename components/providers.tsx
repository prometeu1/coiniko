"use client";

import { ReactNode } from "react";
import { SessionProvider } from "next-auth/react";
import { Provider } from "@/components/theme-provider";
import { WalletProvider } from "@/lib/walletContext";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <Provider 
        attribute="class" 
        defaultTheme="system" 
        enableSystem
        disableTransitionOnChange
      >
        <WalletProvider>
          {children}
        </WalletProvider>
      </Provider>
    </SessionProvider>
  );
} 