// Complete Workflow Example: How Puch uses all MCP tools together
// This demonstrates the full Tech Blueprint implementation

class PuchCompleteWorkflow {
  constructor(mcpClient) {
    this.mcpClient = mcpClient;
    this.activeCalls = new Map();
  }

  // Complete customer service workflow
  async handleCustomerServiceRequest(customerPhone, issue) {
    console.log(`🚀 Starting complete workflow for customer: ${customerPhone}`);
    
    try {
      // Step 1: Make the call
      const callResult = await this.makeCall(customerPhone, issue);
      if (callResult.type === 'error') return callResult;
      
      const callId = callResult.callId;
      this.activeCalls.set(callId, { customerPhone, issue, startTime: new Date() });
      
      // Step 2: Start recording the call
      const recordingResult = await this.startRecording(callId);
      if (recordingResult.type === 'error') {
        console.warn('Recording failed, but call continues:', recordingResult.message);
      }
      
      // Step 3: Monitor call status
      const callStatus = await this.monitorCall(callId);
      
      // Step 4: Process call data after completion
      if (callStatus.status === 'completed') {
        return await this.processCompletedCall(callId);
      }
      
      return {
        type: 'workflow_in_progress',
        callId,
        status: callStatus.status,
        message: 'Call workflow is in progress'
      };
      
    } catch (error) {
      console.error('Workflow error:', error);
      return {
        type: 'error',
        message: 'Customer service workflow failed'
      };
    }
  }

  // Make initial call
  async makeCall(phoneNumber, issue) {
    const message = `Hi! This is Puch from customer support. I understand you have an issue with ${issue}. I'm here to help you resolve this today.`;
    
    try {
      const result = await this.mcpClient.callTool({
        to: phoneNumber,
        message: message,
        voice: 'alice',
        language: 'en-US'
      });
      
      return {
        type: 'call_initiated',
        callId: result.callId,
        status: result.status,
        message: 'Call started successfully'
      };
    } catch (error) {
      return {
        type: 'error',
        message: 'Failed to initiate call'
      };
    }
  }

  // Start recording
  async startRecording(callId) {
    try {
      const result = await this.mcpClient.recordTool({
        callId: callId,
        action: 'start',
        recordingChannels: 'dual'
      });
      
      return {
        type: 'recording_started',
        recordingId: result.recordingId,
        status: result.status
      };
    } catch (error) {
      return {
        type: 'error',
        message: 'Failed to start recording'
      };
    }
  }

  // Monitor call status
  async monitorCall(callId) {
    try {
      const status = await this.mcpClient.callStatusTool({
        callId: callId
      });
      
      return status;
    } catch (error) {
      console.error('Error monitoring call:', error);
      return { status: 'unknown' };
    }
  }

  // Process completed call
  async processCompletedCall(callId) {
    console.log(`📝 Processing completed call: ${callId}`);
    
    try {
      // Step 1: Stop recording
      await this.stopRecording(callId);
      
      // Step 2: Transcribe the recording
      const transcription = await this.transcribeCall(callId);
      if (transcription.type === 'error') {
        return transcription;
      }
      
      // Step 3: Summarize the transcript
      const summary = await this.summarizeTranscript(transcription.text);
      if (summary.type === 'error') {
        return summary;
      }
      
      // Step 4: Generate insights
      const insights = await this.generateInsights(transcription, summary);
      
      // Step 5: Create follow-up action
      const followUp = await this.createFollowUpAction(callId, insights);
      
      return {
        type: 'workflow_complete',
        callId: callId,
        transcription: transcription,
        summary: summary,
        insights: insights,
        followUp: followUp,
        message: 'Complete workflow finished successfully'
      };
      
    } catch (error) {
      console.error('Error processing completed call:', error);
      return {
        type: 'error',
        message: 'Failed to process completed call'
      };
    }
  }

  // Stop recording
  async stopRecording(callId) {
    try {
      await this.mcpClient.recordTool({
        callId: callId,
        action: 'stop'
      });
      
      console.log(`✅ Recording stopped for call: ${callId}`);
    } catch (error) {
      console.warn('Failed to stop recording:', error);
    }
  }

