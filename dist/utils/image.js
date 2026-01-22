/**
 * Image processing utilities for Bluesky
 *
 * Features:
 * - HEIC to JPEG conversion
 * - Image resizing with quality control
 * - Size optimization for Bluesky's 976KB limit
 * - Placeholder generation
 *
 * Note: These utilities require browser APIs (Canvas, Image, etc.)
 * and will not work in Node.js environments.
 *
 * @module utils/image
 */
/**
 * Maximum file size for Bluesky uploads (976KB)
 */
export const BLUESKY_MAX_SIZE = 976 * 1024;
/**
 * Accepted image MIME types
 */
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
/**
 * Check if running in browser with required APIs
 */
function isBrowserWithCanvas() {
    return typeof window !== 'undefined' &&
        typeof document !== 'undefined' &&
        typeof HTMLCanvasElement !== 'undefined';
}
/**
 * Get image dimensions from a file or blob
 *
 * @param file - Image file or blob
 * @returns Promise resolving to dimensions
 *
 * @example
 * ```ts
 * const { width, height } = await getImageDimensions(imageFile);
 * console.log(`Image is ${width}x${height}`);
 * ```
 */
export async function getImageDimensions(file) {
    if (!isBrowserWithCanvas()) {
        throw new Error('Image processing requires a browser environment');
    }
    return new Promise((resolve) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            resolve({
                width: img.width,
                height: img.height,
            });
        };
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            // Default dimensions if we can't determine the actual size
            resolve({
                width: 800,
                height: 600,
            });
        };
        img.src = objectUrl;
    });
}
/**
 * Create a placeholder preview image (300px width)
 *
 * @param file - Image file or blob
 * @returns Base64 data URL of placeholder
 *
 * @example
 * ```ts
 * const placeholder = await createPlaceholder(imageFile);
 * // Use as img.src for preview
 * ```
 */
export async function createPlaceholder(file) {
    if (!isBrowserWithCanvas()) {
        return '';
    }
    try {
        const bitmap = await createImageBitmap(file);
        const canvas = document.createElement('canvas');
        const previewWidth = 300;
        const aspectRatio = bitmap.height / bitmap.width;
        canvas.width = previewWidth;
        canvas.height = Math.round(previewWidth * aspectRatio);
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx)
            throw new Error('Failed to get canvas context');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        bitmap.close();
        return canvas.toDataURL('image/jpeg', 0.7);
    }
    catch (error) {
        console.error('Error creating placeholder:', error);
        return '';
    }
}
/**
 * Convert HEIC file to JPEG
 *
 * NOTE: Requires heic2any library to be loaded globally (window.heic2any)
 * Install: npm install heic2any
 * Then load: import heic2any from 'heic2any'; window.heic2any = heic2any;
 *
 * @param file - HEIC image file
 * @returns Converted JPEG file
 * @throws Error if heic2any is not available
 *
 * @example
 * ```ts
 * // First, ensure heic2any is available
 * import heic2any from 'heic2any';
 * window.heic2any = heic2any;
 *
 * // Then convert
 * const jpegFile = await convertHEIC(heicFile);
 * ```
 */
export async function convertHEIC(file) {
    if (typeof window === 'undefined' || typeof window.heic2any !== 'function') {
        throw new Error('heic2any library not loaded. Install and import heic2any, then assign to window.heic2any');
    }
    const heic2any = window.heic2any;
    const jpegBlob = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.85,
    });
    // Convert blob to File
    const jpegFile = new File([jpegBlob], file.name.replace(/\.heic$/i, '.jpg'), { type: 'image/jpeg' });
    return jpegFile;
}
/**
 * Create an optimized image with specific dimensions and quality
 */
async function createOptimizedImage(file, width, height, quality) {
    if (!isBrowserWithCanvas()) {
        throw new Error('Image processing requires a browser environment');
    }
    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            URL.revokeObjectURL(objectUrl);
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d', { alpha: false });
            if (!ctx) {
                reject(new Error('Failed to get canvas context'));
                return;
            }
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                }
                else {
                    reject(new Error('Failed to create blob'));
                }
            }, 'image/jpeg', quality);
        };
        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('Failed to load image'));
        };
        img.src = objectUrl;
    });
}
/**
 * Optimize an image for Bluesky with progressive quality reduction
 * Ensures output is under 976KB
 *
 * @param file - Image file or blob
 * @param width - Target width
 * @param height - Target height
 * @param maxAttempts - Maximum optimization attempts (default: 5)
 * @returns Optimized blob under 976KB
 *
 * @example
 * ```ts
 * const optimized = await optimizeForBluesky(largeImage, 1920, 1080);
 * console.log(`Optimized to ${optimized.size} bytes`);
 * ```
 */
export async function optimizeForBluesky(file, width, height, maxAttempts = 5) {
    // If already under limit, return as-is
    if (file.size <= BLUESKY_MAX_SIZE) {
        return file instanceof Blob ? file : file;
    }
    const qualityLevels = [0.92, 0.85, 0.78, 0.7, 0.6, 0.5];
    // Try with progressively lower quality
    for (let i = 0; i < Math.min(qualityLevels.length, maxAttempts); i++) {
        const optimized = await createOptimizedImage(file, width, height, qualityLevels[i]);
        if (optimized.size <= BLUESKY_MAX_SIZE) {
            console.log(`Optimized to ${Math.round(optimized.size / 1024)}KB with quality ${qualityLevels[i]}`);
            return optimized;
        }
    }
    // If still too large, resize dimensions
    const scaleFactor = 0.8;
    const scaledWidth = Math.round(width * scaleFactor);
    const scaledHeight = Math.round(height * scaleFactor);
    return optimizeForBluesky(file, scaledWidth, scaledHeight, maxAttempts);
}
/**
 * Resize image to fit within max dimensions while maintaining aspect ratio
 *
 * @param input - Image file, blob, or URL
 * @param options - Resize options
 * @returns Resized image with metadata
 *
 * @example
 * ```ts
 * const resized = await resizeImage(imageFile, {
 *   maxWidth: 1200,
 *   maxHeight: 1200,
 *   quality: 0.9,
 *   maxSizeKB: 500
 * });
 *
 * // Use resized.blob for upload
 * // Use resized.base64 for preview
 * ```
 */
