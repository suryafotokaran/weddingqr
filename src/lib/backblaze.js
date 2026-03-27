/**
 * BackBlaze B2 — fully client-side upload helper.
 * Credentials live in VITE_ env vars (create a restricted B2 App Key
 * scoped to only this bucket with writeFiles permission to limit exposure).
 *
 * Upload flow (no edge functions):
 *   1. b2_authorize_account  → get apiUrl + authToken + downloadUrl
 *   2. b2_get_upload_url     → get one-time uploadUrl + uploadAuthToken
 *   3. POST file bytes       → directly to B2
 *
 * Photo display:
 *   - Public bucket  → direct URL works fine (recommended)
 *   - Private bucket → change bucket to allPublic in B2 console so <img> tags work
 */

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB hard limit
const B2_KEY_ID = import.meta.env.VITE_B2_KEY_ID;
const B2_APP_KEY = import.meta.env.VITE_B2_APP_KEY;
const B2_BUCKET_ID = import.meta.env.VITE_B2_BUCKET_ID;
const B2_BUCKET_NAME = import.meta.env.VITE_B2_BUCKET_NAME;

/** Cache the auth token for the session (valid for 24 h, reused across uploads) */
let _authCache = null;

async function authorizeB2() {
  if (_authCache) return _authCache;

  if (!B2_KEY_ID || !B2_APP_KEY) {
    throw new Error('BackBlaze credentials missing. Add VITE_B2_KEY_ID and VITE_B2_APP_KEY to .env.local');
  }

  const res = await fetch('https://api.backblazeb2.com/b2api/v3/b2_authorize_account', {
    method: 'GET',
    headers: { 'Authorization': 'Basic ' + btoa(`${B2_KEY_ID}:${B2_APP_KEY}`) },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`B2 authorization failed: ${err}`);
  }

  const data = await res.json();
  _authCache = {
    apiUrl: data.apiInfo?.storageApi?.apiUrl ?? data.apiUrl,
    authToken: data.authorizationToken,
    downloadUrl: data.apiInfo?.storageApi?.downloadUrl ?? data.downloadUrl,
  };
  return _authCache;
}

/**
 * Upload a File to BackBlaze B2 directly from the browser.
 * Bucket must have CORS rules allowing uploads from your origin.
 *
 * @param {File}   file         Image file (max 50 MB)
 * @param {string} storagePath  e.g. `userId/eventId/filename.jpg`
 * @returns {{ fileId: string, downloadUrl: string }}
 */
export async function uploadToB2(file, storagePath) {
  // ── 1. Size guard ────────────────────────────────────────────────────────
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `"${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)} MB — exceeds the 50 MB limit.`
    );
  }

  // ── 2. Authorize ─────────────────────────────────────────────────────────
  const { apiUrl, authToken, downloadUrl } = await authorizeB2();

  // ── 3. Get one-time upload URL ────────────────────────────────────────────
  const urlRes = await fetch(`${apiUrl}/b2api/v3/b2_get_upload_url`, {
    method: 'POST',
    headers: { 'Authorization': authToken, 'Content-Type': 'application/json' },
    body: JSON.stringify({ bucketId: B2_BUCKET_ID }),
  });

  if (!urlRes.ok) {
    const err = await urlRes.text();
    throw new Error(`Failed to get B2 upload URL: ${err}`);
  }

  const { uploadUrl, authorizationToken: uploadAuthToken } = await urlRes.json();

  // ── 4. Upload file directly ───────────────────────────────────────────────
  const uploadRes = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': uploadAuthToken,
      'X-Bz-File-Name': encodeURIComponent(storagePath),
      'Content-Type': file.type || 'b2/x-auto',
      'Content-Length': String(file.size),
      'X-Bz-Content-Sha1': 'do_not_verify',
    },
    body: file,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    // Invalidate cache on auth errors so next attempt re-authorizes
    if (uploadRes.status === 401) _authCache = null;
    throw new Error(`B2 upload failed: ${err}`);
  }

  const data = await uploadRes.json();

  // Public download URL — works when bucket is allPublic
  const fileDownloadUrl = `${downloadUrl}/file/${B2_BUCKET_NAME}/${storagePath}`;

  return {
    fileId: data.fileId,
    downloadUrl: fileDownloadUrl,
  };
}
