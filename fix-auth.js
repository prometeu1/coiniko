// Correction des problèmes d'authentification
console.log("Script de correction des problèmes d'authentification");

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
console.log("Variables d'environnement requises:");
Object.entries(env).forEach(([key, value]) => {
  console.log(`${key}=${value.substring(0, 10)}...`);
});

// Instructions
console.log("\nInstructions pour corriger l'authentification :");
console.log("1. Créez un fichier .env.local à la racine du projet avec le contenu suivant :");
console.log(`
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-at-least-32-chars-long

DATABASE_URL="postgres://postgres.sxdclilkgmrkktaqazkn:coiniko-database@aws-0-eu-west-3.pooler.supabase.com:5432/postgres"
DIRECT_URL="postgres://postgres.sxdclilkgmrkktaqazkn:coiniko-database@aws-0-eu-west-3.pooler.supabase.com:5432/postgres"

GOOGLE_CLIENT_ID=747561554538-hla86ioipagc6naa7nk1msd0lbqdt04s.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
`);

console.log("2. Copiez également ce contenu dans un fichier .env (sans le .local)");
console.log("3. Redémarrez le serveur avec la commande : npm run dev");
console.log("4. Si vous avez encore des problèmes de connexion, essayez d'effacer les cookies du navigateur");
console.log("5. Vérifiez que le port 3000 est libre avant de démarrer le serveur"); 