  // Transcribe call
  async transcribeCall(callId) {
    try {
      const result = await this.mcpClient.transcribeTool({
        callId: callId,
        language: 'en-US'
      });
      
      return {
        type: 'transcription_complete',
        transcriptionId: result.transcriptionId,
        text: result.text,
        confidence: result.confidence,
        wordCount: result.wordCount
      };
    } catch (error) {
      return {
        type: 'error',
        message: 'Failed to transcribe call'
      };
    }
  }

  // Summarize transcript
  async summarizeTranscript(transcript) {
    try {
      const result = await this.mcpClient.summarizeTool({
        text: transcript,
        maxLength: 200,
        style: 'key_points'
      });
      
      return {
        type: 'summary_complete',
        summary: result.summary,
        keyTopics: result.keyTopics,
        sentiment: result.sentiment,
        originalLength: result.originalLength,
        summaryLength: result.summaryLength
      };
    } catch (error) {
      return {
        type: 'error',
        message: 'Failed to summarize transcript'
      };
    }
  }

  // Generate insights
  async generateInsights(transcription, summary) {
    const insights = {
      callQuality: this.assessCallQuality(transcription.confidence),
      customerSentiment: summary.sentiment,
      keyIssues: summary.keyTopics,
      actionRequired: this.determineActionRequired(summary),
      followUpNeeded: this.assessFollowUpNeeded(summary)
    };
    
    return insights;
  }

  // Assess call quality
  assessCallQuality(confidence) {
    if (confidence >= 0.9) return 'excellent';
    if (confidence >= 0.7) return 'good';
    if (confidence >= 0.5) return 'fair';
    return 'poor';
  }

  // Determine if action is required
  determineActionRequired(summary) {
    const urgentKeywords = ['urgent', 'emergency', 'broken', 'failed', 'critical'];
    const hasUrgentIssue = urgentKeywords.some(keyword => 
      summary.summary.toLowerCase().includes(keyword)
    );
    
    return hasUrgentIssue ? 'immediate' : 'standard';
  }

  // Assess if follow-up is needed
  assessFollowUpNeeded(summary) {
    return summary.sentiment === 'negative' || summary.keyTopics.length > 0;
  }

  // Create follow-up action
  async createFollowUpAction(callId, insights) {
    const callInfo = this.activeCalls.get(callId);
    
    if (insights.actionRequired === 'immediate') {
      // Create urgent follow-up
      return {
        type: 'urgent_follow_up',
        priority: 'high',
        action: 'Escalate to senior support',
        timeline: 'within 1 hour'
      };
    } else if (insights.followUpNeeded) {
      // Create standard follow-up
      return {
        type: 'standard_follow_up',
        priority: 'medium',
        action: 'Schedule follow-up call',
        timeline: 'within 24 hours'
      };
    } else {
      // No follow-up needed
      return {
        type: 'no_follow_up',
        priority: 'low',
        action: 'Close ticket',
        timeline: 'immediate'
      };
    }
  }

  // WhatsApp command handler
  async handleWhatsAppCommand(message, customerPhone) {
    const { text } = message;
    
    // Parse command: /call +1-XXX-XXXXXXX to confirm order
    const callCommand = text.match(/\/call\s+([+\d-]+)\s+(.+)/);
    
    if (callCommand) {
      const phoneNumber = callCommand[1];
      const reason = callCommand[2];
      
      return await this.handleCustomerServiceRequest(phoneNumber, reason);
    }
    
    // Handle other commands
    if (text.toLowerCase().includes('transcribe')) {
      // Handle transcription request
      return { type: 'transcription_request', message: 'Transcription feature available' };
    }
    
    if (text.toLowerCase().includes('summarize')) {
      // Handle summarization request
      return { type: 'summarization_request', message: 'Summarization feature available' };
    }
    
    return {
      type: 'unknown_command',
      message: 'Available commands: /call <phone> <reason>, transcribe, summarize'
    };
  }
}

// Example usage:
/*
const workflow = new PuchCompleteWorkflow(mcpClient);

// Handle WhatsApp command
await workflow.handleWhatsAppCommand({
  text: "/call +1-555-123-4567 to confirm order"
}, "+1-555-123-4567");

// Handle customer service request
await workflow.handleCustomerServiceRequest(
  "+1-555-123-4567", 
  "order confirmation"
);
*/

module.exports = { PuchCompleteWorkflow };
