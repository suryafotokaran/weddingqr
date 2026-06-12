export default function handler(req, res) {
  const { groom = 'Groom', bride = 'Bride', date = '' } = req.query;

  const g = String(groom).slice(0, 30);
  const b = String(bride).slice(0, 30);
  const d = String(date).slice(0, 40);

  // Scale font size down for long names
  const nameFontSize = Math.max(52, 80 - Math.max(g.length, b.length) * 1.2);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f0a05"/>
      <stop offset="50%" stop-color="#1e1008"/>
      <stop offset="100%" stop-color="#0f0a05"/>
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#8B6914"/>
      <stop offset="30%" stop-color="#D4AF37"/>
      <stop offset="60%" stop-color="#F5E07A"/>
      <stop offset="100%" stop-color="#D4AF37"/>
    </linearGradient>
    <linearGradient id="goldv" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#D4AF37"/>
      <stop offset="50%" stop-color="#F5E07A"/>
      <stop offset="100%" stop-color="#D4AF37"/>
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="1200" height="630" fill="url(#bg)"/>

  <!-- Outer gold border -->
  <rect x="18" y="18" width="1164" height="594" fill="none" stroke="url(#gold)" stroke-width="1.5" opacity="0.9"/>
  <!-- Inner gold border -->
  <rect x="28" y="28" width="1144" height="574" fill="none" stroke="url(#gold)" stroke-width="0.5" opacity="0.4"/>

  <!-- Corner diamonds TL -->
  <polygon points="18,18 30,30 18,42 6,30" fill="#D4AF37" opacity="0.9"/>
  <polygon points="1182,18 1194,30 1182,42 1170,30" fill="#D4AF37" opacity="0.9"/>
  <polygon points="18,588 30,600 18,612 6,600" fill="#D4AF37" opacity="0.9"/>
  <polygon points="1182,588 1194,600 1182,612 1170,600" fill="#D4AF37" opacity="0.9"/>

  <!-- Top floral ornament -->
  <g transform="translate(600,68)" opacity="0.75">
    <ellipse cx="-60" cy="0" rx="28" ry="8" fill="none" stroke="#D4AF37" stroke-width="1"/>
    <ellipse cx="60" cy="0" rx="28" ry="8" fill="none" stroke="#D4AF37" stroke-width="1"/>
    <ellipse cx="-60" cy="0" rx="8" ry="18" fill="none" stroke="#D4AF37" stroke-width="1"/>
    <ellipse cx="60" cy="0" rx="8" ry="18" fill="none" stroke="#D4AF37" stroke-width="1"/>
    <circle cx="0" cy="0" r="6" fill="#D4AF37" opacity="0.8"/>
    <circle cx="-60" cy="0" r="3" fill="#D4AF37" opacity="0.6"/>
    <circle cx="60" cy="0" r="3" fill="#D4AF37" opacity="0.6"/>
    <line x1="-30" y1="0" x2="30" y2="0" stroke="#D4AF37" stroke-width="0.5" opacity="0.5"/>
  </g>

  <!-- YOU ARE CORDIALLY INVITED -->
  <text x="600" y="130" text-anchor="middle"
    font-family="Georgia, 'Times New Roman', serif"
    font-size="15" fill="#D4AF37" letter-spacing="6" opacity="0.85">YOU ARE CORDIALLY INVITED TO THE WEDDING OF</text>

  <!-- Decorative divider -->
  <line x1="160" y1="158" x2="530" y2="158" stroke="#D4AF37" stroke-width="0.8" opacity="0.5"/>
  <polygon points="600,150 609,158 600,166 591,158" fill="#D4AF37" opacity="0.7"/>
  <line x1="670" y1="158" x2="1040" y2="158" stroke="#D4AF37" stroke-width="0.8" opacity="0.5"/>

  <!-- Groom Name -->
  <text x="600" y="${date ? 268 : 290}"
    text-anchor="middle"
    font-family="Georgia, 'Times New Roman', serif"
    font-size="${nameFontSize}" fill="white" font-style="italic"
    filter="drop-shadow(0 2px 8px rgba(212,175,55,0.3))">${g}</text>

  <!-- & -->
  <text x="600" y="${date ? 318 : 340}"
    text-anchor="middle"
    font-family="Georgia, serif"
    font-size="26" fill="#D4AF37" letter-spacing="4" opacity="0.9">&amp;</text>

  <!-- Bride Name -->
  <text x="600" y="${date ? 400 : 420}"
    text-anchor="middle"
    font-family="Georgia, 'Times New Roman', serif"
    font-size="${nameFontSize}" fill="white" font-style="italic"
    filter="drop-shadow(0 2px 8px rgba(212,175,55,0.3))">${b}</text>

  ${d ? `
  <!-- Date -->
  <text x="600" y="472" text-anchor="middle"
    font-family="Georgia, serif"
    font-size="20" fill="#D4AF37" letter-spacing="4" opacity="0.85">${d}</text>
  ` : ''}

  <!-- Bottom ornament -->
  <g transform="translate(600,${date ? 520 : 500})" opacity="0.65">
    <line x1="-180" y1="0" x2="-20" y2="0" stroke="#D4AF37" stroke-width="0.8"/>
    <ellipse cx="-100" cy="0" rx="15" ry="5" fill="none" stroke="#D4AF37" stroke-width="0.8"/>
    <polygon points="0,-6 6,0 0,6 -6,0" fill="#D4AF37"/>
    <ellipse cx="100" cy="0" rx="15" ry="5" fill="none" stroke="#D4AF37" stroke-width="0.8"/>
    <line x1="20" y1="0" x2="180" y2="0" stroke="#D4AF37" stroke-width="0.8"/>
  </g>

  <!-- Fotokaran watermark -->
  <text x="600" y="590" text-anchor="middle"
    font-family="Georgia, serif"
    font-size="13" fill="#D4AF37" letter-spacing="5" opacity="0.45">FOTOKARAN STUDIO</text>
</svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
  res.end(svg);
}
