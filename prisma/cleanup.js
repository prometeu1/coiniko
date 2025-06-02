const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧹 Cleaning Prisma environment...');

// Suppression des fichiers de cache Prisma
const directories = [
  path.join(__dirname, '..', 'node_modules', '.prisma'),
  path.join(__dirname, '..', 'node_modules', '@prisma'),
  path.join(__dirname, '..', '.next')
];

directories.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`Removing ${dir}...`);
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`✅ Successfully removed ${dir}`);
    } catch (err) {
      console.error(`❌ Failed to remove ${dir}: ${err.message}`);
    }
  } else {
    console.log(`Directory ${dir} does not exist, skipping.`);
  }
});

// Regénération des clients Prisma
console.log('📦 Reinstalling Prisma...');
try {
  execSync('npm install @prisma/client', { stdio: 'inherit' });
  console.log('✅ Successfully reinstalled @prisma/client');
} catch (err) {
  console.error(`❌ Failed to reinstall @prisma/client: ${err.message}`);
}

console.log('🔄 Generating Prisma Client...');
try {
  execSync('npx prisma generate', { stdio: 'inherit' });
  console.log('✅ Successfully generated Prisma Client');
} catch (err) {
  console.error(`❌ Failed to generate Prisma Client: ${err.message}`);
}

console.log('✨ Cleanup completed!'); 