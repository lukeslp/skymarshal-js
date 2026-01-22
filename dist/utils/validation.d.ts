/**
 * Validation utilities for Bluesky data
 * Input validation, format checking, content moderation helpers
 *
 * @module utils/validation
 */
/**
 * Result of a validation check
 */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
}
/**
 * Result of post text validation
 */
export interface PostTextValidation extends ValidationResult {
    charCount: number;
}
/**
 * Result of spam detection
 */
export interface SpamDetectionResult {
    isSpam: boolean;
    reasons: string[];
}
/**
 * Parsed post URL components
 */
export interface ParsedPostUrl {
    handle: string;
    postId: string;
}
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
export declare function isValidAtUri(uri: string): boolean;
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
export declare function isValidHandle(handle: string): boolean;
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
export declare function isValidDid(did: string): boolean;
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
export declare function validatePostText(text: string): PostTextValidation;
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
export declare function validateImageFile(file: File): ValidationResult;
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
export declare function sanitizeText(text: string): string;
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
export declare function isValidPostUrl(url: string): boolean;
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
export declare function parsePostUrl(url: string): ParsedPostUrl | null;
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
export declare function detectSpamPatterns(text: string): SpamDetectionResult;
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
export declare function truncateText(text: string, maxLength: number): string;
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
export declare function validateAltText(altText: string): ValidationResult;
//# sourceMappingURL=validation.d.ts.map