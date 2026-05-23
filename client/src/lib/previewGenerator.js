import exifr from 'exifr';
import Psd from '@webtoon/psd';
import LibRaw from 'libraw-wasm';

const RAW_EXTENSIONS = new Set([
  'cr2', 'cr3', 'nef', 'arw', 'dng', 'raw', 'sr2', 'orf', 'rw2',
  'raf', 'pef', 'nrw', 'kdc', 'iiq', 'x3f',
]);

const PSD_EXTENSIONS = new Set(['psd', 'psb']);

/**
 * All allowed image file extensions.
 */
export const ALLOWED_EXTENSIONS = new Set([
  // Popular everyday formats
  'jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'tif', 'webp',
  'heif', 'heic', 'avif', 'svg',
  // Camera RAW formats
  'raw', 'dng', 'cr2', 'cr3', 'nef', 'nrw', 'arw', 'sr2',
  'orf', 'rw2', 'raf', 'pef', 'x3f', 'iiq', 'kdc',
  // Editing & design formats
  'psd', 'psb', 'ai', 'eps', 'indd', 'xcf', 'cpt', 'cdr',
  // Web & modern formats
  'apng', 'mng', 'ico', 'cur',
  // Animation formats
  'flif',
]);

export function isAllowedImageFile(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext);
}

export function filterAllowedFiles(files) {
  const allowed = [];
  const rejected = [];
  for (const f of files) {
    if (isAllowedImageFile(f)) {
      allowed.push(f);
    } else {
      rejected.push(f.name);
    }
  }
  return { allowed, rejected };
}

/**
 * Test if the browser can render an image URL.
 */
function tryLoadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Convert a loaded Image element to a JPEG blob URL via canvas.
 */
function imageToJpegUrl(img) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const maxDim = 800;
    let w = img.naturalWidth || img.width;
    let h = img.naturalHeight || img.height;
    if (w > maxDim || h > maxDim) {
      const scale = maxDim / Math.max(w, h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    canvas.toBlob(
      (blob) => resolve(blob ? URL.createObjectURL(blob) : null),
      'image/jpeg',
      0.85
    );
  });
}

/**
 * Decode a RAW file using libraw-wasm.
 * Tries thumbnailData() first (fast), falls back to full imageData() decode.
 */
async function decodeRawWithLibRaw(file) {
  const arrayBuffer = await file.arrayBuffer();
  const raw = new LibRaw();

  try {
    await raw.open(new Uint8Array(arrayBuffer), {});

    // Try extracting the embedded thumbnail first (fast)
    try {
      const thumb = await raw.thumbnailData();
      if (thumb && thumb.data && thumb.data.length > 0) {
        if (thumb.format === 'jpeg') {
          const blob = new Blob([thumb.data], { type: 'image/jpeg' });
          return URL.createObjectURL(blob);
        }
        if (thumb.format === 'bitmap' && thumb.width && thumb.height) {
          const canvas = document.createElement('canvas');
          canvas.width = thumb.width;
          canvas.height = thumb.height;
          const ctx = canvas.getContext('2d');
          const imgData = ctx.createImageData(thumb.width, thumb.height);
          for (let i = 0, j = 0; i < thumb.data.length; i += 3, j += 4) {
            imgData.data[j]     = thumb.data[i];
            imgData.data[j + 1] = thumb.data[i + 1];
            imgData.data[j + 2] = thumb.data[i + 2];
            imgData.data[j + 3] = 255;
          }
          ctx.putImageData(imgData, 0, 0);
          return new Promise((resolve) => {
            canvas.toBlob(
              (blob) => resolve(blob ? URL.createObjectURL(blob) : null),
              'image/jpeg', 0.85
            );
          });
        }
      }
    } catch (thumbErr) {
      console.warn(`[Preview] LibRaw thumbnail failed for ${file.name}:`, thumbErr.message);
    }

    // Fallback: full decode (slower but works when no thumbnail)
    try {
      const meta = await raw.metadata();
      const image = await raw.imageData();
      if (image && image.length > 0 && meta.width && meta.height) {
        const canvas = document.createElement('canvas');
        canvas.width = meta.width;
        canvas.height = meta.height;
        const ctx = canvas.getContext('2d');
        const imgData = ctx.createImageData(meta.width, meta.height);
        for (let i = 0, j = 0; i < image.length; i += 3, j += 4) {
          imgData.data[j]     = image[i];
          imgData.data[j + 1] = image[i + 1];
          imgData.data[j + 2] = image[i + 2];
          imgData.data[j + 3] = 255;
        }
        ctx.putImageData(imgData, 0, 0);
        return new Promise((resolve) => {
          canvas.toBlob(
            (blob) => resolve(blob ? URL.createObjectURL(blob) : null),
            'image/jpeg', 0.85
          );
        });
      }
    } catch (decodeErr) {
      console.warn(`[Preview] LibRaw full decode failed for ${file.name}:`, decodeErr.message);
    }
  } catch (openErr) {
    console.warn(`[Preview] LibRaw open failed for ${file.name}:`, openErr.message);
  }

  return null;
}

