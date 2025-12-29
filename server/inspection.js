const twilio = require('twilio');
require('dotenv').config();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function check() {
    console.log("--- TWILIO CONFIG INSPECTION ---");
    try {
        const numbers = await client.incomingPhoneNumbers.list();
        if (numbers.length === 0) console.log("No Incoming Phone Numbers found.");
        numbers.forEach(n => {
            console.log(`[Number] ${n.phoneNumber}`);
            console.log(`   Friendly: ${n.friendlyName}`);
            console.log(`   Webhook:  ${n.smsUrl}`);
        });

        // Check for WhatsApp Sandbox specifically if using it
        // Note: The Twilio API for Sandbox is a bit different, often set in the console.
        // But we can check if there are any messaging services.
        const services = await client.messaging.v1.services.list();
        services.forEach(s => {
            console.log(`[Service] ${s.friendlyName} (${s.sid})`);
            console.log(`   Webhook: ${s.inboundRequestUrl}`);
        });

    } catch (e) {
        console.error("Error:", e.message);
    }
}

check();
