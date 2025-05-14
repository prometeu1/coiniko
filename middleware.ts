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
  
  // Ajouter des en-têtes CORS pour permettre les requêtes
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  
  // En-tête CSP plus permissif pour les ressources externes
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self' https://accounts.google.com; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*; font-src 'self' data:; connect-src 'self' https://* http://localhost:*; frame-src 'self' https://accounts.google.com;"
  );
  
  return response;
}

// Spécifier sur quelles routes ce middleware s'applique
export const config = {
  matcher: [
    // Appliquer à toutes les routes sauf quelques exceptions
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}; 