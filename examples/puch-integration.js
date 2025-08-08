// Example: How Puch WhatsApp bot integrates with the MCP server
// This is a conceptual example showing the integration pattern

class PuchWhatsAppBot {
  constructor(mcpClient) {
    this.mcpClient = mcpClient;
    this.callHistory = new Map();
  }

  // Handle WhatsApp message and potentially trigger a call
  async handleWhatsAppMessage(message, customerPhone) {
    const { text, customerId } = message;
    
    // Example: If customer asks for a call back
    if (text.toLowerCase().includes('call me') || text.toLowerCase().includes('phone call')) {
      return await this.scheduleFollowUpCall(customerId, customerPhone);
    }
    
    // Example: If customer has urgent issue
    if (text.toLowerCase().includes('urgent') || text.toLowerCase().includes('emergency')) {
      return await this.makeImmediateCall(customerId, customerPhone, text);
    }
    
    // Normal WhatsApp response
    return this.sendWhatsAppResponse(text);
  }

  // Schedule a follow-up call
  async scheduleFollowUpCall(customerId, phoneNumber) {
    const message = `Hi! This is Puch from our support team. I noticed you requested a call back. I'm calling to follow up on your recent inquiry. How can I help you today?`;
    
    try {
      const callResult = await this.mcpClient.callTool({
        to: phoneNumber,
        message: message,
        voice: 'alice',
        language: 'en-US'
      });
      
      // Store call information
      this.callHistory.set(callResult.callId, {
        customerId,
        phoneNumber,
        type: 'follow-up',
        timestamp: new Date(),
        status: callResult.status
      });
      
      return {
        type: 'call_initiated',
        callId: callResult.callId,
        message: 'I\'ve initiated a call to you. You should receive it shortly!'
      };
      
    } catch (error) {
      console.error('Failed to make call:', error);
      return {
        type: 'error',
        message: 'Sorry, I couldn\'t make the call right now. Please try again later.'
      };
    }
  }

  // Make an immediate call for urgent issues
  async makeImmediateCall(customerId, phoneNumber, originalMessage) {
    const message = `Hi! This is Puch calling about your urgent inquiry. I understand this is important and I'm here to help right away. Can you tell me more about what you need assistance with?`;
    
    try {
      const callResult = await this.mcpClient.callTool({
        to: phoneNumber,
        message: message,
        voice: 'alice',
        language: 'en-US'
      });
      
      // Store call information
      this.callHistory.set(callResult.callId, {
        customerId,
        phoneNumber,
        type: 'urgent',
        originalMessage,
        timestamp: new Date(),
        status: callResult.status
      });
      
      return {
        type: 'urgent_call_initiated',
        callId: callResult.callId,
        message: 'I\'m calling you right now about your urgent matter!'
      };
      
    } catch (error) {
      console.error('Failed to make urgent call:', error);
      return {
        type: 'error',
        message: 'I couldn\'t make the urgent call. Please contact our emergency support line.'
      };
    }
  }

  // Check call status and update customer
  async checkCallStatus(callId) {
    try {
      const status = await this.mcpClient.callStatusTool({
        callId: callId
      });
      
      const callInfo = this.callHistory.get(callId);
      if (callInfo) {
        callInfo.status = status.status;
        callInfo.duration = status.duration;
        callInfo.endTime = status.endTime;
      }
      
      return status;
    } catch (error) {
      console.error('Failed to check call status:', error);
      return null;
    }
  }

  // Get call history for a customer
  async getCustomerCallHistory(customerId) {
    try {
      const allCalls = await this.mcpClient.listCallsTool({});
      
      return allCalls.calls.filter(call => {
        const callInfo = this.callHistory.get(call.callId);
        return callInfo && callInfo.customerId === customerId;
      });
    } catch (error) {
      console.error('Failed to get call history:', error);
      return [];
    }
  }

  // Transcribe a call recording
  async transcribeCall(callId) {
    try {
      const transcription = await this.mcpClient.transcribeTool({
        callId: callId,
        language: 'en-US'
      });
      
      return {
        type: 'transcription_complete',
        transcriptionId: transcription.transcriptionId,
        text: transcription.text,
        confidence: transcription.confidence,
        wordCount: transcription.wordCount
      };
    } catch (error) {
      console.error('Failed to transcribe call:', error);
      return {
        type: 'error',
        message: 'Could not transcribe the call recording.'
      };
    }
  }

  // Summarize call transcript
  async summarizeCall(transcript, style = 'key_points') {
    try {
      const summary = await this.mcpClient.summarizeTool({
        text: transcript,
        maxLength: 200,
        style: style
      });
      
      return {
        type: 'summary_complete',
        summary: summary.summary,
        keyTopics: summary.keyTopics,
        sentiment: summary.sentiment,
        originalLength: summary.originalLength,
        summaryLength: summary.summaryLength
      };
    } catch (error) {
      console.error('Failed to summarize transcript:', error);
      return {
        type: 'error',
        message: 'Could not summarize the call transcript.'
      };
    }
  }

  // Record a call
  async recordCall(callId, action = 'start') {
    try {
      const recording = await this.mcpClient.recordTool({
        callId: callId,
        action: action,
        recordingChannels: 'dual'
      });
      
      return {
        type: 'recording_' + action,
        recordingId: recording.recordingId,
        status: recording.status,
        recordingUrl: recording.recordingUrl
      };
    } catch (error) {
      console.error('Failed to record call:', error);
      return {
        type: 'error',
        message: `Could not ${action} recording the call.`
      };
    }
  }

  // Complete call workflow: Record -> Transcribe -> Summarize
  async processCallWorkflow(callId) {
    try {
      // 1. Start recording
      const recordingResult = await this.recordCall(callId, 'start');
      if (recordingResult.type === 'error') {
        return recordingResult;
      }

      // 2. Wait for call to end (in real implementation, you'd wait for webhook)
      // For demo purposes, we'll simulate this
      await new Promise(resolve => setTimeout(resolve, 5000));

      // 3. Stop recording
      await this.recordCall(callId, 'stop');

      // 4. Transcribe the recording
      const transcriptionResult = await this.transcribeCall(callId);
      if (transcriptionResult.type === 'error') {
        return transcriptionResult;
      }

      // 5. Summarize the transcript
      const summaryResult = await this.summarizeCall(transcriptionResult.text);
      if (summaryResult.type === 'error') {
        return summaryResult;
      }

      return {
        type: 'workflow_complete',
        callId: callId,
        transcription: transcriptionResult,
        summary: summaryResult
      };
    } catch (error) {
      console.error('Call workflow failed:', error);
      return {
        type: 'error',
        message: 'Call processing workflow failed.'
      };
    }
  }

  // Send WhatsApp response
  sendWhatsAppResponse(message) {
    return {
      type: 'whatsapp_response',
      message: message
    };
  }
}

// Example usage:
/*
const mcpClient = new MCPClient({
  server: 'puch-call-mcp-server',
  config: {
    TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN,
    TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER
  }
});

const puch = new PuchWhatsAppBot(mcpClient);

// Handle incoming WhatsApp message
await puch.handleWhatsAppMessage({
  text: "Can you call me? I need help with my order.",
  customerId: "customer123"
}, "+1234567890");
*/

module.exports = { PuchWhatsAppBot };