/**
 * Generate a preview URL for ANY image file.
 *
 * Strategy:
 *   1. Try browser-native rendering
 *   2. RAW files → exifr (fast) → libraw-wasm (full decode, handles CR3)
 *   3. PSD/PSB → @webtoon/psd composite render
 *   4. Convert to JPEG for guaranteed display
 */
export async function generatePreviewUrl(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();

  // ── Step 1: Try direct browser rendering ──────────────────────────────────
  const objectUrl = URL.createObjectURL(file);
  const directImg = await tryLoadImage(objectUrl);
  if (directImg) {
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      return objectUrl;
    }
    // Convert to JPEG for formats that may not work everywhere
    const jpegUrl = await imageToJpegUrl(directImg);
    URL.revokeObjectURL(objectUrl);
    return jpegUrl || objectUrl;
  }
  URL.revokeObjectURL(objectUrl);

  // ── Step 2: RAW files ─────────────────────────────────────────────────────
  if (RAW_EXTENSIONS.has(ext)) {
    // Try exifr first (lightweight, fast for TIFF-based RAW)
    try {
      const thumbUrl = await exifr.thumbnailUrl(file);
      if (thumbUrl) {
        const thumbImg = await tryLoadImage(thumbUrl);
        if (thumbImg) {
          const jpegUrl = await imageToJpegUrl(thumbImg);
          return jpegUrl || thumbUrl;
        }
      }
    } catch (e) {
      console.warn(`[Preview] exifr failed for ${file.name}:`, e.message);
    }

    // Fallback to libraw-wasm (handles CR3, all RAW formats)
    const librawUrl = await decodeRawWithLibRaw(file);
    if (librawUrl) return librawUrl;

    return null;
  }

  // ── Step 3: PSD/PSB ───────────────────────────────────────────────────────
  if (PSD_EXTENSIONS.has(ext)) {
    try {
      const buffer = await file.arrayBuffer();
      const psd = Psd.parse(buffer);
      const composite = await psd.composite();

      const canvas = document.createElement('canvas');
      canvas.width = psd.width;
      canvas.height = psd.height;
      const ctx = canvas.getContext('2d');
      const imageData = new ImageData(composite, psd.width, psd.height);
      ctx.putImageData(imageData, 0, 0);

      return new Promise((resolve) => {
        canvas.toBlob(
          (blob) => resolve(blob ? URL.createObjectURL(blob) : null),
          'image/jpeg', 0.85
        );
      });
    } catch (e) {
      console.warn(`[Preview] PSD parse failed for ${file.name}:`, e.message);
      return null;
    }
  }

  // ── Step 4: No preview possible ───────────────────────────────────────────
  return null;
}
