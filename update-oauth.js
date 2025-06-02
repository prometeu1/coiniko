// Script pour mettre à jour les identifiants Google OAuth
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Nouveaux identifiants OAuth
const newClientId = '8094554090-erm0qq2pc47r0gv2aa9j9jc8r89st4q9.apps.googleusercontent.com';
const newClientSecret = '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';

console.log('🔧 Mise à jour des identifiants Google OAuth');

// Déterminer le chemin du fichier .env.local
const envPath = path.join(process.cwd(), '.env.local');

// Vérifier si le fichier existe
if (fs.existsSync(envPath)) {
  console.log('✅ Fichier .env.local trouvé');
  
  // Lire le contenu actuel
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  // Mettre à jour les variables d'environnement
  if (envContent.includes('GOOGLE_CLIENT_ID=')) {
    envContent = envContent.replace(/GOOGLE_CLIENT_ID=.*/g, `GOOGLE_CLIENT_ID=${newClientId}`);
    console.log('✅ GOOGLE_CLIENT_ID mis à jour');
  } else {
    envContent += `\nGOOGLE_CLIENT_ID=${newClientId}`;
    console.log('✅ GOOGLE_CLIENT_ID ajouté');
  }
  
  if (envContent.includes('GOOGLE_CLIENT_SECRET=')) {
    envContent = envContent.replace(/GOOGLE_CLIENT_SECRET=.*/g, `GOOGLE_CLIENT_SECRET=${newClientSecret}`);
    console.log('✅ GOOGLE_CLIENT_SECRET mis à jour');
  } else {
    envContent += `\nGOOGLE_CLIENT_SECRET=${newClientSecret}`;
    console.log('✅ GOOGLE_CLIENT_SECRET ajouté');
  }
  
  // Écrire les modifications
  fs.writeFileSync(envPath, envContent);
  console.log('✅ Fichier .env.local mis à jour avec succès');
} else {
  console.log('❌ Fichier .env.local non trouvé, création du fichier...');
  
  // Créer un nouveau fichier .env.local
  const defaultEnvContent = `NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-at-least-32-chars-long

GOOGLE_CLIENT_ID=${newClientId}
GOOGLE_CLIENT_SECRET=${newClientSecret}
`;
  
  fs.writeFileSync(envPath, defaultEnvContent);
  console.log('✅ Fichier .env.local créé avec succès');
}

console.log('\n🔄 Pour appliquer les modifications:');
console.log('1. Arrêtez votre serveur de développement (Ctrl+C)');
console.log('2. Exécutez la commande: npm run dev');
console.log('3. Essayez de vous connecter à nouveau'); 