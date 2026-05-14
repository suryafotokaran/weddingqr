import * as faceapi from '@vladmandic/face-api';

let modelsLoaded = false;
let loadingPromise = null; // Singleton — prevents concurrent loads

export async function loadModels() {
  if (modelsLoaded) return;
  if (loadingPromise) return loadingPromise;

  const MODEL_URL = '/models';

  loadingPromise = (async () => {
    if (faceapi.tf) await faceapi.tf.ready();
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);
    modelsLoaded = true;
    loadingPromise = null;
  })();

  return loadingPromise;
}

/**
 * Detect a single face and return its 128D descriptor.
 * Tries progressively lower confidence thresholds to handle
 * dim lighting and partial visibility.
 * Returns Float32Array(128) or null if no face found.
 */
export async function extractSingleEmbedding(input) {
  if (!modelsLoaded) await loadModels();

  // Try with decreasing confidence — stops as soon as a face is found
  const thresholds = [0.3, 0.2, 0.1];

  for (const minConfidence of thresholds) {
    const options = new faceapi.SsdMobilenetv1Options({ minConfidence });
    const detection = await faceapi
      .detectSingleFace(input, options)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (detection) {
      console.log(`[FaceAPI] ✅ Face detected at confidence threshold ${minConfidence}`);
      return detection.descriptor;
    }

    console.log(`[FaceAPI] No face at threshold ${minConfidence}, retrying lower…`);
  }

  console.warn('[FaceAPI] ❌ No face detected at any confidence level');
  return null;
}

/**
 * Detect ALL faces in an image and return their descriptors.
 * Used during photo upload to index every person in each photo.
 */
export async function extractMultipleEmbeddings(input) {
  if (!modelsLoaded) await loadModels();

  const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.3 });
  const detections = await faceapi
    .detectAllFaces(input, options)
    .withFaceLandmarks()
    .withFaceDescriptors();

  return detections;
}
