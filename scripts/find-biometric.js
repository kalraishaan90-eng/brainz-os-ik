const fs = require('fs');
const lines = fs.readFileSync('Eduvia.html', 'utf8').split('\n');

lines.forEach((line, i) => {
  if (line.includes('biometric-overlay') || line.includes('openBiometricModal') || line.includes('Biometric')) {
    console.log(`Line ${i + 1}: ${line.trim()}`);
  }
});
