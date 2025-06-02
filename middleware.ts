import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(req) {
    // Middleware function pour les pages protégées
    console.log("Middleware - path:", req.nextUrl.pathname);
    console.log("Middleware - token:", !!req.nextauth.token);
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // Autoriser l'accès aux pages publiques
        const publicPaths = ["/", "/auth/signin", "/auth/signout", "/api/auth"];
        const isPublicPath = publicPaths.some(path => 
          req.nextUrl.pathname.startsWith(path)
        );
        
        if (isPublicPath) {
          return true;
        }
        
        // Pour les autres pages, vérifier le token
        return !!token;
      },
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api/auth (NextAuth API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
} 