const fs = require('fs');
const path = require('path');

console.log('🔍 Checking DumpsterTracker setup...\n');

// Check required files
const requiredFiles = [
  'package.json',
  'src/index.ts',
  'src/App.tsx',
  'index.html',
  '.env'
];

requiredFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`${exists ? '✓' : '✗'} ${file} ${exists ? 'exists' : 'MISSING'}`);
});

console.log('\n📦 Checking node_modules...');
const hasNodeModules = fs.existsSync('node_modules');
console.log(`${hasNodeModules ? '✓' : '✗'} node_modules ${hasNodeModules ? 'exists' : 'MISSING - Run npm install'}`);

console.log('\n🔧 Environment:');
console.log(`Node version: ${process.version}`);
console.log(`NPM version: ${require('child_process').execSync('npm -v').toString().trim()}`);
