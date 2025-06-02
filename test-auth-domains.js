/**
 * Script pour tester l'authentification sur tous les domaines Vercel
 * Ce script peut être exécuté après le déploiement pour vérifier que tous les domaines fonctionnent
 */

// Importation des modules
const https = require('https');

// Liste des domaines Vercel à tester
const domains = [
  'coiniko.vercel.app',
  'coiniko-git-main-prometeu1s-projects.vercel.app',
  'coiniko-e5mtcrlqk-prometeu1s-projects.vercel.app',
  'coiniko-prometeu1s-projects.vercel.app'
];

// Points d'API à tester pour chaque domaine
const endpoints = [
  '/api/auth/session',
  '/api/auth/providers',
  '/api/auth/csrf'
];

// Log fonction avec couleurs
const log = {
  info: (msg) => console.log(`\x1b[36m${msg}\x1b[0m`),
  success: (msg) => console.log(`\x1b[32m${msg}\x1b[0m`),
  error: (msg) => console.log(`\x1b[31m${msg}\x1b[0m`),
  warn: (msg) => console.log(`\x1b[33m${msg}\x1b[0m`)
};

// Fonction pour tester un endpoint
async function testEndpoint(domain, endpoint) {
  return new Promise((resolve) => {
    const url = `https://${domain}${endpoint}`;
    log.info(`Testing: ${url}`);
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const statusCode = res.statusCode;
        if (statusCode >= 200 && statusCode < 300) {
          log.success(`✓ ${domain}${endpoint} - ${statusCode}`);
          resolve({ success: true, statusCode, data });
        } else {
          log.error(`✗ ${domain}${endpoint} - ${statusCode}`);
          resolve({ success: false, statusCode, data });
        }
      });
    }).on('error', (err) => {
      log.error(`✗ ${domain}${endpoint} - ${err.message}`);
      resolve({ success: false, error: err.message });
    });
  });
}

// Fonction principale
async function testAllDomains() {
  log.info('=== TESTING AUTH ACROSS ALL VERCEL DOMAINS ===');
  
  for (const domain of domains) {
    log.info(`\n\nTesting domain: ${domain}`);
    log.info('-------------------------------------');
    
    let allPassed = true;
    
    for (const endpoint of endpoints) {
      const result = await testEndpoint(domain, endpoint);
      if (!result.success) allPassed = false;
      
      // Petit délai pour ne pas surcharger
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (allPassed) {
      log.success(`✅ All tests passed for ${domain}`);
    } else {
      log.error(`❌ Some tests failed for ${domain}`);
    }
  }
  
  log.info('\n=== AUTH DOMAIN TESTING COMPLETE ===');
}

// Exécuter les tests
testAllDomains().catch(err => {
  log.error('Error running tests:', err);
  process.exit(1);
}); 