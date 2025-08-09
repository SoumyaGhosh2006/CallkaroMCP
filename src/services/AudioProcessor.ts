import { randomUUID } from 'crypto';
import { pipeline, Readable, Writable } from 'stream';
import { promisify } from 'util';
import { createWriteStream, promises as fs } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { WSServer } from './WebSocketServer';

export type WebSocketMessage = {
  type: 'connect' | 'media' | 'mark' | 'error' | 'transcription';
  streamSid?: string;
  track?: 'inbound' | 'outbound' | 'both';
  payload?: any;
  event?: string;
  error?: string;
};

const pipelineAsync = promisify(pipeline);

export interface AudioChunk {
  event: 'media' | 'mark' | 'error';
  streamSid: string;
  media?: {
    payload: string; // base64 encoded audio data
    track: 'inbound_track' | 'outbound_track';
    chunk: number;
    timestamp: number;
  };
  mark?: {
    name: string;
    time: number;
  };
  error?: string;
}

export interface TranscriptionResult {
  text: string;
  isFinal: boolean;
  language: string;
  confidence: number;
  alternatives?: {
    text: string;
    confidence: number;
  }[];
}

export class AudioProcessor {
  private audioBuffers: Map<string, Buffer[]> = new Map();
  private wsServer: WSServer;
  private sampleRate = 8000; // Default sample rate (Hz)
  private channels = 1; // Mono audio
  private bitDepth = 16; // 16-bit audio

  constructor(wsServer: WSServer) {
    this.wsServer = wsServer;
  }

  public async processAudioStream(streamSid: string, language: string = 'en-US'): Promise<{
    onTranscription: (callback: (result: TranscriptionResult) => void) => void;
    stop: () => Promise<void>;
  }> {
    console.log(`Starting audio processing for stream: ${streamSid}`);
    
    // Initialize audio buffers for this stream
    this.audioBuffers.set(streamSid, []);
    
    // Set up WebSocket message handler for this stream
    this.wsServer.registerStreamHandler(streamSid, async (message: WebSocketMessage) => {
      try {
        if (message.type === 'media' && message.payload) {
          await this.handleAudioChunk(streamSid, message.payload);
        } else if (message.type === 'mark' && message.payload) {
          console.log(`Received mark: ${message.payload.name} at ${message.payload.time}ms`);
        }
      } catch (error) {
        console.error('Error processing audio chunk:', error);
        this.wsServer.broadcast(streamSid, {
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error processing audio',
        });
      }
    });

    // Set up transcription callback with a no-op default
    let transcriptionCallback: (result: TranscriptionResult) => void = () => {};
    
    // Return control methods
    return {
      onTranscription: (callback) => {
        if (typeof callback === 'function') {
          transcriptionCallback = callback;
        }
      },
      stop: async () => {
        console.log(`Stopping audio processing for stream: ${streamSid}`);
        this.wsServer.unregisterStreamHandler(streamSid);
        this.audioBuffers.delete(streamSid);
        
        // Process any remaining audio data
        const remainingAudio = this.audioBuffers.get(streamSid) || [];
        if (remainingAudio.length > 0) {
          console.log(`Processing ${remainingAudio.length} remaining audio chunks`);
          await this.processAudioBuffer(streamSid, language, transcriptionCallback);
        }
      },
    };
  }

  private async handleAudioChunk(streamSid: string, chunk: any): Promise<void> {
    if (!this.audioBuffers.has(streamSid)) {
      this.audioBuffers.set(streamSid, []);
    }

    const buffer = this.audioBuffers.get(streamSid)!;
    
    // Convert base64 to buffer
    if (chunk.media && chunk.media.payload) {
      const audioData = Buffer.from(chunk.media.payload, 'base64');
      buffer.push(audioData);
      
      // Process the buffer if we have enough data (e.g., 2 seconds of audio)
      const bufferDuration = (buffer.length * audioData.length) / (this.sampleRate * this.channels * (this.bitDepth / 8));
      if (bufferDuration >= 2.0) { // Process every 2 seconds
        await this.processAudioBuffer(streamSid, 'en-US');
      }
    }
  }

  private async processAudioBuffer(
    streamSid: string,
    language: string,
    callback?: (result: TranscriptionResult) => void
  ): Promise<void> {
    const buffer = this.audioBuffers.get(streamSid);
    if (!buffer || buffer.length === 0) return;

    try {
      // Create a temporary file for the audio data
      const tempDir = tmpdir();
      const tempFilePath = path.join(tempDir, `${streamSid}-${Date.now()}.wav`);
      
      // Convert the buffer to a WAV file
      await this.bufferToWavFile(Buffer.concat(buffer), tempFilePath);
      
      // Simulate transcription (replace with actual Twilio Media Streams API call)
      const transcription = await this.transcribeAudio(tempFilePath, language);
      
      // Notify listeners
      if (callback) {
        callback({
          text: transcription.text,
          isFinal: true,
          language,
          confidence: transcription.confidence,
        });
      }
      
      // Clear the processed buffer
      buffer.length = 0;
      
      // Clean up the temporary file
      try {
        await fs.unlink(tempFilePath);
      } catch (e) {
        console.error('Error cleaning up temp file:', e);
      }
      
    } catch (error) {
      console.error('Error processing audio buffer:', error);
      this.wsServer.broadcast(streamSid, {
        type: 'error',
        error: error instanceof Error ? error.message : 'Error processing audio',
      });
    }
  }

  private async bufferToWavFile(audioBuffer: Buffer, filePath: string): Promise<void> {
    // In a real implementation, you would convert the raw audio data to WAV format
    // This is a simplified version that assumes the incoming data is already in WAV format
    await fs.writeFile(filePath, audioBuffer);
  }

  private async transcribeAudio(
    audioFilePath: string,
    language: string
  ): Promise<{ text: string; confidence: number }> {
    // In a real implementation, you would use Twilio's Media Streams API here
    // This is a placeholder that simulates transcription
    console.log(`Transcribing audio file: ${audioFilePath}`);
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return mock transcription
    return {
      text: "This is a simulated transcription of the audio content. In a real implementation, this would be the actual transcribed text from Twilio's Media Streams API.",
      confidence: 0.95,
    };
  }
}
