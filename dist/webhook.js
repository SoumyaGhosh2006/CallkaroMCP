import express from 'express';
import cors from 'cors';
import { TwilioService } from './services/twilio.js';
const app = express();
const port = process.env.MCP_SERVER_PORT || 3000;
// Middleware
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Initialize Twilio service
const twilioService = new TwilioService();
// Webhook endpoint for call status updates
app.post('/webhook/call-status', (req, res) => {
    const { CallSid, CallStatus, CallDuration, CallStartTime, CallEndTime, CallPrice, To, From, } = req.body;
    console.log('Call Status Update:', {
        callId: CallSid,
        status: CallStatus,
        duration: CallDuration,
        startTime: CallStartTime,
        endTime: CallEndTime,
        price: CallPrice,
        to: To,
        from: From,
    });
    // Here you can add logic to:
    // - Update your database
    // - Send notifications to Puch
    // - Log call analytics
    // - Trigger follow-up actions
    res.status(200).send('OK');
});
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        service: 'puch-call-mcp-server',
        timestamp: new Date().toISOString(),
    });
});
// Start the webhook server
app.listen(port, () => {
    console.log(`Webhook server listening on port ${port}`);
    console.log(`Call status webhook: http://localhost:${port}/webhook/call-status`);
});
export default app;
//# sourceMappingURL=webhook.js.map