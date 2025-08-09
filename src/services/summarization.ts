import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration for Gemini API
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-pro';

if (!GEMINI_API_KEY) {
  console.warn('GEMINI_API_KEY is not set. Summarization features will be limited.');
}

// Safety settings for Gemini API
const SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

// Maximum tokens for different summary styles
const MAX_TOKENS = {
  bullet: 300,
  paragraph: 500,
  key_points: 200,
};

export interface SummarizationOptions {
  text: string;
  maxLength?: number;
  style?: 'bullet' | 'paragraph' | 'key_points';
  language?: string; // ISO language code (e.g., 'en', 'es', 'fr')
  includeSentiment?: boolean;
  includeKeyTopics?: boolean;
}

export interface SummarizationResult {
  summary: string;
  originalLength: number;
  summaryLength: number;
  keyTopics: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
  confidence?: number;
  language?: string;
  metadata?: Record<string, any>;
}

export class SummarizationService {
  private genAI: GoogleGenerativeAI | null = null;
  private initialized: boolean = false;

  constructor() {
    if (GEMINI_API_KEY) {
      try {
        this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        this.initialized = true;
      } catch (error) {
        console.error('Failed to initialize Gemini API:', error);
        this.initialized = false;
      }
    } else {
      console.warn('Gemini API key not provided. Using fallback summarization.');
      this.initialized = false;
    }
  }

  /**
   * Summarizes the given text using Gemini API
   * @param options Summarization options
   * @returns Summarization result with metadata
   */
  async summarize(options: SummarizationOptions): Promise<SummarizationResult> {
    const { 
      text, 
      maxLength = 300, 
      style = 'key_points',
      language = 'en',
      includeSentiment = true,
      includeKeyTopics = true
    } = options;

    // Input validation
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }
    if (maxLength <= 0) {
      throw new Error('maxLength must be positive');
    }

