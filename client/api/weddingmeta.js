import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const BASE_URL = 'https://www.fotokaranstudio.com';

export default async function handler(req, res) {
  const { slug } = req.query;

  if (!slug) {
    res.status(400).end('Missing slug');
    return;
  }

  // Fetch wedding config
  let groom = 'Groom', bride = 'Bride', date = '', city = '';
  try {
    const { data } = await supabase
      .from('website_configs')
      .select('data')
      .eq('slug', slug)
      .single();

    if (data?.data?.hero) {
      const h = data.data.hero;
      groom = h.groomName || groom;
      bride = h.brideName || bride;
      date  = h.date  || '';
      city  = h.city  || '';
    }
  } catch (_) {}

  const pageUrl  = `${BASE_URL}/w/${slug}`;
  const title    = `${groom} & ${bride} — Wedding Invitation`;
  const desc     = `You are cordially invited to celebrate the wedding of ${groom} & ${bride}${date ? ' on ' + date : ''}${city ? ' in ' + city : ''}.`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>${title}</title>

  <!-- Open Graph -->
  <meta property="og:type"        content="website"/>
  <meta property="og:url"         content="${pageUrl}"/>
  <meta property="og:title"       content="${title}"/>
  <meta property="og:description" content="${desc}"/>
  <meta property="og:site_name"   content="Fotokaran Studio"/>

  <!-- Twitter Card -->
  <meta name="twitter:card"        content="summary"/>
  <meta name="twitter:title"       content="${title}"/>
  <meta name="twitter:description" content="${desc}"/>

  <!-- Redirect humans to the SPA -->
  <meta http-equiv="refresh" content="0;url=${pageUrl}"/>
  <script>window.location.replace('${pageUrl}');</script>
</head>
<body></body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  res.end(html);
}
