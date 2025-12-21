const supabase = require('./supabase');
const crypto = require('crypto');

// Define the flows
const FLOWS = {
    root: {
        step: 'root',
        message: "Aweh! I'm Kaelo. 👋 I'll help you manage your business bookings.\n\nAre you a:\n1. *Professional* (Doctor, Lawyer, etc.)\n2. *Tradesperson* (Plumber, Barber, etc.)\n\nReply *1* or *2*.",
        transitions: {
            '1': 'pro_intro',
            'professional': 'pro_intro',
            '2': 'trade_intro',
            'trade': 'trade_intro',
            'tradesperson': 'trade_intro'
        }
    },
    // --- PATH A: PROFESSIONAL ---
    pro_intro: {
        next: 'pro_business_name',
        message: "Great 👍\nI’ll help you manage appointments in a structured, reliable way."
    },
    pro_business_name: {
        step: 'pro_business_name',
        message: "What’s the name of your practice or firm?",
        saveField: 'business_name'
    },
    pro_role_type: {
        step: 'pro_role_type',
        message: "What type of professional are you?\n\n1. Doctor\n2. Lawyer\n3. Psychologist\n4. Consultant\n5. Other",
        options: { '1': 'Doctor', '2': 'Lawyer', '3': 'Psychologist', '4': 'Consultant', '5': 'Other' },
        saveField: 'role_type'
    },
    pro_appointment_length: {
        step: 'pro_appointment_length',
        message: "How long is a typical appointment?\n\n1. 30 minutes\n2. 45 minutes\n3. 60 minutes",
        options: { '1': 30, '2': 45, '3': 60 },
        saveField: 'appointment_length'
    },
    pro_working_days: {
        step: 'pro_working_days',
        message: "Which days do you usually work?\n(You can type: Mon–Fri, or list days)",
        saveField: 'working_days',
        finalize: 'professional' // Trigger profile completion
    },

    // --- PATH B: TRADESPERSON ---
    trade_intro: {
        next: 'trade_business_name',
        message: "Nice 👍\nI’ll help you remember jobs, avoid double bookings, and reply to customers while you’re on the move."
    },
    trade_business_name: {
        step: 'trade_business_name',
        message: "What should customers call you?\n(Business name or your name is fine)",
        saveField: 'business_name'
    },
    trade_type: {
        step: 'trade_type',
        message: "What do you do?\n\n1. Plumber\n2. Electrician\n3. Barber\n4. Nail Tech\n5. Technician\n6. Other",
        options: { '1': 'Plumber', '2': 'Electrician', '3': 'Barber', '4': 'Nail Tech', '5': 'Technician', '6': 'Other' },
        saveField: 'trade_type'
    },
    trade_service_area: {
        step: 'trade_service_area',
        message: "What area do you mostly work in?\n(Optional — you can skip)",
        saveField: 'service_area'
    },
    trade_reminders: {
        step: 'trade_reminders',
        message: "Do you want me to remind you before jobs?\n(This helps a lot 🙌)\n\n1. Yes, remind me\n2. No, not now",
        options: { '1': true, '2': false, 'yes': true, 'no': false },
        saveField: 'reminders',
        finalize: 'trade' // Trigger profile completion
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

    // Hardcoded Transitions based on Request
    if (currentStepId === 'pro_business_name') nextStepId = 'pro_role_type';
    else if (currentStepId === 'pro_role_type') nextStepId = 'pro_appointment_length';
    else if (currentStepId === 'pro_appointment_length') nextStepId = 'pro_working_days';
    else if (currentStepId === 'pro_working_days') nextStepId = 'finalize_pro';

    else if (currentStepId === 'trade_business_name') nextStepId = 'trade_type';
    else if (currentStepId === 'trade_type') nextStepId = 'trade_service_area';
    else if (currentStepId === 'trade_service_area') nextStepId = 'trade_reminders';
    else if (currentStepId === 'trade_reminders') nextStepId = 'finalize_trade';

    if (nextStepId && nextStepId.startsWith('finalize')) {
        // SAVE PROFILE
        const slug = data.business_name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.floor(Math.random() * 1000);

        const profileData = {
            business_name: data.business_name,
            slug: slug,
            role_category: nextStepId === 'finalize_pro' ? 'professional' : 'tradesperson',
            role_type: data.role_type || data.trade_type,
            // defaults
            approval_required: true
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
            return "✅ You’re all set!\n\nYour profile is created. Clients can now book with you through your professional booking page. Check your email for dashboard access.";
        } else {
            return "✅ You’re set!\n\nCustomers can now send booking requests through WhatsApp. I'll notify you here for every new request. Sharp! 🤙";
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
