# Authentication Troubleshooting Guide

This guide will help you resolve common authentication issues with the Coiniko application.

## Common Authentication Errors

### 1. "Failed to fetch" Error

This typically occurs when:
- The server is not running
- There's a network connectivity issue
- The NextAuth API route is not responding

### 2. "Auth error from URL: Callback" Error

This error occurs when:
- There's a database connection issue
- The database tables don't exist or are corrupted
- Prepared statements are conflicting

### 3. "Auth error from URL: OAuthCallback" Error

This error happens when:
- The OAuth state doesn't match (often due to cookie issues)
- The session couldn't be created
- The Google OAuth configuration is incorrect

## Quick Solutions

### Step 1: Run the Authentication Diagnostic Tool

```bash
npm run auth-diagnostic
```

This tool will:
- Check your environment variables
- Test your database connection
- Check for port conflicts
- Verify project files
- Fix common issues automatically

### Step 2: Reset Database Connections

```bash
npm run reset-db
```

This will:
- Clean up all prepared statements
- Reset all database connections
- Reconnect to the database with fresh connections

### Step 3: Clean Browser Data

1. Clear all cookies for your development domain (usually localhost:3000)
2. Try using incognito/private browsing mode
3. Clear browser cache and reload

### Step 4: Restart with Clean Environment

```bash
npm run clean-all
npm run dev
```

This will:
- Clear Next.js cache
- Clean Prisma cache
- Regenerate Prisma client
- Restart the development server

## Advanced Troubleshooting

### Database Connection Issues

If you're experiencing persistent database connection problems:

1. Verify your DATABASE_URL is correct in .env.local
2. Check if your database is online and accessible
3. Run this command to clean up prepared statements:

```bash
node -e "require('./lib/db').cleanupPreparedStatements().then(() => console.log('Cleanup successful')).catch(e => console.error('Cleanup failed:', e))"
```

### OAuth Configuration Issues

1. Verify your Google OAuth credentials:
   - Check GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.local
   - Ensure your OAuth consent screen is configured correctly
   - Verify that the authorized redirect URIs include `http://localhost:3000/api/auth/callback/google`

2. Check NextAuth configuration:
   - Ensure NEXTAUTH_URL is set correctly
   - Verify NEXTAUTH_SECRET is set

### Session Issues

If users can authenticate but sessions are not persisting:

1. Check that the database tables for sessions exist
2. Verify the cookies are being set correctly
3. Try using a different browser

## Debugging Tips

### Enable Debug Mode

Add this to your .env.local file:

```
NEXTAUTH_DEBUG=true
```

### Check Server Logs

Look for errors related to:
- "prepared statement already exists"
- Database connection failures
- OAuth state mismatches

### Test Database Connection Directly

```bash
node -e "const { Pool } = require('pg'); const pool = new Pool({connectionString: process.env.DATABASE_URL}); pool.query('SELECT NOW()', (err, res) => { console.log(err ? err : res.rows[0]); pool.end(); })"
```

## Need More Help?

If you're still experiencing issues after trying all these solutions:

1. Check the [NextAuth.js documentation](https://next-auth.js.org/getting-started/introduction)
2. Look for similar issues in the [NextAuth.js GitHub repository](https://github.com/nextauthjs/next-auth/issues)
3. Run `npm run fix-auth` to see additional troubleshooting steps 