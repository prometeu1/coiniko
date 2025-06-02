// Script pour guider la création d'un nouveau client OAuth Google
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const readline = require('readline');

// Créer une interface readline pour l'interaction avec l'utilisateur
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Charger les variables d'environnement existantes
try {
  if (fs.existsSync(path.join(process.cwd(), '.env.local'))) {
    console.log('Chargement des variables depuis .env.local');
    dotenv.config({ path: '.env.local' });
  } else if (fs.existsSync(path.join(process.cwd(), '.env'))) {
    console.log('Chargement des variables depuis .env');
    dotenv.config({ path: '.env' });
  }
} catch (error) {
  console.error('Erreur lors du chargement des variables d\'environnement:', error);
}

console.log("\n🔧 Assistant de création d'un client OAuth Google");
console.log("=============================================");

console.log("\n📋 Étape 1: Accéder à la console Google Cloud");
console.log("1. Ouvrez votre navigateur et accédez à https://console.cloud.google.com/");
console.log("2. Connectez-vous avec votre compte Google");
console.log("3. Créez un nouveau projet ou sélectionnez un projet existant");

rl.question('\nAppuyez sur Entrée une fois que vous avez accédé à la console Google Cloud...', () => {
  console.log("\n📋 Étape 2: Configurer l'écran de consentement OAuth");
  console.log("1. Dans le menu de gauche, cliquez sur 'APIs & Services' > 'OAuth consent screen'");
  console.log("2. Sélectionnez 'External' comme type d'utilisateur (pour le développement)");
  console.log("3. Remplissez les informations requises:");
  console.log("   - Nom de l'application: Coiniko");
  console.log("   - Email de support: votre adresse email");
  console.log("   - Logo de l'application: facultatif");
  console.log("4. Dans 'Authorized domains', ajoutez le domaine de votre application (ex: localhost)");
  console.log("5. Ajoutez votre adresse email (kevin.bajurean@oteria.fr) comme utilisateur de test");
  console.log("6. Cliquez sur 'Save and Continue'");
  
  rl.question('\nAppuyez sur Entrée une fois que vous avez configuré l\'écran de consentement...', () => {
    console.log("\n📋 Étape 3: Créer des identifiants OAuth");
    console.log("1. Dans le menu de gauche, cliquez sur 'APIs & Services' > 'Credentials'");
    console.log("2. Cliquez sur 'Create Credentials' > 'OAuth client ID'");
    console.log("3. Sélectionnez 'Web application' comme type d'application");
    console.log("4. Donnez un nom à votre client (ex: 'Coiniko Auth')");
    console.log("5. Dans 'Authorized JavaScript origins', ajoutez: http://localhost:3000");
    console.log("6. Dans 'Authorized redirect URIs', ajoutez: http://localhost:3000/api/auth/callback/google");
    console.log("7. Cliquez sur 'Create'");
    
    rl.question('\nAppuyez sur Entrée une fois que vous avez créé les identifiants OAuth...', () => {
      console.log("\n📋 Étape 4: Copier les identifiants");
      console.log("Une fenêtre devrait s'afficher avec votre Client ID et Client Secret.");
      
      rl.question('\nEntrez votre nouveau Client ID: ', (clientId) => {
        rl.question('Entrez votre nouveau Client Secret: ', (clientSecret) => {
          console.log("\n📋 Étape 5: Activer l'API Google People");
          console.log("1. Dans le menu de gauche, cliquez sur 'APIs & Services' > 'Library'");
          console.log("2. Recherchez 'Google People API'");
          console.log("3. Cliquez sur l'API et activez-la en cliquant sur 'Enable'");
          
          rl.question('\nAppuyez sur Entrée une fois que vous avez activé l\'API Google People...', () => {
            console.log("\n📋 Étape 6: Mettre à jour le fichier .env.local");
            
            // Préparer le contenu du fichier .env.local
            const envPath = path.join(process.cwd(), '.env.local');
            let envContent = '';
            
            // Lire le fichier existant s'il existe
            if (fs.existsSync(envPath)) {
              envContent = fs.readFileSync(envPath, 'utf8');
              
              // Mettre à jour les variables OAuth
              envContent = envContent.replace(/GOOGLE_CLIENT_ID=.*/g, `GOOGLE_CLIENT_ID=${clientId}`);
              envContent = envContent.replace(/GOOGLE_CLIENT_SECRET=.*/g, `GOOGLE_CLIENT_SECRET=${clientSecret}`);
              
              // Vérifier si les variables existent déjà, sinon les ajouter
              if (!envContent.includes('GOOGLE_CLIENT_ID=')) {
                envContent += `\nGOOGLE_CLIENT_ID=${clientId}`;
              }
              if (!envContent.includes('GOOGLE_CLIENT_SECRET=')) {
                envContent += `\nGOOGLE_CLIENT_SECRET=${clientSecret}`;
              }
            } else {
              // Créer un nouveau fichier .env.local
              envContent = `NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-at-least-32-chars-long

DATABASE_URL="${process.env.DATABASE_URL || "postgres://user:password@host:port/database"}"
DIRECT_URL="${process.env.DIRECT_URL || process.env.DATABASE_URL || "postgres://user:password@host:port/database"}"

GOOGLE_CLIENT_ID=${clientId}
GOOGLE_CLIENT_SECRET=${clientSecret}
`;
            }
            
            // Écrire le fichier .env.local
            fs.writeFileSync(envPath, envContent);
            console.log(`✅ Fichier .env.local mis à jour avec succès!`);
            
            console.log("\n📋 Étape 7: Redémarrer l'application");
            console.log("1. Arrêtez votre serveur de développement s'il est en cours d'exécution");
            console.log("2. Exécutez la commande: npm run dev");
            console.log("3. Essayez de vous connecter à nouveau");
            
            console.log("\n✨ Configuration OAuth terminée!");
            console.log("Si vous rencontrez encore des problèmes, exécutez: npm run auth-diagnostic");
            
            rl.close();
          });
        });
      });
    });
  });
}); 