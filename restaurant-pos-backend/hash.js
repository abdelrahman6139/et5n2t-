import bcrypt from 'bcrypt';

const password = 'admin123';

bcrypt.hash(password, 10).then(hash => {
  console.log('\n=============================================');
  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('=============================================');
  console.log('\nCopy and run this SQL:');
  console.log(`UPDATE users SET password = '${hash}' WHERE username = 'admin';`);
  console.log('=============================================\n');
  process.exit(0);
});
