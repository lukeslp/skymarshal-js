/**
 * VisionService - Image description and alt text generation
 * Supports: Ollama (local), OpenAI, Anthropic
 * @module skymarshal-core/services/vision
 */
/** Supported vision providers */
export type VisionProvider = 'ollama' | 'openai' | 'anthropic';
/** Provider configuration */
export interface ProviderConfig {
    provider: VisionProvider;
    apiKey?: string;
    baseUrl?: string;
    model?: string;
}
/** Alt text generation options */
export interface AltTextOptions {
    provider?: VisionProvider;
    model?: string;
    prompt?: string;
    maxLength?: number;
    detailed?: boolean;
}
/** Alt text result */
export interface AltTextResult {
    text: string;
    provider: VisionProvider;
    model: string;
    confidence?: number;
    processingTime?: number;
}
/** Image analysis result */
export interface ImageAnalysis {
    description: string;
    objects?: string[];
    colors?: string[];
    text?: string[];
    sentiment?: string;
    accessibility?: {
        altText: string;
        longDescription?: string;
    };
}
/**
 * VisionService - Generates alt text and analyzes images
 * Supports multiple providers: Ollama (local), OpenAI, Anthropic
 */
export declare class VisionService {
    private configs;
    private defaultProvider;
    constructor(config?: ProviderConfig | ProviderConfig[]);
    /**
     * Configure a provider
     * @param config - Provider configuration
     */
    configureProvider(config: ProviderConfig): void;
    /**
     * Set the default provider
     * @param provider - Provider to use by default
     */
    setDefaultProvider(provider: VisionProvider): void;
    /**
     * Get available providers
     */
    getProviders(): VisionProvider[];
    /**
     * Generate alt text for an image
     * @param imageUrl - URL or base64 data URL of the image
     * @param options - Generation options
     */
    generateAltText(imageUrl: string, options?: AltTextOptions): Promise<AltTextResult>;
    /**
     * Generate with Ollama (local)
     */
    private generateWithOllama;
    /**
     * Generate with OpenAI
     */
    private generateWithOpenAI;
    /**
     * Generate with Anthropic
     */
    private generateWithAnthropic;
    /**
     * Convert URL to base64
     */
    private urlToBase64;
    /**
     * Analyze image comprehensively
     * @param imageUrl - URL or base64 data URL of the image
     * @param options - Analysis options
     */
    analyzeImage(imageUrl: string, options?: AltTextOptions): Promise<ImageAnalysis>;
}
export default VisionService;
//# sourceMappingURL=vision.d.ts.map