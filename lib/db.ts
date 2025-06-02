import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

// Global Prisma client instance
let prismaInstance: PrismaClient | null = null;

// PostgreSQL connection pool
let pgPool: Pool | null = null;

// Create PostgreSQL pool
const getPgPool = (): Pool => {
  if (!pgPool) {
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pgPool.on('error', (err) => {
      console.error('PostgreSQL pool error:', err);
    });
  }
  return pgPool;
};

// Create Prisma client instance
export const prisma = (): PrismaClient => {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient();
  }
  return prismaInstance;
};

// Function to execute raw SQL queries
export async function executeRawQuery(sql: string, params: any[] = []): Promise<any> {
  const pool = getPgPool();
  const client = await pool.connect();
  
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } catch (error) {
    console.error('Error executing raw query:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Handle database operations with retry
export async function handleDatabaseOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 2
): Promise<T> {
  let retries = 0;
  let lastError: Error | null = null;
  
  while (retries <= maxRetries) {
    try {
      const result = await operation();
      return result;
    } catch (error: any) {
      lastError = error;
      retries++;
      
      console.error(`Database operation failed (attempt ${retries}/${maxRetries + 1}): `, error.message);
      
      if (retries <= maxRetries) {
        const delay = Math.min(1000 * retries, 3000);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Database operation failed');
}

export default prisma; 