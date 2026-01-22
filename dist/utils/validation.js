/**
 * Validation utilities for Bluesky data
 * Input validation, format checking, content moderation helpers
 *
 * @module utils/validation
 */
/**
 * Validate if a string is a valid AT-URI
 * Format: at://did:plc:xxx/app.bsky.feed.post/abc123
 *
 * @param uri - String to validate
 * @returns True if valid AT-URI format
 *
 * @example
 * ```ts
 * isValidAtUri('at://did:plc:abc123/app.bsky.feed.post/xyz789'); // true
 * isValidAtUri('https://bsky.app/post/abc'); // false
 * ```
 */
export function isValidAtUri(uri) {
    return /^at:\/\/did:[a-z0-9]+:[a-zA-Z0-9._%-]+\/app\.bsky\.(feed\.post|feed\.like|feed\.repost|actor\.profile|graph\.follow)\/[a-z0-9]+$/i.test(uri);
}
/**
 * Validate Bluesky handle format
 * Examples: user.bsky.social, alice.wonderland.com
 *
 * @param handle - Handle to validate
 * @returns True if valid handle format
 *
 * @example
 * ```ts
 * isValidHandle('alice.bsky.social'); // true
 * isValidHandle('bob.example.com'); // true
 * isValidHandle('@alice'); // false
 * ```
 */
export function isValidHandle(handle) {
    // Handle must be domain-like: lowercase alphanumeric with dots
    // Minimum 3 chars, must have at least one dot, TLD at least 2 chars
    return /^[a-z0-9][a-z0-9.-]*[a-z0-9]\.[a-z]{2,}$/.test(handle.toLowerCase());
}
/**
 * Validate DID (Decentralized Identifier) format
 * Examples: did:plc:xxx, did:web:example.com
 *
 * @param did - DID to validate
 * @returns True if valid DID format
 *
 * @example
 * ```ts
 * isValidDid('did:plc:z72i7hdynmk6r22z27h6tvur'); // true
 * isValidDid('did:web:example.com'); // true
 * isValidDid('plc:abc123'); // false
 * ```
 */
export function isValidDid(did) {
    return /^did:[a-z]+:[a-zA-Z0-9._%-]+$/.test(did);
}
/**
 * Validate post text against Bluesky's constraints
 * Max 300 characters (graphemes, not bytes)
 *
 * @param text - Post text to validate
 * @returns Validation result with character count
 *
 * @example
 * ```ts
 * const result = validatePostText('Hello world!');
 * // { valid: true, errors: [], charCount: 12 }
 *
 * const tooLong = validatePostText('x'.repeat(301));
 * // { valid: false, errors: ['Post text too long...'], charCount: 301 }
 * ```
 */
export function validatePostText(text) {
    const errors = [];
    // Count grapheme clusters (visual characters)
    // Use Intl.Segmenter if available, fallback to length
    let charCount;
    if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
        const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' });
        const segments = Array.from(segmenter.segment(text));
        charCount = segments.length;
    }
    else {
        // Fallback for environments without Intl.Segmenter
        charCount = [...text].length;
    }
    if (charCount === 0) {
        errors.push('Post text cannot be empty');
    }
    if (charCount > 300) {
        errors.push(`Post text too long (${charCount}/300 characters)`);
    }
    return {
        valid: errors.length === 0,
        errors,
        charCount,
    };
}
/**
 * Validate image file for Bluesky upload
 * Max 976KB, accepted formats: JPEG, PNG, WebP, HEIC
 *
 * @param file - File to validate
 * @returns Validation result
 *
 * @example
 * ```ts
 * const result = validateImageFile(myImageFile);
 * if (!result.valid) {
 *   console.error(result.errors.join(', '));
 * }
 * ```
 */
