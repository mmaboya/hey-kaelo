require('dotenv').config();
const twilio = require('twilio');

const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

// The production URL
const PRODUCTION_URL = 'https://hey-kaelo-website.vercel.app/webhooks/twilio';

async function fixTwilioConfig() {
    console.log("🛠️ Attempting to update Twilio Webhooks to Production...");
    console.log(`🔗 Target URL: ${PRODUCTION_URL}`);

    try {
        // 1. Update Regular Phone Numbers (if any are used for WhatsApp)
        const numbers = await client.incomingPhoneNumbers.list();
        for (const nr of numbers) {
            console.log(`Updating Number: ${nr.phoneNumber} (${nr.sid})`);
            await client.incomingPhoneNumbers(nr.sid).update({
                smsUrl: PRODUCTION_URL,
                smsMethod: 'POST'
            });
            console.log(`✅ Updated ${nr.phoneNumber}`);
        }

        // 2. Check Messaging Services (If used)
        const services = await client.messaging.v1.services.list();
        for (const service of services) {
            console.log(`Updating Service: ${service.friendlyName} (${service.sid})`);
            await client.messaging.v1.services(service.sid).update({
                inboundRequestUrl: PRODUCTION_URL,
                inboundMethod: 'POST'
            });
            console.log(`✅ Updated Service ${service.friendlyName}`);
        }

        console.log("\n🚀 TWILIO WEBHOOKS POINTING TO PRODUCTION.");
        console.log("⚠️ NOTE: If you are using the WhatsApp Sandbox, you MUST manually update the URL in the Twilio Console:");
        console.log("   Messaging > Try it Out > WhatsApp Sandbox Settings > 'WHEN A MESSAGE COMES IN'");
        console.log(`   URL: ${PRODUCTION_URL}`);

    } catch (error) {
        console.error("❌ ERROR UPDATING TWILIO:", error.message);
    }
}

fixTwilioConfig();
