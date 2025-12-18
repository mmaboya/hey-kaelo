const result = require('dotenv').config();
const fs = require('fs');
const path = require('path');
const logFile = path.join(__dirname, 'server.log');

function logToFile(message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}\n`;
    fs.appendFile(logFile, logMessage, (err) => {
        if (err) console.error("Failed to write to log file:", err);
    });
}
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
const supabase = require('./supabase'); // Import Supabase
const bookings = require('./bookings');
const onboarding = require('./onboarding');
const salesBot = require('./sales-bot');
const { MessagingResponse } = require('twilio').twiml;

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use((req, res, next) => {
    console.log(`🌍 Request: ${req.method} ${req.path}`);
    next();
});
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

// 3.5 Website Sales Bot (Sepitori)
app.post('/api/chat', async (req, res) => {
    const { message, sessionId } = req.body;
    if (!message) return res.status(400).json({ error: 'Missing message' });

    // Default session if none provided
    const localSession = sessionId || 'web-guest-' + Date.now();

    const reply = await salesBot.handleSalesMessage(localSession, message);
    res.json({ reply });
});

// 4. Receive WhatsApp Reply (Webhook)
// Validate Twilio Signature (Disabled for debugging "No Response" issue)
app.post('/webhooks/twilio', twilio.webhook({ validate: process.env.TWILIO_VALIDATE_SIGNATURE === 'true' }), async (req, res) => {
    // Robust extraction with defaults
    const Body = req.body.Body || '';
    const From = req.body.From || req.body.WaId || '';
    const To = req.body.To || '';
    // Ensure MessageSid is never null for DB constraint
    const MessageSid = req.body.MessageSid || req.body.SmsMessageSid || `MID-${require('crypto').randomUUID()}`;

    // Log minimal info
    console.log(`📩 INCOMING: ${Body} from ${From} (SID: ${MessageSid})`);
    logToFile(`📩 INCOMING WEBHOOK: From: ${From}, To: ${To}, Body: ${Body}, SID: ${MessageSid}`);

    try {
        // 1. IDEMPOTENCY CHECK (Phase 6)
        // Attempt to insert MessageSid. If it exists, this writes nothing and throws a specific error (or we check response).
        // Using 'ignoreDuplicates: false' to catch the error.
        const { error: idempotencyError } = await supabase
            .from('webhook_events')
            .insert([{ message_sid: MessageSid }]);

        if (idempotencyError) {
            // Postgres Unique Violation Code: 23505
            if (idempotencyError.code === '23505') {
                console.warn(`🔁 Duplicate Message Ignored: ${MessageSid}`);
                logToFile(`🔁 Duplicate Message Ignored: ${MessageSid}`);
                const twiml = new MessagingResponse();
                return res.status(200).type('text/xml').send(twiml.toString());
            }
            // Other DB errors: Throw to trigger 500 (Twilio Retry)
            logToFile(`❌ Idempotency DB Error: ${JSON.stringify(idempotencyError)}`);
            throw idempotencyError;
        }

        // 2. BUSINESS RESOLUTION (Phase 8)
        let businessId = null;

        // A. Level 1: Direct Channel (Deep Link or Dedicated Number)
        const { data: channel } = await supabase
            .from('business_channels')
            .select('business_id')
            .eq('phone_number', To)
            .single();

        if (channel) {
            businessId = channel.business_id;
            logToFile(`✅ Resolved Business (Direct): ${businessId}`);
        }

        if (channel) {
            businessId = channel.business_id;
            logToFile(`✅ Resolved Business (Direct): ${businessId}`);
        }

        // --- NEW: Onboarding Check ---
        // 1. Check if Onboarding is Active in State
        let convState = null;
        try {
            const { data } = await supabase
                .from('conversation_states')
                .select('*')
                .eq('phone_number', From)
                .maybeSingle();
            convState = data;
        } catch (e) {
            console.error("❌ Failed to fetch state:", e);
        }

        const isOnboarding = convState?.metadata?.onboarding_active === true;

        // Triggers
        const isExplicitCommand = Body.toLowerCase().trim().match(/^(setup|join)$/);
        const isGreeting = Body.toLowerCase().trim().match(/^(hi|hello|start)$/);

        // Logic: 
        // 1. If explicitly saying "setup" or "join", ALWAYS enter onboarding (Force Reset).
        // 2. If valid onboarding session active, continue.
        // 3. If "hi/hello" AND no business resolved, assume onboarding start (User -> Platform)

        if (isExplicitCommand || isOnboarding || (isGreeting && !businessId)) {
            console.log(`🔍 Onboarding Triggered: Explicit=${!!isExplicitCommand}, Active=${isOnboarding}`);
            logToFile(`🚀 Routing to Onboarding: ${From}`);

            // If starting fresh, ensure state exists
            if (!convState) {
                const { error } = await supabase.from('conversation_states').insert([{
                    phone_number: From,
                    metadata: { onboarding_active: true },
                    business_id: process.env.DEFAULT_BUSINESS_ID || null, // Clean logic: Null allowed now
                    last_action: 'onboarding_start',
                    last_message: 'setup'
                }]);
                if (error) {
                    console.error("❌ CRITICAL DB ERROR:", JSON.stringify(error, null, 2));
                    console.error("❌ CRITICAL DB ERROR MSG:", error.message);
                    logToFile(`❌ Failed to init Onboarding State: ${JSON.stringify(error)}`);
                    // If error is not-null business_id, we might need a fallback.
                    // But let's proceed to try handling it.
                }
            } else if (!isOnboarding) {
                // Activate it
                const meta = convState.metadata || {};
                meta.onboarding_active = true;
                await supabase.from('conversation_states').update({ metadata: meta }).eq('id', convState.id);
            }

            console.log("🛠️ calling handleOnboarding...");
            try {
                const reply = await onboarding.handleOnboarding(From, Body, convState || { metadata: { onboarding_active: true } });
                console.log("✅ onboarding returned:", reply);

                const twiml = new MessagingResponse();
                twiml.message(reply);
                return res.status(200).type('text/xml').send(twiml.toString());
            } catch (err) {
                console.error("❌ Onboarding Handler Crashed:", err);
                require('fs').writeFileSync('crash.log', 'CRASH: ' + err.stack);
                throw err;
            }
        }

        // --- NEW: Shortcode Detection (Tradesperson Flow) ---
        if (Body.trim().startsWith('#')) {
            const shortcodeMatch = Body.match(/^#(\d+)\s+(ok|no)/i);
            if (shortcodeMatch) {
                const bookingIdNumeric = shortcodeMatch[1];
                const response = shortcodeMatch[2].toLowerCase();

                // 1. Identify Business via From Number
                const { data: ownerProfile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('phone_number', From.replace('whatsapp:', ''))
                    .single();

                if (ownerProfile) {
                    logToFile(`🛠️ Shortcode Detected from Owner ${From}: ${Body}`);

                    // Find the most recent pending booking for this business
                    const { data: latestBooking } = await supabase
                        .from('bookings')
                        .select('*')
                        .eq('business_id', ownerProfile.id)
                        .eq('status', 'pending')
                        .order('created_at', { ascending: false })
                        .limit(1)
                        .single();

                    if (latestBooking) {
                        const newStatus = response === 'ok' ? 'approved' : 'rejected';

                        // Update Booking
                        await supabase
                            .from('bookings')
                            .update({ status: newStatus })
                            .eq('id', latestBooking.id);

                        // Schedule Reminders if Approved
                        if (newStatus === 'approved') {
                            await bookings.scheduleReminders(latestBooking.id, latestBooking.start_time);
                        }

                        // Notify Customer (Trigger same logic as dashboard)
                        const bookingInfo = await bookings.getBookingById(latestBooking.id);
                        const customerMsg = newStatus === 'approved'
                            ? `Aweh! Your booking for ${bookingInfo.datetime} has been confirmed. See you then! 🤙`
                            : `Hi, unfortunately we couldn't make that time work. Please try another slot.`;

                        await client.messages.create({
                            from: process.env.TWILIO_PHONE_NUMBER,
                            to: `whatsapp:${bookingInfo.phone}`,
                            body: customerMsg
                        });

                        return res.status(200).type('text/xml').send(new MessagingResponse().message(`Sharp! Booking for ${bookingInfo.name} has been ${newStatus}.`).toString());
                    } else {
                        return res.status(200).type('text/xml').send(new MessagingResponse().message("I couldn't find any pending bookings to update.").toString());
                    }
                }
            }
        }

        // B. Level 2: Sticky Session (Existing User)
        if (!businessId) {
            const { data: state } = await supabase
                .from('conversation_states')
                .select('business_id')
                .eq('phone_number', From)
                .single();

            if (state && state.business_id) {
                // Logic seems missing here in original code, assuming it should assign businessId
                businessId = state.business_id;
                logToFile(`✅ Resolved Business (Sticky): ${businessId}`);
            }

            // FAIL SAFE
            // If we are in the SANDBOX, we might not have a businessId yet if it's the very first message
            // and they didn't say "join".
            // For Dev/Demo purposes, we might fallback to default if ENV is set.
            if (!businessId && process.env.DEFAULT_BUSINESS_ID) {
                console.log(`⚠️ Using Fallback Default Business ID: ${process.env.DEFAULT_BUSINESS_ID}`);
                businessId = process.env.DEFAULT_BUSINESS_ID;
                logToFile(`⚠️ Using Fallback Default Business ID: ${businessId}`);
            }

        }

        // End of Resolution Logic
        if (!businessId) {
            console.warn(`❌ Unresolved Business for ${To}. Aborting.`);
            logToFile(`❌ Unresolved Business for ${To}.`);
            const twiml = new MessagingResponse();
            twiml.message("Configuration Error: I don't know which business you are trying to reach. Please use the specific booking link provided by the business.");
            return res.status(200).type('text/xml').send(twiml.toString());
        }

        // 3. HANDOFF TO AI
        // We pass the resolved businessId to the AI logic
        logToFile(`🤖 Handoff to AI for Business: ${businessId}`);
        const responseText = await handleIncomingMessage(From, Body, businessId);
        logToFile(`📤 AI Response: ${responseText}`);

        const twiml = new MessagingResponse();
        twiml.message(responseText);

        res.type('text/xml').send(twiml.toString());

    } catch (error) {
        console.error('❌ Webhook Error:', error);
        logToFile(`❌ Webhook Error Stack: ${error.stack}`);
        // Fallback Reply (Phase 3)
        const twiml = new MessagingResponse();
        twiml.message("Oops! I had a little hiccup. Please try sending that again.");
        res.status(200).type('text/xml').send(twiml.toString());
    }
});

