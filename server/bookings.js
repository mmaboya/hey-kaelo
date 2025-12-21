const calendar = require('./calendar');
const supabase = require('./supabase');

// 1. Add a new booking request to Supabase
async function addRequest(name, datetime, phone) {
    console.log(`📝 Processing Booking Request: ${name}, ${datetime}, ${phone}`);

    let isoTimestamp;
    try {
        const parsed = new Date(datetime);
        if (isNaN(parsed.getTime())) throw new Error("Invalid Date");
        isoTimestamp = parsed.toISOString();
    } catch (e) {
        return { error: "Invalid date format. Please provide a valid ISO timestamp." };
    }

    const isFree = await calendar.isSlotAvailable(isoTimestamp);
    if (!isFree) return { error: "This slot is no longer available. Please choose another time." };

    // Find Business Profile
    let businessId = process.env.DEFAULT_BUSINESS_ID;

    // Check for Mpho's Profile
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, business_name, phone_number, role_category')
        .eq('phone_number', '27608048817')
        .limit(1);

    if (profiles && profiles.length > 0) {
        businessId = profiles[0].id;
    }

    if (!businessId) return { error: "System Error: No valid business profile found." };

    // Customer Management
    let customerId = null;
    const cleanPhone = phone.replace('whatsapp:', '');
    const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('business_id', businessId)
        .eq('phone', cleanPhone)
        .maybeSingle();

    if (existingCustomer) {
        customerId = existingCustomer.id;
    } else {
        const { data: newCustomer, error: createError } = await supabase
            .from('customers')
            .insert([{
                business_id: businessId, name: name, phone: cleanPhone,
                notes: 'Created via WhatsApp Booking'
            }])
            .select('id').maybeSingle();
        if (newCustomer) customerId = newCustomer.id;
    }

    // Insert Booking
    const { data, error } = await supabase
        .from('bookings')
        .insert([{
            business_id: businessId,
            customer_id: customerId,
            customer_name: name,
            customer_phone: cleanPhone,
            start_time: isoTimestamp,
            status: 'pending'
        }])
        .select()
        .single();

    if (error) {
        console.error("Booking Insert Error:", error);
        return { error: "Failed to save booking: " + error.message };
    }

    // Notify Owner if they are a tradesperson (using the same chat for simulation)
    if (profiles && profiles.length > 0) {
        const twilio = require('twilio');
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        const alertMsg = `Aweh Boss! New Booking Request from ${name} for ${new Date(datetime).toLocaleString()}.\n\nReply "#1 ok" to confirm or "#1 no" to reject.`;

        await client.messages.create({
            from: process.env.TWILIO_PHONE_NUMBER,
            to: `whatsapp:${profiles[0].phone_number}`,
            body: alertMsg
        }).catch(e => console.error("Failed to alert owner:", e));
    }

    return {
        id: data.id,
        name: data.customer_name,
        datetime: new Date(data.start_time).toLocaleString(),
        phone: data.customer_phone,
        status: data.status
    };
}

async function getBookingById(id) {
    const { data, error } = await supabase.from('bookings').select('*').eq('id', id).single();
    if (error) return null;
    return {
        id: data.id,
        name: data.customer_name,
        datetime: new Date(data.start_time).toLocaleString(),
        phone: data.customer_phone,
        status: data.status,
        start_time: data.start_time
    };
}

async function scheduleReminders(bookingId, startTimeIso) {
    const startTime = new Date(startTimeIso);
    const reminder24h = new Date(startTime.getTime() - (24 * 60 * 60 * 1000));
    if (reminder24h > new Date()) {
        await supabase.from('reminders').insert([{
            booking_id: bookingId,
            scheduled_time: reminder24h.toISOString(),
            type: '24h_before'
        }]);
    }
}

module.exports = { addRequest, getBookingById, scheduleReminders };
