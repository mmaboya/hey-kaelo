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
const wa = require('./whatsapp');
const { handleIncomingMessage } = require('./ai');
const calendar = require('./calendar');
const supabase = require('./supabase');
const bookings = require('./bookings');
const onboarding = require('./onboarding');
const { handleRegistrationChat } = require('./registration');
const salesBot = require('./sales-bot');

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
        const result = await wa.sendMessage(to, body);
        console.log(`Message sent to ${to}:`, result.sid);
        res.json({ success: true, messageId: result.sid });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: 'Failed to send WhatsApp message.' });
    }
});

// 3. Chat Simulator Endpoint (Direct AI Access)
app.post('/api/simulate-chat', async (req, res) => {
    const { message, sessionId } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Missing message' });
    }

    const session = sessionId || 'simulator-session';

    const response = await handleIncomingMessage(session, message);
    res.json({ reply: response });
});

const supportAgent = require('./support-agent');

// 3.5 Website Sales Bot (Sepitori)
app.post('/api/chat', async (req, res) => {
    const { message, sessionId } = req.body;
    if (!message) return res.status(400).json({ error: 'Missing message' });

    const localSession = sessionId || 'web-guest-' + Date.now();

    const reply = await salesBot.handleSalesMessage(localSession, message);
    res.json({ reply });
});

