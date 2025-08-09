// Shared WebSocket message types
export type WebSocketMessageType = 'connect' | 'media' | 'mark' | 'error' | 'transcription' | 'mcp';

export interface WebSocketMessage {
  type: WebSocketMessageType;
  streamSid?: string;
  track?: 'inbound' | 'outbound' | 'both';
  payload?: any;
  event?: string;
  error?: string;
  method?: string;
  params?: any;
  id?: string | number;
}
