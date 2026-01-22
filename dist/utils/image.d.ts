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
export declare const BLUESKY_MAX_SIZE: number;
/**
 * Accepted image MIME types
 */
export declare const ACCEPTED_IMAGE_TYPES: string[];
/**
 * Processed image result
 */
export interface ProcessedImage {
    /** Original file or blob */
    original: File | Blob;
    /** Optimized blob ready for upload */
    optimized: Blob;
    /** Base64 placeholder preview (300px width) */
    placeholder?: string;
    /** Image dimensions */
    dimensions: {
        width: number;
        height: number;
    };
    /** Final file size in bytes */
    size: number;
    /** Whether original was HEIC format */
    isHeic: boolean;
    /** Whether HEIC was converted */
    heicConverted: boolean;
}
/**
 * Options for image resizing
 */
export interface ResizeOptions {
    /** Maximum width (default: 800) */
    maxWidth?: number;
    /** Maximum height (default: 800) */
    maxHeight?: number;
    /** JPEG quality 0-1 (default: 0.85) */
    quality?: number;
    /** Maximum size in KB (default: 976) */
    maxSizeKB?: number;
}
/**
 * Resized image result
 */
export interface ResizedImage {
    /** Base64 data URL */
    base64: string;
    /** Final width */
    width: number;
    /** Final height */
    height: number;
    /** Final size in bytes */
    size: number;
    /** Blob for upload */
    blob: Blob;
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
export declare function getImageDimensions(file: File | Blob): Promise<{
    width: number;
    height: number;
}>;
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
export declare function createPlaceholder(file: File | Blob): Promise<string>;
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
export declare function convertHEIC(file: File): Promise<File>;
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
export declare function optimizeForBluesky(file: File | Blob, width: number, height: number, maxAttempts?: number): Promise<Blob>;
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
export declare function resizeImage(input: File | Blob | string, options?: ResizeOptions): Promise<ResizedImage>;
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
export declare function processImage(file: File): Promise<ProcessedImage>;
/**
 * Check if a file is an image
 *
 * @param file - File to check
 * @returns True if file is an accepted image type
 */
export declare function isImageFile(file: File): boolean;
/**
 * Get human-readable file size
 *
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g., "256KB", "1.5MB")
 */
export declare function formatFileSize(bytes: number): string;
//# sourceMappingURL=image.d.ts.map