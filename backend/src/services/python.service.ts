// backend/src/services/python.service.ts
import axios, { AxiosInstance } from 'axios';
import { PYTHON_SERVICE_URL } from '../config/env';
import { AppError } from '../middleware/error.middleware';

// Python service interface
export interface IPythonService {
  analyzeSEO(content: string, title: string, keywords?: string[]): Promise<SEOAnalysis>;
  generatePost(topic: string, keywords?: string[]): Promise<GeneratedPost>;
  checkGrammar(text: string): Promise<GrammarCheck>;
  summarizeText(text: string, maxLength?: number): Promise<string>;
  extractKeywords(text: string, limit?: number): Promise<string[]>;
  analyzeSentiment(text: string): Promise<SentimentAnalysis>;
  optimizeImage(imageBuffer: Buffer, options?: OptimizeOptions): Promise<OptimizedImage>;
  detectLanguage(text: string): Promise<string>;
  translateText(text: string, targetLanguage: string): Promise<string>;
  checkSpam(content: string): Promise<SpamCheck>;
  healthCheck(): Promise<boolean>;
}

// Types
export interface SEOAnalysis {
  score: number;
  suggestions: string[];
  readability: {
    score: number;
    level: string;
  };
  keywordDensity: Record<string, number>;
  titleTag: string;
  metaDescription: string;
  headings: {
    h1: number;
    h2: number;
    h3: number;
  };
  images: {
    total: number;
    withAlt: number;
  };
  links: {
    internal: number;
    external: number;
  };
  wordCount: number;
  readingTime: number;
}

export interface GeneratedPost {
  title: string;
  content: string;
  excerpt: string;
  tags: string[];
  seoTitle: string;
  seoDescription: string;
}

export interface GrammarCheck {
  errors: Array<{
    message: string;
    suggestions: string[];
    offset: number;
    length: number;
    severity: 'error' | 'warning';
  }>;
  score: number;
}

export interface SentimentAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
  confidence: number;
  emotions: {
    joy: number;
    anger: number;
    sadness: number;
    fear: number;
    disgust: number;
  };
}

export interface OptimizeOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'jpeg' | 'png' | 'webp' | 'avif';
  crop?: boolean;
}

export interface OptimizedImage {
  buffer: Buffer;
  format: string;
  width: number;
  height: number;
  size: number;
  url?: string;
}

export interface SpamCheck {
  isSpam: boolean;
  score: number;
  reasons: string[];
  suggestions: string[];
}

// Python service implementation
class PythonService implements IPythonService {
  private static instance: PythonService;
  private client: AxiosInstance;
  private isAvailable: boolean = false;

