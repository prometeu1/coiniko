# Authentication System for Coiniko

This document provides an overview of the authentication system implemented in the Coiniko application and instructions on how to use the various tools we've created to diagnose and fix authentication issues.

## Overview

Coiniko uses NextAuth.js with Google OAuth for authentication and Prisma with PostgreSQL for database access. The authentication system has been enhanced with robust error handling, connection pooling, and diagnostic tools to prevent common authentication issues.

## Key Components

1. **Database Connection Handling** (`lib/db.ts`)
   - Singleton pattern for PrismaClient
   - Connection pooling with PostgreSQL
   - Unique prepared statement names to prevent conflicts
   - Robust error handling and recovery

2. **NextAuth Configuration** (`app/api/auth/[...nextauth]/route.ts`)
   - Custom Prisma adapter with error handling
   - Session management with database strategy
   - Comprehensive error handling for all callbacks
   - Connection reset before handling auth requests

3. **Session Provider** (`components/providers.tsx`)
   - Enhanced session provider with error detection
   - Automatic cookie cleanup for problematic sessions
   - Session timeout detection

## Authentication Tools

We've created several tools to help diagnose and fix authentication issues:

### 1. Authentication Diagnostic Tool

```bash
npm run auth-diagnostic
```

This tool performs a comprehensive check of your authentication setup, including:
- Environment variables
- Database connection
- NextAuth tables
- Prepared statements
- Port conflicts
- Project files

It will also attempt to fix common issues automatically.

### 2. Authentication Test Tool

```bash
npm run test-auth
```

This tool performs a quick test of your authentication setup, including:
- Environment variables format validation
- Database connection test
- OAuth configuration validation
- NextAuth tables check

### 3. Database Reset Tool

```bash
npm run reset-db
```

This tool resets the database connections and cleans up prepared statements.

### 4. Fix Auth Script

```bash
npm run fix-auth
```

This script provides guidance on how to fix common authentication issues.

### 5. Clean All Script

```bash
npm run clean-all
```

This script cleans up the Next.js cache, Prisma cache, and regenerates the Prisma client.

## Common Authentication Issues and Solutions

For a comprehensive guide to troubleshooting authentication issues, please refer to the [AUTH-TROUBLESHOOTING.md](./AUTH-TROUBLESHOOTING.md) file.

## Environment Variables

Make sure you have the following environment variables set in your `.env.local` file:

```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-at-least-32-chars-long

DATABASE_URL="postgres://your-database-connection-string"
DIRECT_URL="postgres://your-database-connection-string"

GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-google-client-secret
```

## Development Workflow

1. Before starting development, run the authentication test:
   ```bash
   npm run test-auth
   ```

2. If any issues are detected, run the diagnostic tool:
   ```bash
   npm run auth-diagnostic
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. If you encounter authentication issues during development:
   - Check the browser console for errors
   - Check the server logs for errors
   - Run the diagnostic tool
   - Try resetting the database connections
   - Clear browser cookies

## Production Considerations

For production deployments:

1. Ensure your environment variables are properly set in your hosting platform
2. Use a strong NEXTAUTH_SECRET value
3. Set NEXTAUTH_URL to your production domain
4. Configure your Google OAuth credentials to allow your production domain
5. Consider implementing a more robust session storage solution if needed

## Need Help?

If you're still experiencing authentication issues after trying all the tools and solutions provided, please refer to:

1. [NextAuth.js Documentation](https://next-auth.js.org/getting-started/introduction)
2. [Prisma Documentation](https://www.prisma.io/docs)
3. [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2) 