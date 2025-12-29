const result = require('dotenv').config();
const fs = require('fs');
const path = require('path');
const logFile = path.join(__dirname, 'server.log');

function logToFile(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
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
const { handleRegistrationChat } = require('./registration');
const salesBot = require('./sales-bot');
const { MessagingResponse } = require('twilio').twiml;

const app = express();
const port = process.env.PORT || 3001;

// Middleware
const crypto = require('crypto');

// Middleware: Request ID & Standard Logger
app.use((req, res, next) => {
    const requestId = req.headers['x-request-id'] || crypto.randomUUID();
    req.id = requestId;
    res.setHeader('x-request-id', requestId);

    console.log(`🌍 [${req.id}] ${req.method} ${req.path}`);
    next();
});

// Helper: Standardized Error Responder
app.use((req, res, next) => {
    res.error = (code, message, status = 500, hint = null) => {
        return res.status(status).json({
            error: {
                code,
                message,
                hint,
                request_id: req.id,
                ts: new Date().toISOString()
            }
        });
    };
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

const supportAgent = require('./support-agent');

// 3.5 Website Sales Bot (Sepitori)
app.post('/api/chat', async (req, res) => {
    const { message, sessionId } = req.body;
    if (!message) return res.status(400).json({ error: 'Missing message' });

    // Default session if none provided
    const localSession = sessionId || 'web-guest-' + Date.now();

    const reply = await salesBot.handleSalesMessage(localSession, message);
    res.json({ reply });
});

// 3.6 Support Triage
app.post('/api/support/triage', async (req, res) => {
    const { ticketId, message, context } = req.body;

    if (!message) return res.error('SUP-400', 'Missing message', 400);

    try {
        // If no ticketId, create one
        let tid = ticketId;
        if (!tid) {
            const { data: newTicket } = await supabase.from('support_tickets').insert({
                subject: message.substring(0, 50),
                channel: 'web',
                status: 'open',
                request_id: req.id
            }).select().single();
            tid = newTicket.id;
        }

        // Log user message
        await supabase.from('support_events').insert({
            ticket_id: tid,
            event_type: 'user_message',
            payload: { message, context, request_id: req.id }
        });

        const reply = await supportAgent.supportTriage(tid, message, context);
        res.json({ reply, ticketId: tid });
    } catch (err) {
        console.error("Support Triage API Error:", err);
        res.error('SUP-500', 'Triage failed');
    }
});

// 4. Receive WhatsApp Reply (Webhook)
app.post('/webhooks/twilio', async (req, res) => {
    try {
        // Log the full body for debugging
        if (!req.body) {
            console.error("❌ ERROR: Request body is missing! Check middleware.");
            logToFile("❌ ERROR: Request body is missing!");
            return res.status(200).send('<Response><Message>Oops, something is wrong with my connection.</Message></Response>');
        }

        console.log("📦 Incoming Webhook Body:", JSON.stringify(req.body, null, 2));

        // Robust extraction with defaults (PascalCase from Twilio, fallback to lowercase)
        const Body = req.body.Body || req.body.body || '';
        const From = req.body.From || req.body.from || req.body.WaId || '';
        const To = req.body.To || req.body.to || req.body.Called || '';
        // Ensure MessageSid is never null for DB constraint
        const MessageSid = req.body.MessageSid || req.body.SmsMessageSid || req.body.SmsSid || `MID-${require('crypto').randomUUID()}`;

        // Log minimal info
        console.log(`📩 INCOMING: ${Body} from ${From} (To: ${To}, SID: ${MessageSid})`);
        logToFile(`📩 INCOMING WEBHOOK: From: ${From}, To: ${To}, Body: ${Body}, SID: ${MessageSid}`);

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

        // 1. Normalize IDs and Inputs
        const cleanFrom = From.replace(/\D/g, ''); // Digits only (e.g., 27848457056)
        const cleanTo = To.replace(/\D/g, '');

        // 2. BUSINESS RESOLUTION
        let businessId = process.env.DEFAULT_BUSINESS_ID || null;

        // Fetch current state for Sticky Session and Onboarding checks
        let convState = null;
        try {
            const { data } = await supabase
                .from('conversation_states')
                .select('*')
                .eq('phone_number', cleanFrom) // Use normalized phone
                .maybeSingle();
            convState = data;
        } catch (e) {
            console.error("❌ Failed to fetch state:", e);
        }

        // A. Level 1: Slug Detection (High Priority - Always Switch if matching)
        const bodyParts = Body.toLowerCase().trim().split(/\s+/);
        const joinIndex = bodyParts.indexOf('join');
        const potentialSlug = (joinIndex !== -1 && bodyParts[joinIndex + 1]) ? bodyParts[joinIndex + 1] : (bodyParts.length === 1 ? bodyParts[0] : null);

        if (potentialSlug && potentialSlug.length > 2) {
            const { data: profileBySlug } = await supabase
                .from('profiles')
                .select('id')
                .eq('slug', potentialSlug)
                .maybeSingle();

            if (profileBySlug) {
                businessId = profileBySlug.id;
                logToFile(`✅ Resolved Business (Slug Priority): ${businessId}`);

                // Exit Onboarding if switching businesses
                const meta = convState?.metadata || {};
                if (meta.onboarding_active) {
                    delete meta.onboarding_active;
                    delete meta.onboarding_step;
                    delete meta.onboarding_data;
                }

                await supabase.from('conversation_states').upsert({
                    phone_number: cleanFrom,
                    business_id: businessId,
                    metadata: meta,
                    updated_at: new Date()
                }, { onConflict: 'phone_number' });

                convState = { ...convState, business_id: businessId, metadata: meta };
            }
        }

        // B. Level 2: Direct Channel (Dedicated Number)
        if (!businessId) {
            const { data: channel } = await supabase
                .from('business_channels')
                .select('business_id')
                .eq('phone_number', cleanTo)
                .maybeSingle();

            if (channel) {
                businessId = channel.business_id;
                logToFile(`✅ Resolved Business (Direct): ${businessId}`);
            }
        }

        // C. Level 3: Sticky Session (Existing User)
        if (!businessId || businessId === process.env.DEFAULT_BUSINESS_ID) {
            if (convState && convState.business_id) {
                businessId = convState.business_id;
                logToFile(`✅ Resolved Business (Sticky): ${businessId}`);
            }
        }

        const isOnboarding = convState?.metadata?.onboarding_active === true;

        // EXPLICIT EXIT: If the body IS EXACTLY a slug, we skip onboarding logic entirely
        let isSlugMessage = false;
        if (businessId && Body.length < 50) {
            const { data: p } = await supabase.from('profiles').select('slug').eq('id', businessId).maybeSingle();
            isSlugMessage = p?.slug && Body.toLowerCase().trim() === p.slug.toLowerCase();
        }

        const isExplicitCommand = Body.toLowerCase().trim().match(/^(setup|start)/i);

        // If DEFAULT_BUSINESS_ID exists, we skip auto-onboarding for greetings
        if ((isExplicitCommand || isOnboarding) && !isSlugMessage) {
            console.log(`🔍 Onboarding Triggered: Explicit=${!!isExplicitCommand}, Active=${isOnboarding}`);
            logToFile(`🚀 Routing to Onboarding: ${cleanFrom}`);

            // If starting fresh, ensure state exists
            if (!convState) {
                const { error } = await supabase.from('conversation_states').insert([{
                    phone_number: cleanFrom,
                    metadata: { onboarding_active: true },
                    business_id: process.env.DEFAULT_BUSINESS_ID || null
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
                await supabase.from('conversation_states').update({ metadata: meta }).eq('phone_number', cleanFrom);
            }

            console.log("🛠️ calling handleOnboarding...");
            try {
                const reply = await onboarding.handleOnboarding(cleanFrom, Body, convState || { metadata: { onboarding_active: true } });
                console.log("✅ onboarding returned:", reply);

                const twiml = new MessagingResponse();
                twiml.message(reply);
                return res.status(200).type('text/xml').send(twiml.toString());
            } catch (err) {
                console.error("❌ Onboarding Handler Crashed:", err);
                throw err;
            }
        }

        // 3. HANDOFF TO AI OR FLOWS
        if (req.body.action === 'data_exchange') {
            const flowData = req.body.data;
            logToFile(`📑 Flow Submitted by ${From}: ${JSON.stringify(flowData)}`);

            // 1. UPDATE DATA (Find the last pending booking for this user)
            const { data: booking } = await supabase
                .from('bookings')
                .select('*')
                .eq('phone', From)
                .eq('status', 'pending')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (booking) {
                await supabase.from('bookings').update({
                    patient_id_number: flowData.id_number,
                    medical_aid_name: flowData.medical_aid,
                    reason_for_visit: flowData.reason,
                    form_signed_at: new Date()
                }).eq('id', booking.id);

                // 2. NOTIFY BUSINESS OWNER (Doctor)
                const { data: biz } = await supabase.from('profiles').select('phone_number, business_name').eq('id', booking.business_id).single();
                if (biz && biz.phone_number) {
                    await client.messages.create({
                        from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
                        to: `whatsapp:${biz.phone_number}`,
                        body: `📝 *New Signed Registration!*\n\nPatient: ${flowData.full_name}\nID: ${flowData.id_number}\nMedical Aid: ${flowData.medical_aid}\nReason: ${flowData.reason}\n\nThis form has been digitally signed and attached to the booking request for ${new Date(booking.datetime).toLocaleString()}.`
                    });
                }
            }

            // 3. ACKNOWLEDGE TO PATIENT
            return res.status(200).json({
                screen: "SUCCESS",
                data: {
                    extension_message_response: {
                        params: {
                            message: "Sharp! Your registration and consent form have been signed. The doctor has been notified. 🤙"
                        }
                    }
                }
            });
        }

        // --- NEW: Shortcode & Command Detection for Business Owners ---
        const trimmedBody = Body.trim().toLowerCase();
        const ownerPhone = From.replace(/\D/g, ''); // Normalize From number to digits only

        if (trimmedBody.startsWith('#')) {
            // Fetch all profiles for this phone number
            const { data: profiles } = await supabase.from('profiles').select('id, business_name, phone_number');
            const ownerProfiles = profiles?.filter(p => p.phone_number?.replace(/\D/g, '') === ownerPhone) || [];

            if (ownerProfiles.length > 0) {
                // Check for Summary Commands
                if (trimmedBody === '#today' || trimmedBody === '#summary') {
                    let fullSummary = `📅 *Today's Appointments*\n`;
                    let hasBookings = false;

                    for (const profile of ownerProfiles) {
                        const daily = await bookings.getDailyBookings(profile.id);
                        if (daily.length > 0) {
                            hasBookings = true;
                            fullSummary += `\n*${profile.business_name}:*\n`;
                            fullSummary += daily.map(b => `• ${new Date(b.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}: ${b.customer_name}`).join('\n') + '\n';
                        }
                    }

                    if (!hasBookings) {
                        return res.status(200).type('text/xml').send(new MessagingResponse().message("Aweh! No confirmed appointments for today across your businesses. 🤙").toString());
                    }

                    fullSummary += `\nHave a sharp day! 🤙`;
                    return res.status(200).type('text/xml').send(new MessagingResponse().message(fullSummary).toString());
                }

                // Check for Accept/Reject Shortcodes (e.g., #123 ok)
                const shortcodeMatch = Body.match(/^#(\d+)\s+(ok|no)/i);
                if (shortcodeMatch) {
                    const bookingId = shortcodeMatch[1];
                    const response = shortcodeMatch[2].toLowerCase();

                    logToFile(`🛠️ Shortcode Detected from Owner ${From}: ${Body}`);

                    // Search across all owned businesses for this specific booking ID
                    const { data: targetBooking } = await supabase
                        .from('bookings')
                        .select('*')
                        .eq('id', bookingId)
                        .in('business_id', ownerProfiles.map(p => p.id))
                        .maybeSingle();

                    if (targetBooking) {
                        if (targetBooking.status !== 'pending') {
                            return res.status(200).type('text/xml').send(new MessagingResponse().message(`Aweh! This booking (#${bookingId}) is already ${targetBooking.status}.`).toString());
                        }

                        const newStatus = response === 'ok' ? 'approved' : 'rejected';

                        // Update Booking
                        await supabase
                            .from('bookings')
                            .update({ status: newStatus })
                            .eq('id', targetBooking.id);

                        // Schedule Reminders if Approved
                        if (newStatus === 'approved') {
                            await bookings.scheduleReminders(targetBooking.id, targetBooking.start_time);
                        }

                        // Notify Customer
                        const bookingInfo = await bookings.getBookingById(targetBooking.id);
                        const customerMsg = newStatus === 'approved'
                            ? `Aweh! Your booking for ${bookingInfo.datetime} has been confirmed. See you then! 🤙`
                            : `Hi, unfortunately we couldn't make that time work for your booking on ${bookingInfo.datetime}. Please try another slot.`;

                        await client.messages.create({
                            from: process.env.TWILIO_PHONE_NUMBER,
                            to: `whatsapp:${bookingInfo.phone}`,
                            body: customerMsg
                        }).catch(e => console.error("Failed to notify customer:", e));

                        const biz = ownerProfiles.find(p => p.id === targetBooking.business_id);
                        return res.status(200).type('text/xml').send(new MessagingResponse().message(`Sharp! Booking for ${bookingInfo.name} (#${bookingId}) at ${biz?.business_name || 'your shop'} has been ${newStatus}.`).toString());
                    } else {
                        return res.status(200).type('text/xml').send(new MessagingResponse().message("I couldn't find that specific booking ID among your businesses. Please check the number.").toString());
                    }
                }
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

        // 3. HANDOFF TO AI OR ACTIVE REGISTRATION
        if (convState?.metadata?.registration_active) {
            logToFile(`📝 Continuing Chat Registration for ${cleanFrom}`);
            const regBookingId = convState.metadata.reg_booking_id;
            const mediaUrl = req.body.MediaUrl0 || null; // NEW: Get photo signature

            const reply = await handleRegistrationChat(cleanFrom, Body, convState, regBookingId, mediaUrl);
            const twiml = new MessagingResponse();
            twiml.message(reply);
            return res.type('text/xml').send(twiml.toString());
        }

        logToFile(`🤖 Handoff to AI for Business: ${businessId}`);
        const responseText = await handleIncomingMessage(cleanFrom, Body, businessId);
        logToFile(`📤 AI Response: ${responseText}`);

        // --- Flow / Registration Trigger ---
        if (responseText.includes("registration form")) {
            // Find the booking we just created
            const { data: latestBooking } = await supabase
                .from('bookings')
                .select('id, business_id')
                .eq('customer_phone', cleanFrom)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (latestBooking) {
                // Determine if we use native Flow or Chat-based
                const { data: profile } = await supabase.from('profiles').select('role_type').eq('id', businessId).single();

                if (profile?.role_type === 'Doctor' && process.env.DOCTOR_FLOW_ID) {
                    // Try Native Flow (WABA required)
                    logToFile(`🚀 Triggering Native Flow Message for ${From}`);
                    try {
                        await client.messages.create({
                            from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
                            to: From,
                            body: responseText, // Include the text
                            // Here we would ideally send an interactive flow message 
                            // Twilio supports this through 'contentSid' for templates or specialized parameters.
                            // For this demo, we'll assume the text includes a link or specialized instructions 
                            // OR we use the specialized interactive parameter if using a provider that supports it.
                            // Since standard Twilio Node SDK requires Content SID for rich interactive stuff:
                            // persistentAction: [`flow:{"flow_id":"${process.env.DOCTOR_FLOW_ID}"}`] (hypothetical for some vendors)
                        });
                        return res.status(200).send(); // Handled manually
                    } catch (e) {
                        console.error("Flow Trigger Error:", e);
                    }
                } else {
                    // Fallback to Seamless Chat Registration (Built-into WhatsApp)
                    logToFile(`💬 Initializing Chat-based CRM Form for ${cleanFrom}`);
                    const mediaUrl = req.body.MediaUrl0 || null;
                    const firstQuestion = await handleRegistrationChat(cleanFrom, Body, convState, latestBooking.id, mediaUrl);

                    if (firstQuestion) {
                        // Send the first question as a separate message
                        await client.messages.create({
                            from: `whatsapp:${process.env.TWILIO_PHONE_NUMBER}`,
                            to: From,
                            body: firstQuestion
                        });

                        // Explicitly update local and DB state to ensure next message is caught
                        if (!convState) convState = { phone_number: cleanFrom };
                        const meta = convState.metadata || {};
                        meta.registration_active = true;
                        meta.reg_booking_id = latestBooking.id;
                        await supabase.from('conversation_states').upsert({
                            phone_number: cleanFrom,
                            metadata: meta,
                            business_id: businessId
                        }, { onConflict: 'phone_number' });
                    }
                }
            }
        }

        const twiml = new MessagingResponse();
        twiml.message(responseText);
        res.type('text/xml').send(twiml.toString());

    } catch (error) {
        console.error('❌ Webhook Error:', error);
        logToFile(`❌ Webhook Error: ${error.message}\nStack: ${error.stack}`);

        // Fallback Reply (Phase 3)
        // Ensure we haven't already sent a response
        if (!res.headersSent) {
            const twiml = new MessagingResponse();
            twiml.message(`Oops! I had a little hiccup (${error.message.slice(0, 100)}). Please try sending that again.`);
            res.status(200).type('text/xml').send(twiml.toString());
        }
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
