"use client";

import { ReactNode, useEffect } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import { Provider } from "@/components/theme-provider";
import { WalletProvider } from "@/lib/walletContext";

// Session error handler component
function SessionErrorHandler({ children }: { children: ReactNode }) {
  const { status } = useSession();
  
  // Handle session errors
  useEffect(() => {
    if (status === "loading") {
      // Add a timeout to detect hanging session requests
      const timeout = setTimeout(() => {
        console.warn("Session loading is taking too long, may indicate an issue");
      }, 5000);
      
      return () => clearTimeout(timeout);
    }
    
    if (status === "unauthenticated") {
      // Clear any problematic cookies on unauthenticated state
      // This helps with "OAuthCallback" errors caused by stale cookies
      if (typeof window !== 'undefined') {
        document.cookie.split(';').forEach(cookie => {
          const [name] = cookie.split('=');
          if (name.trim().startsWith('next-auth')) {
            document.cookie = `${name.trim()}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
          }
        });
      }
    }
  }, [status]);
  
  return <>{children}</>;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider
      refetchInterval={5 * 60}
      refetchOnWindowFocus={true}
      refetchWhenOffline={false}
    >
      <SessionErrorHandler>
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
      </SessionErrorHandler>
    </SessionProvider>
  );
} 