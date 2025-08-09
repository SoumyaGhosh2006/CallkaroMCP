import { WebSocket, WebSocketServer } from 'ws';
import { Server as HttpServer } from 'http';
import { Server as HttpsServer } from 'https';
import { randomUUID } from 'crypto';
import { WebSocketMessage } from '../types/websocket';

type ConnectionId = string;

export class WSServer {
  private wss: WebSocketServer;
  private connections: Map<ConnectionId, WebSocket> = new Map();
  private streamHandlers: Map<string, (message: WebSocketMessage, connectionId: string) => void> = new Map();

  constructor(server: HttpServer | HttpsServer) {
    this.wss = new WebSocketServer({ server });
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    this.wss.on('connection', (ws) => {
      this.handleConnection(ws);
    });
  }

  private handleConnection(ws: WebSocket): void {
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

    ws.on('error', (error: Error) => {
      console.error('WebSocket error:', error);
      this.connections.delete(connectionId);
    });
  }

  private handleMessage(message: any, connectionId: string): void {
    try {
      // Handle MCP protocol messages
      if (message.jsonrpc === '2.0' && message.method) {
        console.log(`MCP method call: ${message.method}`);
        
        // Forward to appropriate handler based on method
        if (message.method.startsWith('tools/')) {
          const handler = this.streamHandlers.get(message.method);
          if (handler) {
            const mcpMessage: WebSocketMessage = {
              type: 'mcp',
              method: message.method,
              params: message.params || {}
            };
            if (message.id) mcpMessage.id = message.id;
            
            handler(mcpMessage, connectionId);
          } else {
            console.warn(`No handler for MCP method: ${message.method}`);
            const errorResponse: WebSocketMessage = {
              type: 'error',
              error: `No handler for method: ${message.method}`
            };
            if (message.id) errorResponse.id = message.id;
            
            this.send(connectionId, errorResponse);
          }
        } else {
          console.warn('Unhandled MCP message type:', message.method);
        }
      }
      // Handle legacy WebSocket messages
      else if (message.type && message.streamSid) {
        console.log(`Stream message: ${message.type} for ${message.streamSid}`);
        const handler = this.streamHandlers.get(message.streamSid);
        if (handler) {
          handler(message as WebSocketMessage, connectionId);
        } else {
          console.warn('No handler for stream:', message.streamSid);
        }
      } else {
        console.warn('Unhandled message format:', message);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      this.send(connectionId, {
        type: 'error',
        error: 'Internal server error',
        ...(message.id && { id: message.id })
      });
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
