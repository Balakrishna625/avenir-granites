const fs = require('fs');
const path = require('path');

// Simple SVG to create placeholder icons with "AG" (Avenir Granites)
function createIconSVG(size) {
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#1e40af;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" fill="url(#grad)" rx="${size * 0.15}"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.4}" font-weight="bold" fill="white" text-anchor="middle" dominant-baseline="central">AG</text>
</svg>`;
}

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate icons
const sizes = [
  { name: 'icon-192x192.png', size: 192 },
  { name: 'icon-512x512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 }
];

console.log('📱 Generating PWA icons for Avenir Granites...\n');

sizes.forEach(({ name, size }) => {
  const svg = createIconSVG(size);
  const svgPath = path.join(publicDir, name.replace('.png', '.svg'));
  fs.writeFileSync(svgPath, svg);
  console.log(`✅ Created ${name.replace('.png', '.svg')} (${size}x${size})`);
});

console.log('\n🎨 Icon generation complete!');
console.log('💡 Replace these SVG files with your actual logo PNG files later.');
console.log('   Keep the same filenames: icon-192x192.png, icon-512x512.png, apple-touch-icon.png\n');
