const supabase = require('./supabase');

const REG_STEPS = {
    'REG_NAME': {
        message: "Okie-dokie! Let's get you registered for the doctor. ✨\n\nWhat is your **Full Legal Name**?",
        field: 'full_name',
        next: 'REG_ID'
    },
    'REG_ID': {
        message: "Gee whiz, thanks! Now, what is your **ID Number**?",
        field: 'id_number',
        next: 'REG_MEDICAL'
    },
    'REG_MEDICAL': {
        message: "Got it. Which **Medical Aid** are you on?\n(Reply with the name or 'Private')",
        field: 'medical_aid',
        next: 'REG_CONSENT'
    },
    'REG_CONSENT': {
        message: "Final Step: Please **sign on a piece of paper**, take a photo of your signature, and **send it to me here**. ✍️\n\n(This serves as your official medical consent signature).",
        field: 'signature_url',
        next: 'DONE'
    }
};

async function handleRegistrationChat(phone, message, state, bookingId, mediaUrl = null) {
    const currentStep = state.metadata?.reg_step || 'REG_NAME';
    const stepConfig = REG_STEPS[currentStep];

    if (!stepConfig) return null;

    // 1. Process/Save the input to the state's metadata (Schema-Safe)
    let regData = state.metadata?.registration_data || {};
    const lastStepId = state.metadata?.prev_step;

    if (lastStepId && REG_STEPS[lastStepId]) {
        const lastStep = REG_STEPS[lastStepId];
        regData[lastStep.field] = (lastStep.field === 'signature_url') ? mediaUrl : message;
    }

    // 2. Determine Next Step / Finalize
    if (currentStep === 'DONE' || (currentStep === 'REG_CONSENT' && mediaUrl)) {
        if (mediaUrl) regData.signature_url = mediaUrl;

        // Save Final Payload to the conversation state
        const meta = state.metadata || {};
        meta.registration_active = false;
        meta.registration_complete = true;
        meta.last_registration_data = regData;
        delete meta.reg_step;
        delete meta.prev_step;
        delete meta.reg_booking_id;

        await supabase.from('conversation_states').update({ metadata: meta }).eq('phone_number', phone);

        // Attempt to update booking notes or similar if columns exist
        // For now, we store in conversation_states as the source of truth for the dashboard
        console.log("✅ Registration finalized for:", phone, regData);

        return "✅ **Registration & Signature Received!**\n\nI've sent your file to the doctor. See you at your appointment! Fan-tas-tic! ✨🎈";
    }

    // Special Check: Signature step requires media
    if (currentStep === 'REG_CONSENT' && !mediaUrl && message) {
        return "⚠️ Please send a **photo of your signature** to complete the registration. You can just sign a paper and snap a clear pic! 📸";
    }

    // 3. Move to current step's question and update state
    const meta = state.metadata || {};
    meta.registration_active = true;
    meta.reg_step = stepConfig.next;
    meta.prev_step = currentStep;
    meta.reg_booking_id = bookingId;
    meta.registration_data = regData;

    await supabase.from('conversation_states').update({
        metadata: meta,
        updated_at: new Date()
    }).eq('phone_number', phone);

    return stepConfig.message;
}

module.exports = { handleRegistrationChat };
