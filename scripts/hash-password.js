// Uso: node scripts/hash-password.js "tuClaveSuperSegura"
// Copia el resultado en la variable de entorno ADMIN_PASSWORD_HASH.
// Así la contraseña real nunca queda guardada en texto plano en ningún lado.

const bcrypt = require('bcryptjs');

const plain = process.argv[2];

if (!plain) {
  console.error('Uso: node scripts/hash-password.js "tuClaveSuperSegura"');
  process.exit(1);
}

if (plain.length < 8) {
  console.error('Usa una clave de al menos 8 caracteres.');
  process.exit(1);
}

const hash = bcrypt.hashSync(plain, 12);
console.log('\nCopia esta línea completa en tu variable de entorno ADMIN_PASSWORD_HASH:\n');
console.log(hash);
console.log('');
