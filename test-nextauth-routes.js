#!/usr/bin/env node

/**
 * Script de test pour vérifier les routes NextAuth
 * Utilisation: node test-nextauth-routes.js [base-url]
 * Exemple: node test-nextauth-routes.js https://coiniko.vercel.app
 */

const https = require('https');
const http = require('http');

const BASE_URL = process.argv[2] || 'http://localhost:3000';

console.log(`🔍 Test des routes NextAuth sur: ${BASE_URL}`);
console.log('='.repeat(60));

/**
 * Faire une requête HTTP(S)
 */
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    
    const options = {
      timeout: 10000,
      headers: {
        'User-Agent': 'NextAuth-Route-Tester/1.0'
      }
    };

    const req = lib.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.on('error', reject);
  });
}

/**
 * Tester une route spécifique
 */
async function testRoute(path, expectedContentType = null) {
  const url = `${BASE_URL}${path}`;
  
  try {
    console.log(`\n📡 Test: ${path}`);
    console.log(`   URL: ${url}`);
    
    const response = await makeRequest(url);
    
    console.log(`   Status: ${response.status}`);
    console.log(`   Content-Type: ${response.headers['content-type'] || 'non défini'}`);
    
    // Vérifier le type de contenu
    const contentType = response.headers['content-type'] || '';
    const isJSON = contentType.includes('application/json');
    const isHTML = contentType.includes('text/html');
    
    if (expectedContentType === 'json' && !isJSON) {
      console.log(`   ❌ ERREUR: Attendu JSON, reçu ${contentType}`);
      console.log(`   📄 Contenu (100 premiers caractères): ${response.data.substring(0, 100)}...`);
      return false;
    }
    
    if (isJSON) {
      try {
        const jsonData = JSON.parse(response.data);
        console.log(`   ✅ JSON valide`);
        console.log(`   📄 Contenu: ${JSON.stringify(jsonData, null, 2).substring(0, 200)}...`);
      } catch (e) {
        console.log(`   ❌ JSON invalide: ${e.message}`);
        return false;
      }
    } else if (isHTML) {
      console.log(`   📄 Page HTML (longueur: ${response.data.length} caractères)`);
      
      // Vérifier s'il y a des erreurs dans le HTML
      if (response.data.includes('<!DOCTYPE')) {
        if (response.data.includes('Error') || response.data.includes('error')) {
          console.log(`   ⚠️  HTML contient "Error"`);
        } else {
          console.log(`   ✅ Page HTML normale`);
        }
      }
    }
    
    if (response.status >= 200 && response.status < 300) {
      console.log(`   ✅ Statut OK`);
      return true;
    } else if (response.status >= 300 && response.status < 400) {
      console.log(`   ➡️  Redirection (normal pour certaines routes)`);
      return true;
    } else {
      console.log(`   ❌ Erreur HTTP`);
      return false;
    }
    
  } catch (error) {
    console.log(`   ❌ Erreur de connexion: ${error.message}`);
    return false;
  }
}

/**
 * Test principal
 */
async function runTests() {
  const routes = [
    // Routes NextAuth essentielles
    { path: '/api/auth/session', expectJson: true },
    { path: '/api/auth/signin', expectJson: false },
    { path: '/api/auth/providers', expectJson: true },
    { path: '/api/auth/csrf', expectJson: true },
    
    // Pages d'authentification
    { path: '/auth/signin', expectJson: false },
    
    // API de base
    { path: '/api/coinmarketcap', expectJson: true },
  ];
  
  console.log(`\n🚀 Début des tests (${routes.length} routes à tester):`);
  
  let successCount = 0;
  let totalCount = 0;
  
  for (const route of routes) {
    totalCount++;
    const success = await testRoute(
      route.path, 
      route.expectJson ? 'json' : null
    );
    if (success) successCount++;
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`📊 RÉSULTATS:`);
  console.log(`   ✅ Succès: ${successCount}/${totalCount}`);
  console.log(`   ❌ Échecs: ${totalCount - successCount}/${totalCount}`);
  
  if (successCount === totalCount) {
    console.log(`\n🎉 Tous les tests sont passés !`);
    console.log(`   Les routes NextAuth fonctionnent correctement sur ${BASE_URL}`);
  } else {
    console.log(`\n⚠️  Certains tests ont échoué.`);
    console.log(`   Vérifiez les routes qui ne fonctionnent pas.`);
  }
  
  console.log('\n📝 DIAGNOTIC:');
  if (BASE_URL.includes('localhost')) {
    console.log('   - Vous testez en local');
    console.log('   - Assurez-vous que le serveur Next.js est démarré');
  } else {
    console.log('   - Vous testez en production');
    console.log('   - Si /api/auth/session retourne du HTML au lieu de JSON,');
    console.log('     cela signifie que les routes API ne fonctionnent pas');
  }
}

// Lancer les tests
runTests().catch(console.error); 