// 3.6 Support Triage
app.post('/api/support/triage', async (req, res) => {
    const { ticketId, message, context, userId } = req.body;

    if (!message) return res.error('SUP-400', 'Missing message', 400);

    try {
        let tid = ticketId;
        if (!tid) {
            const { data: newTicket } = await supabase.from('support_tickets').insert({
                tenant_profile_id: userId,
                subject: message.substring(0, 50),
                channel: 'web',
                status: 'open',
                request_id: req.id
            }).select().single();
            tid = newTicket.id;
        }

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

// 4. Receive WhatsApp Messages (Twilio Webhook)
app.post('/webhooks/whatsapp', async (req, res) => {
    // Always ACK immediately
    res.sendStatus(200);

    try {
        const Body = req.body.Body;
        const From = req.body.From; // e.g. "whatsapp:+27848457056"
        const To = req.body.To;     // e.g. "whatsapp:+14155238886"
        const MessageSid = req.body.MessageSid;

        // Ignore status callbacks (no Body) and non-text messages
        if (!Body || !From || !MessageSid) return;

        console.log(`📩 INCOMING: "${Body}" from ${From} (To: ${To}, MsgId: ${MessageSid})`);
        logToFile(`📩 INCOMING WEBHOOK: From: ${From}, To: ${To}, Body: ${Body}, SID: ${MessageSid}`);

        // 1. IDEMPOTENCY CHECK
        const { error: idempotencyError } = await supabase
            .from('webhook_events')
            .insert([{ message_sid: MessageSid }]);

        if (idempotencyError) {
            if (idempotencyError.code === '23505') {
                console.warn(`🔁 Duplicate Message Ignored: ${MessageSid}`);
                return;
            }
            logToFile(`❌ Idempotency DB Error: ${JSON.stringify(idempotencyError)}`);
            throw idempotencyError;
        }

        // 1. Normalize IDs and Inputs
        const cleanFrom = From.replace(/\D/g, '');
        const cleanTo = To.replace(/\D/g, '');

        // 2. BUSINESS RESOLUTION
        let businessId = process.env.DEFAULT_BUSINESS_ID || null;

        let convState = null;
        try {
            const { data } = await supabase
                .from('conversation_states')
                .select('*')
                .eq('phone_number', cleanFrom)
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

                const slugMeta = convState?.metadata || {};
                if (slugMeta.onboarding_active) {
                    delete slugMeta.onboarding_active;
                    delete slugMeta.onboarding_step;
                    delete slugMeta.onboarding_data;
                }

                await supabase.from('conversation_states').upsert({
                    phone_number: cleanFrom,
                    business_id: businessId,
                    metadata: slugMeta,
                    updated_at: new Date()
                }, { onConflict: 'phone_number' });

                convState = { ...convState, business_id: businessId, metadata: slugMeta };
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

        let isSlugMessage = false;
        if (businessId && Body.length < 50) {
            const { data: p } = await supabase.from('profiles').select('slug').eq('id', businessId).maybeSingle();
            isSlugMessage = p?.slug && Body.toLowerCase().trim() === p.slug.toLowerCase();
        }

        const isExplicitCommand = Body.toLowerCase().trim().match(/^(setup|start)/i);

        if ((isExplicitCommand || isOnboarding) && !isSlugMessage) {
            console.log(`🔍 Onboarding Triggered: Explicit=${!!isExplicitCommand}, Active=${isOnboarding}`);
            logToFile(`🚀 Routing to Onboarding: ${cleanFrom}`);

            if (!convState) {
                const { error } = await supabase.from('conversation_states').insert([{
                    phone_number: cleanFrom,
                    metadata: { onboarding_active: true },
                    business_id: process.env.DEFAULT_BUSINESS_ID || null
                }]);
                if (error) {
                    console.error("❌ CRITICAL DB ERROR:", JSON.stringify(error, null, 2));
                    logToFile(`❌ Failed to init Onboarding State: ${JSON.stringify(error)}`);
                }
            } else if (!isOnboarding) {
                const meta = convState.metadata || {};
                meta.onboarding_active = true;
                await supabase.from('conversation_states').update({ metadata: meta }).eq('phone_number', cleanFrom);
            }

            console.log("🛠️ calling handleOnboarding...");
            try {
                const reply = await onboarding.handleOnboarding(cleanFrom, Body, convState || { metadata: { onboarding_active: true } });
                console.log("✅ onboarding returned:", reply);
                await wa.sendMessage(cleanFrom, reply).catch(e => console.error("❌ Send failed:", e));
                return;
            } catch (err) {
                console.error("❌ Onboarding Handler Crashed:", err);
                throw err;
            }
        }

        // --- Shortcode & Command Detection for Business Owners ---
        const trimmedBody = Body.trim().toLowerCase();

        if (trimmedBody.startsWith('#')) {
            const { data: profiles } = await supabase.from('profiles').select('id, business_name, phone_number');
            const ownerProfiles = profiles?.filter(p => p.phone_number?.replace(/\D/g, '') === cleanFrom) || [];

            if (ownerProfiles.length > 0) {
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
                        await wa.sendMessage(cleanFrom, "Gee whiz! No confirmed appointments for today across your businesses. ✨").catch(e => console.error("❌ Send failed:", e));
                        return;
                    }

                    fullSummary += `\nHave a fan-tas-tic day! 🎈`;
                    await wa.sendMessage(cleanFrom, fullSummary).catch(e => console.error("❌ Send failed:", e));
                    return;
                }

                const shortcodeMatch = Body.match(/^#(\d+)\s+(ok|no)/i);
                if (shortcodeMatch) {
                    const bookingId = shortcodeMatch[1];
                    const response = shortcodeMatch[2].toLowerCase();

                    logToFile(`🛠️ Shortcode Detected from Owner ${cleanFrom}: ${Body}`);

                    const { data: targetBooking } = await supabase
                        .from('bookings')
                        .select('*')
                        .eq('id', bookingId)
                        .in('business_id', ownerProfiles.map(p => p.id))
                        .maybeSingle();

                    if (targetBooking) {
                        if (targetBooking.status !== 'pending') {
                            await wa.sendMessage(cleanFrom, `Gee whiz! This booking (#${bookingId}) is already ${targetBooking.status}.`).catch(e => console.error("❌ Send failed:", e));
                            return;
                        }

                        const newStatus = response === 'ok' ? 'approved' : 'rejected';

                        await supabase
                            .from('bookings')
                            .update({ status: newStatus })
                            .eq('id', targetBooking.id);

                        if (newStatus === 'approved') {
                            await bookings.scheduleReminders(targetBooking.id, targetBooking.start_time);
                        }

                        const bookingInfo = await bookings.getBookingById(targetBooking.id);
                        const customerMsg = newStatus === 'approved'
                            ? `Okie-dokie! Your booking for ${bookingInfo.datetime} has been confirmed. See you then! ✨`
                            : `Gee whiz, unfortunately we couldn't make that time work for your booking on ${bookingInfo.datetime}. Please try another slot.`;

                        await wa.sendMessage(bookingInfo.phone, customerMsg).catch(e => console.error("Failed to notify customer:", e));

                        const biz = ownerProfiles.find(p => p.id === targetBooking.business_id);
                        await wa.sendMessage(cleanFrom, `Super-duper! Booking for ${bookingInfo.name} (#${bookingId}) at ${biz?.business_name || 'your shop'} has been ${newStatus}.`).catch(e => console.error("❌ Send failed:", e));
                        return;
                    } else {
                        await wa.sendMessage(cleanFrom, "I couldn't find that specific booking ID among your businesses. Please check the number.").catch(e => console.error("❌ Send failed:", e));
                        return;
                    }
                }
            }
        }

        // End of Resolution Logic
        if (!businessId) {
            console.warn(`❌ Unresolved Business for ${To}. Aborting.`);
            logToFile(`❌ Unresolved Business for ${To}.`);
            await wa.sendMessage(cleanFrom, "Configuration Error: I don't know which business you are trying to reach. Please use the specific booking link provided by the business.").catch(e => console.error("❌ Send failed:", e));
            return;
        }

        // 3. HANDOFF TO AI OR ACTIVE REGISTRATION
        if (convState?.metadata?.registration_active) {
            logToFile(`📝 Continuing Chat Registration for ${cleanFrom}`);
            const regBookingId = convState.metadata.reg_booking_id;

            const reply = await handleRegistrationChat(cleanFrom, Body, convState, regBookingId, null);
            await wa.sendMessage(cleanFrom, reply).catch(e => console.error("❌ Send failed:", e));
            return;
        }

        logToFile(`🤖 Handoff to AI for Business: ${businessId}`);
        const responseText = await handleIncomingMessage(cleanFrom, Body, businessId);
        logToFile(`📤 AI Response: ${responseText}`);

        // --- Registration Trigger ---
        if (responseText.includes("registration form")) {
            const { data: latestBooking } = await supabase
                .from('bookings')
                .select('id, business_id')
                .eq('customer_phone', cleanFrom)
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            if (latestBooking) {
                logToFile(`💬 Initializing Chat-based CRM Form for ${cleanFrom}`);
                const firstQuestion = await handleRegistrationChat(cleanFrom, Body, convState, latestBooking.id, null);

                if (firstQuestion) {
                    await wa.sendMessage(cleanFrom, firstQuestion).catch(e => console.error("❌ Send failed:", e));

                    if (!convState) convState = { phone_number: cleanFrom };
                    const regMeta = convState.metadata || {};
                    regMeta.registration_active = true;
                    regMeta.reg_booking_id = latestBooking.id;
                    await supabase.from('conversation_states').upsert({
                        phone_number: cleanFrom,
                        metadata: regMeta,
                        business_id: businessId
                    }, { onConflict: 'phone_number' });
                    return;
                }
            }
        }

        await wa.sendMessage(cleanFrom, responseText).catch(e => console.error("❌ Send failed:", e));

    } catch (error) {
        console.error('❌ Webhook Error:', error);
        logToFile(`❌ Webhook Error: ${error.message}\nStack: ${error.stack}`);
    }
});

// 5. Booking Management Endpoints
// Respond to booking (Approve/Reject)
app.post('/api/bookings/:id/respond', async (req, res) => {
    const { id } = req.params;
    const { action } = req.body;

    const booking = await bookings.getBookingById(id);
    if (!booking) {
        return res.status(404).json({ error: 'Booking not found' });
    }

    const message = action === 'approved'
        ? `🎉 Booking Confirmed! Your appointment for ${booking.datetime} has been approved.`
        : `❌ Booking Update: unfortunately your request for ${booking.datetime} could not be approved. Please try another time.`;

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
        await wa.sendMessage(booking.phone, message);
        console.log(`Sent ${action} notification to ${booking.phone}`);

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
    const now = new Date().toISOString();

    const { data: dueReminders } = await supabase
        .from('reminders')
        .select('*, bookings(*)')
        .eq('status', 'pending')
        .lte('scheduled_time', now);

    if (!dueReminders || dueReminders.length === 0) return;

    for (const reminder of dueReminders) {
        const booking = reminder.bookings;
        if (!booking || booking.status !== 'approved') {
            await supabase.from('reminders').update({ status: 'cancelled' }).eq('id', reminder.id);
            continue;
        }

        const { data: business } = await supabase
            .from('profiles')
            .select('business_name')
            .eq('id', booking.business_id)
            .single();

        const bizName = business?.business_name || "the shop";
        const timeStr = new Date(booking.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        let message = "";
        if (reminder.type === '24h_before') {
            message = `Hi ${booking.customer_name}! ✨ Just a friendly reminder from ${bizName} that you're booked in for tomorrow at ${timeStr}. We're looking forward to seeing you. Toodles! 🎈`;
        } else {
            message = `Okie-dokie ${booking.customer_name}! Just a quick heads-up that your appointment with ${bizName} is coming up today at ${timeStr}. See you soon! Super-duper.`;
        }

        try {
            await wa.sendMessage(booking.customer_phone, message);
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

// Start Server only if run directly
if (require.main === module) {
    app.listen(port, () => {
        console.log(`✅ Server running on http://localhost:${port}`);
    });
}

module.exports = app;
