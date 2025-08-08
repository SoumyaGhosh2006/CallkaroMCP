export interface TranscriptionOptions {
    callId?: string;
    audioUrl?: string;
    language?: string;
}
export interface TranscriptionResult {
    id: string;
    text: string;
    confidence: number;
    language: string;
    duration: number;
    wordCount: number;
}
export declare class TranscriptionService {
    private client;
    constructor();
    transcribe(options: TranscriptionOptions): Promise<TranscriptionResult>;
    private performTranscription;
    getTranscription(transcriptionId: string): Promise<TranscriptionResult | null>;
    listTranscriptions(limit?: number): Promise<TranscriptionResult[]>;
}
//# sourceMappingURL=transcription.d.ts.map