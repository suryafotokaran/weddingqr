export default function handler(req, res) {
  const { groom = 'Groom', bride = 'Bride', date = '' } = req.query;

  const g = String(groom).slice(0, 30);
  const b = String(bride).slice(0, 30);
  const d = String(date).slice(0, 40);

  const nameFontSize = Math.max(52, 80 - Math.max(g.length, b.length) * 1.2);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f0a05"/>
      <stop offset="50%" stop-color="#1e1008"/>
      <stop offset="100%" stop-color="#0f0a05"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="18" y="18" width="1164" height="594" fill="none" stroke="#D4AF37" stroke-width="1.5" opacity="0.9"/>
  <rect x="28" y="28" width="1144" height="574" fill="none" stroke="#D4AF37" stroke-width="0.5" opacity="0.35"/>
  <text x="600" y="140" text-anchor="middle" font-family="Georgia,serif" font-size="15" fill="#D4AF37" letter-spacing="6" opacity="0.85">YOU ARE CORDIALLY INVITED TO THE WEDDING OF</text>
  <line x1="160" y1="165" x2="530" y2="165" stroke="#D4AF37" stroke-width="0.8" opacity="0.5"/>
  <polygon points="600,157 609,165 600,173 591,165" fill="#D4AF37" opacity="0.7"/>
  <line x1="670" y1="165" x2="1040" y2="165" stroke="#D4AF37" stroke-width="0.8" opacity="0.5"/>
  <text x="600" y="${d ? 268 : 285}" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-size="${nameFontSize}" fill="white" font-style="italic">${g}</text>
  <text x="600" y="${d ? 315 : 335}" text-anchor="middle" font-family="Georgia,serif" font-size="26" fill="#D4AF37" letter-spacing="4" opacity="0.9">&amp;</text>
  <text x="600" y="${d ? 400 : 415}" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-size="${nameFontSize}" fill="white" font-style="italic">${b}</text>
  ${d ? `<text x="600" y="468" text-anchor="middle" font-family="Georgia,serif" font-size="20" fill="#D4AF37" letter-spacing="4" opacity="0.85">${d}</text>` : ''}
  <line x1="400" y1="${d ? 508 : 490}" x2="800" y2="${d ? 508 : 490}" stroke="#D4AF37" stroke-width="0.5" opacity="0.4"/>
  <text x="600" y="590" text-anchor="middle" font-family="Georgia,serif" font-size="13" fill="#D4AF37" letter-spacing="5" opacity="0.45">FOTOKARAN STUDIO</text>
</svg>`;

  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
  res.end(svg);
}
