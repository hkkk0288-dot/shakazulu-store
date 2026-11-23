/**
 * Compresses an uploaded image file in-browser via HTML5 Canvas
 * so it fits comfortably inside Firestore's document limit (< 350 KB Data URI).
 */
export async function compressImageFile(file: File, maxDimension = 720, maxBytes = 320000): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read image file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Invalid image file'));
    image.src = dataUrl;
  });

  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;

  if (width > maxDimension || height > maxDimension) {
    const ratio = Math.min(maxDimension / width, maxDimension / height);
    width = Math.max(1, Math.round(width * ratio));
    height = Math.max(1, Math.round(height * ratio));
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return dataUrl;
  }
  ctx.drawImage(img, 0, 0, width, height);

  let quality = 0.82;
  let result = canvas.toDataURL('image/jpeg', quality);
  while (result.length > maxBytes && quality > 0.35) {
    quality -= 0.12;
    result = canvas.toDataURL('image/jpeg', quality);
  }

  // If still slightly large, scale down dimensions once more
  if (result.length > maxBytes) {
    const scaleCanvas = document.createElement('canvas');
    scaleCanvas.width = Math.max(1, Math.round(width * 0.7));
    scaleCanvas.height = Math.max(1, Math.round(height * 0.7));
    const sCtx = scaleCanvas.getContext('2d');
    if (sCtx) {
      sCtx.drawImage(canvas, 0, 0, scaleCanvas.width, scaleCanvas.height);
      result = scaleCanvas.toDataURL('image/jpeg', 0.72);
    }
  }

  return result;
}