  private constructor() {
    this.client = axios.create({
      baseURL: PYTHON_SERVICE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Check service availability
    this.healthCheck().then(available => {
      this.isAvailable = available;
      if (available) {
        console.log('Python service is available');
      } else {
        console.warn('Python service is not available');
      }
    }).catch(() => {
      console.warn('Python service is not available');
      this.isAvailable = false;
    });
  }

  public static getInstance(): PythonService {
    if (!PythonService.instance) {
      PythonService.instance = new PythonService();
    }
    return PythonService.instance;
  }

  // Check if service is available
  private async ensureServiceAvailable(): Promise<void> {
    if (!this.isAvailable) {
      const available = await this.healthCheck();
      if (!available) {
        throw new AppError('Python service is not available', 503);
      }
      this.isAvailable = true;
    }
  }

  // Analyze SEO
  async analyzeSEO(content: string, title: string, keywords: string[] = []): Promise<SEOAnalysis> {
    try {
      await this.ensureServiceAvailable();

      const response = await this.client.post('/seo/analyze', {
        content,
        title,
        keywords
      });

      return response.data;
    } catch (error) {
      console.error('SEO analysis error:', error);
      // Return fallback SEO analysis
      return this.fallbackSEOAnalysis(content, title, keywords);
    }
  }

  // Generate post
  async generatePost(topic: string, keywords: string[] = []): Promise<GeneratedPost> {
    try {
      await this.ensureServiceAvailable();

      const response = await this.client.post('/ai/generate-post', {
        topic,
        keywords
      });

      return response.data;
    } catch (error) {
      console.error('Post generation error:', error);
      throw new AppError('Failed to generate post. Please try again.', 500);
    }
  }

  // Check grammar
  async checkGrammar(text: string): Promise<GrammarCheck> {
    try {
      await this.ensureServiceAvailable();

      const response = await this.client.post('/grammar/check', { text });
      return response.data;
    } catch (error) {
      console.error('Grammar check error:', error);
      return {
        errors: [],
        score: 100
      };
    }
  }

  // Summarize text
  async summarizeText(text: string, maxLength: number = 150): Promise<string> {
    try {
      await this.ensureServiceAvailable();

      const response = await this.client.post('/text/summarize', {
        text,
        max_length: maxLength
      });

      return response.data.summary || text.substring(0, maxLength);
    } catch (error) {
      console.error('Text summarization error:', error);
      return text.substring(0, maxLength);
    }
  }

  // Extract keywords
  async extractKeywords(text: string, limit: number = 10): Promise<string[]> {
    try {
      await this.ensureServiceAvailable();

      const response = await this.client.post('/text/keywords', {
        text,
        limit
      });

      return response.data.keywords || [];
    } catch (error) {
      console.error('Keyword extraction error:', error);
      // Fallback: extract words by frequency
      const words = text
        .toLowerCase()
        .replace(/[^a-z\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 3);
      
      const freq: Record<string, number> = {};
      for (const word of words) {
        freq[word] = (freq[word] || 0) + 1;
      }
      
      return Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([word]) => word);
    }
  }

  // Analyze sentiment
  async analyzeSentiment(text: string): Promise<SentimentAnalysis> {
    try {
      await this.ensureServiceAvailable();

      const response = await this.client.post('/sentiment/analyze', { text });
      return response.data;
    } catch (error) {
      console.error('Sentiment analysis error:', error);
      // Fallback sentiment
      return {
        sentiment: 'neutral',
        score: 0,
        confidence: 0.5,
        emotions: {
          joy: 0,
          anger: 0,
          sadness: 0,
          fear: 0,
          disgust: 0
        }
      };
    }
  }

  // Optimize image
  async optimizeImage(imageBuffer: Buffer, options: OptimizeOptions = {}): Promise<OptimizedImage> {
    try {
      await this.ensureServiceAvailable();

      const formData = new FormData();
      formData.append('image', new Blob([imageBuffer]), 'image.jpg');
      formData.append('options', JSON.stringify(options));

      const response = await this.client.post('/image/optimize', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        responseType: 'arraybuffer'
      });

      return {
        buffer: Buffer.from(response.data),
        format: response.headers['x-image-format'] || 'jpeg',
        width: parseInt(response.headers['x-image-width'] || '0'),
        height: parseInt(response.headers['x-image-height'] || '0'),
        size: parseInt(response.headers['x-image-size'] || '0')
      };
    } catch (error) {
      console.error('Image optimization error:', error);
      // Return original image if optimization fails
      return {
        buffer: imageBuffer,
        format: 'jpeg',
        width: 0,
        height: 0,
        size: imageBuffer.length
      };
    }
  }

  // Detect language
  async detectLanguage(text: string): Promise<string> {
    try {
      await this.ensureServiceAvailable();

      const response = await this.client.post('/language/detect', { text });
      return response.data.language || 'en';
    } catch (error) {
      console.error('Language detection error:', error);
      return 'en';
    }
  }

  // Translate text
  async translateText(text: string, targetLanguage: string): Promise<string> {
    try {
      await this.ensureServiceAvailable();

      const response = await this.client.post('/language/translate', {
        text,
        target_language: targetLanguage
      });

      return response.data.translated_text || text;
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  }

  // Check spam
  async checkSpam(content: string): Promise<SpamCheck> {
    try {
      await this.ensureServiceAvailable();

      const response = await this.client.post('/spam/check', { content });
      return response.data;
    } catch (error) {
      console.error('Spam check error:', error);
      // Default to safe if service is unavailable
      return {
        isSpam: false,
        score: 0,
        reasons: [],
        suggestions: []
      };
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/health', { timeout: 5000 });
      this.isAvailable = true;
      return true;
    } catch (error) {
      this.isAvailable = false;
      return false;
    }
  }

  // Fallback SEO analysis
  private fallbackSEOAnalysis(content: string, title: string, keywords: string[]): SEOAnalysis {
    const wordCount = content.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200);
    
    // Count headings
    const h1Count = (content.match(/<h1[^>]*>/g) || []).length;
    const h2Count = (content.match(/<h2[^>]*>/g) || []).length;
    const h3Count = (content.match(/<h3[^>]*>/g) || []).length;
    
    // Count images with alt
    const imageTags = content.match(/<img[^>]*>/g) || [];
    const imagesWithAlt = imageTags.filter(img => img.includes('alt='));
    
    // Count links
    const internalLinks = (content.match(/<a[^>]*href="\/[^"]*"[^>]*>/g) || []).length;
    const externalLinks = (content.match(/<a[^>]*href="https?:\/\/[^"]*"[^>]*>/g) || []).length;

    return {
      score: 50,
      suggestions: [
        'Add more relevant keywords to your content',
        'Improve readability by using shorter sentences',
        'Add more internal and external links'
      ],
      readability: {
        score: 60,
        level: 'Readable'
      },
      keywordDensity: keywords.reduce((acc, kw) => {
        const count = (content.toLowerCase().match(new RegExp(kw.toLowerCase(), 'g')) || []).length;
        acc[kw] = (count / wordCount) * 100;
        return acc;
      }, {} as Record<string, number>),
      titleTag: title,
      metaDescription: content.substring(0, 160),
      headings: {
        h1: h1Count,
        h2: h2Count,
        h3: h3Count
      },
      images: {
        total: imageTags.length,
        withAlt: imagesWithAlt.length
      },
      links: {
        internal: internalLinks,
        external: externalLinks
      },
      wordCount,
      readingTime
    };
  }
}

// Export singleton instance
export const pythonService = PythonService.getInstance();
export default pythonService;