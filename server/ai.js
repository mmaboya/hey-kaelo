// server/ai.js
require('dotenv').config({ path: './.env' });
const { GoogleGenerativeAI } = require("@google/generative-ai");
const calendar = require('./calendar');
const bookings = require('./bookings');
const supabase = require('./supabase'); // Import Supabase Client

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

// --- SYSTEM INSTRUCTION ---
function getSystemInstruction(businessContext = {}) {
    return `
You are Kaelo, a professional yet friendly automated scheduling assistant for ${businessContext.name || 'a local business'} in South Africa.
Primary Outcome: A confirmed appointment with zero friction.

TONE:
- Professional-Cool. 
- Use light greetings like "Aweh", "Sharp", or "Heita".
- Keep it clear and efficient. No heavy slang.

CONVERSATION FLOW:
1. When a user asks for an appointment/availability, call 'checkAvailability(date)'.
2. If the slot is available, confirm it and ask for their Name.
3. Once you have Name and Time, call 'createBookingRequest'.
4. After booking, say: "Sharp! I've sent that request through. You'll get a confirmation here once the boss approves it."

RULES:
- Outcome-driven: Don't just chat, guide them to a booking.
- createBookingRequest requires 'name' and 'datetime' (ISO 8601).
`;
}

// --- MAIN HANDLER ---
async function handleIncomingMessage(userPhone, messageText, businessId) {
    console.log(`🤖 AI Processing for ${userPhone} (Biz: ${businessId || 'None'})`);

    const resolvedBizId = businessId || process.env.DEFAULT_BUSINESS_ID;

    // 2. LOAD STATE
    let state = { metadata: { history: [] } };
    let businessName = "Default Business";

    if (resolvedBizId) {
        // Fetch Context + State
        const { data: stateData } = await supabase
            .from('conversation_states')
            .select('*')
            .eq('phone_number', userPhone)
            .maybeSingle();
        if (stateData) state = stateData;

        // Fetch Business Name
        const { data: profile } = await supabase
            .from('profiles')
            .select('business_name')
            .eq('id', resolvedBizId)
            .single();
        if (profile) businessName = profile.business_name;
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

    const chat = model.startChat({
        history: chatHistory,
        generationConfig: { maxOutputTokens: 1000 }
    });

    const systemPrompt = getSystemInstruction({ name: businessName });
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
            const nameMatch = finalReply.match(/name=['"]([^'"]+)['"]/);
            const timeMatch = finalReply.match(/datetime=['"]([^'"]+)['"]/);

            if (nameMatch && timeMatch) {
                const name = nameMatch[1];
                const datetime = timeMatch[1];
                const res = await bookings.addRequest(name, datetime, userPhone);
                if (res.error) {
                    finalReply = `I tried to book that, but: ${res.error}`;
                } else {
                    finalReply = `Great! I've sent a request for ${res.datetime}. You'll receive a confirmation soon!`;
                }
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
        return "I'm having trouble connecting to the schedule. Please try again. Error: " + e.message;
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
