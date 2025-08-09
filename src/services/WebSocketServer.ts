import * as WebSocket from 'ws';
import { Server as HttpServer } from 'http';
import { Server as HttpsServer } from 'https';
import { randomUUID } from 'crypto';

type ConnectionId = string;

export interface WebSocketMessage {
  type: 'connect' | 'media' | 'mark' | 'error' | 'transcription';
  streamSid?: string;
  track?: 'inbound' | 'outbound' | 'both';
  payload?: any;
  event?: string;
  error?: string;
}

export class WSServer {
  private wss: WebSocket.Server;
  private connections: Map<ConnectionId, WebSocket.WebSocket> = new Map();
  private streamHandlers: Map<string, (message: WebSocketMessage, connectionId: string) => void> = new Map();

  constructor(server: HttpServer | HttpsServer) {
    this.wss = new WebSocket.Server({ server });
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.wss.on('connection', (ws: WebSocket.WebSocket) => {
      this.handleConnection(ws);
    });
  }

  private handleConnection(ws: WebSocket.WebSocket): void {
    const connectionId = randomUUID();
    this.connections.set(connectionId, ws);
    console.log(`New WebSocket connection: ${connectionId}`);

    ws.on('message', (data: string) => {
      try {
        const message: WebSocketMessage = JSON.parse(data);
        this.handleMessage(message, connectionId);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        this.send(connectionId, {
          type: 'error',
          error: 'Invalid message format',
        });
      }
    });

    ws.on('close', () => {
      console.log(`Connection closed: ${connectionId}`);
      this.connections.delete(connectionId);
      // Notify any stream handlers about the disconnection
      this.streamHandlers.forEach((handler, streamSid) => {
        handler({
          type: 'error',
          streamSid,
          error: 'Connection closed',
        }, connectionId);
      });
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      this.connections.delete(connectionId);
    });
  }

  private handleMessage(message: WebSocketMessage, connectionId: string): void {
    if (message.type === 'connect' && message.streamSid) {
      console.log(`Stream connected: ${message.streamSid}`);
      // You can add authentication/authorization here if needed
      this.send(connectionId, {
        type: 'connect',
        streamSid: message.streamSid,
      });
    } else if (message.streamSid && this.streamHandlers.has(message.streamSid)) {
      // Forward message to the appropriate stream handler
      const handler = this.streamHandlers.get(message.streamSid)!;
      handler(message, connectionId);
    } else {
      console.warn('Unhandled message type or missing streamSid:', message.type);
    }
  }

  public registerStreamHandler(streamSid: string, handler: (message: WebSocketMessage, connectionId: string) => void): void {
    this.streamHandlers.set(streamSid, handler);
  }

  public unregisterStreamHandler(streamSid: string): void {
    this.streamHandlers.delete(streamSid);
  }

  public send(connectionId: string, message: WebSocketMessage): void {
    const ws = this.connections.get(connectionId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  public broadcast(streamSid: string, message: WebSocketMessage): void {
    const messageStr = JSON.stringify({
      ...message,
      streamSid,
    });

    this.connections.forEach((ws, connectionId) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(messageStr);
      } else {
        this.connections.delete(connectionId);
      }
    });
  }

  public close(): Promise<void> {
    return new Promise((resolve) => {
      // Close all connections
      this.connections.forEach((ws) => {
        ws.close();
      });
      this.connections.clear();
      this.streamHandlers.clear();

      // Close the server
      this.wss.close(() => {
        console.log('WebSocket server closed');
        resolve();
      });
    });
  }
}
