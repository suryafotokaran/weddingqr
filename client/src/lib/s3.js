/**
 * Cloudflare R2 Storage Client (S3-compatible)
 *
 * Provides three operations:
 *  - uploadToR2(file, storagePath)        → uploads via presigned PUT URL
 *  - getSignedPhotoUrls(photos)           → returns { photoId → signedUrl } map (1-hour expiry)
 *  - deleteFromR2(storagePaths[])         → deletes objects from the bucket
 */

import { S3Client, DeleteObjectsCommand, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const BUCKET   = import.meta.env.VITE_R2_BUCKET;
const ENDPOINT = import.meta.env.VITE_R2_ENDPOINT;

export const s3Client = new S3Client({
  region: 'auto', // R2 requires "auto"
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId:     import.meta.env.VITE_R2_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_R2_SECRET_ACCESS_KEY,
  },
});

/**
 * Upload a File object to R2 using a presigned PUT URL.
 * Returns the storage path (S3 key) on success.
 */
export async function uploadToR2(file, storagePath) {
  const command = new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         storagePath,
    ContentType: file.type,
  });

  // Generate a presigned PUT URL (valid 1 hour)
  const signedPutUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

  const response = await fetch(signedPutUrl, {
    method:  'PUT',
    body:    file,
    headers: { 'Content-Type': file.type },
  });

  if (!response.ok) {
    throw new Error(`R2 upload failed: ${response.status} ${response.statusText}`);
  }

  return storagePath;
}

/**
 * Generate presigned GET URLs for an array of photo objects.
 * Only generates for photos that have a non-Supabase storage_path.
 * Returns a map: { photo.id → signedUrl }
 */
export async function getSignedPhotoUrls(photos) {
  const r2Photos = photos.filter(
    (p) => p.storage_path && !p.supabase_url?.includes('supabase.co')
  );

  if (!r2Photos.length) return {};

  const entries = await Promise.all(
    r2Photos.map(async (photo) => {
      const command = new GetObjectCommand({
        Bucket: BUCKET,
        Key:    photo.storage_path,
      });
      const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
      return [photo.id, url];
    })
  );

  return Object.fromEntries(entries);
}

/**
 * Delete one or more objects from R2.
 * storagePaths = array of S3 keys (storage_path values from DB)
 * Batches into chunks of 1000 (S3 DeleteObjects hard limit).
 */
export async function deleteFromR2(storagePaths) {
  if (!storagePaths.length) return;

  const CHUNK = 1000;
  for (let i = 0; i < storagePaths.length; i += CHUNK) {
    const batch = storagePaths.slice(i, i + CHUNK);
    const command = new DeleteObjectsCommand({
      Bucket: BUCKET,
      Delete: {
        Objects: batch.map((Key) => ({ Key })),
        Quiet:   true,
      },
    });
    await s3Client.send(command);
  }
}

/**
 * Build a non-signed reference URL for a storage path (stored in DB).
 * Not used for serving — signed URLs are used for display.
 */
export function buildR2RefUrl(storagePath) {
  return `${ENDPOINT}/${BUCKET}/${storagePath}`;
}

/**
 * Generate a single presigned GET URL for a storage path (1-hour expiry).
 */
export async function getSignedUrlForPath(storagePath) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: storagePath });
  return getSignedUrl(s3Client, command, { expiresIn: 3600 });
}

// ── Backward-compatible aliases (used in EventDetail / GuestEventView) ────────
export const uploadToIDrive   = uploadToR2;
export const deleteFromIDrive = deleteFromR2;
export const buildIDriveRefUrl = buildR2RefUrl;
