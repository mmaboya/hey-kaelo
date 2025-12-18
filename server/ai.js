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
// We inject context dynamically now.
function getSystemInstruction(businessContext = {}) {
    return `
You are Kaelo, a professional yet friendly automated scheduling assistant for ${businessContext.name || 'a local business'} in South Africa.
Your goal is to help users find a time and book an appointment with zero friction.

TONE:
- Professional-Cool. 
- Use light greetings like "Aweh", "Sharp", or "Heita" for flavor.
- Keep the core message clear, professional, and efficient.
- No heavy slang. Just enough to feel local.

CONVERSATION FLOW:
1. When a user asks for an appointment/availability, call 'checkAvailability(date)'.
2. If the slot is available, confirm it immediately and ask ONLY for their Name (if missing).
   Example: "Aweh! Checking the schedule... Sharp, tomorrow at 10 AM works. Can I just get your name to lock it in?"
3. Once you have Name and Time, call 'createBookingRequest'.
4. After booking, say: "Sharp! I've sent that request through. You'll get a confirmation here once the boss approves it. See you then!"

RULES:
- Handle dates naturally (today, tomorrow, next Monday).
- If time is missing, ask nicely: "What time works best for you?"
- 'createBookingRequest' requires 'name' and 'datetime' (ISO 8601).
`;
}

// --- MAIN HANDLER ---
async function handleIncomingMessage(userPhone, messageText, businessId) {
    console.log(`🤖 AI Processing for ${userPhone} (Biz: ${businessId || 'None'})`);

    // 1. SAFEGUARDS (Kill Switch) - Phase 12
    if (businessId) {
        // Logic to check ai_enabled should ideally be done in index.js to save cost, 
        // but if we are here, we proceed.
    }

    // 2. LOAD STATE (Phase 7)
    let state = { metadata: {} };
    let businessName = "Default Business";

    if (businessId) {
        // Fetch Context + State
        const { data: stateData } = await supabase
            .from('conversation_states')
            .select('*')
            .eq('phone_number', userPhone)
            .single();
        if (stateData) state = stateData;

        // Fetch Business Name (Optional, for context)
        const { data: profile } = await supabase
            .from('profiles')
            .select('business_name')
            .eq('id', businessId)
            .single();
        if (profile) businessName = profile.business_name;
    }

    // Recover History from metadata
    let history = state.metadata?.history || [];

    // Prune history if too long to save tokens/cost
    if (history.length > 10) history = history.slice(-10);

    // Initial Chat Setup using History (converted to Gemini Format)
    const chatHistory = history.map(h => ({
        role: h.role === 'ai' ? 'model' : 'user',
        parts: [{ text: h.text }]
    }));

    // Always prepend System Context if it's the very first start or just trust systemInstruction?
    // Let's inject a system context message as the first item if history is empty.
    if (chatHistory.length === 0) {
        chatHistory.push({ role: "user", parts: [{ text: "System Context: User Phone is " + userPhone }] });
    }

    const chat = model.startChat({
        history: chatHistory,
        generationConfig: {
            maxOutputTokens: 1000,
        }
    });

    const systemPrompt = getSystemInstruction({ name: businessName });
    // Note: We don't need to inject history into systemPrompt text if we use chat.history;
    // but we DO need to ensure the system prompt is active. 
    // Best practice with this SDK often involves putting the system instruction in the model config, 
    // but since we reuse the model instance, we rely on the prompt or the first message.

    // HACK: Re-sending system prompt + user message ensures the model "remembers" its persona every turn 
    // if state was lost, but with history injection above, it should be fine.
    // Let's just send the User Message, but maybe prepend the Persona if history is empty.

    let fullPrompt = messageText;
    if (history.length === 0) {
        fullPrompt = `${systemPrompt}\n\nUser: ${messageText}`;
    }

    try {
        // TIMEOUT SAFEGUARD (Phase 12)
        const aiPromise = chat.sendMessage(fullPrompt);
        // Vercel function limit is often 10s. Safely timeout at 15s.
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 15000));

        const result = await Promise.race([aiPromise, timeoutPromise]);
        const response = result.response;
        const text = response.text();
        console.log("🤖 AI Raw Response Text:", text);

        // 5. TOOL LOOP SAFEGUARD - (Simplified Text Parsing for now)
        // If text contains "CALL: checkAvailability", we execute.
        // Note: Real function calling is preferred, but this fits the "text-based" requirement of previous steps unless allowed to change model.

        // Let's implement basic parsing compatible with previous "Tools" concept.

        if (text.includes("checkAvailability")) {
            // ... parsing logic ...
            // For prototype speed:
            // We'll rely on the model asking for dates if missing.
            // If we parse a date, we call it.
            const dateMatch = messageText.match(/tomorrow|today|monday|tuesday|wednesday|thursday|friday|\d{4}-\d{2}-\d{2}/i);
            if (dateMatch) {
                const slots = await calendar.generateSlots(dateMatch[0]);
                const reply = await chat.sendMessage(`(System Tool Output): ${JSON.stringify(slots)}`);
                return reply.response.text();
            }
        }

        // Check for Booking Creation
        // Expecting: "CALL: createBookingRequest(name='Mpho', datetime='2023-12-25T10:00:00')"
        if (text.includes("createBookingRequest")) {
            console.log("🛠️ Detected Tool Call: createBookingRequest");
            const nameMatch = text.match(/name=['"]([^'"]+)['"]/);
            const timeMatch = text.match(/datetime=['"]([^'"]+)['"]/);

            if (nameMatch && timeMatch) {
                const name = nameMatch[1];
                const datetime = timeMatch[1];
                const result = await bookings.addRequest(name, datetime, userPhone);
                if (result.error) {
                    return `I tried to book that, but: ${result.error}`;
                } else {
                    return `Great! I've sent a request for ${result.datetime}. You'll receive a confirmation soon!`;
                }
            }
        }

        // Update History
        history.push({ role: 'user', text: messageText });
        history.push({ role: 'ai', text: text });
        state.metadata.history = history;

        // Update State (Last Action)
        await updateState(userPhone, businessId, 'processed_message', state.metadata);

        return text;

    } catch (e) {
        console.error("AI Error Detailed:", e);
        if (e.message === 'Timeout') return "I'm thinking a bit slowly. Could you repeat that?";
        return "I'm having trouble connecting to the schedule. Please try again. Error: " + e.message;
    }
}

async function updateState(phone, businessId, action, metadata) {
    if (!businessId) return;

    // Ensure we don't overwrite if we don't have new metadata
    // But here we want to save.
    await supabase.from('conversation_states').upsert({
        phone_number: phone,
        business_id: businessId,
        last_action: action,
        metadata: metadata,
        updated_at: new Date()
    }, { onConflict: 'phone_number, business_id' }); // Ensure unique key handling if needed, usually phone is PK/Unique
}

module.exports = { handleIncomingMessage };
