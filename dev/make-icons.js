// Draws the app icon once as SVG and saves it at the sizes phones ask for.  node dev/make-icons.js
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const out = path.join(__dirname, '..', 'icons');
fs.mkdirSync(out, { recursive: true });

// Everything that matters sits in the middle 70%, so round and squircle masks never cut it.
const puffs = '<circle cx="204" cy="262" r="62"/><circle cx="268" cy="226" r="80"/><circle cx="330" cy="268" r="54"/><rect x="166" y="258" width="196" height="72" rx="36"/>';
const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#BEE6FA"/>
  <ellipse cx="256" cy="560" rx="420" ry="230" fill="#BFE6B5"/>
  <g transform="translate(256 388) rotate(-6)"><rect x="-96" y="-28" width="192" height="64" rx="14" fill="#FF7A8A"/><path d="M-32 -28V36M32 -28V36M-96 -6H96M-96 16H96" stroke="#FFFFFF" stroke-width="12" opacity=".7"/></g>
  <path d="M228 152L240 114L262 142L284 108L296 152Z" fill="#FFD34D" stroke="#5B6785" stroke-width="6" stroke-linejoin="round"/>
  <g fill="#5B6785" stroke="#5B6785" stroke-width="14" stroke-linejoin="round">${puffs}</g>
  <g fill="#FFFFFF">${puffs}</g>
  <circle cx="236" cy="256" r="11" fill="#24324A"/><circle cx="298" cy="256" r="11" fill="#24324A"/>
  <path d="M248 284Q267 303 286 284" fill="none" stroke="#24324A" stroke-width="9" stroke-linecap="round"/>
  <circle cx="214" cy="282" r="13" fill="#FF9DB0" opacity=".85"/><circle cx="320" cy="282" r="13" fill="#FF9DB0" opacity=".85"/>
</svg>`;

(async () => {
  const browser = await chromium.launch();
  for (const [name, size] of [['icon-512.png', 512], ['icon-192.png', 192], ['apple-touch-icon.png', 180]]) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent(`<style>html,body{margin:0}svg{display:block;width:${size}px;height:${size}px}</style>${icon}`);
    await page.screenshot({ path: path.join(out, name) });
    await page.close();
  }
  await browser.close();
  console.log('icons written to', out);
})();