    try {
      // If Gemini is not initialized, use fallback
      if (!this.initialized) {
        return this.fallbackSummarization(text, maxLength, style);
      }

      // Generate the summary using Gemini
      if (!this.genAI) {
        throw new Error('Gemini client not initialized');
      }
      const model = this.genAI.getGenerativeModel({ model: GEMINI_MODEL });
      
      // Prepare the prompt based on style
      const prompt = this.buildPrompt(text, style, maxLength, language);
      
      // Generate content with safety settings
      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          maxOutputTokens: Math.min(MAX_TOKENS[style as keyof typeof MAX_TOKENS] || 300, maxLength),
          temperature: 0.3, // Lower temperature for more focused summaries
        },
        safetySettings: SAFETY_SETTINGS,
      });

      // Extract the generated text
      const response = result.response;
      const summary = response.text().trim();

      // Get additional insights if needed
      let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
      let keyTopics: string[] = [];

      if (includeSentiment) {
        sentiment = await this.analyzeSentimentWithGemini(text);
      }

      if (includeKeyTopics) {
        keyTopics = await this.extractKeyTopicsWithGemini(text);
      }

      return {
        summary,
        originalLength: text.length,
        summaryLength: summary.length,
        keyTopics,
        sentiment,
        language,
        metadata: {
          model: GEMINI_MODEL,
          style,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('Summarization error:', error);
      // Fallback to basic summarization if Gemini fails
      return this.fallbackSummarization(text, maxLength, style);
    }
  }

  /**
   * Fallback summarization when Gemini is not available
   */
  private fallbackSummarization(
    text: string,
    maxLength: number,
    style: 'bullet' | 'paragraph' | 'key_points'
  ): SummarizationResult {
    console.warn('Using fallback summarization. For better results, provide a valid GEMINI_API_KEY.');
    
    // Simple text truncation as fallback
    const words = text.split(' ');
    const truncated = words.slice(0, Math.min(maxLength / 5, words.length)).join(' ');
    
    let summary: string;
    switch (style) {
      case 'bullet':
        summary = `• ${truncated}\n• Key points extracted from the conversation`;
        break;
      case 'paragraph':
        summary = `Summary: ${truncated}...`;
        break;
      case 'key_points':
      default:
        summary = `Key Points:\n1. ${truncated}\n2. Important discussion topics`;
    }

    return {
      summary,
      originalLength: text.length,
      summaryLength: summary.length,
      keyTopics: this.extractKeyTopics(text),
      sentiment: this.analyzeSentiment(text),
      metadata: {
        fallback: true,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Builds a prompt for the Gemini API based on the desired style
   */
  private buildPrompt(
    text: string,
    style: 'bullet' | 'paragraph' | 'key_points',
    maxLength: number,
    language: string
  ): string {
    const styleInstructions = {
      bullet: 'Provide a bullet-point summary with the most important points.',
      paragraph: 'Write a concise paragraph summarizing the key information.',
      key_points: 'List the key points as a numbered list.',
    };

    return `Please summarize the following text in ${language}.
    ${styleInstructions[style]}
    Keep the summary under ${maxLength} characters.
    Focus on the main ideas and key information.
    
    Text to summarize:
    """
    ${text}
    """
    
    Summary:`;
  }

  /**
   * Analyzes sentiment using Gemini
   */
  private async analyzeSentimentWithGemini(text: string): Promise<'positive' | 'negative' | 'neutral'> {
    try {
      if (!this.initialized || !this.genAI) {
        return this.analyzeSentiment(text);
      }

      const model = this.genAI.getGenerativeModel({ model: GEMINI_MODEL });
      
      const prompt = `Analyze the sentiment of the following text and respond with only one word: "positive", "negative", or "neutral".
      
      Text: """
      ${text}
      """
      
      Sentiment:`;

      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 10,
          temperature: 0.1,
        },
        safetySettings: SAFETY_SETTINGS,
      });

      const response = result.response;
      const sentiment = response.text().trim().toLowerCase();

      if (['positive', 'negative', 'neutral'].includes(sentiment)) {
        return sentiment as 'positive' | 'negative' | 'neutral';
      }
      return 'neutral';
    } catch (error) {
      console.error('Error analyzing sentiment with Gemini:', error);
      return this.analyzeSentiment(text);
    }
  }

  /**
   * Extracts key topics using Gemini
   */
  private async extractKeyTopicsWithGemini(text: string): Promise<string[]> {
    try {
      if (!this.initialized || !this.genAI) {
        return this.extractKeyTopics(text);
      }

      const model = this.genAI.getGenerativeModel({ model: GEMINI_MODEL });
      
      const prompt = `Extract the main topics from the following text. 
      Return only a comma-separated list of topics (3-5 topics max).
      
      Text: """
      ${text}
      """
      
      Topics:`;

      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 100,
          temperature: 0.1,
        },
        safetySettings: SAFETY_SETTINGS,
      });

      const response = result.response;
      const topicsText = response.text().trim();
      
      // Parse the comma-separated list and clean up
      return topicsText
        .split(',')
        .map(topic => topic.trim())
        .filter(topic => topic.length > 0);
    } catch (error) {
      console.error('Error extracting topics with Gemini:', error);
      return this.extractKeyTopics(text);
    }
  }

  /**
   * Simple fallback sentiment analysis
   */
  private analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' {
    const positiveWords = ['good', 'great', 'excellent', 'happy', 'satisfied', 'love', 'amazing', 'thanks', 'thank you'];
    const negativeWords = ['bad', 'terrible', 'awful', 'angry', 'frustrated', 'hate', 'disappointed', 'problem', 'issue'];

    const lowerText = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
    const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;

    if (positiveCount > negativeCount * 1.5) return 'positive';
    if (negativeCount > positiveCount * 1.5) return 'negative';
    return 'neutral';
  }

  /**
   * Simple fallback topic extraction
   */
  private extractKeyTopics(text: string): string[] {
    const commonTopics = [
      'customer service', 'order status', 'billing', 'technical support',
      'product inquiry', 'complaint', 'feedback', 'refund', 'delivery',
      'account', 'payment', 'shipping', 'return', 'exchange', 'warranty'
    ];

    const lowerText = text.toLowerCase();
    return commonTopics.filter(topic => lowerText.includes(topic));
  }

  /**
   * Specialized summarization for call transcripts
   */
  async summarizeCallTranscript(
    transcript: string, 
    callType: 'support' | 'sales' | 'general' = 'general'
  ): Promise<SummarizationResult> {
    const promptEnhancement = this.getCallSpecificPrompt(callType);
    
    return this.summarize({
      text: transcript,
      style: 'key_points',
      includeSentiment: true,
      includeKeyTopics: true,
      maxLength: 500,
      language: 'en',
    });
  }

  /**
   * Gets a call-type specific prompt enhancement
   */
  private getCallSpecificPrompt(callType: string): string {
    const prompts = {
      support: 'Focus on the customer issue, steps taken to resolve it, and the final resolution.',
      sales: 'Highlight the product discussed, customer interest level, objections raised, and next steps.',
      general: 'Note the main discussion points, decisions made, and any action items.'
    };
    
    return prompts[callType as keyof typeof prompts] || prompts.general;
  }
}