export async function resizeImage(input, options = {}) {
    if (!isBrowserWithCanvas()) {
        throw new Error('Image processing requires a browser environment');
    }
    const opts = {
        maxWidth: options.maxWidth || 800,
        maxHeight: options.maxHeight || 800,
        quality: options.quality || 0.85,
        maxSizeKB: options.maxSizeKB || 976,
    };
    // Handle input type
    let blob;
    if (input instanceof Blob) {
        blob = input;
    }
    else if (typeof input === 'string') {
        const res = await fetch(input);
        blob = await res.blob();
    }
    else {
        throw new Error('Input must be a Blob, File, or URL string');
    }
    try {
        const bitmap = await createImageBitmap(blob);
        // Calculate dimensions
        let width = bitmap.width;
        let height = bitmap.height;
        if (width > opts.maxWidth) {
            height = Math.round((opts.maxWidth / width) * height);
            width = opts.maxWidth;
        }
        if (height > opts.maxHeight) {
            width = Math.round((opts.maxHeight / height) * width);
            height = opts.maxHeight;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx)
            throw new Error('Failed to get canvas context');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(bitmap, 0, 0, width, height);
        bitmap.close();
        // Convert to blob with quality control
        let resultBlob = await new Promise((resolve) => {
            canvas.toBlob((b) => resolve(b), 'image/jpeg', opts.quality);
        });
        // Reduce quality if too large
        let currentQuality = opts.quality;
        const maxSize = opts.maxSizeKB * 1024;
        while (resultBlob.size > maxSize && currentQuality > 0.5) {
            currentQuality -= 0.05;
            resultBlob = await new Promise((resolve) => {
                canvas.toBlob((b) => resolve(b), 'image/jpeg', currentQuality);
            });
        }
        // Convert to base64
        const base64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(resultBlob);
        });
        return {
            base64,
            width,
            height,
            size: resultBlob.size,
            blob: resultBlob,
        };
    }
    catch (error) {
        console.error('Error resizing image:', error);
        throw error;
    }
}
/**
 * Process an image file - handles HEIC conversion and optimization
 *
 * @param file - Image file to process
 * @returns Processed image ready for Bluesky upload
 *
 * @example
 * ```ts
 * const processed = await processImage(userSelectedFile);
 *
 * if (processed.heicConverted) {
 *   console.log('HEIC was converted to JPEG');
 * }
 *
 * // Use processed.optimized for upload
 * // Use processed.placeholder for preview
 * ```
 */
export async function processImage(file) {
    if (!isBrowserWithCanvas()) {
        throw new Error('Image processing requires a browser environment');
    }
    const isHeic = file.name.toLowerCase().endsWith('.heic');
    let processedFile = file;
    let heicConverted = false;
    // Convert HEIC if needed
    if (isHeic) {
        try {
            processedFile = await convertHEIC(file);
            heicConverted = true;
            console.log('HEIC converted to JPEG');
        }
        catch (error) {
            console.warn('HEIC conversion failed, using original:', error);
        }
    }
    // Get dimensions
    const dimensions = await getImageDimensions(processedFile);
    // Create placeholder
    const placeholder = await createPlaceholder(processedFile);
    // Optimize if needed
    let optimized = processedFile;
    if (processedFile.size > BLUESKY_MAX_SIZE) {
        console.log(`Image ${Math.round(processedFile.size / 1024)}KB exceeds 976KB limit, optimizing...`);
        try {
            optimized = await optimizeForBluesky(processedFile, dimensions.width, dimensions.height);
        }
        catch (error) {
            console.error('Optimization failed:', error);
            // Fallback: aggressive resize
            const maxDim = 1200;
            let targetWidth = dimensions.width;
            let targetHeight = dimensions.height;
            if (targetWidth > maxDim || targetHeight > maxDim) {
                if (targetWidth > targetHeight) {
                    targetHeight = Math.round((maxDim / targetWidth) * targetHeight);
                    targetWidth = maxDim;
                }
                else {
                    targetWidth = Math.round((maxDim / targetHeight) * targetWidth);
                    targetHeight = maxDim;
                }
            }
            optimized = await createOptimizedImage(processedFile, targetWidth, targetHeight, 0.7);
        }
    }
    return {
        original: processedFile,
        optimized,
        placeholder,
        dimensions,
        size: optimized.size,
        isHeic,
        heicConverted,
    };
}
/**
 * Check if a file is an image
 *
 * @param file - File to check
 * @returns True if file is an accepted image type
 */
export function isImageFile(file) {
    return ACCEPTED_IMAGE_TYPES.includes(file.type) ||
        file.name.toLowerCase().endsWith('.heic');
}
/**
 * Get human-readable file size
 *
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g., "256KB", "1.5MB")
 */
export function formatFileSize(bytes) {
    if (bytes < 1024)
        return `${bytes}B`;
    if (bytes < 1024 * 1024)
        return `${Math.round(bytes / 1024)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
//# sourceMappingURL=image.js.map