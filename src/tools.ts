import { z } from 'zod';

// MCP Connection Tool
export const MCPConnectionTool = {
  name: 'mcp_connection',
  description: 'Handle MCP server connection and authentication',
  inputSchema: z.object({
    url: z.string().url().describe('The public URL of the MCP server'),
    token: z.string().optional().describe('Authentication token if required'),
  }),
};

// Validate Tool
export const ValidateTool = {
  name: 'validate',
  description: 'Validate a bearer token and return user information',
  inputSchema: z.object({
    token: z.string().describe('The bearer token to validate'),
  }),
};

export type MCPConnectionToolInput = {
  arguments: z.infer<typeof MCPConnectionTool.inputSchema>;
};

export type ValidateToolInput = {
  arguments: z.infer<typeof ValidateTool.inputSchema>;
};

export type ValidateToolResult = {
  phoneNumber: string; // Format: {country_code}{number} (e.g., 919876543210 for +91-9876543210)
  isValid: boolean;
  message?: string;
};

// Call Tool
export const CallTool = {
  name: 'call',
  description: 'Make a phone call to a customer using Twilio',
  inputSchema: z.object({
    to: z.string().describe('The phone number to call (e.g., +1234567890)'),
    message: z.string().describe('The message to speak during the call'),
    voice: z.string().optional().default('alice').describe('Voice to use (alice, bob, etc.)'),
    language: z.string().optional().default('en-US').describe('Language for the call (e.g., en-US, es-ES)'),
  }),
};

export type CallToolInput = {
  arguments: z.infer<typeof CallTool.inputSchema>;
};

export type CallToolResult = {
  callId: string;
  status: string;
  to: string;
  from: string;
  message: string;
};

// Call Status Tool
export const CallStatusTool = {
  name: 'call-status',
  description: 'Get the status of a specific call',
  inputSchema: z.object({
    callId: z.string().describe('The Twilio call ID to check status for'),
  }),
};

export type CallStatusToolInput = {
  arguments: z.infer<typeof CallStatusTool.inputSchema>;
};

export type CallStatusToolResult = {
  callId: string;
  status: string;
  duration: string | null;
  startTime: string | null;
  endTime: string | null;
  price: string | null;
};

// List Calls Tool
export const ListCallsTool = {
  name: 'list-calls',
  description: 'List all recent calls made through the system',
  inputSchema: z.object({}),
};

export type ListCallsToolInput = {
  arguments: z.infer<typeof ListCallsTool.inputSchema>;
};

export type ListCallsToolResult = {
  calls: Array<{
    callId: string;
    to: string;
    from: string;
    status: string;
    startTime: string | null;
    duration: string | null;
    price: string | null;
  }>;
};

// Transcribe Tool
export const TranscribeTool = {
  name: 'transcribe',
  description: 'Transcribe audio from a call recording or audio file',
  inputSchema: z.object({
    callId: z.string().optional().describe('Twilio call ID to transcribe'),
    audioUrl: z.string().optional().describe('URL of audio file to transcribe'),
    language: z.string().optional().default('en-US').describe('Language of the audio'),
  }),
};

export type TranscribeToolInput = {
  arguments: z.infer<typeof TranscribeTool.inputSchema>;
};

export type TranscribeToolResult = {
  transcriptionId: string;
  text: string;
  confidence: number;
  language: string;
  duration: number;
  wordCount: number;
};

// Summarize Tool
export const SummarizeTool = {
  name: 'summarize',
  description: 'Summarize call transcript or text content',
  inputSchema: z.object({
    text: z.string().describe('Text content to summarize'),
    maxLength: z.number().optional().default(150).describe('Maximum length of summary'),
    style: z.enum(['bullet', 'paragraph', 'key_points']).optional().default('key_points').describe('Summary style'),
  }),
};

export type SummarizeToolInput = {
  arguments: z.infer<typeof SummarizeTool.inputSchema>;
};

export type SummarizeToolResult = {
  summary: string;
  originalLength: number;
  summaryLength: number;
  keyTopics: string[];
  sentiment: 'positive' | 'negative' | 'neutral';
};

// Record Tool
export const RecordTool = {
  name: 'record',
  description: 'Start or stop recording a call',
  inputSchema: z.object({
    callId: z.string().describe('Twilio call ID to record'),
    action: z.enum(['start', 'stop']).describe('Action to perform: start or stop recording'),
    recordingChannels: z.enum(['dual', 'single']).optional().default('dual').describe('Recording channels'),
    recordingStatusCallback: z.string().optional().describe('Callback URL for recording status updates'),
  }),
};

export type RecordToolInput = {
  arguments: z.infer<typeof RecordTool.inputSchema>;
};

export type RecordToolResult = {
  recordingId: string;
  callId: string;
  status: string;
  action: string;
  recordingUrl?: string;
  duration?: number;
};
