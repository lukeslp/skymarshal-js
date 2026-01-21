export class MediaManager {
    agent;
    constructor(agent) {
        this.agent = agent;
    }
    /**
     * Upload an image blob to Bluesky
     */
    async uploadImage(options) {
        const response = await this.agent.uploadBlob(options.data, {
            encoding: options.mimeType,
        });
        return {
            blob: response.data.blob,
        };
    }
    /**
     * Upload multiple images at once
     */
    async uploadImages(images) {
        const results = [];
        for (const image of images) {
            const uploaded = await this.uploadImage(image);
            results.push(uploaded);
        }
        return results;
    }
    /**
     * Create an images embed for a post
     */
    createImagesEmbed(images) {
        return {
            $type: "app.bsky.embed.images",
            images: images.map((img) => ({
                alt: img.altText || "",
                image: img.blob.blob,
                aspectRatio: img.aspectRatio,
            })),
        };
    }
    /**
     * Upload a video blob to Bluesky
     */
    async uploadVideo(options) {
        const response = await this.agent.uploadBlob(options.data, {
            encoding: options.mimeType,
        });
        return {
            blob: response.data.blob,
        };
    }
    /**
     * Get the dimensions of an image from its data
     * Note: This is a basic implementation - for production, use a proper image library
     */
    getImageDimensions(data) {
        // PNG signature check
        if (data[0] === 0x89 &&
            data[1] === 0x50 &&
            data[2] === 0x4e &&
            data[3] === 0x47) {
            // PNG: width at bytes 16-19, height at bytes 20-23
            const width = (data[16] << 24) | (data[17] << 16) | (data[18] << 8) | data[19];
            const height = (data[20] << 24) | (data[21] << 16) | (data[22] << 8) | data[23];
            return { width, height };
        }
        // JPEG signature check
        if (data[0] === 0xff && data[1] === 0xd8) {
            let offset = 2;
            while (offset < data.length) {
                if (data[offset] !== 0xff)
                    break;
                const marker = data[offset + 1];
                if (marker === 0xc0 || marker === 0xc2) {
                    // SOF0 or SOF2
                    const height = (data[offset + 5] << 8) | data[offset + 6];
                    const width = (data[offset + 7] << 8) | data[offset + 8];
                    return { width, height };
                }
                const length = (data[offset + 2] << 8) | data[offset + 3];
                offset += 2 + length;
            }
        }
        // GIF signature check
        if (data[0] === 0x47 &&
            data[1] === 0x49 &&
            data[2] === 0x46) {
            const width = data[6] | (data[7] << 8);
            const height = data[8] | (data[9] << 8);
            return { width, height };
        }
        return null;
    }
    /**
     * Validate image size and dimensions
     */
    validateImage(data, options) {
        const maxSize = options?.maxSizeBytes || 1000000; // 1MB default
        const maxWidth = options?.maxWidth || 4096;
        const maxHeight = options?.maxHeight || 4096;
        if (data.length > maxSize) {
            return {
                valid: false,
                error: `Image size ${data.length} exceeds maximum ${maxSize} bytes`,
            };
        }
        const dimensions = this.getImageDimensions(data);
        if (dimensions) {
            if (dimensions.width > maxWidth) {
                return {
                    valid: false,
                    error: `Image width ${dimensions.width} exceeds maximum ${maxWidth}`,
                };
            }
            if (dimensions.height > maxHeight) {
                return {
                    valid: false,
                    error: `Image height ${dimensions.height} exceeds maximum ${maxHeight}`,
                };
            }
        }
        return { valid: true };
    }
    /**
     * Detect MIME type from image data
     */
    detectMimeType(data) {
        // PNG
        if (data[0] === 0x89 &&
            data[1] === 0x50 &&
            data[2] === 0x4e &&
            data[3] === 0x47) {
            return "image/png";
        }
        // JPEG
        if (data[0] === 0xff && data[1] === 0xd8) {
            return "image/jpeg";
        }
        // GIF
        if (data[0] === 0x47 &&
            data[1] === 0x49 &&
            data[2] === 0x46) {
            return "image/gif";
        }
        // WebP
        if (data[0] === 0x52 &&
            data[1] === 0x49 &&
            data[2] === 0x46 &&
            data[3] === 0x46 &&
            data[8] === 0x57 &&
            data[9] === 0x45 &&
            data[10] === 0x42 &&
            data[11] === 0x50) {
            return "image/webp";
        }
        return null;
    }
}
export default MediaManager;
//# sourceMappingURL=media.js.map