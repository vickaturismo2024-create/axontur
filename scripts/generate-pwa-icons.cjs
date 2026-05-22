// scripts/generate-pwa-icons.js
// Genera íconos PWA provisionales con SVG convertido a PNG via sharp
// Correr con: node scripts/generate-pwa-icons.js

const fs = require('fs');
const path = require('path');

// SVG simple con las iniciales "Ax" sobre fondo azul — igual al hero del informe
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="80" fill="#3C3489"/>
  <text x="256" y="340" font-family="Georgia, serif" font-size="240" font-weight="700" 
        text-anchor="middle" fill="white" letter-spacing="-8">Ax</text>
</svg>`;

// Guardar el SVG como fuente
fs.mkdirSync('public', { recursive: true });
fs.writeFileSync('public/pwa-icon.svg', svg);

console.log('✅ SVG guardado en public/pwa-icon.svg');
console.log('');
console.log('Ahora corré:');
console.log('  npx pwa-asset-generator public/pwa-icon.svg public/ --icon-only --type png --no-favicon');
console.log('');
console.log('Eso genera pwa-192x192.png y pwa-512x512.png automáticamente.');
