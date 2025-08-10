import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import http from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import WebSocket, { WebSocketServer } from 'ws';
import { createMCPServer } from './mcpServer';
import { TwilioService } from './services/twilio';
import { TranscriptionService } from './services/transcription';
import { SummarizationService } from './services/summarization';
import { AuthService } from './services/auth';

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create HTTP server
const server = http.createServer(app);

// Initialize services
const twilioService = new TwilioService();
const summarizationService = new SummarizationService();
const authService = new AuthService();

// Initialize services that need the HTTP server
const transcriptionService = new TranscriptionService();

// Create and set up WebSocket server
const wss = new WebSocketServer({ noServer: true });

// Handle upgrade requests
server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url || '', `http://${request.headers.host}`).pathname;
  
  if (pathname === '/mcp') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    // Handle other WebSocket paths if needed
    socket.destroy();
  }
});

// Create MCP server with initialized services
const mcpServer = createMCPServer(server, {
  twilioService,
  transcriptionService,
  summarizationService,
  authService
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// MCP connection endpoint
app.post('/mcp/connect', (req, res) => {
  try {
    const { url, token } = req.body;
    
    // Validate the connection request
    if (!url) {
      return res.status(400).json({ 
        success: false, 
        error: 'URL is required' 
      });
    }
    
    console.log(`MCP connection established with URL: ${url}`);
    
    res.status(200).json({ 
      success: true, 
      message: 'MCP connection established',
      serverInfo: {
        name: 'puch-call-mcp-server',
        version: '1.0.0',
        capabilities: [
          'call',
          'transcribe',
          'summarize',
          'record',
          'validate'
        ]
      }
    });
  } catch (error) {
    console.error('Error handling MCP connection:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to establish MCP connection' 
    });
  }
});

// Start the HTTP server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  
  // Close the HTTP server
  server.close(async () => {
    console.log('HTTP server closed');
    
    // Close the MCP server
    await mcpServer.close();
    console.log('MCP server closed');
    
    process.exit(0);
  });
});

console.log('Puch Call MCP Server started successfully!');

// Tool handlers are registered in mcpServer.ts

// Start the MCP server
const transport = new StdioServerTransport();

// Connect to the MCP server
mcpServer.connect(transport).then(() => {
  console.log('Puch Call MCP Server is running...');
  
  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    
    // Close the HTTP server
    server.close(async () => {
      console.log('HTTP server closed');
      
      // Close the MCP server
      await mcpServer.close();
      console.log('MCP server closed');
      
      process.exit(0);
    });
  });
}).catch(error => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});

console.log('Puch Call MCP Server started successfully!');
console.log('Available tools:');
console.log('- validate: Validate a bearer token and return user information');
console.log('- call: Make a phone call to a customer');
console.log('- call-status: Get the status of a call');
console.log('- list-calls: List all recent calls');
console.log('- transcribe: Transcribe audio from call recordings');
console.log('- summarize: Summarize call transcripts or text content');
console.log('- record: Start or stop recording calls');
