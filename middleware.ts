import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Ce middleware s'exécute avant chaque requête
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Ajout d'en-têtes de sécurité
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // En-tête CSP pour améliorer la sécurité (à ajuster selon vos besoins)
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://pro-api.coinmarketcap.com https://api.coingecko.com;"
  );
  
  return response;
}

// Spécifier sur quelles routes ce middleware s'applique
export const config = {
  matcher: [
    // Appliquer à toutes les routes sauf quelques exceptions
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
}; 