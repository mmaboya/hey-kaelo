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
    const category = businessContext.category;
    const name = businessContext.name || 'a local business';
    const role = businessContext.role || 'service provider';
    const timeString = new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' });

    const contextHeader = `
[SYSTEM CONTEXT]
- Assistant Name: Kaelo
- Business Name: ${name}
- Business Type: ${role}
- Category: ${category}
- Current Time (SAST): ${timeString}
- Location: South Africa

[BEHAVIOR RULES]
- BE CONCISE: Short WhatsApp-style messages.
- STAY IN CONTEXT: If a user provides their name, remember the slot you just offered them. Do NOT ask for time/date again if already discussed.
- GREETING: Only greet/introduce yourself if it's the start of a conversation. If you see chat history, skip the "I am Kaelo..." part.
- TONE: Professional but with local flair ("Aweh", "Sharp", "Sharp-sharp").
`;

    if (category === 'professional') {
        return contextHeader + `
[GOAL] Confirm an appointment.
[FLOW]
1. Check availability for requested date/time.
2. If available, ask for FULL NAME.
3. Once name is given, call 'createBookingRequest' using the name and the PREVIOUSLY DISCUSSED datetime.
4. Tell them you've sent the request and ask them to complete the registration form below.
`;
    } else if (category === 'tradesperson') {
        return contextHeader + `
[GOAL] Qualify lead with photo/location.
[FLOW]
1. Ask for a photo of the issue and location.
2. Check availability.
3. Call 'createBookingRequest' once they pick a time and give name.
`;
    } else {
        return contextHeader + `
[GOAL] Handle studio bookings OR mobile call-outs.
[FLOW]
1. Detect Intent: Fixed appointment vs. Mobile service.
2. If mobile: Ask for photo/location first.
3. If fixed: Go straight to availability and booking.
`;
    }
}

// --- MAIN HANDLER ---
async function handleIncomingMessage(userPhone, messageText, businessId) {
    console.log(`🤖 AI Processing for ${userPhone} (Biz: ${businessId || 'None'})`);
    const resolvedBizId = businessId || process.env.DEFAULT_BUSINESS_ID;
    const cleanPhone = userPhone.replace(/\D/g, '');

    // 1. Load State & Context
    let state = { metadata: { history: [] } };
    let businessName = "Default Business";
    let profile = null;

    if (resolvedBizId) {
        const { data: stateData } = await supabase
            .from('conversation_states')
            .select('*')
            .eq('phone_number', cleanPhone)
            .maybeSingle();
        if (stateData) state = stateData;

        const { data: profileData } = await supabase
            .from('profiles')
            .select('business_name, role_type, role_category')
            .eq('id', resolvedBizId)
            .single();

        profile = profileData;
        if (profile) businessName = profile.business_name;
    }

    // 2. Prepare System Instruction
    const systemPrompt = getSystemInstruction({
        name: businessName,
        role: profile?.role_type,
        category: profile?.role_category
    });

    // 3. Initialize Model with Static System Instruction
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: systemPrompt
    });

    // 4. Recovery & Mapping History
    let history = state.metadata?.history || [];
    if (history.length > 30) history = history.slice(-30);

    const chatHistory = history.map(h => ({
        role: h.role === 'ai' ? 'model' : 'user',
        parts: [{ text: h.text }]
    }));

    // 5. Start Chat
    const chat = model.startChat({
        history: chatHistory,
        generationConfig: { maxOutputTokens: 1000, temperature: 0.7 }
    });

    try {
        const aiPromise = chat.sendMessage(messageText);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 30000));

        const result = await Promise.race([aiPromise, timeoutPromise]);
        let text = result.response.text();
        console.log("🤖 AI Response:", text);

        let finalReply = text;

        // --- TOOL HANDLING ---

        // 1. checkAvailability
        if (text.includes("checkAvailability")) {
            const dateMatch = messageText.match(/tomorrow|today|monday|tuesday|wednesday|thursday|friday|\d{4}-\d{2}-\d{2}/i);
            const targetDate = dateMatch ? dateMatch[0] : 'tomorrow';

            try {
                const slots = await calendar.generateSlots(targetDate);
                const toolResponse = await chat.sendMessage(`(System Tool Output: checkAvailability): Found following slots for ${targetDate}: ${JSON.stringify(slots)}. Please present these to the user or ask for details.`);
                finalReply = toolResponse.response.text();
            } catch (calErr) {
                console.error("Calendar Error:", calErr);
                const toolResponse = await chat.sendMessage(`(System Error): The calendar system is currently experiencing a technical delay. Please inform the user correctly and offer to take a priority request.`);
                finalReply = toolResponse.response.text();
            }
        }

        // 2. createBookingRequest
        if (finalReply.includes("createBookingRequest")) {
            const nameMatch = finalReply.match(/name\s*=\s*(?:['"]([^'"]+)['"]|(\w+))/);
            const timeMatch = finalReply.match(/datetime\s*=\s*(?:['"]([^'"]+)['"]|([^,)\s]+))/);

            const name = nameMatch ? (nameMatch[1] || nameMatch[2]) : null;
            let datetime = timeMatch ? (timeMatch[1] || timeMatch[2]) : null;

            if (name && datetime) {
                const res = await bookings.addRequest(name, datetime, userPhone, resolvedBizId);
                if (!res.error) {
                    const isMedical = profile?.role_type === 'Doctor' || profile?.role_category === 'professional';
                    finalReply = `Perfect, ${name}! I've sent that request through for ${res.formatted_time || datetime}. 🤙 ${isMedical ? '\n\n📝 I\'ve also sent a registration form below—please fill it out and sign to finalize your appointment.' : 'Expect a confirmation from us shortly!'}`;
                } else {
                    finalReply = `I hit a snag while saving your booking: ${res.error}. Please try one more time?`;
                }
            }
        }

        // 6. Update History & Save State
        history.push({ role: 'user', text: messageText });
        history.push({ role: 'ai', text: finalReply });

        const metadata = { ...state.metadata, history };
        await updateState(userPhone, resolvedBizId, 'processed_message', metadata);

        return finalReply;

    } catch (e) {
        console.error("AI End-to-End Error:", e);
        if (e.message.includes("429") || e.message.includes("quota")) {
            return "Heita! I'm a bit overwhelmed right now. 😅 Give me 30 seconds and try again? Sharp! 🤙";
        }
        return "Oops! I had a little technical hiccup. Please try sending that again? Sharp! 🤙";
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
