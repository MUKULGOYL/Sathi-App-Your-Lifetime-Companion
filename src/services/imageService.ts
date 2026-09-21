/**
 * Client-side image compression utility
 * Resizes images to max 1280px maintaining aspect ratio and outputs JPEG at 0.8 quality
 */

export interface CompressionResult {
  base64: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  originalSizeKb: number;
  compressedSizeKb: number;
  width: number;
  height: number;
}

export class ImageService {
  static readonly MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
  static readonly MAX_DIMENSION = 1280;
  static readonly JPEG_QUALITY = 0.8;

  /**
   * Reads and compresses a file to JPEG 0.8, max 1280px
   */
  static async compressImageFile(file: File): Promise<CompressionResult> {
    if (file.size > this.MAX_FILE_SIZE_BYTES) {
      throw new Error('File size exceeds 5MB limit. Please choose a smaller photo.');
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (!dataUrl) {
          reject(new Error('Failed to read file.'));
          return;
        }

        const img = new Image();
        img.onload = () => {
          let { width, height } = img;

          // Scale down if larger than max dimension
          if (width > this.MAX_DIMENSION || height > this.MAX_DIMENSION) {
            if (width > height) {
              height = Math.round((height * this.MAX_DIMENSION) / width);
              width = this.MAX_DIMENSION;
            } else {
              width = Math.round((width * this.MAX_DIMENSION) / height);
              height = this.MAX_DIMENSION;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to initialize canvas context.'));
            return;
          }

          // Draw with white background in case of transparent PNG
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          const compressedBase64 = canvas.toDataURL('image/jpeg', this.JPEG_QUALITY);
          const compressedSizeBytes = Math.round((compressedBase64.length * 3) / 4);

          resolve({
            base64: compressedBase64,
            mimeType: 'image/jpeg',
            originalSizeKb: Math.round(file.size / 1024),
            compressedSizeKb: Math.round(compressedSizeBytes / 1024),
            width,
            height,
          });
        };

        img.onerror = () => {
          reject(new Error('Failed to load image for compression.'));
        };

        img.src = dataUrl;
      };

      reader.onerror = () => {
        reject(new Error('Error reading image file.'));
      };

      reader.readAsDataURL(file);
    });
  }
}
