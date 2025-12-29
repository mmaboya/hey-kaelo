const supabase = require('./supabase');
const crypto = require('crypto');

// Define the flows
const FLOWS = {
    root: {
        step: 'root',
        message: "Aweh! I'm Kaelo. 👋 I'll help you manage your bookings.\n\nHow do you usually work?\n1. *Fixed Appointments* (Work from a set location/times)\n2. *On-the-Go / Call-outs* (You go to customers or take walk-ins)\n3. *Both / Mixed* (Handle both scheduled and mobile jobs)\n\nReply *1*, *2*, or *3*.",
        transitions: {
            '1': 'pro_intro',
            'fixed': 'pro_intro',
            '2': 'trade_intro',
            'mobile': 'trade_intro',
            '3': 'hybrid_intro',
            'both': 'hybrid_intro',
            'mixed': 'hybrid_intro'
        }
    },
    // --- PATH A: PROFESSIONAL ---
    pro_intro: {
        next: 'pro_business_name',
        message: "Great choice. 👍 I’ll act as your digital receptionist, checking your calendar and gathering client info so you can focus on your work."
    },
    pro_business_name: {
        step: 'pro_business_name',
        message: "What’s the name of your practice or firm?",
        saveField: 'business_name'
    },
    pro_role_type: {
        step: 'pro_role_type',
        message: "What type of professional are you?\n(e.g., GP, Physio, Consultant, Psychologist, Other)",
        saveField: 'role_type'
    },
    pro_working_days: {
        step: 'pro_working_days',
        message: "Sharp! Last step: When are you usually available for sessions? (e.g., Mon-Fri 08:00–17:00)",
        saveField: 'working_days',
        finalize: 'professional'
    },

    // --- PATH B: CALL-OUT / MOBILE ---
    trade_intro: {
        next: 'trade_business_name',
        message: "Nice choice! 🛠️ I'll help you avoid double-bookings and gather job details (like photos and location) before you even talk to the customer."
    },
    trade_business_name: {
        step: 'trade_business_name',
        message: "What's your business name?\n(e.g., Sipho's Sparky Services)",
        saveField: 'business_name'
    },
    trade_role_type: {
        step: 'trade_role_type',
        message: "Sharp. What trade/service are you in?\n(e.g., Electrician, Plumber, Barber)",
        saveField: 'role_type'
    },
    trade_service_area: {
        step: 'trade_service_area',
        message: "Which areas do you mostly cover? (e.g., Sandton, Soweto, Randburg)",
        saveField: 'service_area',
        finalize: 'tradesperson'
    },

    // --- PATH C: HYBRID / MIXED ---
    hybrid_intro: {
        next: 'hybrid_business_name',
        message: "The best of both worlds! 🚀 I'll handle your fixed bookings AND help you qualify call-out jobs on the move."
    },
    hybrid_business_name: {
        step: 'hybrid_business_name',
        message: "What’s your business name?",
        saveField: 'business_name'
    },
    hybrid_role_type: {
        step: 'hybrid_role_type',
        message: "What service do you provide?\n(e.g., Beauty Salon, Tailor, Sound Engineer)",
        saveField: 'role_type'
    },
    hybrid_service_area: {
        step: 'hybrid_service_area',
        message: "Where are you based or which areas do you cover? (e.g., Sandton & Midrand)",
        saveField: 'service_area',
        finalize: 'hybrid'
    }
};

