import { TwilioService } from './services/twilio.js';
// Simple test to verify Twilio service initialization
async function testTwilioService() {
    try {
        console.log('Testing Twilio service initialization...');
        // This will throw an error if environment variables are not set
        const twilioService = new TwilioService();
        console.log('✅ Twilio service initialized successfully');
        // Test listing calls (this will work even without making actual calls)
        console.log('Testing call listing...');
        const calls = await twilioService.listCalls(5);
        console.log(`✅ Successfully retrieved ${calls.length} calls`);
        return true;
    }
    catch (error) {
        console.error('❌ Test failed:', error);
        return false;
    }
}
// Test MCP server tools
async function testMCPServer() {
    console.log('Testing MCP server tools...');
    // Import tool schemas
    const { CallTool, CallStatusTool, ListCallsTool } = await import('./tools.js');
    console.log('✅ Call tool schema:', CallTool.name);
    console.log('✅ Call status tool schema:', CallStatusTool.name);
    console.log('✅ List calls tool schema:', ListCallsTool.name);
    return true;
}
// Run tests
async function runTests() {
    console.log('🧪 Running Puch Call MCP Server tests...\n');
    const twilioTest = await testTwilioService();
    const mcpTest = await testMCPServer();
    console.log('\n📊 Test Results:');
    console.log(`Twilio Service: ${twilioTest ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`MCP Server: ${mcpTest ? '✅ PASS' : '❌ FAIL'}`);
    if (twilioTest && mcpTest) {
        console.log('\n🎉 All tests passed! The server is ready to use.');
    }
    else {
        console.log('\n⚠️  Some tests failed. Please check your configuration.');
    }
}
// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runTests().catch(console.error);
}
export { testTwilioService, testMCPServer, runTests };
//# sourceMappingURL=test.js.map