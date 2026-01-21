import { BskyAgent } from "@atproto/api";
export interface UploadedBlob {
    blob: any;
    url?: string;
}
export interface ImageUploadOptions {
    data: Uint8Array;
    mimeType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
    altText?: string;
}
export interface VideoUploadOptions {
    data: Uint8Array;
    mimeType: "video/mp4" | "video/webm";
}
export interface EmbedImage {
    alt: string;
    image: any;
    aspectRatio?: {
        width: number;
        height: number;
    };
}
export interface ImageEmbed {
    $type: "app.bsky.embed.images";
    images: EmbedImage[];
}
export declare class MediaManager {
    private agent;
    constructor(agent: BskyAgent);
    /**
     * Upload an image blob to Bluesky
     */
    uploadImage(options: ImageUploadOptions): Promise<UploadedBlob>;
    /**
     * Upload multiple images at once
     */
    uploadImages(images: ImageUploadOptions[]): Promise<UploadedBlob[]>;
    /**
     * Create an images embed for a post
     */
    createImagesEmbed(images: Array<{
        blob: UploadedBlob;
        altText?: string;
        aspectRatio?: {
            width: number;
            height: number;
        };
    }>): ImageEmbed;
    /**
     * Upload a video blob to Bluesky
     */
    uploadVideo(options: VideoUploadOptions): Promise<UploadedBlob>;
    /**
     * Get the dimensions of an image from its data
     * Note: This is a basic implementation - for production, use a proper image library
     */
    getImageDimensions(data: Uint8Array): {
        width: number;
        height: number;
    } | null;
    /**
     * Validate image size and dimensions
     */
    validateImage(data: Uint8Array, options?: {
        maxSizeBytes?: number;
        maxWidth?: number;
        maxHeight?: number;
    }): {
        valid: boolean;
        error?: string;
    };
    /**
     * Detect MIME type from image data
     */
    detectMimeType(data: Uint8Array): "image/jpeg" | "image/png" | "image/gif" | "image/webp" | null;
}
export default MediaManager;
//# sourceMappingURL=media.d.ts.map