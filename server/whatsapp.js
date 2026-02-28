// Meta WhatsApp Cloud API helper
// Replaces Twilio - free up to 1,000 conversations/month
// Required env vars: WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN

async function sendMessage(to, body) {
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const cleanTo = String(to).replace(/\D/g, '');

    const response = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: cleanTo,
            type: 'text',
            text: { body }
        })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(`Meta API Error: ${JSON.stringify(data)}`);
    return data;
}

module.exports = { sendMessage };
