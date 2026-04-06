/**
 * Cloudflare R2 — CORS Setup Instructions
 *
 * R2 does NOT support setting CORS via the S3 API (PutBucketCors).
 * CORS must be configured through the Cloudflare Dashboard.
 *
 * Steps:
 * 1. Go to https://dash.cloudflare.com
 * 2. Navigate to R2 Object Storage → foto-select bucket
 * 3. Click "Settings" tab
 * 4. Scroll to "CORS Policy" → click "Add CORS policy"
 * 5. Paste the JSON below and save
 */

console.log(`
╔══════════════════════════════════════════════════════════╗
║          Cloudflare R2 — CORS Configuration             ║
╠══════════════════════════════════════════════════════════╣
║                                                          ║
║  R2 CORS must be set via the Cloudflare Dashboard.       ║
║                                                          ║
║  Steps:                                                  ║
║  1. dash.cloudflare.com → R2 → foto-select               ║
║  2. Settings tab → CORS Policy → Add CORS policy         ║
║  3. Paste the JSON printed below                         ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
`);

const corsPolicy = [
  {
    AllowedOrigins: [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:4173',
      '*', // Tighten to your Netlify domain before going live
    ],
    AllowedMethods: ['GET', 'PUT', 'DELETE', 'HEAD'],
    AllowedHeaders: ['*'],
    ExposeHeaders:  ['ETag', 'Content-Length'],
    MaxAgeSeconds:  3000,
  },
];

console.log('📋 Paste this JSON in the R2 CORS Policy field:\n');
console.log(JSON.stringify(corsPolicy, null, 2));
