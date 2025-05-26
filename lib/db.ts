import { PrismaClient } from '@prisma/client';
import { Pool, PoolClient } from 'pg';

// Create a singleton PrismaClient instance
let prismaInstance: PrismaClient | null = null;

// Create a PostgreSQL pool for direct queries
let pgPool: Pool | null = null;

// Track connection state
let isConnected = false;
let connectionAttempts = 0;
const MAX_CONNECTION_ATTEMPTS = 3;

// Unique identifier for this server instance to prevent prepared statement name collisions
const INSTANCE_ID = Math.random().toString(36).substring(2, 10);
let statementCounter = 0;

// Get a unique name for prepared statements to avoid conflicts
const getUniqueStatementName = () => {
  return `stmt_${INSTANCE_ID}_${statementCounter++}`;
};

// Get or create the PostgreSQL pool
const getPgPool = (): Pool => {
  if (!pgPool) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error('DATABASE_URL is not defined');
    }
    
    pgPool = new Pool({
      connectionString: url,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      // Add statement timeout to prevent hanging queries
      statement_timeout: 30000,
      // Use SSL in production
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
    
    console.log('PostgreSQL pool created');
    
    // Add error handler
    pgPool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client', err);
      // Reset the pool on critical errors
      pgPool = null;
    });
  }
  
  return pgPool;
};

// Get or create the PrismaClient instance
export const prisma = (): PrismaClient => {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      log: [
        {
          emit: 'event',
          level: 'error',
        },
      ],
      // Important: Disable connection pooling in Prisma since we're managing it ourselves
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      }
    });

    // Log Prisma errors
    prismaInstance.$on('error', (e) => {
      console.error('Prisma Client error:', e);
    });
  }
  
  return prismaInstance;
};

// Execute a raw query with a unique prepared statement name
export async function executeRawQuery(sql: string, params: any[] = []): Promise<any> {
  const pool = getPgPool();
  const client = await pool.connect();
  
  try {
    // Execute directly without prepared statements to avoid conflicts
    const result = await client.query(sql, params);
    return result.rows;
  } catch (error) {
    console.error('Error executing raw query:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Clean up all prepared statements for this connection
export async function cleanupPreparedStatements(): Promise<void> {
  const pool = getPgPool();
  const client = await pool.connect();
  
  try {
    // First try to deallocate all statements at once (safer approach)
    try {
      await client.query('DEALLOCATE ALL');
      console.log('✅ All prepared statements have been deallocated');
      return;
    } catch (e) {
      console.warn('Failed to deallocate all statements:', e);
    }

    // If that fails, try to get a list of statements and deallocate them individually
    try {
      const result = await client.query('SELECT name FROM pg_prepared_statements');
      
      // Deallocate each statement individually
      for (const row of result.rows) {
        try {
          await client.query(`DEALLOCATE "${row.name}"`);
        } catch (e) {
          console.warn(`Failed to deallocate statement ${row.name}:`, e);
        }
      }
      
      console.log(`Cleaned up ${result.rows.length} prepared statements`);
    } catch (e) {
      console.error('Failed to clean up prepared statements:', e);
    }
  } catch (error) {
    console.error('Failed to clean up prepared statements:', error);
  } finally {
    client.release();
  }
}

// Reset the Prisma client and PostgreSQL pool
export async function resetPrisma(): Promise<void> {
  console.log('Resetting database connections...');
  
  try {
    // Disconnect Prisma
    if (prismaInstance) {
      await prismaInstance.$disconnect();
      prismaInstance = null;
    }
    
    // Clean up prepared statements
    await cleanupPreparedStatements();
    
    // Close and recreate the pool
    if (pgPool) {
      try {
        await pgPool.end();
      } catch (err: any) {
        // Ignore "Called end on pool more than once" errors
        if (!err.message?.includes('Called end on pool more than once')) {
          console.error('Error ending pool:', err);
        }
      }
      pgPool = null;
    }
    
    // Reset connection state
    isConnected = false;
    connectionAttempts = 0;
    
    // Create fresh connections
    getPgPool();
    prisma();
    
    console.log('✓ Database connections reset successfully');
    return;
  } catch (error) {
    console.error('Failed to reset database connections:', error);
    throw error;
  }
}

// Connect to the database
export async function connectPrisma(): Promise<void> {
  try {
    if (!isConnected) {
      connectionAttempts++;
      console.log(`Connecting to database (attempt ${connectionAttempts}/${MAX_CONNECTION_ATTEMPTS})...`);
      
      // Initialize the pool and Prisma
      getPgPool();
      prisma();
      
      // Test the connection WITHOUT using prepared statements
      try {
        // Use direct query with pool instead of Prisma
        const pool = getPgPool();
        const client = await pool.connect();
        try {
          await client.query('SELECT 1');
          isConnected = true;
        } finally {
          client.release();
        }
      } catch (e) {
        console.error('Test connection failed:', e);
        throw e;
      }
      
      connectionAttempts = 0;
      console.log('✓ Database connection established');
    }
  } catch (error) {
    console.error('Failed to connect to database:', error);
    isConnected = false;
    
    if (connectionAttempts >= MAX_CONNECTION_ATTEMPTS) {
      console.error('Max connection attempts reached');
      throw new Error('Failed to establish database connection after multiple attempts');
    }
    
    throw error;
  }
}

// Disconnect from the database
export async function disconnectPrisma(): Promise<void> {
  try {
    // Clean up prepared statements
    await cleanupPreparedStatements();
    
    // Disconnect Prisma
    if (prismaInstance) {
      await prismaInstance.$disconnect();
      prismaInstance = null;
    }
    
    // Close the pool
    if (pgPool) {
      await pgPool.end();
      pgPool = null;
    }
    
    isConnected = false;
    console.log('Database disconnected');
  } catch (error) {
    console.error('Error disconnecting from database:', error);
    throw error;
  }
}

// Handle database operations with retry and connection management
export async function handleDatabaseOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let retries = 0;
  let lastError: Error | null = null;
  
  while (retries <= maxRetries) {
    try {
      // Ensure connection is established
      await connectPrisma();
      
      // Execute the operation
      const result = await operation();
      return result;
    } catch (error: any) {
      lastError = error;
      retries++;
      
      // Log the error with more context
      console.error(`Database operation failed (attempt ${retries}/${maxRetries + 1}): `, error.message);
      
      // Check for prepared statement errors
      const isPreparedStatementError = 
        error.message?.includes('prepared statement') || 
        error.code === '42P05' || 
        error.code === '26000';
      
      if (isPreparedStatementError) {
        console.log('Detected prepared statement conflict, resetting connections...');
        await resetPrisma();
      }
      
      if (retries <= maxRetries) {
        // Wait before retrying with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, retries - 1), 8000);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('Max retries reached for database operation');
        throw error;
      }
    }
  }
  
  // This should never happen, but TypeScript needs it
  throw lastError || new Error('Unknown error during database operation');
}

// Clean up connections when the process exits
process.on('beforeExit', async () => {
  await disconnectPrisma();
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, cleaning up database connections...');
  await disconnectPrisma();
  process.exit(0);
});

// Initialize the database connection
if (typeof window === 'undefined') {
  // Only run on server side
  resetPrisma().catch(console.error);
} 