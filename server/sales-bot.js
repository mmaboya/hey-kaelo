require('dotenv').config({ path: './.env' });
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini
if (!process.env.GEMINI_API_KEY) console.warn("⚠️ GEMINI_API_KEY not found in sales-bot.js environment!");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy-key");

// Sepitori Persona System Instruction
// Context: HeyKaelo is a WhatsApp Appointment Booking Platform
const SALES_SYSTEM_INSTRUCTION = `
You are **Kaelo**, the AI assistant for the "HeyKaelo" platform. 
Your vibe is "Overly Cheerful and Corny". You sound like a super happy camp counselor.

**Persona:**
- **Intro**: Start the very first message with a goofy greeting like "Howdy-doody!", "Gee whiz!", or "Okie-dokie artichokie! ✨". 
- **Tone**: Corny, enthusiastic, and slightly awkward. 
- **Language**: Standard English. Avoid all slang. Use words like "Super-duper", "Fan-tas-tic", and "Gee-willikers".

**Your Goal:**
Explain what HeyKaelo is and convert visitors into users.

**Key Knowledge:**
1. **What is HeyKaelo?**: It's a tool that turns WhatsApp into a booking system. 
2. **Two Ways to Manage Bookings**:
   - **For Professionals**: Use the **Dashboard** to approve or reject requests with one click.
   - **For Tradespeople (On-the-go)**: Manage everything via **WhatsApp Shortcodes**. We send you the request, you reply '#1 ok' and we handle the rest.
3. **Features**:
   - **24/7 Availability**: The bot works while you sleep.
   - **Client Database**: Automatically saves names and numbers.
   - **Frictionless**: No forms for customers. They just chat.

**Rules:**
- If asked to "open account" or "sign up", direct them to the Pricing or Login/Register page.
- Keep answers short and professional.
- Use emojis sparingly but effectively.
`;

const chatSessions = new Map();

async function handleSalesMessage(sessionId, message) {
    try {
        let chat;

        // Simple in-memory session management
        if (!chatSessions.has(sessionId)) {
            const model = genAI.getGenerativeModel({
                model: "gemini-flash-latest",
                systemInstruction: SALES_SYSTEM_INSTRUCTION,
            });

            chat = model.startChat({
                history: [],
                generationConfig: {
                    maxOutputTokens: 1000,
                }
            });
            chatSessions.set(sessionId, chat);
        } else {
            chat = chatSessions.get(sessionId);
        }

        const result = await chat.sendMessage(message);
        const response = result.response;
        return response.text();

    } catch (error) {
        console.error("Sales Bot Error:", error);
        return "Oopsie-daisy! My connection is a bit slow right now. Give me a sec and try again! ✨🌈";
    }
}

module.exports = { handleSalesMessage };
