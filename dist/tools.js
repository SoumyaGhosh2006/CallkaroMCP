import { z } from 'zod';
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
// Call Status Tool
export const CallStatusTool = {
    name: 'call-status',
    description: 'Get the status of a specific call',
    inputSchema: z.object({
        callId: z.string().describe('The Twilio call ID to check status for'),
    }),
};
// List Calls Tool
export const ListCallsTool = {
    name: 'list-calls',
    description: 'List all recent calls made through the system',
    inputSchema: z.object({}),
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
//# sourceMappingURL=tools.js.map