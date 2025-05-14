const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Detect if running on Vercel
const isVercel = process.env.VERCEL === '1';
const isBuildStep = process.env.VERCEL_ENV === 'production';

console.log(`Running on Vercel: ${isVercel ? 'true' : 'false'}`);
console.log(`Is build step: ${isBuildStep ? 'true' : 'false'}`);
console.log(`DATABASE_URL defined: ${!!process.env.DATABASE_URL ? 'true' : 'false'}`);

// Vérifier l'environnement de build Vercel
if (isVercel || process.env.VERCEL_BUILD === 'true') {
  console.log('Running Prisma generate for Vercel deployment...');

  try {
    // Vérifier le schéma Prisma
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
    if (fs.existsSync(schemaPath)) {
      console.log('Schema file found at:', schemaPath);
      
      // Commande de génération Prisma
      console.log('Executing prisma generate...');
      execSync('npx prisma generate', { stdio: 'inherit' });
      console.log('✅ Prisma client generated successfully!');
    } else {
      console.error('❌ Schema file not found!');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error generating Prisma client:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
} else {
  console.log('Not running on Vercel or not in build step, skipping Prisma generate.');
}

console.log('✅ Prisma setup complete.'); 