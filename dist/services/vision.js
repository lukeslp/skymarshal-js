/**
 * VisionService - Image description and alt text generation
 * Supports: Ollama (local), OpenAI, Anthropic
 * @module skymarshal-core/services/vision
 */
/** Default prompts for alt text generation */
const DEFAULT_PROMPTS = {
    standard: 'Describe this image in detail, suitable for use as alt text for accessibility. Be concise but descriptive.',
    detailed: 'Provide a comprehensive description of this image including: main subjects, actions, setting, colors, mood, and any text visible. This will be used as alt text for screen readers.',
    concise: 'Describe this image in one sentence for alt text.',
};
/** Default models per provider */
const DEFAULT_MODELS = {
    ollama: 'llava-phi3',
    openai: 'gpt-4o-mini',
    anthropic: 'claude-3-haiku-20240307',
};
/**
 * VisionService - Generates alt text and analyzes images
 * Supports multiple providers: Ollama (local), OpenAI, Anthropic
 */
export class VisionService {
    configs = new Map();
    defaultProvider = 'ollama';
    constructor(config) {
        if (config) {
            const configs = Array.isArray(config) ? config : [config];
            for (const c of configs) {
                this.configs.set(c.provider, c);
                if (configs.length === 1) {
                    this.defaultProvider = c.provider;
                }
            }
        }
    }
    /**
     * Configure a provider
     * @param config - Provider configuration
     */
    configureProvider(config) {
        this.configs.set(config.provider, config);
    }
    /**
     * Set the default provider
     * @param provider - Provider to use by default
     */
    setDefaultProvider(provider) {
        this.defaultProvider = provider;
    }
    /**
     * Get available providers
     */
    getProviders() {
        return Array.from(this.configs.keys());
    }
    /**
     * Generate alt text for an image
     * @param imageUrl - URL or base64 data URL of the image
     * @param options - Generation options
     */
    async generateAltText(imageUrl, options = {}) {
        const startTime = Date.now();
        const provider = options.provider || this.defaultProvider;
        const config = this.configs.get(provider);
        if (!config && provider !== 'ollama') {
            throw new Error(`Provider ${provider} not configured`);
        }
        const model = options.model || config?.model || DEFAULT_MODELS[provider];
        const prompt = options.prompt || (options.detailed ? DEFAULT_PROMPTS.detailed : DEFAULT_PROMPTS.standard);
        let text;
        switch (provider) {
            case 'ollama':
                text = await this.generateWithOllama(imageUrl, prompt, model, config?.baseUrl);
                break;
            case 'openai':
                text = await this.generateWithOpenAI(imageUrl, prompt, model, config.apiKey);
                break;
            case 'anthropic':
                text = await this.generateWithAnthropic(imageUrl, prompt, model, config.apiKey);
                break;
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }
        // Truncate if maxLength specified
        if (options.maxLength && text.length > options.maxLength) {
            text = text.substring(0, options.maxLength - 3) + '...';
        }
        return {
            text,
            provider,
            model,
            processingTime: Date.now() - startTime,
        };
    }
    /**
     * Generate with Ollama (local)
     */
    async generateWithOllama(imageUrl, prompt, model, baseUrl = 'http://localhost:11434') {
        // Extract base64 from data URL if needed
        const imageData = imageUrl.startsWith('data:')
            ? imageUrl.split(',')[1]
            : await this.urlToBase64(imageUrl);
        const response = await fetch(`${baseUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                prompt,
                images: [imageData],
                stream: false,
            }),
        });
        if (!response.ok) {
            throw new Error(`Ollama error: ${response.status}`);
        }
        const data = await response.json();
        return data.response;
    }
    /**
     * Generate with OpenAI
     */
    async generateWithOpenAI(imageUrl, prompt, model, apiKey) {
        const imageContent = imageUrl.startsWith('data:')
            ? { type: 'image_url', image_url: { url: imageUrl } }
            : { type: 'image_url', image_url: { url: imageUrl } };
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model,
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: prompt },
                            imageContent,
                        ],
                    },
                ],
                max_tokens: 500,
            }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(`OpenAI error: ${error.error?.message || response.status}`);
        }
        const data = await response.json();
        return data.choices[0].message.content;
    }
    /**
     * Generate with Anthropic
     */
    async generateWithAnthropic(imageUrl, prompt, model, apiKey) {
        // Anthropic requires base64 with media type
        let imageData;
        if (imageUrl.startsWith('data:')) {
            const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
            if (!match)
                throw new Error('Invalid data URL');
            imageData = {
                type: 'base64',
                media_type: match[1],
                data: match[2],
            };
        }
        else {
            const base64 = await this.urlToBase64(imageUrl);
            imageData = {
                type: 'base64',
                media_type: 'image/jpeg', // Assume JPEG for URLs
                data: base64,
            };
        }
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model,
                max_tokens: 500,
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'image',
                                source: imageData,
                            },
                            {
                                type: 'text',
                                text: prompt,
                            },
                        ],
                    },
                ],
            }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Anthropic error: ${error.error?.message || response.status}`);
        }
        const data = await response.json();
        return data.content[0].text;
    }
    /**
     * Convert URL to base64
     */
    async urlToBase64(url) {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        // Convert to base64
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }
    /**
     * Analyze image comprehensively
     * @param imageUrl - URL or base64 data URL of the image
     * @param options - Analysis options
     */
    async analyzeImage(imageUrl, options = {}) {
        const analysisPrompt = `Analyze this image and provide:
1. A detailed description
2. Main objects/subjects visible
3. Dominant colors
4. Any text visible in the image
5. Overall mood/sentiment
6. A concise alt text suitable for accessibility

Format your response as JSON with keys: description, objects, colors, text, sentiment, altText`;
        const result = await this.generateAltText(imageUrl, {
            ...options,
            prompt: analysisPrompt,
        });
        try {
            // Try to parse as JSON
            const parsed = JSON.parse(result.text);
            return {
                description: parsed.description || result.text,
                objects: parsed.objects,
                colors: parsed.colors,
                text: parsed.text,
                sentiment: parsed.sentiment,
                accessibility: {
                    altText: parsed.altText || parsed.description,
                    longDescription: parsed.description,
                },
            };
        }
        catch {
            // If not valid JSON, return as plain description
            return {
                description: result.text,
                accessibility: {
                    altText: result.text,
                },
            };
        }
    }
}
export default VisionService;
//# sourceMappingURL=vision.js.map