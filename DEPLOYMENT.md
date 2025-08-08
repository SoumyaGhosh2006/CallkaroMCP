# Deployment Guide

This guide covers deploying the Puch Call MCP Server to production environments.

## 🚀 Quick Deploy Options

### 1. Railway Deployment

1. **Fork this repository**
2. **Connect to Railway**
   - Go to [Railway](https://railway.app)
   - Create new project from GitHub
   - Select your forked repository

3. **Configure Environment Variables**
   ```env
   TWILIO_ACCOUNT_SID=your_twilio_account_sid
   TWILIO_AUTH_TOKEN=your_twilio_auth_token
   TWILIO_PHONE_NUMBER=+1234567890
   WEBHOOK_BASE_URL=https://your-app.railway.app
   ```

4. **Deploy**
   - Railway will automatically build and deploy
   - Your MCP server will be available at the provided URL

### 2. Heroku Deployment

1. **Install Heroku CLI**
   ```bash
   npm install -g heroku
   ```

2. **Create Heroku app**
   ```bash
   heroku create your-puch-call-mcp
   ```

3. **Set environment variables**
   ```bash
   heroku config:set TWILIO_ACCOUNT_SID=your_twilio_account_sid
   heroku config:set TWILIO_AUTH_TOKEN=your_twilio_auth_token
   heroku config:set TWILIO_PHONE_NUMBER=+1234567890
   heroku config:set WEBHOOK_BASE_URL=https://your-app.herokuapp.com
   ```

4. **Deploy**
   ```bash
   git push heroku main
   ```

### 3. Docker Deployment

1. **Create Dockerfile**
   ```dockerfile
   FROM node:18-alpine
   
   WORKDIR /app
   
   COPY package*.json ./
   RUN npm ci --only=production
   
   COPY . .
   RUN npm run build
   
   EXPOSE 3000
   
   CMD ["npm", "start"]
   ```

2. **Build and run**
   ```bash
   docker build -t puch-call-mcp .
   docker run -p 3000:3000 --env-file .env puch-call-mcp
   ```

## 🔧 Production Configuration

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | `AC1234567890abcdef` |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | `your_auth_token` |
| `TWILIO_PHONE_NUMBER` | Your Twilio number | `+1234567890` |
| `WEBHOOK_BASE_URL` | Your server URL | `https://your-domain.com` |
| `NODE_ENV` | Environment | `production` |
| `PORT` | Server port | `3000` |

### Security Considerations

1. **Environment Variables**
   - Never commit `.env` files
   - Use secure environment variable management
   - Rotate Twilio tokens regularly

2. **HTTPS**
   - Always use HTTPS in production
   - Configure SSL certificates
   - Update `WEBHOOK_BASE_URL` to use HTTPS

3. **Rate Limiting**
   - Implement rate limiting for webhook endpoints
   - Monitor Twilio API usage
   - Set up alerts for unusual activity

### Monitoring & Logging

1. **Health Checks**
   ```bash
   curl https://your-domain.com/health
   ```

2. **Logging**
   - Use structured logging (JSON)
   - Log all call attempts and results
   - Monitor error rates

3. **Metrics**
   - Track call success/failure rates
   - Monitor response times
   - Set up dashboards

## 🔗 Twilio Configuration

### 1. Get Twilio Credentials

1. **Sign up at [Twilio](https://www.twilio.com)**
2. **Get Account SID and Auth Token**
   - Go to Console Dashboard
   - Copy Account SID
   - Generate Auth Token

3. **Get a Phone Number**
   - Buy a phone number
   - Note the number for configuration

### 2. Configure Webhooks

1. **Set webhook URL in Twilio**
   - Go to Phone Numbers > Manage > Active numbers
   - Set webhook URL: `https://your-domain.com/webhook/call-status`

2. **Test webhook**
   ```bash
   curl -X POST https://your-domain.com/webhook/call-status \
     -d "CallSid=test&CallStatus=completed"
   ```

## 📊 Analytics & Tracking

### Call Analytics

Track these metrics:
- Total calls made
- Call success rate
- Average call duration
- Cost per call
- Peak usage times

### Integration Analytics

Monitor:
- MCP server uptime
- Response times
- Error rates
- Tool usage patterns

## 🚨 Troubleshooting

### Common Issues

1. **Twilio Authentication Error**
   - Verify Account SID and Auth Token
   - Check if credentials are correct
   - Ensure account is active

2. **Webhook Not Receiving Updates**
   - Verify webhook URL is accessible
   - Check firewall settings
   - Test webhook endpoint

3. **Calls Not Going Through**
   - Verify phone number format (+1234567890)
   - Check Twilio account balance
   - Verify phone number is verified (trial accounts)

### Debug Commands

```bash
# Test Twilio connection
npm run test:setup

# Check server health
curl https://your-domain.com/health

# Test webhook endpoint
curl -X POST https://your-domain.com/webhook/call-status \
  -H "Content-Type: application/json" \
  -d '{"CallSid":"test","CallStatus":"completed"}'
```

## 📈 Scaling

### Horizontal Scaling

1. **Load Balancer**
   - Use multiple server instances
   - Configure load balancer
   - Ensure session persistence

2. **Database**
   - Store call history in database
   - Use connection pooling
   - Implement caching

### Performance Optimization

1. **Connection Pooling**
   - Reuse Twilio client connections
   - Implement connection limits
   - Monitor connection usage

2. **Caching**
   - Cache call status results
   - Implement Redis for session storage
   - Cache frequently accessed data

## 🔄 CI/CD Pipeline

### GitHub Actions Example

```yaml
name: Deploy MCP Server

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: npm test
      - name: Deploy to Railway
        uses: bervProject/railway-deploy@v1.0.0
        with:
          railway_token: ${{ secrets.RAILWAY_TOKEN }}
```

## 📞 Support

For deployment issues:
1. Check the troubleshooting section
2. Review Twilio documentation
3. Contact the development team
4. Create an issue in the repository

---

**Happy Deploying! 🚀**
