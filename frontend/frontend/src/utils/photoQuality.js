// Checks if a photo is blurry, right in the browser (nothing is uploaded).
// Method: "variance of the Laplacian" on a 400px-wide grey copy. Sharp
// photos have lots of strong edges (high score), blurry ones don't.
// Measured on real face photos: sharp ~1300, slightly blurry ~55,
// very blurry ~4. Below BLUR_THRESHOLD we show a warning (never block).
export const BLUR_THRESHOLD = 80;

// Pure maths on RGBA pixels, so it can be tested without a browser.
export function sharpnessFromPixels(data, width, height) {
  const gray = new Float64Array(width * height);
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    gray[i] = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
  }
  let sum = 0;
  let sumSq = 0;
  let n = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      const lap = gray[i - width] + gray[i + width] + gray[i - 1] + gray[i + 1] - 4 * gray[i];
      sum += lap;
      sumSq += lap * lap;
      n++;
    }
  }
  if (!n) return 0;
  const mean = sum / n;
  return sumSq / n - mean * mean;
}

// Returns { score, blurry } or null if the file can't be read as an image
export function checkPhotoSharpness(file) {
  return new Promise((resolve) => {
    if (!(file instanceof Blob) || !file.type.startsWith("image/")) {
      resolve(null);
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = img.naturalWidth > 400 ? 400 / img.naturalWidth : 1;
        const w = Math.max(3, Math.round(img.naturalWidth * scale));
        const h = Math.max(3, Math.round(img.naturalHeight * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);
        const score = sharpnessFromPixels(data, w, h);
        resolve({ score: Math.round(score), blurry: score < BLUR_THRESHOLD });
      } catch {
        resolve(null);
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}