export function validateImageFile(file) {
    const errors = [];
    const MAX_SIZE = 976 * 1024; // 976KB
    const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
    if (!ACCEPTED_TYPES.includes(file.type) && !file.name.toLowerCase().endsWith('.heic')) {
        errors.push(`Invalid file type: ${file.type}. Accepted: JPEG, PNG, WebP, HEIC`);
    }
    if (file.size > MAX_SIZE) {
        errors.push(`File too large: ${Math.round(file.size / 1024)}KB. Maximum: 976KB`);
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
/**
 * Sanitize text for safe display
 * Removes control characters and excessive whitespace
 *
 * @param text - Text to sanitize
 * @returns Sanitized text
 *
 * @example
 * ```ts
 * sanitizeText('Hello\x00World'); // 'Hello World'
 * sanitizeText('  multiple   spaces  '); // 'multiple spaces'
 * ```
 */
export function sanitizeText(text) {
    return (text
        // Remove control characters except newlines and tabs
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
        // Normalize whitespace
        .replace(/\s+/g, ' ')
        .trim());
}
/**
 * Validate Bluesky post URL format
 * Example: https://bsky.app/profile/user.bsky.social/post/abc123
 *
 * @param url - URL to validate
 * @returns True if valid Bluesky post URL
 *
 * @example
 * ```ts
 * isValidPostUrl('https://bsky.app/profile/alice.bsky.social/post/abc123'); // true
 * isValidPostUrl('https://example.com/post/123'); // false
 * ```
 */
export function isValidPostUrl(url) {
    try {
        const urlObj = new URL(url);
        if (!urlObj.hostname.includes('bsky.app'))
            return false;
        return /^\/profile\/[^/]+\/post\/[a-z0-9]+$/.test(urlObj.pathname);
    }
    catch {
        return false;
    }
}
/**
 * Extract handle and post ID from Bluesky URL
 *
 * @param url - Bluesky post URL
 * @returns Parsed components or null if invalid
 *
 * @example
 * ```ts
 * parsePostUrl('https://bsky.app/profile/alice.bsky.social/post/abc123');
 * // { handle: 'alice.bsky.social', postId: 'abc123' }
 *
 * parsePostUrl('https://example.com/post/123');
 * // null
 * ```
 */
export function parsePostUrl(url) {
    try {
        const urlObj = new URL(url);
        const match = urlObj.pathname.match(/^\/profile\/([^/]+)\/post\/([a-z0-9]+)$/);
        if (!match)
            return null;
        return {
            handle: match[1],
            postId: match[2],
        };
    }
    catch {
        return null;
    }
}
/**
 * Check if content contains potential spam patterns
 * Simple heuristic-based detection
 *
 * @param text - Text to analyze
 * @returns Spam detection result
 *
 * @example
 * ```ts
 * const result = detectSpamPatterns('BUY NOW!!! CLICK HERE!!!');
 * // { isSpam: true, reasons: ['Excessive capitalization', 'Repeated characters'] }
 * ```
 */
export function detectSpamPatterns(text) {
    const reasons = [];
    // Excessive caps
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (capsRatio > 0.7 && text.length > 20) {
        reasons.push('Excessive capitalization');
    }
    // Repeated characters
    if (/(.)\1{10,}/.test(text)) {
        reasons.push('Repeated characters');
    }
    // Many URLs
    const urlCount = (text.match(/https?:\/\//g) || []).length;
    if (urlCount > 3) {
        reasons.push('Excessive URLs');
    }
    // Many emojis
    const emojiCount = (text.match(/[\u{1F300}-\u{1F9FF}]/gu) || []).length;
    if (emojiCount > 20) {
        reasons.push('Excessive emojis');
    }
    return {
        isSpam: reasons.length >= 2, // At least 2 spam indicators
        reasons,
    };
}
/**
 * Truncate text to character limit while preserving word boundaries
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text with ellipsis if needed
 *
 * @example
 * ```ts
 * truncateText('Hello world!', 5); // 'Hello...'
 * truncateText('Hi', 10); // 'Hi'
 * ```
 */
export function truncateText(text, maxLength) {
    if (text.length <= maxLength)
        return text;
    // Find last space before limit
    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > maxLength * 0.8) {
        // If space is reasonably close to limit, use it
        return truncated.substring(0, lastSpace) + '...';
    }
    // Otherwise, hard truncate
    return truncated + '...';
}
/**
 * Validate alt text for accessibility
 *
 * @param altText - Alt text to validate
 * @returns Validation result with suggestions
 *
 * @example
 * ```ts
 * validateAltText(''); // { valid: false, errors: ['Alt text is empty'] }
 * validateAltText('Image of a cat'); // { valid: true, errors: [] }
 * ```
 */
export function validateAltText(altText) {
    const errors = [];
    if (!altText || altText.trim().length === 0) {
        errors.push('Alt text is empty');
    }
    else if (altText.length < 10) {
        errors.push('Alt text may be too short to be descriptive');
    }
    else if (altText.length > 2000) {
        errors.push('Alt text exceeds maximum length of 2000 characters');
    }
    // Check for common bad patterns
    const lowered = altText.toLowerCase();
    if (lowered.startsWith('image of') || lowered.startsWith('picture of')) {
        // This is technically OK but screen readers announce "image" already
        // Just a warning, not an error
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
//# sourceMappingURL=validation.js.map