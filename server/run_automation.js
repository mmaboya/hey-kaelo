const axios = require('axios');
const supabase = require('./supabase');
require('dotenv').config();

// Configuration
const TEST_PORT = process.env.PORT || 3001;
const BASE_URL = `http://localhost:${TEST_PORT}/webhooks/twilio`;
const TEST_CUSTOMER_PHONE = 'whatsapp:+27820001234';
const BUSINESS_ID = '00000000-0000-0000-0000-000000000000'; // Replace with a real test ID if needed

/**
 * Simulates a WhatsApp message from Twilio
 * @param {string} body The message text
 * @param {string} from The sender phone
 */
async function sendMockWhatsApp(body, from = TEST_CUSTOMER_PHONE) {
    console.log(`\n📤 Sending: "${body}" from ${from}`);
    try {
        const response = await axios.post(BASE_URL,
            new URLSearchParams({
                Body: body,
                From: from,
                To: 'whatsapp:+14155238886', // Sandbox number
                SmsMessageSid: 'SM' + Math.random().toString(36).substring(7),
                NumMedia: '0'
            }).toString(),
            {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            }
        );
        console.log(`📥 Response: ${response.data}`);
        return response.data;
    } catch (error) {
        console.error(`❌ Webhook Error: ${error.message}`);
        if (error.response) console.error(error.response.data);
    }
}

async function runAutomation() {
    console.log("🚀 Starting Automated HeyKaelo WhatsApp Tests...");

    // 1. Reset State
    console.log("\n🧹 Resetting test state...");
    const cleanPhone = TEST_CUSTOMER_PHONE.replace('whatsapp:', '');
    await supabase.from('conversation_states').delete().eq('phone_number', cleanPhone);
    console.log("✅ State cleared.");

    // 2. Test Onboarding Initiation
    await sendMockWhatsApp("setup");

    // 3. Test Hybrid Flow Selection
    // Assuming the bot replies with options, we pick '3'
    await sendMockWhatsApp("3");

    // 4. Test Name Entry
    await sendMockWhatsApp("The Tech Workshop");

    // 5. Test Role Entry
    await sendMockWhatsApp("Gadget Repair & Training");

    // 6. Test Area Entry
    await sendMockWhatsApp("Cape Town Central");

    console.log("\n✨ Automation Sequence Finished.");
    process.exit(0);
}

// Check if server is running
axios.get(`http://localhost:${TEST_PORT}/api/health`).then(() => {
    runAutomation();
}).catch(() => {
    console.error(`❌ Error: Server is not running on port ${TEST_PORT}. Please start it first with 'npm run dev:backend'`);
});
