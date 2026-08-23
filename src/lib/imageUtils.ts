const WEBP_QUALITY = 0.85;

/**
 * Converts an image File to .webp using the canvas API.
 * Returns the original file unchanged if it is already .webp.
 * Throws if the browser cannot encode webp (e.g. older Safari).
 */
export const convertImageFileToWebp = async (file: File): Promise<File> => {
  const isAlreadyWebp = /\.webp$/i.test(file.name) || file.type === "image/webp";
  if (isAlreadyWebp) return file;

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not read image file."));
      img.src = objectUrl;
    });

    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is not supported in this browser.");
    ctx.drawImage(image, 0, 0);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), "image/webp", WEBP_QUALITY);
    });

    if (!blob || blob.type !== "image/webp") {
      throw new Error("This browser could not encode a .webp image. Try Chrome, Edge, or Firefox.");
    }

    const webpName = file.name.replace(/\.[^.]+$/, "") + ".webp";
    return new File([blob], webpName, { type: "image/webp" });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};
