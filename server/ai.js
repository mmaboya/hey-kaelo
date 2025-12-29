// server/ai.js
require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const calendar = require('./calendar');
const bookings = require('./bookings');
const supabase = require('./supabase'); // Import Supabase Client

// Initialize Gemini
function getModel() {
    try {
        const key = (process.env.GEMINI_API_KEY || "").trim();
        const genAI = new GoogleGenerativeAI(key);
        // Use the most compatible model ID from the allowed list
        return genAI.getGenerativeModel({ model: "gemini-flash-latest" });
    } catch (e) {
        console.error("Error initializing Gemini model:", e);
        throw e;
    }
}

// --- SYSTEM INSTRUCTION ---
function getSystemInstruction(businessContext = {}) {
    const category = businessContext.category; // 'professional', 'tradesperson', 'hybrid'
    const name = businessContext.name || 'a local business';
    const role = businessContext.role || 'service provider';

    if (category === 'professional') {
        return `
You are Kaelo, a professional digital receptionist for ${name}, a ${role} practice in South Africa.
Current Time (SAST): ${new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}
Primary Outcome: A confirmed appointment and completed registration.

TONE:
- Professional, efficient, and reliable.
- Use light local greetings like "Aweh" or "Sharp".

CONVERSATION FLOW:
1. When a user asks for an appointment, call 'checkAvailability(date)'.
2. Recommend specific slots. Once a user picks one, ask for their Full Name.
3. Call 'createBookingRequest' with name and datetime.
4. After booking, say: "Sharp! I've sent that request through. 📝 I've also sent a registration form below—please fill it out to finalize your appointment."

RULES:
- Always guide the user to a booking slot.
- Mention the registration form immediately after calling 'createBookingRequest'.
`;
    } else if (category === 'tradesperson') {
        return `
You are Kaelo, a helpful and street-smart assistant for ${name}, a ${role} business in South Africa.
Current Time (SAST): ${new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}
Primary Outcome: Qualifying a lead with a photo and location.

TONE:
- Friendly, practical, and hustle-ready.
- Use local greetings like "Aweh", "Heita", or "Sharp".

CONVERSATION FLOW:
1. When a user asks for service, ask them to provide:
   - A photo of the issue/work needed.
   - Their location/address (or a pin).
2. Once they provide details (or if they are asking for a specific time), call 'checkAvailability(date)' to see when the boss is free.
3. Call 'createBookingRequest' once they pick a time and provide a name.
4. After booking, say: "Sharp! I've sent that to the boss. They're on a job right now but will check it and confirm with you shortly. Hang tight! 🤙"

RULES:
- Focus on gathering visual info (photos) and location for trades.
`;
    } else {
        // HYBRID
        return `
You are Kaelo, a versatile and efficient assistant for ${name}, a ${role} business in South Africa.
Current Time (SAST): ${new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}
Primary Outcome: A confirmed appointment OR a qualified lead.

TONE:
- Adaptable, professional yet approachable.
- Use light local greetings like "Aweh" or "Sharp".

CONVERSATION FLOW:
1. Listen to the user's request. If they want a set appointment, follow the receptionist flow (Check availability -> Get Name -> Book).
2. If they need a call-out or mobile service, ask for a photo and location first, then check availability.
3. Call 'createBookingRequest' once details are clear.
4. After booking, confirm professionally and mention that the boss will review the details.

RULES:
- Be flexible. Handle both structured bookings and mobile requests seamlessly.
`;
    }
}

