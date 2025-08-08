import { z } from 'zod';
export declare const CallTool: {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        to: z.ZodString;
        message: z.ZodString;
        voice: z.ZodDefault<z.ZodOptional<z.ZodString>>;
        language: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        to: string;
        message: string;
        voice: string;
        language: string;
    }, {
        to: string;
        message: string;
        voice?: string | undefined;
        language?: string | undefined;
    }>;
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
export declare const CallStatusTool: {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        callId: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        callId: string;
    }, {
        callId: string;
    }>;
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
export declare const ListCallsTool: {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{}, "strip", z.ZodTypeAny, {}, {}>;
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
export declare const TranscribeTool: {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        callId: z.ZodOptional<z.ZodString>;
        audioUrl: z.ZodOptional<z.ZodString>;
        language: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    }, "strip", z.ZodTypeAny, {
        language: string;
        callId?: string | undefined;
        audioUrl?: string | undefined;
    }, {
        language?: string | undefined;
        callId?: string | undefined;
        audioUrl?: string | undefined;
    }>;
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
export declare const SummarizeTool: {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        text: z.ZodString;
        maxLength: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        style: z.ZodDefault<z.ZodOptional<z.ZodEnum<["bullet", "paragraph", "key_points"]>>>;
    }, "strip", z.ZodTypeAny, {
        text: string;
        maxLength: number;
        style: "bullet" | "paragraph" | "key_points";
    }, {
        text: string;
        maxLength?: number | undefined;
        style?: "bullet" | "paragraph" | "key_points" | undefined;
    }>;
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
export declare const RecordTool: {
    name: string;
    description: string;
    inputSchema: z.ZodObject<{
        callId: z.ZodString;
        action: z.ZodEnum<["start", "stop"]>;
        recordingChannels: z.ZodDefault<z.ZodOptional<z.ZodEnum<["dual", "single"]>>>;
        recordingStatusCallback: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        callId: string;
        action: "start" | "stop";
        recordingChannels: "dual" | "single";
        recordingStatusCallback?: string | undefined;
    }, {
        callId: string;
        action: "start" | "stop";
        recordingChannels?: "dual" | "single" | undefined;
        recordingStatusCallback?: string | undefined;
    }>;
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
//# sourceMappingURL=tools.d.ts.map