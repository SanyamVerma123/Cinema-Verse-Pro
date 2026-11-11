/**
 * CLI Utility to set and hash passwords securely.
 * 
 * Usage:
 *   node scripts/set-passwords.js --private "MySecretPassword123"
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const args = process.argv.slice(2);
let newPrivatePass = null;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--private' && args[i + 1]) {
    newPrivatePass = args[i + 1];
    i++;
  }
}

if (!newPrivatePass) {
  console.log('Usage: node scripts/set-passwords.js --private "yourPassword"');
  process.exit(1);
}

const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.pbkdf2Sync(newPrivatePass, salt, 100000, 64, 'sha512').toString('hex');

const envPath = path.join(__dirname, '..', '.env');
let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

function updateOrAppendEnv(content, key, value) {
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(content)) {
    return content.replace(regex, `${key}=${value}`);
  } else {
    return content.trim() + `\n${key}=${value}\n`;
  }
}

envContent = updateOrAppendEnv(envContent, 'PRIVATE_APP_PASSWORD_HASH', hash);
envContent = updateOrAppendEnv(envContent, 'PRIVATE_APP_SALT', salt);
// Remove any plaintext password variable if present
envContent = envContent.replace(/^PRIVATE_APP_PASSWORD=.*$/m, '');

fs.writeFileSync(envPath, envContent, 'utf8');

console.log('----------------------------------------------------');
console.log('✅ Private Application Password Updated Successfully!');
console.log('   Hash: ' + hash.slice(0, 16) + '...');
console.log('   Salt: ' + salt);
console.log('   Stored safely in .env (salted PBKDF2 with 100k iterations)');
console.log('----------------------------------------------------');
