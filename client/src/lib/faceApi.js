import * as faceapi from '@vladmandic/face-api';

let modelsLoaded = false;

export async function loadModels() {
  if (modelsLoaded) return;
  const MODEL_URL = '/models';
  
  // Wait for tf backend initialization
  if (faceapi.tf) await faceapi.tf.ready();

  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);
  
  modelsLoaded = true;
}

export async function extractSingleEmbedding(input) {
  if (!modelsLoaded) await loadModels();
  
  const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 });
  const detection = await faceapi.detectSingleFace(input, options)
    .withFaceLandmarks()
    .withFaceDescriptor();
    
  return detection ? detection.descriptor : null;
}

export async function extractMultipleEmbeddings(input) {
  if (!modelsLoaded) await loadModels();
  
  const options = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 });
  const detections = await faceapi.detectAllFaces(input, options)
    .withFaceLandmarks()
    .withFaceDescriptors();
    
  return detections;
}
