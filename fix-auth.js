// Script de correction des problèmes d'authentification
console.log("🔧 Script de correction des problèmes d'authentification");

// Variables d'environnement requises pour l'authentification
const env = {
  NEXTAUTH_URL: "http://localhost:3000",
  NEXTAUTH_SECRET: "your-secret-key-at-least-32-chars-long",
  GOOGLE_CLIENT_ID: "747561554538-hla86ioipagc6naa7nk1msd0lbqdt04s.apps.googleusercontent.com",
  GOOGLE_CLIENT_SECRET: "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",
  DATABASE_URL: "postgres://postgres.sxdclilkgmrkktaqazkn:coiniko-database@aws-0-eu-west-3.pooler.supabase.com:5432/postgres",
  DIRECT_URL: "postgres://postgres.sxdclilkgmrkktaqazkn:coiniko-database@aws-0-eu-west-3.pooler.supabase.com:5432/postgres",
};

// Afficher les variables d'environnement pour le debug
console.log("\n📋 Variables d'environnement requises:");
Object.entries(env).forEach(([key, value]) => {
  console.log(`${key}=${value.substring(0, 10)}...`);
});

// Instructions pour corriger les problèmes d'authentification
console.log("\n📝 Instructions pour corriger l'authentification :");
console.log("1. Créez un fichier .env.local à la racine du projet avec le contenu suivant :");
console.log(`
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-at-least-32-chars-long

DATABASE_URL="postgres://postgres.sxdclilkgmrkktaqazkn:coiniko-database@aws-0-eu-west-3.pooler.supabase.com:5432/postgres"
DIRECT_URL="postgres://postgres.sxdclilkgmrkktaqazkn:coiniko-database@aws-0-eu-west-3.pooler.supabase.com:5432/postgres"

GOOGLE_CLIENT_ID=747561554538-hla86ioipagc6naa7nk1msd0lbqdt04s.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
`);

console.log("\n2. Suivez ces étapes pour résoudre les problèmes courants :");
console.log("   a. Effacez les cookies du navigateur liés au domaine");
console.log("   b. Redémarrez le serveur avec : npm run dev");
console.log("   c. Si le problème persiste, nettoyez le cache avec : npm run clean");
console.log("   d. Réinstallez les dépendances avec : npm install");

console.log("\n3. Pour les problèmes de base de données :");
console.log("   a. Exécutez ce script pour nettoyer les connexions : node prisma/cleanup.js");
console.log("   b. Régénérez le client Prisma avec : npx prisma generate");

console.log("\n4. Vérifiez que le port 3000 est libre avant de démarrer le serveur");
console.log("   Pour Windows : netstat -ano | findstr :3000");
console.log("   Pour Mac/Linux : lsof -i :3000");

console.log("\n5. Si vous rencontrez des erreurs 'prepared statement already exists' :");
console.log("   a. Connectez-vous à la base de données et exécutez : DEALLOCATE ALL;");
console.log("   b. Redémarrez complètement le serveur");

console.log("\n6. Si rien ne fonctionne, essayez de :");
console.log("   a. Supprimer le dossier .next");
console.log("   b. Supprimer node_modules et package-lock.json");
console.log("   c. Réinstaller avec npm install");
console.log("   d. Redémarrer le serveur");

// Fonction pour tester la connexion à la base de données
console.log("\n🔍 Voulez-vous tester la connexion à la base de données ?");
console.log("   Exécutez : node -e \"require('./lib/db').resetPrisma().then(() => console.log('✅ Connexion réussie')).catch(e => console.error('❌ Erreur de connexion', e))\"");

console.log("\n✨ Fin du script de correction"); 