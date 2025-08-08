# Puch Call MCP Server

An MCP (Model Context Protocol) server that enables the Puch WhatsApp bot to make phone calls to customers using Twilio.

## 🚀 Features

- **Make Phone Calls**: Initiate calls to customers with custom messages
- **Call Status Tracking**: Monitor call progress and completion
- **Call History**: List and manage recent calls
- **Voice Customization**: Choose different voices and languages
- **Call Recording**: Start and stop call recordings
- **Audio Transcription**: Transcribe call recordings to text
- **Content Summarization**: Summarize call transcripts and text content
- **AI-Powered Analysis**: Sentiment analysis and key topic extraction
- **Webhook Integration**: Real-time call status updates
- **MCP Protocol**: Standardized interface for AI assistants

## 🛠️ Setup

### Prerequisites

- Node.js 18+ 
- Twilio account with:
  - Account SID
  - Auth Token
  - Phone number for making calls

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd puch-call-mcp-server
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your Twilio credentials:
   ```env
   TWILIO_ACCOUNT_SID=your_twilio_account_sid_here
   TWILIO_AUTH_TOKEN=your_twilio_auth_token_here
   TWILIO_PHONE_NUMBER=+1234567890
   MCP_SERVER_PORT=3000
   MCP_SERVER_HOST=localhost
   WEBHOOK_BASE_URL=https://your-domain.com
   ```

4. **Build the project**
   ```bash
   npm run build
   ```

## 🚀 Usage

### Starting the MCP Server

```bash
npm start
```

### Development Mode

```bash
npm run dev
```

### Starting the Webhook Server

```bash
node dist/webhook.js
```

## 📋 Available Tools

### 1. Make a Call (`call`)

Initiates a phone call to a customer.

**Parameters:**
- `to` (string): Phone number to call (e.g., "+1234567890")
- `message` (string): Message to speak during the call
- `voice` (optional): Voice to use (default: "alice")
- `language` (optional): Language for the call (default: "en-US")

**Example:**
```json
{
  "tool": "call",
  "arguments": {
    "to": "+1234567890",
    "message": "Hello! This is Puch calling to follow up on your recent inquiry.",
    "voice": "alice",
    "language": "en-US"
  }
}
```

### 2. Check Call Status (`call-status`)

Gets the current status of a specific call.

**Parameters:**
- `callId` (string): Twilio call ID

**Example:**
```json
{
  "tool": "call-status",
  "arguments": {
    "callId": "CA1234567890abcdef"
  }
}
```

### 3. List Calls (`list-calls`)

Retrieves a list of recent calls.

**Example:**
```json
{
  "tool": "list-calls",
  "arguments": {}
}
```

### 4. Transcribe Audio (`transcribe`)

Transcribe audio from call recordings or audio files.

**Parameters:**
- `callId` (optional): Twilio call ID to transcribe
- `audioUrl` (optional): URL of audio file to transcribe
- `language` (optional): Language of the audio (default: "en-US")

**Example:**
```json
{
  "tool": "transcribe",
  "arguments": {
    "callId": "CA1234567890abcdef",
    "language": "en-US"
  }
}
```

### 5. Summarize Content (`summarize`)

Summarize call transcripts or text content with AI-powered analysis.

**Parameters:**
- `text` (string): Text content to summarize
- `maxLength` (optional): Maximum length of summary (default: 150)
- `style` (optional): Summary style - "bullet", "paragraph", or "key_points" (default: "key_points")

**Example:**
```json
{
  "tool": "summarize",
  "arguments": {
    "text": "Customer called about order status...",
    "maxLength": 200,
    "style": "key_points"
  }
}
```

### 6. Record Call (`record`)

Start or stop recording a call.

**Parameters:**
- `callId` (string): Twilio call ID to record
- `action` (string): "start" or "stop" recording
- `recordingChannels` (optional): "dual" or "single" (default: "dual")
- `recordingStatusCallback` (optional): Callback URL for recording status updates

**Example:**
```json
{
  "tool": "record",
  "arguments": {
    "callId": "CA1234567890abcdef",
    "action": "start",
    "recordingChannels": "dual"
  }
}
```

## 🔗 Integration with Puch

### MCP Client Configuration

Add this server to your MCP client configuration:

```json
{
  "mcpServers": {
    "puch-call": {
      "command": "node",
      "args": ["path/to/puch-call-mcp-server/dist/index.js"],
      "env": {
        "TWILIO_ACCOUNT_SID": "your_sid",
        "TWILIO_AUTH_TOKEN": "your_token",
        "TWILIO_PHONE_NUMBER": "+1234567890"
      }
    }
  }
}
```

### WhatsApp Bot Integration

Puch can now make calls by using the MCP tools:

```javascript
// Example: Puch making a follow-up call
const callResult = await mcpClient.callTool({
  to: customerPhoneNumber,
  message: "Hi! This is Puch from our support team. I wanted to check if you received our latest update about your order.",
  voice: "alice",
  language: "en-US"
});

console.log(`Call initiated: ${callResult.callId}`);
```

## 🌐 Webhook Endpoints

### Call Status Webhook

- **URL**: `POST /webhook/call-status`
- **Purpose**: Receives real-time updates about call status
- **Data**: CallSid, CallStatus, CallDuration, etc.

### Health Check

- **URL**: `GET /health`
- **Purpose**: Server health monitoring

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `TWILIO_ACCOUNT_SID` | Your Twilio Account SID | Yes |
| `TWILIO_AUTH_TOKEN` | Your Twilio Auth Token | Yes |
| `TWILIO_PHONE_NUMBER` | Your Twilio phone number | Yes |
| `MCP_SERVER_PORT` | Port for webhook server | No (default: 3000) |
| `WEBHOOK_BASE_URL` | Base URL for webhooks | No |

### Voice Options

Available Twilio voices:
- `alice` (default)
- `bob`
- `charlie`
- `diana`
- `eve`
- `frank`
- `grace`
- `henry`

### Language Options

Common language codes:
- `en-US` (English, US)
- `en-GB` (English, UK)
- `es-ES` (Spanish)
- `fr-FR` (French)
- `de-DE` (German)
- `it-IT` (Italian)

## 📊 Monitoring & Analytics

The server provides:
- Real-time call status updates via webhooks
- Call duration and pricing information
- Call history and analytics
- Health monitoring endpoints

## 🚨 Error Handling

The server includes comprehensive error handling for:
- Invalid phone numbers
- Twilio API errors
- Network connectivity issues
- Authentication failures

## 🔒 Security

- Environment variables for sensitive credentials
- Input validation using Zod schemas
- CORS configuration for webhook endpoints
- Error message sanitization

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📞 Support

For support or questions:
- Create an issue in the repository
- Contact the Puch AI team
- Check the Twilio documentation for API details

---

**Made with ❤️ for the Puch AI team**
