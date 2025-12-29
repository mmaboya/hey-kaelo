const { GoogleGenerativeAI } = require("@google/generative-ai");
const supabase = require("./supabase");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SUPPORT_SYSTEM_INSTRUCTION = `
You are Kaelo (meaning "care" in Sesotho), the friendly AI support assistant for HeyKaelo, a healthcare appointment booking platform serving South Africa's township and rural communities.

## Personality & Tone
- Warm, patient, respectful, solution-focused.
- Language: Clear, simple, jargon-free.
- Cultural context: You understand South African township and rural healthcare challenges.
- Friendly greetings: "Sharp", "Sure".

## Your Goal
Fix issues immediately when possible. Only escalate when you truly cannot resolve the problem yourself.

## Response Framework
1. ACKNOWLEDGE + UNDERSTAND: "I can see you're trying to book..."
2. DIAGNOSE: Analyze context, error codes, and patterns.
3. ACT: Take immediate action using tools.
4. EXPLAIN: Tell the user what you found and what you did.
5. VERIFY: "Can you see your booking confirmation now?"
6. NEXT STEPS: Give clear guidance.

## Communication Style
- Short, clear sentences.
- Empathy: "I understand that's frustrating."
- No jargon: Say "connection issue", not "API timeout".
- Break long paragraphs into short lines.

## Multilingual Support
- If user writes in isiZulu, respond in isiZulu.
- If user writes in isiXhosa, respond in isiXhosa.
- Offer choice if mixed: "Would you prefer I respond in English, isiZulu, or isiXhosa?"

## Escalation Decision Tree
- ESCALATE IMMEDIATELY: Payment/billing issues, medical emergencies, security concerns, user tried 3+ times.
- TRY TO FIX: Booking confirmation missing, slot selection issues, WhatsApp connection problems.
`;

// Tool Definitions for Gemini
const SUPPORT_TOOLS = [
    {
        functionDeclarations: [
            {
                name: "check_slot_availability",
                description: "Verify if appointment slots are truly available.",
                parameters: {
                    type: "object",
                    properties: {
                        clinic_id: { type: "string" },
                        slot_datetime: { type: "string", description: "ISO8601 string" }
                    },
                    required: ["slot_datetime"]
                }
            },
            {
                name: "resend_confirmation",
                description: "Resend a booking confirmation message.",
                parameters: {
                    type: "object",
                    properties: {
                        booking_id: { type: "string" },
                        channel: { type: "string", enum: ["sms", "whatsapp", "both"] }
                    },
                    required: ["booking_id", "channel"]
                }
            },
            {
                name: "reset_conversation_state",
                description: "Clear AI conversation memory for a user to start fresh.",
                parameters: {
                    type: "object",
                    properties: {
                        user_id: { type: "string" }
                    },
                    required: ["user_id"]
                }
            },
            {
                name: "validate_booking",
                description: "Check if a booking exists and get its status.",
                parameters: {
                    type: "object",
                    properties: {
                        booking_id: { type: "string" }
                    },
                    required: ["booking_id"]
                }
            },
            {
                name: "create_support_ticket",
                description: "Escalate the issue to a human support agent.",
                parameters: {
                    type: "object",
                    properties: {
                        category: { type: "string" },
                        priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
                        description: { type: "string" }
                    },
                    required: ["category", "priority", "description"]
                }
            }
        ]
    }
];

async function supportTriage(ticketId, userMessage, rawContext = {}) {
    const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: SUPPORT_SYSTEM_INSTRUCTION,
        tools: SUPPORT_TOOLS
    });

    // 1. Fetch Ticket & Hydrate Context
    const { data: ticket } = await supabase.from('support_tickets').select('*, profiles(*)').eq('id', ticketId).single();
    const { data: events } = await supabase.from('support_events').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: true });

    // Build the Rich Context Object as per blueprint
    const context = {
        route: rawContext.route || ticket.route || '/dashboard',
        request_id: ticket.request_id,
        user: {
            id: ticket.tenant_profile_id,
            profile_id: ticket.tenant_profile_id,
            preferred_language: 'en',
            phone_verified: true,
            last_successful_booking: null
        },
        recent_activity: {
            last_errors: ticket.error_code ? [ticket.error_code] : [],
            pages_visited: [ticket.route].filter(Boolean),
            actions_taken: events.filter(e => e.event_type === 'agent_action').map(e => e.payload?.action)
        },
        system_status: {
            whatsapp_connected: true,
            sms_service_operational: true
        }
    };

    // 2. Prepare Context for Gemini
    // We only inject the context into the VERY FIRST message of the history or the current message
    // to avoid token bloat and repetition.
    const history = events.slice(0, -1).map(e => ({
        role: e.event_type === 'agent_reply' ? 'model' : 'user',
        parts: [{ text: e.payload?.message || '' }]
    }));

    const chat = model.startChat({ history });

    // Inject context into the prompt only once
    const promptWithContext = `[CONTEXT: ${JSON.stringify(context)}] ${userMessage}`;

    try {
        const result = await chat.sendMessage(promptWithContext);
        const responseData = result.response;

        if (!responseData.candidates || responseData.candidates.length === 0) {
            throw new Error("No candidates returned from Gemini");
        }

        const part = responseData.candidates[0].content.parts[0];
        const call = part.functionCall;

        if (call) {
            console.log(`🤖 Support Agent executing tool: ${call.functionCall.name}`, call.functionCall.args);

            // Log Agent Action
            await supabase.from('support_events').insert({
                ticket_id: ticketId,
                event_type: 'agent_action',
                payload: { action: call.functionCall.name, args: call.functionCall.args }
            });

            // Handle tool execution (Stubs for now, expandable)
            let toolResult = { success: true, message: "Action executed" };

            if (call.functionCall.name === 'create_support_ticket') {
                await supabase.from('support_tickets').update({ status: 'escalated', priority: call.functionCall.args.priority }).eq('id', ticketId);
                toolResult = { ticket_id: `HK-${ticketId.split('-')[0].toUpperCase()}`, estimated_response_time: "2 hours" };
            }

            // Send tool result back to Gemini for final response
            const finalResult = await chat.sendMessage([{
                functionResponse: {
                    name: call.name,
                    response: toolResult
                }
            }]);

            const finalResponse = finalResult.response.text();
            await logReply(ticketId, finalResponse);
            return finalResponse;
        }

        const response = result.response.text();
        await logReply(ticketId, response);
        return response;

    } catch (error) {
        console.error("Support AI Error:", error);
        return "⚠️ Ake ngixolise, I'm having trouble with my support brain. Let me get a human to help you. Ticket #HK-" + ticketId.split('-')[0].toUpperCase();
    }
}

async function logReply(ticketId, message) {
    await supabase.from('support_events').insert({
        ticket_id: ticketId,
        event_type: 'agent_reply',
        payload: { message }
    });
    await supabase.from('support_tickets').update({
        summary_ai: message.substring(0, 200),
        status: 'ai_in_progress',
        updated_at: new Date()
    }).eq('id', ticketId);
}

module.exports = { supportTriage };
