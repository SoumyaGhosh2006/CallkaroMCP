import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { CallTool, CallStatusTool, ListCallsTool, TranscribeTool, SummarizeTool, RecordTool, ValidateTool } from './tools';
import { TwilioService } from './services/twilio';
import { TranscriptionService } from './services/transcription';
import { SummarizationService } from './services/summarization';
import { AuthService } from './services/auth';
import { Server as HttpServer } from 'http';
interface CallParams {
  to: string;
  message: string;
  voice?: string;
  language?: string;
}

interface TranscribeParams {
  callSid?: string;
  audioUrl?: string;
  language?: string;
}

interface MCPServerOptions {
  twilioService: TwilioService;
  transcriptionService: TranscriptionService;
  summarizationService: SummarizationService;
  authService: AuthService;
}

export function createMCPServer(httpServer: HttpServer, services: MCPServerOptions) {
  const { twilioService, transcriptionService, summarizationService, authService } = services;

  // Create MCP server
  const mcpServer = new Server({
    name: 'puch-call-mcp-server',
    version: '1.0.0',
  });

  // Define the method schema
  const methodSchema = z.object({
    method: z.literal('tools/call')
  });

  // Define the request type for call tool
  type CallRequest = { method: 'tools/call' } & { arguments: CallParams };

  // Register tool handlers using setRequestHandler with Zod schema
  // Register call tool handler
  mcpServer.setRequestHandler(methodSchema, async (request: any) => {
    try {
      const { to, message, voice = 'alice', language = 'en-US' } = request;
      
      console.log(`Making call to ${to} with message: ${message}`);
      
      const call = await twilioService.makeCall({
        to,
        message,
        voice,
        language,
      });

      return {
        callSid: call.sid,
        status: call.status,
        from: call.from,
        to: call.to,
        dateCreated: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error making call:', error);
      throw new Error(`Failed to make call: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  // Define the method schema for call-status
  const callStatusMethodSchema = z.object({
    method: z.literal('tools/call-status')
  });

  // Define the request type for call-status tool
  type CallStatusRequest = { method: 'tools/call-status' } & { arguments: { callSid: string } };

  // Register call-status tool handler
  mcpServer.setRequestHandler(callStatusMethodSchema, async (request: any) => {
    try {
      const { callSid } = request;
      // Get call details from Twilio using the public method
      const call = await twilioService.getCall(callSid);
      
      return {
        callSid: call.sid,
        status: call.status,
        from: call.from,
        to: call.to,
        duration: call.duration,
        dateCreated: call.dateCreated ? new Date(call.dateCreated).toISOString() : new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error getting call status:', error);
      throw new Error(`Failed to get call status: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  // Define the method schema for transcribe
  const transcribeMethodSchema = z.object({
    method: z.literal('tools/transcribe')
  });

  // Define the request type for transcribe tool
  type TranscribeRequest = { method: 'tools/transcribe' } & { arguments: TranscribeParams };

  // Register transcribe tool handler
  mcpServer.setRequestHandler(transcribeMethodSchema, async (request: any) => {
    try {
      const { callSid, audioUrl, language = 'en-US' } = request;
      
      if (callSid) {
        // Use the existing transcribe method for calls
        const result = await transcriptionService.transcribe({
          callId: callSid,  // Changed from callSid to callId to match the expected interface
          language
        });
        return {
          text: result.text,
          language: result.language,
          callId: callSid,
          status: 'completed'
        };
      } else if (audioUrl) {
        // For direct audio URLs, we'd need to implement this in the service
        throw new Error('Direct audio URL transcription is not yet implemented');
      } else {
        throw new Error('Either callSid or audioUrl must be provided');
      }
    } catch (error) {
      console.error('Error transcribing audio:', error);
      throw new Error(`Failed to transcribe audio: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  // List calls handler
  // Define the method schema for list-calls
  const listCallsMethodSchema = z.object({
    method: z.literal('tools/list-calls')
  });

  // Register list-calls tool handler
  mcpServer.setRequestHandler(listCallsMethodSchema, async () => {
    try {
      const calls = await twilioService.listCalls();
      return {
        calls: calls.map(call => ({
          callSid: call.sid,
          status: call.status,
          from: call.from,
          to: call.to,
          startTime: call.startTime || null,
          duration: call.duration,
          price: call.price,
        }))
      };
    } catch (error) {
      console.error('Error listing calls:', error);
      throw new Error(`Failed to list calls: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  // Summarize handler
  // Define the method schema for summarize
  const summarizeMethodSchema = z.object({
    method: z.literal('tools/summarize')
  });

  // Define the request type for summarize tool
  type SummarizeRequest = { method: 'tools/summarize' } & { arguments: { text: string; language?: string } };

  // Register summarize tool handler
  mcpServer.setRequestHandler(summarizeMethodSchema, async (request: any) => {
    try {
      const { text, language = 'en' } = request;
      const summary = await summarizationService.summarize({
        text,
        language
      });
      return {
        summary: summary.summary,
        language: summary.language
      };
    } catch (error) {
      console.error('Error summarizing text:', error);
      throw new Error(`Failed to summarize text: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  // Record handler
  // Define the method schema for record
  const recordMethodSchema = z.object({
    method: z.literal('tools/record')
  });

  // Define the request type for record tool
  type RecordRequest = { method: 'tools/record' } & { arguments: { callSid: string; action: 'start' | 'stop' } };

  // Register record tool handler
  mcpServer.setRequestHandler(recordMethodSchema, async (request: any) => {
    try {
      const { callSid, action } = request;
      if (action === 'start') {
        // Implementation for starting recording
        return { status: 'started', callSid };
      } else {
        // Implementation for stopping recording
        return { status: 'stopped', callSid };
      }
    } catch (error) {
      console.error('Error managing recording:', error);
      throw new Error(`Failed to manage recording: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  // Validate handler
  // Define the method schema for validate
  const validateMethodSchema = z.object({
    method: z.literal('tools/validate')
  });

  // Define the request type for validate tool
  type ValidateRequest = { method: 'tools/validate' } & { arguments: { token: string } };

  // Register validate tool handler
  mcpServer.setRequestHandler(validateMethodSchema, async (request: any) => {
    try {
      const { token } = request;
      const userInfo = await authService.validateToken(token);
      return {
        isValid: true,
        userId: userInfo.user?.id,
        phoneNumber: userInfo.user?.phoneNumber
      };
    } catch (error) {
      console.error('Token validation failed:', error);
      return {
        isValid: false,
        error: error instanceof Error ? error.message : 'Invalid token'
      };
    }
  });

  return mcpServer;
}
