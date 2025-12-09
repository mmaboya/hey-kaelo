const { GoogleGenerativeAI } = require("@google/generative-ai");
const calendar = require('./calendar');
const bookings = require('./bookings');

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// System Instruction
const SYSTEM_INSTRUCTION = `
You are HeyKaelo, the AI receptionist for "Classic Cuts".
Your goal is to help customers book appointments.

Tools Available:
- checkAvailability(date): Call this to see what times are open.
- createBookingRequest(name, datetime, phone): Call this when the user confirms a specific time.

Rules:
1. When a user asks for an appointment, check availability first.
2. If they confirm a time, ask for their Name.
3. Once you have Name and Time, CALL 'createBookingRequest'.
4. Do NOT say "Booking Confirmed" yet. Say "I've sent your request to the shop owner for approval. You'll get a confirmation message shortly."
5. Be friendly and concise.
`;

// Define the Tools
const tools = [
    {
        functionDeclarations: [
            {
                name: "checkAvailability",
                description: "Checks the calendar for available appointment slots on a given date.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        date: {
                            type: "STRING",
                            description: "The date to check (e.g., '2023-10-27' or 'tomorrow')."
                        }
                    },
                    required: ["date"]
                }
            },
            {
                name: "createBookingRequest",
                description: "Creates a new booking request that needs approval.",
                parameters: {
                    type: "OBJECT",
                    properties: {
                        name: { type: "STRING", description: "Customer's name" },
                        datetime: { type: "STRING", description: "Requested date and time" },
                        phone: { type: "STRING", description: "Customer's phone number" }
                    },
                    required: ["name", "datetime", "phone"]
                }
            }
        ]
    }
];

const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
    systemInstruction: SYSTEM_INSTRUCTION,
    tools: tools
});

const chatSessions = new Map();

const { createClient } = require('@supabase/supabase-js');

// Init Supabase Admin Lazy
const supabaseUrl = process.env.SUPABASE_URL;
// const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Moved inside

async function handleIncomingMessage(from, messageBody) {
    try {
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        console.log(`📨 Handling msg from ${from}. Key present? ${!!supabaseKey}. Key length: ${supabaseKey ? supabaseKey.length : 0}`);
        if (!supabaseKey) {
            console.error("❌ CRITICAL: SUPABASE_SERVICE_ROLE_KEY is missing in .env");
            return "System Error: Missing Credentials.";
        }
        const supabase = createClient(supabaseUrl, supabaseKey);

        // 1. Fetch Business Context
        let businessContext = "";
        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('business_name, business_context')
            .single();

        if (profiles) {
            businessContext = `\n\nBUSINESS KNOWLEDGE BASE:\nName: ${profiles.business_name}\n${profiles.business_context || ''}`;
        }

        // 2. Dynamic System Instruction
        const dynamicInstruction = SYSTEM_INSTRUCTION + businessContext;

        let chat;
        if (!chatSessions.has(from)) {
            const localModel = genAI.getGenerativeModel({
                model: "gemini-2.0-flash-exp",
                systemInstruction: dynamicInstruction,
                tools: tools
            });

            chat = localModel.startChat({
                history: [],
            });
            chatSessions.set(from, chat);
        } else {
            chat = chatSessions.get(from);
        }

        // 3. Send User Message
        let result = await chat.sendMessage(messageBody);
        let response = result.response;
        let text = response.text();

        // 4. Check for Function Calls
        let calls = response.functionCalls();

        while (calls && calls.length > 0) {
            const call = calls[0];
            console.log("🛠️ AI wants to call tool:", call.name, call.args);

            let functionResult = {};

            if (call.name === "checkAvailability") {
                functionResult = await calendar.getValues(call.args.date);
            } else if (call.name === "createBookingRequest") {
                functionResult = await bookings.addRequest(call.args.name, call.args.datetime, call.args.phone || from);
            }

            // Send Tool Result back to AI
            const toolResponse = [
                {
                    functionResponse: {
                        name: call.name,
                        response: { result: functionResult }
                    }
                }
            ];

            const result2 = await chat.sendMessage(toolResponse);
            text = result2.response.text();
            calls = result2.response.functionCalls();
        }

        return text;

    } catch (error) {
        console.error("Gemini Error:", error);
        // If Quota Error, give friendly message
        if (error.message.includes("429") || error.message.includes("Quota")) {
            return "I'm a bit overwhelmed right now (Too many requests). Please try again in 1 minute.";
        }
        return "Sorry, I'm having trouble thinking right now. Please try again later.";
    }
}

module.exports = { handleIncomingMessage };
