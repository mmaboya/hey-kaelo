const calendar = require('./calendar'); // Import for availability check

// 1. Add a new booking request to Supabase
async function addRequest(name, datetime, phone) {
    console.log(`📝 Processing Booking Request: ${name}, ${datetime}, ${phone}`);

    // --- PHASE 1: Validation & Availability Check (Strict) ---
    // 1. Parse Date strict
    let isoTimestamp;
    try {
        const parsed = new Date(datetime);
        if (isNaN(parsed.getTime())) throw new Error("Invalid Date");
        isoTimestamp = parsed.toISOString();
    } catch (e) {
        console.error("❌ Invalid Date Format:", datetime);
        return { error: "Invalid date format. Please provide a valid ISO timestamp." };
    }

    // 2. Check Availability (Prevent Race Conditions)
    const isFree = await calendar.isSlotAvailable(isoTimestamp);
    if (!isFree) {
        console.warn(`❌ Slot Unavailable during insert: ${isoTimestamp}`);
        return { error: "This slot is no longer available. Please choose another time." };
    }

    // 3. Finding Business Profile
    // ADMIN: Use Service Role to find a business to attach this to.
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, business_name, role_category, phone_number')
        .neq('business_context', '')
        .order('created_at', { ascending: false })
        .limit(1);

    // Fallback logic (Strict Determinism)
    let businessId;
    if (!profiles || profiles.length === 0) {
        const defaultId = process.env.DEFAULT_BUSINESS_ID;
        if (defaultId) {
            console.log(`⚠️ No config profile, using DEFAULT_BUSINESS_ID: ${defaultId}`);
            businessId = defaultId;
        } else {
            console.error("❌ No configured business profile found.");
            // Do not guess.
        }
    } else {
        businessId = profiles[0].id;
    }

    if (!businessId) {
        return { error: "System Error: No valid business profile found." };
    }

    // --- PHASE 2: Customer Management ---
    let customerId = null;
    const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('business_id', businessId)
        .eq('phone', phone)
        .single();

    if (existingCustomer) {
        customerId = existingCustomer.id;
    } else {
        const { data: newCustomer, error: createError } = await supabase
            .from('customers')
            .insert([{
                business_id: businessId, name: name, phone: phone,
                notes: 'Created via WhatsApp Booking'
            }])
            .select('id').single();

        if (!createError) customerId = newCustomer.id;
    }

    // --- PHASE 3: Deduplication check ---
    // Prevent double-booking same slot for same customer (or same slot entirely?)
    // Rule: Same Customer cannot have PENDING booking for Same Time.
    if (customerId) {
        const { data: dupes } = await supabase
            .from('bookings')
            .select('id')
            .eq('business_id', businessId)
            .eq('customer_id', customerId)
            .eq('start_time', isoTimestamp)
            .in('status', ['pending', 'approved']); // Check Pending or Approved

        if (dupes && dupes.length > 0) {
            console.warn(`⚠️ Duplicate booking detected for ${phone} at ${isoTimestamp}`);
            return { error: "You already have a booking request for this time." };
        }
    }

    // --- PHASE 4: Insert (State = PENDING_APPROVAL) ---
    // Insert with Service Role
    const { data, error } = await supabase
        .from('bookings')
        .insert([{
            business_id: businessId,
            customer_id: customerId,
            customer_name: name,
            customer_phone: phone,
            start_time: isoTimestamp,
            status: 'pending' // Explicit Default
        }])
        .select()
        .single();

    // --- PHASE 5: Owner Notification (New) ---
    if (!error && data) {
        const ownerPhone = profiles[0].phone_number;
        const roleCategory = profiles[0].role_category;

        if (ownerPhone && roleCategory === 'on-the-go') {
            // Send Alert to Owner
            const twilio = require('twilio');
            const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

            const alertMsg = `Aweh! New Booking Request from ${name} for ${new Date(datetime).toLocaleString()}.\n\nReply "#1 ok" to confirm or "#1 no" to reject.`;

            client.messages.create({
                from: process.env.TWILIO_PHONE_NUMBER,
                to: `whatsapp:${ownerPhone}`,
                body: alertMsg
            }).catch(e => console.error("Failed to alert owner:", e));
        }
    }

    return {
        id: data.id,
        name: data.customer_name,
        datetime: new Date(data.start_time).toLocaleString(),
        phone: data.customer_phone,
        status: data.status
    };
}

// 2. Get Booking by ID (for notifications)
async function getBookingById(id) {
    const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        console.error("Supabase Get Error:", error);
        return null;
    }

    return {
        id: data.id,
        name: data.customer_name,
        datetime: new Date(data.start_time).toLocaleString(),
        phone: data.customer_phone,
        status: data.status
    };
}

// 3. Schedule Reminders
async function scheduleReminders(bookingId, startTimeIso) {
    const startTime = new Date(startTimeIso);

    // 1. 24h Reminder (Only if it's more than 24h away)
    const reminder24h = new Date(startTime.getTime() - (24 * 60 * 60 * 1000));
    if (reminder24h > new Date()) {
        await supabase.from('reminders').insert([{
            booking_id: bookingId,
            scheduled_time: reminder24h.toISOString(),
            type: '24h_before'
        }]);
    }

    // 2. Day-of Reminder (2 hours before, if it's more than 2h away)
    const reminder2h = new Date(startTime.getTime() - (2 * 60 * 60 * 1000));
    if (reminder2h > new Date()) {
        await supabase.from('reminders').insert([{
            booking_id: bookingId,
            scheduled_time: reminder2h.toISOString(),
            type: 'day_of'
        }]);
    }
}

module.exports = { addRequest, getBookingById, scheduleReminders };
