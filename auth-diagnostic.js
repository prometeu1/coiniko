// Auth Diagnostic Script
// This script helps diagnose and fix common authentication issues
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
try {
  // Try to load from .env.local first
  if (fs.existsSync(path.join(process.cwd(), '.env.local'))) {
    console.log('Loading environment from .env.local');
    dotenv.config({ path: '.env.local' });
  } else if (fs.existsSync(path.join(process.cwd(), '.env'))) {
    console.log('Loading environment from .env');
    dotenv.config({ path: '.env' });
  } else {
    console.log('No .env or .env.local file found');
  }
} catch (error) {
  console.error('Error loading environment variables:', error);
}

console.log('🔍 Starting Authentication Diagnostic Tool');
console.log('========================================');

// Check environment variables
function checkEnvironmentVariables() {
  console.log('\n📋 Checking environment variables...');
  
  const requiredVars = [
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'DATABASE_URL'
  ];
  
  let missingVars = [];
  
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
      console.log(`❌ Missing: ${varName}`);
    } else {
      const value = process.env[varName];
      const displayValue = value.length > 15 
        ? `${value.substring(0, 10)}...${value.substring(value.length - 5)}` 
        : value;
      console.log(`✅ ${varName}: ${displayValue}`);
    }
  });
  
  if (missingVars.length > 0) {
    console.log('\n⚠️ Some environment variables are missing. Check your .env file.');
  } else {
    console.log('\n✅ All required environment variables are present.');
  }
  
  return missingVars.length === 0;
}

