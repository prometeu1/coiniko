import { PrismaClient } from '@prisma/client';

// Déclaration pour le global scope
declare global {
  var prisma: PrismaClient | undefined;
}

// Log pour déboguer
console.log('=== Initializing Prisma client ===');
console.log('DATABASE_URL is set:', !!process.env.DATABASE_URL);
console.log('DIRECT_URL is set:', !!process.env.DIRECT_URL);

if (process.env.DATABASE_URL) {
  console.log('DATABASE_URL starts with:', process.env.DATABASE_URL.substring(0, 20) + '...');
}
if (process.env.DIRECT_URL) {
  console.log('DIRECT_URL starts with:', process.env.DIRECT_URL.substring(0, 20) + '...');
}

// Solution pour éviter la duplication de connexions
export const prisma = global.prisma || new PrismaClient();

// En développement, on garde l'instance dans le global scope
// pour éviter de multiples connexions
if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

// Test database connection sans lancer de requête
(async () => {
  try {
    await prisma.$connect();
    console.log('✅ Database connection successful');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
  }
})(); 