async function handleOnboarding(userPhone, messageText, state) {
    let currentStepId = state.metadata?.onboarding_step || 'root';
    let data = state.metadata?.onboarding_data || {};
    let currentFlow = FLOWS[currentStepId];

    console.log(`🧭 Onboarding Step: ${currentStepId}, Input: ${messageText}`);

    // HACK: If "pro_intro" or "trade_intro" (messages without input), skip immediately
    // Ideally this logic sits in the loop, but since we are request-response, 
    // we might need to send 2 messages. For simplicity, we assume the user triggers the next step by replying "ok" or we chain it?
    // Request says: "Transition -> pro_business_name".
    // Let's assume we send the Intro AND the First Question together? 
    // Or we just skip the wait state for intro.

    // Actually, let's treat the *previous* step's processing or the *current* step's prompts.

    // 1. PROCESS INPUT (if not root start)
    if (currentStepId === 'root') {
        const choice = messageText.toLowerCase().trim();
        const nextStep = currentFlow.transitions[choice];
        if (nextStep) {
            // Special handling for Intros: They are just messages, then jump to next.
            // We'll bundle the Intro Message + The Next Question
            const intro = FLOWS[nextStep];
            const realNext = FLOWS[intro.next];

            await updateOnboardingState(userPhone, intro.next, data);
            return `${intro.message}\n\n${realNext.message}`;
        } else {
            return currentFlow.message; // Retry Root
        }
    }

    // Process Specific Steps
    if (currentFlow.saveField) {
        let value = messageText.trim();

        // Map Options if exists
        if (currentFlow.options) {
            const normalized = messageText.toLowerCase().trim();
            // Check keys first (1, 2, 3...)
            if (currentFlow.options[normalized]) {
                value = currentFlow.options[normalized];
            } else {
                // Fuzzy match values? Or just accept text if "Other" logic?
                // For now, if not in option keys, treat as RAW text if it's not strict?
                // Step A3 says keys: Doctor...
                // Let's assume strict if options exist, unless 'Other'.
                // Ideally we validate.
            }
        }
        data[currentFlow.saveField] = value;
    }

    // Determine Next Step
    let nextStepId = null;

    // Hardcoded Transitions
    if (currentStepId === 'pro_business_name') nextStepId = 'pro_role_type';
    else if (currentStepId === 'pro_role_type') nextStepId = 'pro_working_days';
    else if (currentStepId === 'pro_working_days') nextStepId = 'finalize_pro';

    else if (currentStepId === 'trade_business_name') nextStepId = 'trade_role_type';
    else if (currentStepId === 'trade_role_type') nextStepId = 'trade_service_area';
    else if (currentStepId === 'trade_service_area') nextStepId = 'finalize_trade';

    else if (currentStepId === 'hybrid_business_name') nextStepId = 'hybrid_role_type';
    else if (currentStepId === 'hybrid_role_type') nextStepId = 'hybrid_service_area';
    else if (currentStepId === 'hybrid_service_area') nextStepId = 'finalize_hybrid';

    if (nextStepId && nextStepId.startsWith('finalize')) {
        // SAVE PROFILE
        const slug = data.business_name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random() * 1000);

        const profileData = {
            business_name: data.business_name,
            slug: slug,
            role_category: nextStepId === 'finalize_pro' ? 'professional' : (nextStepId === 'finalize_trade' ? 'tradesperson' : 'hybrid'),
            role_type: data.role_type,
            service_area: data.service_area || null,
            working_days: data.working_days || null,
            // defaults
            approval_required: nextStepId !== 'finalize_pro' // Only Pure Pro defaults to auto-approve
        };

        // Create or Update Profile
        // Index.js likely uses ID.
        // We'll upsert based on phone number? Or User ID?
        // Supabase schema usually separates Auth Users and Profiles. 
        // Here we are creating a profile directly from WhatsApp phone.

        // Ensure we have a userId linked to Auth
        let userId = crypto.randomUUID();
        const dummyEmail = `${userPhone.replace(/[^0-9]/g, '')}@heykaelo.placeholder.com`;

        const { data: userData, error: createError } = await supabase.auth.admin.createUser({
            email: dummyEmail,
            phone: userPhone,
            email_confirm: true,
            phone_confirm: true,
            user_metadata: { role: 'business_owner' }
        });

        if (userData && userData.user) {
            userId = userData.user.id;
        } else if (createError) {
            // Try to find existing user 
            const { data: users } = await supabase.auth.admin.listUsers();
            if (users && users.users) {
                const found = users.users.find(u => u.phone === userPhone || u.email === dummyEmail);
                if (found) userId = found.id;
            }
        }

        // Create or Update Profile using UPSERT for robustness
        const { error: upsertError } = await supabase.from('profiles').upsert([{
            id: userId,
            phone_number: userPhone,
            ...profileData
        }], { onConflict: 'id' });

        if (upsertError) {
            console.error("❌ Profile Upsert Error:", upsertError);
            // Fallback: try update if upsert fails (e.g. phone_number unique constraint)
            await supabase.from('profiles').update(profileData).eq('phone_number', userPhone);
        }

        // Clear Onboarding State
        await clearOnboardingState(userPhone);

        // Final Message
        if (nextStepId === 'finalize_pro') {
            return "You’re all set! ✅ I've set up your assistant. When clients text this number, I'll handle the booking and registration for you. Sharp! 🤙";
        } else if (nextStepId === 'finalize_trade') {
            return "You’re ready to hustle! 🚀 When customers text, I'll ask for a photo of the issue and their location. I'll send it all here, and you just reply #ok to accept. Sharp! 🤙";
        } else {
            return "You're all set with the best of both! 🚀 I'll handle your fixed bookings AND help you qualify new jobs on the move. Let's get to work. Sharp! 🤙";
        }

    } else if (nextStepId) {
        // Move to Next
        await updateOnboardingState(userPhone, nextStepId, data);
        return FLOWS[nextStepId].message;
    }

    return "⚠️ Error: Unknown State transition.";
}

// Helpers
async function updateOnboardingState(phone, step, data) {
    // Upsert conversation state
    // We assume 'conversation_states' exists for this phone (or we create it)
    // We need a dummy business_id if it's null? No, business_id can be null or we use a special ID.
    // Index.js logic looked for business_id.
    // We'll store this in metadata.

    // Find existing state first to get ID?
    const { data: current } = await supabase.from('conversation_states').select('*').eq('phone_number', phone).single();

    const metadata = current?.metadata || {};
    metadata.onboarding_active = true;
    metadata.onboarding_step = step;
    metadata.onboarding_data = data;

    const { error } = await supabase.from('conversation_states').upsert({
        phone_number: phone,
        metadata: metadata,
        updated_at: new Date()
    }, { onConflict: 'phone_number' });

    if (error) console.error("❌ Onboarding State Update Error:", error);
    // If user is onboarding, business_id is likely NULL.
}

async function clearOnboardingState(phone) {
    const { data: current } = await supabase.from('conversation_states').select('*').eq('phone_number', phone).single();
    if (current) {
        const metadata = current.metadata || {};
        delete metadata.onboarding_active;
        delete metadata.onboarding_step;
        delete metadata.onboarding_data;

        await supabase.from('conversation_states').update({ metadata: metadata }).eq('id', current.id);
    }
}

module.exports = { handleOnboarding, FLOWS };
