import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import http from 'http';
import express from 'express';
import cors from 'cors';
import {
  CallTool,
  CallToolInput,
  CallToolResult,
  CallStatusTool,
  CallStatusToolInput,
  CallStatusToolResult,
  ListCallsTool,
  ListCallsToolResult,
  TranscribeTool,
  TranscribeToolInput,
  TranscribeToolResult,
  SummarizeTool,
  SummarizeToolInput,
  SummarizeToolResult,
  RecordTool,
  RecordToolInput,
  RecordToolResult,
  ValidateTool,
  ValidateToolInput,
  ValidateToolResult,
} from './tools';
import { TwilioService } from './services/twilio';
import { TranscriptionService } from './services/transcription';
import { SummarizationService } from './services/summarization';
import { AuthService } from './services/auth';
import dotenv from 'dotenv';
import { WSServer } from './services/WebSocketServer';
import { MCPConnectionTool } from './tools';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create HTTP server
const server = http.createServer(app);

// Initialize services
const twilioService = new TwilioService();
const transcriptionService = new TranscriptionService(server); // Pass server to initialize WebSocket
const summarizationService = new SummarizationService();
const authService = new AuthService();

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// MCP connection endpoint
app.post('/mcp/connect', (req, res) => {
  try {
    const { url, token } = req.body;
    
    // Validate the connection request
    if (!url) {
      return res.status(400).json({ 
        success: false, 
        error: 'URL is required' 
      });
    }
    
    // Here you would typically:
    // 1. Validate the token if authentication is required
    // 2. Store the connection details
    // 3. Initialize any required services
    
    console.log(`MCP connection established with URL: ${url}`);
    
    res.status(200).json({ 
      success: true, 
      message: 'MCP connection established',
      serverInfo: {
        name: 'puch-call-mcp-server',
        version: '1.0.0',
        capabilities: [
          'call',
          'transcribe',
          'summarize',
          'record',
          'validate'
        ]
      }
    });
  } catch (error) {
    console.error('Error handling MCP connection:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to establish MCP connection' 
    });
  }
});

// Create MCP server
const mcpServer = new Server(
  {
    name: 'puch-call-mcp-server',
    version: '1.0.0',
  }
);

// Start the HTTP server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});

// Register tools
(mcpServer as any).setRequestHandler('tools/call', async (params: any): Promise<CallToolResult> => {
  try {
    const { to, message, voice = 'alice', language = 'en-US' } = params.arguments;
    
    console.log(`Making call to ${to} with message: ${message}`);
    
    const call = await twilioService.makeCall({
      to,
      message,
      voice,
      language,
    });
    
    return {
      callId: call.sid,
      status: call.status,
      to: call.to,
      from: call.from,
      message: 'Call initiated successfully',
    };
  } catch (error) {
    console.error('Error making call:', error);
    throw new Error(`Failed to make call: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

(server as any).setRequestHandler('tools/call-status', async (params: any): Promise<CallStatusToolResult> => {
  try {
    const { callId } = params.arguments;
    
    const callStatus = await twilioService.getCallStatus(callId);
    
    return {
      callId,
      status: callStatus.status,
      duration: callStatus.duration,
      startTime: callStatus.startTime,
      endTime: callStatus.endTime,
      price: callStatus.price,
    };
  } catch (error) {
    console.error('Error getting call status:', error);
    throw new Error(`Failed to get call status: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

(server as any).setRequestHandler('tools/list-calls', async (): Promise<ListCallsToolResult> => {
  try {
    const calls = await twilioService.listCalls();
    
    return {
      calls: calls.map(call => ({
        callId: call.sid,
        to: call.to,
        from: call.from,
        status: call.status,
        startTime: call.startTime,
        duration: call.duration,
        price: call.price,
      })),
    };
  } catch (error) {
    console.error('Error listing calls:', error);
    throw new Error(`Failed to list calls: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

// New tools from Tech Blueprint
(server as any).setRequestHandler('tools/transcribe', async (params: any): Promise<TranscribeToolResult> => {
  try {
    const { callId, audioUrl, language = 'en-US' } = params.arguments;
    
    console.log(`Transcribing audio for call: ${callId || audioUrl}`);
    
    const transcription = await transcriptionService.transcribe({
      callId,
      audioUrl,
      language,
    });
    
    return {
      transcriptionId: transcription.id,
      text: transcription.text,
      confidence: transcription.confidence,
      language: transcription.language,
      duration: transcription.duration,
      wordCount: transcription.wordCount,
    };
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw new Error(`Failed to transcribe audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

(server as any).setRequestHandler('tools/summarize', async (params: any): Promise<SummarizeToolResult> => {
  try {
    const { text, maxLength = 150, style = 'key_points' } = params.arguments;
    
    console.log(`Summarizing text with style: ${style}`);
    
    const summary = await summarizationService.summarize({
      text,
      maxLength,
      style,
    });
    
    return {
      summary: summary.summary,
      originalLength: summary.originalLength,
      summaryLength: summary.summaryLength,
      keyTopics: summary.keyTopics,
      sentiment: summary.sentiment,
    };
  } catch (error) {
    console.error('Error summarizing text:', error);
    throw new Error(`Failed to summarize text: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

(server as any).setRequestHandler('tools/record', async (params: any): Promise<RecordToolResult> => {
  try {
    const { callId, action, recordingChannels = 'dual', recordingStatusCallback } = params.arguments;
    
    console.log(`Recording action: ${action} for call: ${callId}`);
    
    const recording = await twilioService.recordCall({
      callId,
      action,
      recordingChannels,
      recordingStatusCallback,
    });
    
    return {
      recordingId: recording.sid,
      callId: recording.callSid,
      status: recording.status,
      action,
      recordingUrl: recording.uri,
      duration: recording.duration,
    };
  } catch (error) {
    console.error('Error recording call:', error);
    throw new Error(`Failed to record call: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
});

// Register validate tool handler
(server as any).setRequestHandler('tools/validate', async (params: ValidateToolInput): Promise<ValidateToolResult> => {
  try {
    const { token } = params.arguments;
    
    console.log(`Validating token: ${token.substring(0, 8)}...`);
    
    const { user, message } = await authService.validateToken(token);
    
    if (!user) {
      return {
        phoneNumber: '',
        isValid: false,
        message: message || 'Invalid token'
      };
    }
    
    return {
      phoneNumber: user.phoneNumber,
      isValid: true,
      message: 'Token validated successfully'
    };
  } catch (error) {
    console.error('Error validating token:', error);
    return {
      phoneNumber: '',
      isValid: false,
      message: `Error validating token: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
});

// Start the MCP server
const transport = new StdioServerTransport();

// Connect to the MCP server
mcpServer.connect(transport).then(() => {
  console.log('Puch Call MCP Server is running...');
  
  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    
    // Close the HTTP server
    server.close(async () => {
      console.log('HTTP server closed');
      
      // Close the MCP server
      await mcpServer.close();
      console.log('MCP server closed');
      
      process.exit(0);
    });
  });
}).catch(error => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});

console.log('Puch Call MCP Server started successfully!');
console.log('Available tools:');
console.log('- validate: Validate a bearer token and return user information');
console.log('- call: Make a phone call to a customer');
console.log('- call-status: Get the status of a call');
console.log('- list-calls: List all recent calls');
console.log('- transcribe: Transcribe audio from call recordings');
console.log('- summarize: Summarize call transcripts or text content');
console.log('- record: Start or stop recording calls');
