const { GoogleGenerativeAI } = require("@google/generative-ai");
const supabase = require("./supabase");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SUPPORT_SYSTEM_INSTRUCTION = `
You are Kaelo Support Agent, a specialized resolver for the HeyKaelo platform. 
Your goal is to triage issues, provide immediate fixes using tools, or summarize the problem for human escalation.

TONE: Professional, South African flair ("Sharp", "Hustle"), empathetic, and highly technical.

MODE OF OPERATION:
1. Always extract the Intent, Error Code, and Request ID if provided.
2. Check the Knowledge Base (search_kb) before making assumptions.
3. If an error is 401: Explain it's a session issue and suggest re-logging. 
4. If an error is 404: Use lookup tools to see if the ID actually exists.
5. If you can't resolve with 70% confidence, escalate the ticket.

TOOLS AVAILABLE:
- search_kb: Find internal runbooks.
- lookup_booking: Check if a booking exists and its status.
- lookup_document: Check if a signing link is active.
- refresh_conversation: Clear stuck AI states.
- escalate_ticket: Send to human with a summary.
`;

async function supportTriage(ticketId, userMessage, context = {}) {
    const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash",
        systemInstruction: SUPPORT_SYSTEM_INSTRUCTION
    });

    // 1. Fetch Ticket & Recent Events
    const { data: ticket } = await supabase.from('support_tickets').select('*').eq('id', ticketId).single();
    const { data: events } = await supabase.from('support_events').select('*').eq('ticket_id', ticketId).order('created_at', { ascending: false }).limit(5);

    // 2. Prepare Context for Gemini
    const chat = model.startChat({
        history: events.map(e => ({
            role: e.event_type === 'agent_reply' ? 'model' : 'user',
            parts: [{ text: JSON.stringify(e.payload) }]
        }))
    });

    try {
        const result = await chat.sendMessage(userMessage);
        const response = result.response.text();

        // 3. Log the Agent Reply
        await supabase.from('support_events').insert({
            ticket_id: ticketId,
            event_type: 'agent_reply',
            payload: { message: response }
        });

        // 4. Update Ticket Summary
        await supabase.from('support_tickets').update({
            summary_ai: response.substring(0, 200),
            status: 'ai_in_progress'
        }).eq('id', ticketId);

        return response;
    } catch (error) {
        console.error("Support AI Error:", error);
        return "⚠️ I'm having trouble connecting to my support brain. Please try again or wait while I escalate this. Sharp! 🤙";
    }
}

module.exports = { supportTriage };