// --- MAIN HANDLER ---
async function handleIncomingMessage(userPhone, messageText, businessId) {
    console.log(`🤖 AI Processing for ${userPhone} (Biz: ${businessId || 'None'})`);
    const resolvedBizId = businessId || process.env.DEFAULT_BUSINESS_ID;
    const key = process.env.GEMINI_API_KEY || "";
    console.log(`🔑 Using Key: ${key.slice(0, 4)}...${key.slice(-4)} (Length: ${key.length})`);

    // 2. LOAD STATE
    let state = { metadata: { history: [] } };
    let businessName = "Default Business";
    let profile = null;

    if (resolvedBizId) {
        const cleanPhone = userPhone.replace(/\D/g, '');
        // Fetch Context + State
        const { data: stateData } = await supabase
            .from('conversation_states')
            .select('*')
            .eq('phone_number', cleanPhone)
            .maybeSingle();
        if (stateData) state = stateData;

        // Fetch Business Context
        const { data: profileData } = await supabase
            .from('profiles')
            .select('business_name, role_type, role_category')
            .eq('id', resolvedBizId)
            .single();

        profile = profileData;
        if (profile) {
            businessName = profile.business_name;
            state.businessRole = profile.role_type || profile.role_category;
        }
    }

    // Recover History
    let history = state.metadata?.history || [];
    if (history.length > 20) history = history.slice(-20);

    const chatHistory = history.map(h => ({
        role: h.role === 'ai' ? 'model' : 'user',
        parts: [{ text: h.text }]
    }));

    if (chatHistory.length === 0) {
        chatHistory.push({ role: "user", parts: [{ text: "System Context: User Phone is " + userPhone }] });
    }

    const chat = getModel().startChat({
        history: chatHistory,
        generationConfig: { maxOutputTokens: 1000 }
    });

    const systemPrompt = getSystemInstruction({
        name: businessName,
        role: profile?.role_type,
        category: profile?.role_category
    });
    let fullPrompt = messageText;

    // Always prepend system context to ensure it stays on track
    fullPrompt = `${systemPrompt}\n\nUser: ${messageText}`;

    try {
        const aiPromise = chat.sendMessage(fullPrompt);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 30000));

        const result = await Promise.race([aiPromise, timeoutPromise]);
        let text = result.response.text();
        console.log("🤖 AI Raw Response Text:", text);

        let finalReply = text;

        // TOOL CALL: checkAvailability
        if (text.includes("checkAvailability")) {
            const dateMatch = messageText.match(/tomorrow|today|monday|tuesday|wednesday|thursday|friday|\d{4}-\d{2}-\d{2}/i);
            if (dateMatch) {
                const slots = await calendar.generateSlots(dateMatch[0]);
                const toolResult = await chat.sendMessage(`(System Tool Output): ${JSON.stringify(slots)}`);
                finalReply = toolResult.response.text();
            }
        }

        // TOOL CALL: createBookingRequest
        if (finalReply.includes("createBookingRequest")) {
            console.log("🛠️ Detected Tool Call: createBookingRequest");
            // Improved regex to handle various quoting styles and spacing
            const nameMatch = finalReply.match(/name\s*=\s*(?:['"]([^'"]+)['"]|(\w+))/);
            const timeMatch = finalReply.match(/datetime\s*=\s*(?:['"]([^'"]+)['"]|([^,)\s]+))/);

            const name = nameMatch ? (nameMatch[1] || nameMatch[2]) : null;
            let datetime = timeMatch ? (timeMatch[1] || timeMatch[2]) : null;

            console.log(`🔍 Extracted: name=${name}, datetime=${datetime}`);

            if (name && datetime) {
                // FALLBACK: If AI sends a relative date instead of ISO, let's log it
                const res = await bookings.addRequest(name, datetime, userPhone, resolvedBizId);

                if (res.error) {
                    console.error("❌ Booking Tool Error:", res.error);
                    finalReply = `I tried to book that, but: ${res.error}`;
                } else {
                    const isMedical = profile?.role_type === 'Doctor' || profile?.role_category === 'professional';
                    finalReply = `Great! I've sent a request for ${res.datetime}. ${isMedical ? '📝 I\'ve also sent a registration form below—please fill it out and sign to finalize your appointment.' : 'You\'ll receive a confirmation soon!'}`;
                }
            } else {
                console.warn("⚠️ Tool call detected but extraction failed. Reply:", finalReply);
            }
        }

        // Update History & Save State
        history.push({ role: 'user', text: messageText });
        history.push({ role: 'ai', text: finalReply });

        const metadata = { ...state.metadata, history };
        await updateState(userPhone, resolvedBizId, 'processed_message', metadata);

        return finalReply;

    } catch (e) {
        console.error("AI Error Detailed:", e);
        const errorMsg = e.message || "Unknown error";
        if (errorMsg.includes("429") || errorMsg.includes("quota")) {
            return "Heita! I'm a bit overwhelmed with messages right now. 😅 Please give me about 30 seconds to catch my breath and then try that again. Sorry for the wait! 🤙";
        }
        return "I'm having a small technical hiccup. Please try again in a moment. Sharp! 🤙";
    }
}

async function updateState(phone, businessId, action, metadata) {
    const { error } = await supabase.from('conversation_states').upsert({
        phone_number: phone,
        business_id: businessId || process.env.DEFAULT_BUSINESS_ID,
        last_action: action,
        metadata: metadata,
        updated_at: new Date()
    }, { onConflict: 'phone_number' });
    if (error) console.error("Update State Error:", error);
}

module.exports = { handleIncomingMessage };
