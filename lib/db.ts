import { PrismaClient } from '@prisma/client';

// Déclaration pour le global scope
declare global {
  var prisma: PrismaClient | undefined;
  var prismaConnected: boolean;
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

// Fonction pour créer un nouveau client Prisma avec options optimisées
function createPrismaClient() {
  return new PrismaClient({
    log: ['error', 'warn'],
    errorFormat: 'pretty',
  });
}

// Solution pour éviter la duplication de connexions avec options pour résoudre l'erreur "prepared statement already exists"
// Utilise une seule instance par processus
let prismaInstance: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  // En production, toujours créer une nouvelle instance
  prismaInstance = createPrismaClient();
} else {
  // En développement, garder l'instance dans le global scope
  if (!global.prisma) {
    global.prisma = createPrismaClient();
    global.prismaConnected = false;
  }
  prismaInstance = global.prisma;
}

export const prisma = prismaInstance;

// Ajouter cette fonction pour nettoyer les connexions et éviter les erreurs de "prepared statement"
export async function disconnectPrisma() {
  try {
    if (global.prismaConnected) {
      await prisma.$disconnect();
      global.prismaConnected = false;
      console.log('Prisma client disconnected');
    }
  } catch (error) {
    console.error('Error disconnecting Prisma client:', error);
  }
}

// Fonction pour connecter Prisma de manière sécurisée avec retry
export async function connectPrisma(retries = 3, delay = 500) {
  try {
    if (!global.prismaConnected) {
      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          await prisma.$connect();
          global.prismaConnected = true;
          console.log('Prisma client connected successfully');
          return;
        } catch (error) {
          if (attempt < retries - 1) {
            console.warn(`Connection attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
            // Double le délai pour chaque tentative (exponential backoff)
            delay *= 2;
          } else {
            throw error;
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to connect Prisma client after multiple attempts:', error);
    // Réinitialiser l'état de connexion en cas d'échec
    global.prismaConnected = false;
    throw error;
  }
}

// Fonction utilitaire pour exécuter des opérations de base de données avec gestion d'erreurs et retry
export async function handleDatabaseOperation<T>(operation: () => Promise<T>, retries = 2): Promise<T> {
  try {
    // Déconnecter d'abord pour éviter les erreurs de connexions multiples
    await disconnectPrisma();
    // Puis reconnecter avec retry
    await connectPrisma(3, 500);
    
    // Exécuter l'opération
    let lastError: any;
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        // Si c'est une erreur de prepared statement, on déconnecte et réessaie
        if (error?.message?.includes('prepared statement')) {
          console.warn(`Prepared statement error, retry ${attempt + 1}/${retries}`);
          await disconnectPrisma();
          await connectPrisma(2, 300);
          lastError = error;
        } else {
          // Pour les autres types d'erreurs, on propage
          throw error;
        }
      }
    }
    // Si on arrive ici c'est qu'on a épuisé les tentatives
    throw lastError || new Error('Database operation failed after retries');
  } catch (error) {
    console.error('Database operation error:', error);
    // Déconnecter en cas d'erreur pour nettoyer
    await disconnectPrisma();
    throw error;
  }
}

// Test database connection sans lancer de requête
(async () => {
  try {
    // Utiliser notre nouvelle fonction
    await handleDatabaseOperation(async () => {
      console.log('✅ Database connection successful');
      return true;
    });
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
  }
})(); 