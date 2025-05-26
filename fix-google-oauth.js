// Script de correction des problèmes d'authentification Google OAuth
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Fonction pour afficher un message avec délai pour s'assurer qu'il s'affiche
function logWithDelay(message, delay = 0) {
  setTimeout(() => {
    console.log(message);
  }, delay);
}

logWithDelay("🔧 Script de correction des problèmes d'authentification Google OAuth");
logWithDelay("================================================================", 100);

// Charger les variables d'environnement
try {
  if (fs.existsSync(path.join(process.cwd(), '.env.local'))) {
    logWithDelay('Chargement des variables depuis .env.local', 200);
    dotenv.config({ path: '.env.local' });
  } else if (fs.existsSync(path.join(process.cwd(), '.env'))) {
    logWithDelay('Chargement des variables depuis .env', 200);
    dotenv.config({ path: '.env' });
  } else {
    logWithDelay('Aucun fichier .env ou .env.local trouvé', 200);
  }
} catch (error) {
  logWithDelay('Erreur lors du chargement des variables d\'environnement: ' + error, 200);
}

// Vérifier les variables d'environnement OAuth
logWithDelay("\n📋 Vérification des variables d'environnement OAuth:", 300);
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

if (!googleClientId) {
  logWithDelay("❌ GOOGLE_CLIENT_ID n'est pas défini", 400);
} else {
  logWithDelay(`✅ GOOGLE_CLIENT_ID: ${googleClientId.substring(0, 10)}...${googleClientId.substring(googleClientId.length - 10)}`, 400);
  
  if (!googleClientId.includes('.apps.googleusercontent.com')) {
    logWithDelay("⚠️ Le format de GOOGLE_CLIENT_ID semble incorrect (devrait se terminer par .apps.googleusercontent.com)", 500);
  }
}

if (!googleClientSecret) {
  logWithDelay("❌ GOOGLE_CLIENT_SECRET n'est pas défini", 600);
} else {
  logWithDelay(`✅ GOOGLE_CLIENT_SECRET: ${googleClientSecret.substring(0, 8)}...`, 600);
  
  if (!googleClientSecret.startsWith('GOCSPX-')) {
    logWithDelay("⚠️ Le format de GOOGLE_CLIENT_SECRET semble incorrect (devrait commencer par GOCSPX-)", 700);
  }
}

// Vérifier l'URL de callback
const nextAuthUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
logWithDelay(`\n🔗 URL de callback pour Google OAuth: ${nextAuthUrl}/api/auth/callback/google`, 800);
logWithDelay("⚠️ Assurez-vous que cette URL est ajoutée dans les URIs de redirection autorisés dans Google Cloud Console", 900);

// Instructions pour corriger les problèmes d'OAuth
logWithDelay("\n📝 Instructions pour corriger l'erreur 'OAuth client was not found':", 1000);
logWithDelay("1. Accédez à la console Google Cloud: https://console.cloud.google.com/", 1100);
logWithDelay("2. Sélectionnez votre projet", 1200);
logWithDelay("3. Allez dans 'APIs & Services' > 'Credentials'", 1300);
logWithDelay("4. Vérifiez que votre client OAuth existe et est correctement configuré:", 1400);
logWithDelay("   - Le client ID doit correspondre à la valeur de GOOGLE_CLIENT_ID", 1500);
logWithDelay("   - Le client Secret doit correspondre à la valeur de GOOGLE_CLIENT_SECRET", 1600);
logWithDelay("   - L'URI de redirection autorisé doit inclure: " + nextAuthUrl + "/api/auth/callback/google", 1700);
logWithDelay("5. Si votre client OAuth n'existe pas, créez-en un nouveau:", 1800);
logWithDelay("   a. Cliquez sur 'Create Credentials' > 'OAuth client ID'", 1900);
logWithDelay("   b. Sélectionnez 'Web application' comme type d'application", 2000);
logWithDelay("   c. Donnez un nom à votre client (ex: 'Coiniko Auth')", 2100);
logWithDelay("   d. Ajoutez les URIs de redirection autorisés:", 2200);
logWithDelay("      - " + nextAuthUrl + "/api/auth/callback/google", 2300);
logWithDelay("   e. Cliquez sur 'Create'", 2400);
logWithDelay("   f. Copiez le Client ID et le Client Secret générés", 2500);

// Créer ou mettre à jour le fichier .env.local
logWithDelay("\n🔧 Souhaitez-vous mettre à jour votre fichier .env.local avec de nouvelles valeurs?", 2600);
logWithDelay("Si oui, suivez ces étapes:", 2700);
logWithDelay("1. Créez ou modifiez le fichier .env.local à la racine du projet", 2800);
logWithDelay("2. Ajoutez ou mettez à jour les lignes suivantes avec vos nouvelles valeurs:", 2900);
logWithDelay(`
GOOGLE_CLIENT_ID=votre-nouveau-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-votre-nouveau-client-secret
`, 3000);

// Vérifier si l'API Google People est activée
logWithDelay("\n🔍 Assurez-vous également que l'API Google People est activée:", 3100);
logWithDelay("1. Accédez à https://console.cloud.google.com/apis/library/people.googleapis.com", 3200);
logWithDelay("2. Sélectionnez votre projet", 3300);
logWithDelay("3. Cliquez sur 'Enable' si l'API n'est pas déjà activée", 3400);

// Vérifier l'écran de consentement OAuth
logWithDelay("\n👤 Vérifiez la configuration de l'écran de consentement OAuth:", 3500);
logWithDelay("1. Accédez à https://console.cloud.google.com/apis/credentials/consent", 3600);
logWithDelay("2. Assurez-vous que l'écran de consentement est correctement configuré", 3700);
logWithDelay("3. Pour le développement, vous pouvez utiliser un écran de consentement 'External' en mode 'Testing'", 3800);
logWithDelay("4. Ajoutez votre adresse email (kevin.bajurean@oteria.fr) comme utilisateur de test", 3900);

// Nettoyer les cookies et le cache
logWithDelay("\n🧹 Nettoyez les cookies et le cache du navigateur:", 4000);
logWithDelay("1. Ouvrez les paramètres de votre navigateur", 4100);
logWithDelay("2. Accédez à la section 'Confidentialité et sécurité'", 4200);
logWithDelay("3. Effacez les cookies et le cache pour le domaine de votre application", 4300);
logWithDelay("4. Vous pouvez également essayer en navigation privée/incognito", 4400);

// Redémarrer l'application
logWithDelay("\n🔄 Après avoir effectué ces modifications:", 4500);
logWithDelay("1. Redémarrez votre serveur de développement: npm run dev", 4600);
logWithDelay("2. Essayez de vous connecter à nouveau", 4700);

// Ajouter un script au package.json
logWithDelay("\n💡 Pour faciliter le diagnostic à l'avenir, ajoutez ce script à votre package.json:", 4800);
logWithDelay(`
"scripts": {
  ...
  "fix-oauth": "node fix-google-oauth.js"
}
`, 4900);

logWithDelay("\n✨ Fin du script de correction OAuth", 5000);

// Attendre que tous les logs soient affichés avant de terminer
setTimeout(() => {
  process.exit(0);
}, 5500); 