const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Detect if running on Vercel
const isVercel = process.env.VERCEL === '1';
const isBuildStep = process.env.VERCEL_ENV === 'production';

console.log(`Running on Vercel: ${isVercel}`);
console.log(`Is build step: ${isBuildStep}`);

if (isVercel && isBuildStep) {
  console.log('Running Prisma generate for Vercel deployment...');

  try {
    // Check if the schema file exists
    if (fs.existsSync(path.join(process.cwd(), 'prisma', 'schema.prisma'))) {
      console.log('Schema file found, generating Prisma client...');
      
      // Generate Prisma client
      execSync('npx prisma generate', { stdio: 'inherit' });
      console.log('Prisma client generated successfully!');
    } else {
      console.error('Schema file not found!');
      process.exit(1);
    }
  } catch (error) {
    console.error('Error generating Prisma client:', error.message);
    process.exit(1);
  }
}

console.log('Prisma generate complete.'); 