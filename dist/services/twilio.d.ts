export interface CallOptions {
    to: string;
    message: string;
    voice?: string;
    language?: string;
}
export interface CallStatus {
    status: string;
    duration: string | null;
    startTime: string | null;
    endTime: string | null;
    price: string | null;
}
export declare class TwilioService {
    private client;
    private fromNumber;
    constructor();
    makeCall(options: CallOptions): Promise<{
        sid: string;
        status: import("twilio/lib/rest/api/v2010/account/call").CallStatus;
        to: string;
        from: string;
        direction: string;
    }>;
    getCallStatus(callId: string): Promise<CallStatus>;
    listCalls(limit?: number): Promise<{
        sid: string;
        to: string;
        from: string;
        status: import("twilio/lib/rest/api/v2010/account/call").CallStatus;
        startTime: string | null;
        duration: string;
        price: string;
    }[]>;
    cancelCall(callId: string): Promise<{
        sid: string;
        status: import("twilio/lib/rest/api/v2010/account/call").CallStatus;
    }>;
    recordCall(options: {
        callId: string;
        action: 'start' | 'stop';
        recordingChannels?: 'dual' | 'single';
        recordingStatusCallback?: string;
    }): Promise<{
        sid: string;
        callSid: string;
        status: import("twilio/lib/rest/api/v2010/account/call/recording").RecordingStatus;
        uri: string;
        duration?: undefined;
    } | {
        sid: string;
        callSid: string;
        status: import("twilio/lib/rest/api/v2010/account/call/recording").RecordingStatus;
        uri: string;
        duration: number | undefined;
    }>;
}
//# sourceMappingURL=twilio.d.ts.map