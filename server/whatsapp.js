// Twilio WhatsApp helper
// Required env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER

const twilio = require('twilio');

function getClient() {
    return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

async function sendMessage(to, body) {
    const client = getClient();
    const cleanTo = String(to).replace(/\D/g, '');
    const cleanFrom = String(process.env.TWILIO_WHATSAPP_NUMBER).replace(/\D/g, '');

    const message = await client.messages.create({
        from: `whatsapp:+${cleanFrom}`,
        to: `whatsapp:+${cleanTo}`,
        body
    });

    return message;
}

module.exports = { sendMessage };
