export interface SummarizationOptions {
    text: string;
    maxLength?: number;
    style?: 'bullet' | 'paragraph' | 'key_points';
}
export interface SummarizationResult {
    summary: string;
    originalLength: number;
    summaryLength: number;
    keyTopics: string[];
    sentiment: 'positive' | 'negative' | 'neutral';
}
export declare class SummarizationService {
    constructor();
    summarize(options: SummarizationOptions): Promise<SummarizationResult>;
    private performSummarization;
    private analyzeSentiment;
    private extractKeyTopics;
    summarizeCallTranscript(transcript: string, callType?: 'support' | 'sales' | 'general'): Promise<SummarizationResult>;
    private getCallSpecificPrompt;
}
//# sourceMappingURL=summarization.d.ts.map