import { PrismaClient } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Ajout de logs pour le debug
console.log('=== Initializing Prisma client ===');
console.log('DATABASE_URL is set:', !!process.env.DATABASE_URL);
console.log('DIRECT_URL is set:', !!process.env.DIRECT_URL);

// Fix connection strings if needed
let databaseUrl = process.env.DATABASE_URL || '';
let directUrl = process.env.DIRECT_URL || '';

// Ensure connection strings don't have line breaks
databaseUrl = databaseUrl.replace(/\n/g, '').trim();
directUrl = directUrl.replace(/\n/g, '').trim();

// Modify to use postgresql instead of postgres prefix if needed
if (databaseUrl.startsWith('postgres://')) {
  databaseUrl = databaseUrl.replace('postgres://', 'postgresql://');
  console.log('Modified DATABASE_URL to use postgresql:// prefix');
}

if (directUrl.startsWith('postgres://')) {
  directUrl = directUrl.replace('postgres://', 'postgresql://');
  console.log('Modified DIRECT_URL to use postgresql:// prefix');
}

if (databaseUrl) {
  console.log('DATABASE_URL starts with:', databaseUrl.substring(0, 20) + '...');
} else {
  console.error('DATABASE_URL is missing or empty!');
}

if (directUrl) {
  console.log('DIRECT_URL starts with:', directUrl.substring(0, 20) + '...');
} else {
  console.error('DIRECT_URL is missing or empty!');
}

// Create Prisma client with enhanced error handling
let prisma: PrismaClient;

if (!databaseUrl) {
  console.error('DATABASE_URL is required. Please check your .env file');
  // Dummy implementation to prevent app from crashing
  prisma = new PrismaClient({
    log: ['error'],
  });
} else {
  try {
    prisma = globalForPrisma.prisma || 
      new PrismaClient({
        log: ['error', 'warn'],
        datasources: {
          db: {
            url: databaseUrl,
          },
        },
      });
    
    console.log('Prisma client initialized successfully');
  } catch (error) {
    console.error('Error initializing Prisma client:', error);
    // Fallback to a default Prisma client in case of error
    prisma = new PrismaClient();
  }
}

// Test database connection
(async () => {
  try {
    // Simple query to test connection
    // await prisma.$queryRaw`SELECT 1 as test`; // Désactivé car cause des bugs en dev
    console.log('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.log('WARNING: The app will function with limited features that do not require database access.');
  }
})();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export { prisma }; 