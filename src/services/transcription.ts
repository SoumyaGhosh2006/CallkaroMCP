import twilio from 'twilio';
import { randomUUID } from 'crypto';
import axios from 'axios';
import { createWriteStream, promises as fs } from 'fs';
import { promisify } from 'util';
import { pipeline, Readable } from 'stream';
import { tmpdir } from 'os';
import path from 'path';
import { WSServer } from './WebSocketServer';
import { AudioProcessor } from './AudioProcessor';
import type { WebSocketMessage } from '../types/websocket';

const streamPipeline = promisify(pipeline);

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
  status: 'completed' | 'failed' | 'in-progress';
  error?: string;
  metadata?: {
    callSid?: string;
    recordingSid?: string;
    startTime?: string;
    endTime?: string;
    channels?: number;
    sampleRate?: number;
  };
}

export class TranscriptionService {
  private _client: twilio.Twilio | null = null;
  private wsServer: WSServer | null = null;
  private audioProcessor: AudioProcessor | null = null;
  private activeStreams: Map<string, {
    onTranscription: (result: any) => void;
    stop: () => Promise<void>;
  }> = new Map();

  // Lazy initialization getter
  private get client(): twilio.Twilio {
    if (!this._client) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;

      if (!accountSid || !authToken) {
        throw new Error('Twilio credentials not found. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.');
      }

      this._client = twilio(accountSid, authToken);
    }
    return this._client;
  }

  constructor(httpServer?: any) {
    if (httpServer) {
      this.wsServer = new WSServer(httpServer);
      this.audioProcessor = new AudioProcessor(this.wsServer);
      console.log('WebSocket server and AudioProcessor initialized');
    }
  }

  async transcribe(options: TranscriptionOptions): Promise<TranscriptionResult> {
    const { callId, audioUrl, language = 'en-US' } = options;
    const transcriptionId = `trans_${randomUUID()}`;

    try {
      // If we have a WebSocket server and this is a new stream
      if (callId && this.audioProcessor) {
        // Start real-time transcription
        const streamSid = callId;
        
        // Start processing the audio stream
        const streamProcessor = await this.audioProcessor.processAudioStream(streamSid, language);
        
        // Store the stream processor for later cleanup
        this.activeStreams.set(streamSid, streamProcessor);
        
        // Set up transcription callback
        streamProcessor.onTranscription((result) => {
          console.log('Received transcription:', result);
          // You can emit this to connected clients or store it
        });
        
        // Return initial response
        return {
          id: transcriptionId,
          text: '',
          confidence: 0,
          language,
          duration: 0,
          status: 'in-progress',
          wordCount: 0,
          metadata: {
            callSid: callId,
            startTime: new Date().toISOString(),
          }
        };
      }
      
      // Fall back to batch processing for audio URLs
      if (audioUrl) {
        const transcription = await this.performTranscription(audioUrl, language);
        return {
          id: transcriptionId,
          text: transcription.text,
          confidence: transcription.confidence,
          language,
          duration: transcription.duration,
          status: transcription.status,
          wordCount: transcription.text?.trim().split(/\s+/).filter(word => word.length > 0).length || 0,
        };
      }
      
      throw new Error('Either callId (for real-time) or audioUrl (for batch) must be provided');
    } catch (error) {
      console.error('Transcription error:', error);
      throw new Error(`Failed to transcribe audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async downloadAudioFile(url: string): Promise<string> {
    const tempFilePath = path.join(tmpdir(), `audio-${Date.now()}.wav`);
    const writer = createWriteStream(tempFilePath);
    
    try {
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream'
      });
      
      await streamPipeline(response.data, writer);
      return tempFilePath;
    } catch (error) {
      // Clean up the file if it was partially downloaded
      try {
        await fs.unlink(tempFilePath);
      } catch (e) {
        console.error('Error cleaning up temp file:', e);
      }
      throw new Error(`Failed to download audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async transcribeWithTwilio(audioFilePath: string, language: string): Promise<{
    text: string;
    confidence: number;
    duration: number;
    status: 'completed' | 'failed' | 'in-progress';
  }> {
    try {
      // Note: In a real implementation, you would use Twilio's Media Streams API
      // This is a placeholder implementation that simulates the behavior
      console.log(`[Transcription] Simulating transcription for file: ${audioFilePath}`);
      
      // In a real implementation, you would use:
      // const mediaProcessor = await this.client.mediaProcessor.create({
      //   extension: 'audio-transcription',
      //   extensionContext: JSON.stringify({
      //     languageCode: language,
      //     enableAutomaticPunctuation: true,
      //     enableSpeakerDiarization: true,
      //     maxSpeakerCount: 2
      //   }),
      //   extensionEnvironment: {
      //     twilio: {
      //       accountSid: process.env.TWILIO_ACCOUNT_SID,
      //       authToken: process.env.TWILIO_AUTH_TOKEN
      //     }
      //   }
      // });
      
      // For now, read the file to ensure it exists (simulating processing)
      await fs.access(audioFilePath);
      
      // Clean up the temporary file
      try {
        await fs.unlink(audioFilePath);
      } catch (cleanupError) {
        console.error('Error cleaning up audio file:', cleanupError);
      }
      
      // Return a mock result for now
      return {
        text: "This is a simulated transcription. In a real implementation, this would be the actual transcribed text from Twilio's Media Streams API.",
        confidence: 0.95,
        duration: 30,
        status: 'completed' as const
      };
      
    } catch (error) {
      console.error('Transcription error:', error);
      throw new Error(`Twilio transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async performTranscription(audioUrl: string, language: string): Promise<{
    text: string;
    confidence: number;
    duration: number;
    status: 'completed' | 'failed' | 'in-progress';
  }> {
    let audioFilePath = '';
    try {
      // Download the audio file
      audioFilePath = await this.downloadAudioFile(audioUrl);
      
      try {
        // Transcribe using Twilio
        return await this.transcribeWithTwilio(audioFilePath, language);
      } catch (error) {
        console.error('Twilio transcription failed, falling back to basic transcription:', error);
        // Fallback to basic transcription if Twilio fails
        return await this.performBasicTranscription(audioFilePath, language);
      }
    } catch (error) {
      console.error('Transcription failed:', error);
      // Clean up the file if it exists and there was an error
      if (audioFilePath) {
        try {
          await fs.unlink(audioFilePath).catch(e => console.error('Error cleaning up audio file:', e));
        } catch (e) {
          console.error('Error in cleanup during transcription failure:', e);
        }
      }
      throw new Error(`Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  private async performBasicTranscription(audioFilePath: string, _language: string): Promise<{
    text: string;
    confidence: number;
    duration: number;
    status: 'completed' | 'failed' | 'in-progress';
  }> {
    // This is a fallback implementation when Twilio transcription fails
    // In a production environment, you might want to implement a more robust fallback
    
    // Clean up the file
    try {
      await fs.unlink(audioFilePath);
    } catch (e) {
      console.error('Error cleaning up temp file:', e);
    }
    
    // Return a basic transcription result
    return {
      text: "[Transcription service unavailable. Please try again later.]",
      confidence: 0,
      duration: 0,
      status: 'failed' as const
    };
  }

  async getTranscription(transcriptionId: string): Promise<TranscriptionResult | null> {
    try {
      // In a real implementation, you would fetch this from your database
      // For now, we'll return a mock result
      return {
        id: transcriptionId,
        text: "This is a mock transcription result. In a real implementation, this would be fetched from your database.",
        confidence: 0.9,
        language: 'en-US',
        duration: 60,
        wordCount: 15,
        status: 'completed',
        metadata: {
          callSid: 'CA' + randomUUID().replace(/-/g, '').substring(0, 32),
          recordingSid: 'RE' + randomUUID().replace(/-/g, '').substring(0, 32),
          startTime: new Date().toISOString(),
          endTime: new Date(Date.now() + 60000).toISOString(),
          channels: 1,
          sampleRate: 8000
        }
      };
    } catch (error) {
      console.error('Error getting transcription:', error);
      return {
        id: transcriptionId,
        text: "Error retrieving transcription.",
        confidence: 0,
        language: 'en-US',
        duration: 0,
        wordCount: 0,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {}
      };
    }
  }

  async listTranscriptions(limit: number = 50): Promise<TranscriptionResult[]> {
    try {
      // In a real implementation, you would fetch this from your database
      // For now, return a mock list of transcriptions
      const mockTranscriptions: TranscriptionResult[] = [
        {
          id: 'trans_' + randomUUID(),
          text: "First mock transcription result.",
          confidence: 0.9,
          language: 'en-US',
          duration: 120,
          wordCount: 30,
          status: 'completed',
          metadata: {
            callSid: 'CA' + randomUUID().replace(/-/g, '').substring(0, 32),
            recordingSid: 'RE' + randomUUID().replace(/-/g, '').substring(0, 32),
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 120000).toISOString(),
            channels: 1,
            sampleRate: 8000
          }
        },
        {
          id: 'trans_' + randomUUID(),
          text: "Second mock transcription result.",
          confidence: 0.85,
          language: 'en-US',
          duration: 180,
          wordCount: 45,
          status: 'completed',
          metadata: {
            callSid: 'CA' + randomUUID().replace(/-/g, '').substring(0, 32),
            recordingSid: 'RE' + randomUUID().replace(/-/g, '').substring(0, 32),
            startTime: new Date().toISOString(),
            endTime: new Date(Date.now() + 180000).toISOString(),
            channels: 1,
            sampleRate: 8000
          }
        }
      ];
      
      return mockTranscriptions.slice(0, limit);
    } catch (error) {
      console.error('Error listing transcriptions:', error);
      throw new Error(`Failed to list transcriptions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
