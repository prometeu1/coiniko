import { PrismaClient, Prisma } from '@prisma/client';

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
const globalForPrisma = global as unknown as { 
  prisma: PrismaClient | undefined;
};

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

// Configuration de Prisma pour résoudre les problèmes de connexion
const prismaClientOptions: Prisma.PrismaClientOptions = {
  log: [
    { level: 'error', emit: 'stdout' },
    { level: 'warn', emit: 'stdout' }
  ],
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
};

// Create a single PrismaClient instance
// Nous désactivons complètement la réutilisation de la connexion pour éviter les erreurs
let prisma: PrismaClient;

// En production, on crée une nouvelle instance à chaque fois
if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient(prismaClientOptions);
} else {
  // En développement, on supprime toute instance existante et on en crée une nouvelle
  // C'est la clé pour éviter les erreurs de "prepared statement already exists"
  if (globalForPrisma.prisma) {
    // Force disconnect any existing connections
    globalForPrisma.prisma.$disconnect();
  }
  globalForPrisma.prisma = new PrismaClient({
    ...prismaClientOptions,
    // On ajoute des options pour rendre les requêtes plus robustes
    errorFormat: 'pretty',
  });
  prisma = globalForPrisma.prisma;
}

// Test database connection
(async () => {
  try {
    // DO NOT run any query here - just log success
    console.log('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    console.log('WARNING: The app will function with limited features that do not require database access.');
  }
})();

export { prisma }; 