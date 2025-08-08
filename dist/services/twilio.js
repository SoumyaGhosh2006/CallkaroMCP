import twilio from 'twilio';
export class TwilioService {
    client;
    fromNumber;
    constructor() {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        this.fromNumber = process.env.TWILIO_PHONE_NUMBER || '';
        if (!accountSid || !authToken) {
            throw new Error('Twilio credentials not found. Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables.');
        }
        if (!this.fromNumber) {
            throw new Error('Twilio phone number not found. Please set TWILIO_PHONE_NUMBER environment variable.');
        }
        this.client = twilio(accountSid, authToken);
    }
    async makeCall(options) {
        const { to, message, voice = 'alice', language = 'en-US' } = options;
        // Create TwiML for the call
        const twiml = new twilio.twiml.VoiceResponse();
        twiml.say({
            voice: voice,
            language: language,
        }, message);
        // Make the call
        const call = await this.client.calls.create({
            to,
            from: this.fromNumber,
            twiml: twiml.toString(),
            statusCallback: `${process.env.WEBHOOK_BASE_URL || 'http://localhost:3000'}/webhook/call-status`,
            statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
            statusCallbackMethod: 'POST',
        });
        return {
            sid: call.sid,
            status: call.status,
            to: call.to,
            from: call.from,
            direction: call.direction,
        };
    }
    async getCallStatus(callId) {
        const call = await this.client.calls(callId).fetch();
        return {
            status: call.status,
            duration: call.duration,
            startTime: call.startTime ? call.startTime.toISOString() : null,
            endTime: call.endTime ? call.endTime.toISOString() : null,
            price: call.price,
        };
    }
    async listCalls(limit = 50) {
        const calls = await this.client.calls.list({
            limit,
            status: 'completed',
        });
        return calls.map(call => ({
            sid: call.sid,
            to: call.to,
            from: call.from,
            status: call.status,
            startTime: call.startTime ? call.startTime.toISOString() : null,
            duration: call.duration,
            price: call.price,
        }));
    }
    async cancelCall(callId) {
        const call = await this.client.calls(callId).update({
            status: 'canceled',
        });
        return {
            sid: call.sid,
            status: call.status,
        };
    }
    async recordCall(options) {
        const { callId, action, recordingChannels = 'dual', recordingStatusCallback } = options;
        if (action === 'start') {
            // Start recording the call
            const recording = await this.client.calls(callId).recordings.create({
                recordingChannels,
                recordingStatusCallback,
                recordingStatusCallbackEvent: ['completed'],
                recordingStatusCallbackMethod: 'POST',
            });
            return {
                sid: recording.sid,
                callSid: recording.callSid,
                status: recording.status,
                uri: recording.uri,
            };
        }
        else {
            // Stop recording the call
            const recordings = await this.client.calls(callId).recordings.list();
            if (recordings.length === 0) {
                throw new Error(`No active recordings found for call ${callId}`);
            }
            const latestRecording = recordings[0];
            const recording = await this.client.calls(callId).recordings(latestRecording.sid).update({
                status: 'stopped',
            });
            return {
                sid: recording.sid,
                callSid: recording.callSid,
                status: recording.status,
                uri: recording.uri,
                duration: recording.duration ? parseInt(recording.duration) : undefined,
            };
        }
    }
}
//# sourceMappingURL=twilio.js.map