// 5. Booking Management Endpoints
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

        // --- NEW: Schedule Reminders if Approved ---
        if (action === 'approved') {
            await bookings.scheduleReminders(id, booking.start_time || booking.datetime);
        }
    } catch (e) {
        console.error("Error sending WhatsApp confirm / scheduling reminders:", e);
    }

    res.json({ success: true });
});

// 6. Reminder Runner (Background Process)
async function processReminders() {
    // console.log("⏰ Checking for due reminders...");
    const now = new Date().toISOString();

    // 1. Fetch pending reminders due before now
    const { data: dueReminders } = await supabase
        .from('reminders')
        .select('*, bookings(*)')
        .eq('status', 'pending')
        .lte('scheduled_time', now);

    if (!dueReminders || dueReminders.length === 0) return;

    for (const reminder of dueReminders) {
        const booking = reminder.bookings;
        if (!booking || booking.status !== 'approved') {
            // Cancel reminder if booking was cancelled/rejected
            await supabase.from('reminders').update({ status: 'cancelled' }).eq('id', reminder.id);
            continue;
        }

        // 2. Fetch Business Name
        const { data: business } = await supabase
            .from('profiles')
            .select('business_name')
            .eq('id', booking.business_id)
            .single();

        const bizName = business?.business_name || "the shop";
        const timeStr = new Date(booking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        // 3. Construct Message
        let message = "";
        if (reminder.type === '24h_before') {
            message = `Hi ${booking.customer_name}! 👋 Just a friendly reminder from ${bizName} that you're booked in for tomorrow at ${timeStr}. We're looking forward to seeing you. Sharp! 🚀`;
        } else {
            message = `Aweh ${booking.customer_name}! Just a quick heads-up that your appointment with ${bizName} is coming up today at ${timeStr}. See you soon! Sharp.`;
        }

        // 4. Send WhatsApp
        try {
            await client.messages.create({
                from: process.env.TWILIO_PHONE_NUMBER,
                to: `whatsapp:${booking.customer_phone}`,
                body: message
            });

            // 5. Mark as Sent
            await supabase.from('reminders').update({ status: 'sent' }).eq('id', reminder.id);
            logToFile(`✅ Sent reminder (${reminder.type}) to ${booking.customer_phone}`);
        } catch (e) {
            console.error("Failed to send reminder:", e);
            await supabase.from('reminders').update({
                attempt_count: reminder.attempt_count + 1,
                last_error: e.message
            }).eq('id', reminder.id);
        }
    }
}

// Run every minute
setInterval(processReminders, 60000);

// Start Server
// Start Server only if run directly
if (require.main === module) {
    app.listen(port, () => {
        console.log(`✅ Server running on http://localhost:${port}`);
    });
}

module.exports = app;
