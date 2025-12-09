const result = require('dotenv').config();
if (result.error) {
    console.error("❌ dotenv config error:", result.error);
}
console.log("🔍 Loaded ENV Keys:", Object.keys(process.env).filter(k => !k.startsWith('Program') && !k.startsWith('Windows')));
console.log("🔑 Service Role Key Present?", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const twilio = require('twilio');
const { handleIncomingMessage } = require('./ai');
const calendar = require('./calendar'); // Import Calendar

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Twilio Client
const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
);

// 1. Health Check
app.get('/', (req, res) => {
    res.send('HeyKaelo Backend is running! 🚀');
});

// 2. Send WhatsApp Message (Triggered by Frontend)
app.post('/api/send-whatsapp', async (req, res) => {
    const { to, body } = req.body;

    if (!to || !body) {
        return res.status(400).json({ error: 'Missing "to" or "body"' });
    }

    try {
        const message = await client.messages.create({
            from: process.env.TWILIO_PHONE_NUMBER,
            to: `whatsapp:${to}`,
            body: body
        });

        console.log(`Message sent to ${to}: ${message.sid}`);
        res.json({ success: true, sid: message.sid });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: error.message });
    }
});

// 3. Chat Simulator Endpoint (Direct AI Access)
app.post('/api/simulate-chat', async (req, res) => {
    const { message, sessionId } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Missing message' });
    }

    // Use a mock ID for simulation sessions
    const session = sessionId || 'simulator-session';

    const response = await handleIncomingMessage(session, message);
    res.json({ reply: response });
});

// 4. Receive WhatsApp Reply (Webhook)
app.post('/webhooks/twilio', async (req, res) => {
    const incomingMsg = req.body.Body;
    const from = req.body.From;

    console.log(`📩 New Message from ${from}: ${incomingMsg}`);

    // Use Gemini AI to generate response
    let finalMessage = incomingMsg;

    // Handle Media (Images/Voice)
    if (req.body.NumMedia > 0) {
        const mediaUrl = req.body.MediaUrl0;
        const mediaType = req.body.MediaContentType0;
        console.log(`📷 Media received: ${mediaType} - ${mediaUrl}`);

        // Append context for AI so it knows user sent an image
        finalMessage = `[User sent an image/media: ${mediaType}] ${incomingMsg || ''}`;
    }

    const aiResponse = await handleIncomingMessage(from, finalMessage);

    // Send response back via Twilio
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message(aiResponse);

    res.writeHead(200, { 'Content-Type': 'text/xml' });
    res.end(twiml.toString());
});

// 5. Booking Management Endpoints
// 5. Booking Management Endpoints
const bookings = require('./bookings');

// Respond to booking (Approve/Reject)
app.post('/api/bookings/:id/respond', async (req, res) => {
    const { id } = req.params;
    const { action } = req.body; // 'approved' or 'rejected'

    // 1. Fetch Booking Info (Status already updated by Client)
    const booking = await bookings.getBookingById(id);
    if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
    }

    // 2. Send WhatsApp Notification to Customer
    const message = action === 'approved'
        ? `🎉 Booking Confirmed! Your appointment for ${booking.datetime} has been approved.`
        : `❌ Booking Update: unfortunately your request for ${booking.datetime} could not be approved. Please try another time.`;

    // 3. REAL INTEGRATION: Create Google Calendar Event if Approved
    if (action === 'approved') {
        try {
            const gcal = await calendar.createEvent(booking.name, booking.datetime, booking.phone);
            if (gcal.success) {
                console.log("📅 Added to Google Calendar:", gcal.link);
            } else {
                console.error("Failed to add to GCal");
            }
        } catch (e) {
            console.error("GCal Error:", e);
        }
    }

    try {
        await client.messages.create({
            from: process.env.TWILIO_PHONE_NUMBER,
            to: `whatsapp:${booking.phone}`,
            body: message
        });
        console.log(`Sent ${action} notification to ${booking.phone}`);
    } catch (e) {
        console.error("Error sending WhatsApp confirm:", e);
    }

    res.json({ success: true });
});

// Start Server
app.listen(port, () => {
    console.log(`✅ Server running on http://localhost:${port}`);
});