// Test database connection
async function testDatabaseConnection() {
  console.log('\n📊 Testing database connection...');
  
  if (!process.env.DATABASE_URL) {
    console.log('❌ DATABASE_URL is not defined. Cannot test connection.');
    return false;
  }
  
  let pool;
  try {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 10000
    });
    
    console.log('Connecting to database...');
    const client = await pool.connect();
    console.log('✅ Successfully connected to the database.');
    
    // Check for prepared statements
    console.log('Checking for existing prepared statements...');
    const result = await client.query('SELECT count(*) FROM pg_prepared_statements');
    const count = parseInt(result.rows[0].count);
    
    if (count > 0) {
      console.log(`⚠️ Found ${count} prepared statements. Cleaning up...`);
      await client.query('DEALLOCATE ALL');
      console.log('✅ All prepared statements deallocated.');
    } else {
      console.log('✅ No prepared statements found.');
    }
    
    // Check NextAuth tables
    console.log('Checking NextAuth tables...');
    const tables = ['users', 'accounts', 'sessions', 'verification_tokens'];
    
    for (const table of tables) {
      try {
        const tableResult = await client.query(`SELECT count(*) FROM ${table}`);
        console.log(`✅ Table '${table}' exists with ${tableResult.rows[0].count} records.`);
      } catch (error) {
        console.log(`❌ Table '${table}' may not exist or is inaccessible: ${error.message}`);
      }
    }
    
    client.release();
    await pool.end();
    return true;
  } catch (error) {
    console.log(`❌ Database connection failed: ${error.message}`);
    if (pool) {
      try {
        await pool.end();
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    return false;
  }
}

// Check project files
function checkProjectFiles() {
  console.log('\n📁 Checking project files...');
  
  const filesToCheck = [
    'app/api/auth/[...nextauth]/route.ts',
    'lib/db.ts',
    'prisma/schema.prisma',
    '.env.local',
    '.env'
  ];
  
  let allFilesExist = true;
  
  filesToCheck.forEach(file => {
    if (fs.existsSync(path.join(process.cwd(), file))) {
      console.log(`✅ ${file} exists.`);
    } else {
      console.log(`❌ ${file} does not exist.`);
      allFilesExist = false;
    }
  });
  
  return allFilesExist;
}

// Check for port conflicts
function checkPortConflicts() {
  console.log('\n🔌 Checking for port conflicts...');
  
  try {
    let command;
    let output;
    
    if (process.platform === 'win32') {
      command = 'netstat -ano | findstr :3000';
      try {
        output = execSync(command, { encoding: 'utf8' });
      } catch (e) {
        // No output means no conflict
        console.log('✅ Port 3000 is available.');
        return true;
      }
    } else {
      command = 'lsof -i :3000 || echo "No conflict"';
      output = execSync(command, { encoding: 'utf8' });
      
      if (output.includes('No conflict')) {
        console.log('✅ Port 3000 is available.');
        return true;
      }
    }
    
    if (output && output.includes('3000')) {
      console.log('⚠️ Port 3000 may be in use:');
      console.log(output);
      return false;
    } else {
      console.log('✅ Port 3000 is available.');
      return true;
    }
  } catch (error) {
    console.log(`❓ Could not check port conflicts: ${error.message}`);
    return true; // Assume no conflict if we can't check
  }
}

// Clean up and fix common issues
async function fixCommonIssues() {
  console.log('\n🔧 Attempting to fix common issues...');
  
  // Clean Next.js cache
  console.log('Cleaning Next.js cache...');
  try {
    if (fs.existsSync(path.join(process.cwd(), '.next'))) {
      fs.rmSync(path.join(process.cwd(), '.next'), { recursive: true, force: true });
      console.log('✅ Next.js cache cleaned.');
    } else {
      console.log('ℹ️ No Next.js cache to clean.');
    }
  } catch (error) {
    console.log(`❌ Failed to clean Next.js cache: ${error.message}`);
  }
  
  // Regenerate Prisma client
  console.log('Regenerating Prisma client...');
  try {
    execSync('npx prisma generate', { stdio: 'inherit' });
    console.log('✅ Prisma client regenerated.');
  } catch (error) {
    console.log(`❌ Failed to regenerate Prisma client: ${error.message}`);
  }
  
  // Create env file if missing
  if (!fs.existsSync(path.join(process.cwd(), '.env.local'))) {
    console.log('Creating .env.local file...');
    try {
      const envContent = `NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-at-least-32-chars-long

DATABASE_URL="postgres://postgres.sxdclilkgmrkktaqazkn:coiniko-database@aws-0-eu-west-3.pooler.supabase.com:5432/postgres"
DIRECT_URL="postgres://postgres.sxdclilkgmrkktaqazkn:coiniko-database@aws-0-eu-west-3.pooler.supabase.com:5432/postgres"

GOOGLE_CLIENT_ID=747561554538-hla86ioipagc6naa7nk1msd0lbqdt04s.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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`;

      fs.writeFileSync(path.join(process.cwd(), '.env.local'), envContent);
      console.log('✅ Created .env.local file.');
    } catch (error) {
      console.log(`❌ Failed to create .env.local file: ${error.message}`);
    }
  }
}

// Run all checks
async function runDiagnostics() {
  const envOk = checkEnvironmentVariables();
  const filesOk = checkProjectFiles();
  const portOk = checkPortConflicts();
  const dbOk = await testDatabaseConnection();
  
  console.log('\n📊 Diagnostic Summary:');
  console.log(`Environment Variables: ${envOk ? '✅' : '❌'}`);
  console.log(`Project Files: ${filesOk ? '✅' : '❌'}`);
  console.log(`Port Availability: ${portOk ? '✅' : '❌'}`);
  console.log(`Database Connection: ${dbOk ? '✅' : '❌'}`);
  
  if (!envOk || !filesOk || !portOk || !dbOk) {
    console.log('\n🔧 Attempting to fix issues...');
    await fixCommonIssues();
    
    console.log('\n📝 Next steps:');
    console.log('1. Restart your development server: npm run dev');
    console.log('2. Clear your browser cookies for this site');
    console.log('3. Try signing in again');
    
    if (!dbOk) {
      console.log('\n⚠️ Database connection issues detected:');
      console.log('- Verify your DATABASE_URL is correct');
      console.log('- Check if your database is online and accessible');
      console.log('- Ensure your firewall allows connections to the database');
    }
  } else {
    console.log('\n✅ All checks passed! Your authentication setup looks good.');
    console.log('If you are still experiencing issues, try:');
    console.log('1. Clearing browser cookies');
    console.log('2. Using incognito/private browsing mode');
    console.log('3. Checking browser console for client-side errors');
  }
}

// Run the diagnostics
runDiagnostics().catch(error => {
  console.error('Diagnostic failed with error:', error);
}); 