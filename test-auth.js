// Authentication Test Script
// This script tests the authentication setup by checking environment variables and database connection

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

console.log('🔍 Testing Authentication Setup');
console.log('==============================');

// Check required environment variables
const requiredVars = [
  'NEXTAUTH_URL',
  'NEXTAUTH_SECRET',
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'DATABASE_URL'
];

let missingVars = [];
console.log('\nChecking environment variables:');

requiredVars.forEach(varName => {
  if (!process.env[varName]) {
    missingVars.push(varName);
    console.log(`❌ ${varName} is missing`);
  } else {
    const value = process.env[varName];
    const displayValue = value.length > 15 
      ? `${value.substring(0, 10)}...${value.substring(value.length - 5)}` 
      : value;
    console.log(`✅ ${varName}: ${displayValue}`);
  }
});

if (missingVars.length > 0) {
  console.log('\n⚠️ Missing environment variables. Please check your .env or .env.local file.');
  process.exit(1);
}

// Test database connection
console.log('\nTesting database connection...');

async function testDatabaseConnection() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000
  });
  
  try {
    const client = await pool.connect();
    console.log('✅ Successfully connected to the database');
    
    // Check for NextAuth tables
    console.log('\nChecking NextAuth tables:');
    const tables = ['users', 'accounts', 'sessions', 'verification_tokens'];
    
    for (const table of tables) {
      try {
        const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
        console.log(`✅ Table '${table}' exists with ${result.rows[0].count} records`);
      } catch (error) {
        console.log(`❌ Table '${table}' error: ${error.message}`);
      }
    }
    
    // Check for prepared statements
    try {
      const stmtResult = await client.query('SELECT COUNT(*) FROM pg_prepared_statements');
      const stmtCount = parseInt(stmtResult.rows[0].count);
      console.log(`\nFound ${stmtCount} prepared statements`);
      
      if (stmtCount > 0) {
        console.log('Cleaning up prepared statements...');
        await client.query('DEALLOCATE ALL');
        console.log('✅ All prepared statements deallocated');
      }
    } catch (error) {
      console.log(`❌ Error checking prepared statements: ${error.message}`);
    }
    
    client.release();
    await pool.end();
    
    console.log('\n✅ Database connection test passed');
    return true;
  } catch (error) {
    console.error(`❌ Database connection failed: ${error.message}`);
    
    if (error.message.includes('password authentication failed')) {
      console.log('\n⚠️ Authentication failed. Check your DATABASE_URL for correct credentials.');
    } else if (error.message.includes('connect ETIMEDOUT')) {
      console.log('\n⚠️ Connection timed out. Check if the database is accessible from your network.');
    } else if (error.message.includes('database') && error.message.includes('does not exist')) {
      console.log('\n⚠️ Database does not exist. Check your DATABASE_URL for the correct database name.');
    }
    
    try {
      await pool.end();
    } catch (e) {
      // Ignore cleanup errors
    }
    return false;
  }
}

// Test OAuth configuration
function testOAuthConfig() {
  console.log('\nTesting OAuth configuration:');
  
  // Check Google OAuth credentials format
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  
  if (googleClientId && googleClientId.includes('.apps.googleusercontent.com')) {
    console.log('✅ GOOGLE_CLIENT_ID format looks valid');
  } else {
    console.log('❌ GOOGLE_CLIENT_ID format looks incorrect (should end with .apps.googleusercontent.com)');
  }
  
  if (googleClientSecret && googleClientSecret.startsWith('GOCSPX-')) {
    console.log('✅ GOOGLE_CLIENT_SECRET format looks valid');
  } else {
    console.log('❌ GOOGLE_CLIENT_SECRET format looks incorrect (should start with GOCSPX-)');
  }
  
  // Check NEXTAUTH_URL format
  const nextAuthUrl = process.env.NEXTAUTH_URL;
  if (nextAuthUrl && (nextAuthUrl.startsWith('http://') || nextAuthUrl.startsWith('https://'))) {
    console.log('✅ NEXTAUTH_URL format looks valid');
  } else {
    console.log('❌ NEXTAUTH_URL format looks incorrect (should start with http:// or https://)');
  }
  
  // Check NEXTAUTH_SECRET length
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;
  if (nextAuthSecret && nextAuthSecret.length >= 32) {
    console.log('✅ NEXTAUTH_SECRET length is sufficient');
  } else {
    console.log('❌ NEXTAUTH_SECRET is too short (should be at least 32 characters)');
  }
}

// Run tests
async function runTests() {
  testOAuthConfig();
  await testDatabaseConnection();
  
  console.log('\n📝 Next steps:');
  console.log('1. If all tests passed, try running the application: npm run dev');
  console.log('2. If you encounter issues, run the diagnostic tool: npm run auth-diagnostic');
  console.log('3. For detailed troubleshooting, check AUTH-TROUBLESHOOTING.md');
}

runTests().catch(error => {
  console.error('Test failed with error:', error);
  process.exit(1);
}); 