export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
export const MAX_ORIGINAL_SIZE_BYTES = 15 * 1024 * 1024;
export const MAX_PHOTO_DIMENSION = 1920;
export const MAX_COMPRESSED_SIZE_BYTES = 1_500_000;
export const MIN_WEBP_QUALITY = 0.58;

export function validatePhoto(file: Pick<File, "type" | "size">) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type))
    throw new Error("Only JPEG, PNG, or WebP pictures are allowed.");
  if (file.size > MAX_ORIGINAL_SIZE_BYTES)
    throw new Error("Picture is too large. Maximum original size is 15 MB.");
}
export function scaledDimensions(width: number, height: number) {
  const scale = Math.min(1, MAX_PHOTO_DIMENSION / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
export function nextQuality(quality: number, size: number) {
  return size > MAX_COMPRESSED_SIZE_BYTES && quality > MIN_WEBP_QUALITY
    ? Math.max(MIN_WEBP_QUALITY, quality - 0.08)
    : null;
}
function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Unable to compress image.")),
      "image/webp",
      quality,
    ),
  );
}
export async function compressPhoto(file: File): Promise<File> {
  validatePhoto(file);
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("The selected file is not a valid picture.");
  }
  const dimensions = scaledDimensions(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  try {
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error("Picture processing is not supported on this device.");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  } finally {
    bitmap.close();
  }
  let quality = 0.82,
    blob = await canvasToBlob(canvas, quality),
    next: number | null;
  while ((next = nextQuality(quality, blob.size)) !== null) {
    quality = next;
    blob = await canvasToBlob(canvas, quality);
  }
  // Never replace an already-small WebP with a larger encoding.
  if (file.type === "image/webp" && file.size <= blob.size) return file;
  const base =
    file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "-") ||
    "job-photo";
  return new File([blob], `${base}.webp`, {
    type: "image/webp",
    lastModified: Date.now(),
  });
}
