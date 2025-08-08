import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { TwilioService } from './services/twilio';
import { TranscriptionService } from './services/transcription';
import { SummarizationService } from './services/summarization';
import dotenv from 'dotenv';
// Load environment variables
dotenv.config();
// Initialize services
const twilioService = new TwilioService();
const transcriptionService = new TranscriptionService();
const summarizationService = new SummarizationService();
// Create MCP server
const server = new Server({
    name: 'puch-call-mcp-server',
    version: '1.0.0',
});
// Register tools
server.setRequestHandler('tools/call', async (params) => {
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
    }
    catch (error) {
        console.error('Error making call:', error);
        throw new Error(`Failed to make call: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});
server.setRequestHandler('tools/call-status', async (params) => {
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
    }
    catch (error) {
        console.error('Error getting call status:', error);
        throw new Error(`Failed to get call status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});
server.setRequestHandler('tools/list-calls', async () => {
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
    }
    catch (error) {
        console.error('Error listing calls:', error);
        throw new Error(`Failed to list calls: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});
// New tools from Tech Blueprint
server.setRequestHandler('tools/transcribe', async (params) => {
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
    }
    catch (error) {
        console.error('Error transcribing audio:', error);
        throw new Error(`Failed to transcribe audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});
server.setRequestHandler('tools/summarize', async (params) => {
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
    }
    catch (error) {
        console.error('Error summarizing text:', error);
        throw new Error(`Failed to summarize text: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});
server.setRequestHandler('tools/record', async (params) => {
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
    }
    catch (error) {
        console.error('Error recording call:', error);
        throw new Error(`Failed to record call: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});
// Start the server
const transport = new StdioServerTransport();
await server.connect(transport);
console.log('Puch Call MCP Server started successfully!');
console.log('Available tools:');
console.log('- call: Make a phone call to a customer');
console.log('- call-status: Get the status of a call');
console.log('- list-calls: List all recent calls');
console.log('- transcribe: Transcribe audio from call recordings');
console.log('- summarize: Summarize call transcripts or text content');
console.log('- record: Start or stop recording calls');
//# sourceMappingURL=index.js.map