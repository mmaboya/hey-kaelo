const calendar = require('./calendar');
const supabase = require('./supabase');

// 1. Add a new booking request to Supabase
async function addRequest(name, datetime, phone, businessId) {
    console.log(`📝 Processing Booking Request: ${name}, ${datetime}, ${phone}, Biz: ${businessId}`);

    let isoTimestamp;
    try {
        // Basic cleanup in case AI includes extra quotes or noise
        const cleanDateStr = datetime.replace(/['"]/g, '').trim();
        const parsed = new Date(cleanDateStr);

        if (isNaN(parsed.getTime())) {
            console.error(`❌ Booking Failed: Could not parse date string: "${datetime}"`);
            return { error: `Invalid date format ("${datetime}"). Please tell me the date and time again clearly.` };
        }
        isoTimestamp = parsed.toISOString();
    } catch (e) {
        console.error(`❌ Booking Parse Exception:`, e);
        return { error: "I had trouble reading the time. Could you please state it exactly (e.g., '25 Dec at 9am')?" };
    }

    const isFree = await calendar.isSlotAvailable(isoTimestamp);
    if (!isFree) return { error: "This slot is no longer available. Please choose another time." };

    const resolvedBizId = businessId || process.env.DEFAULT_BUSINESS_ID;
    if (!resolvedBizId) return { error: "System Error: No valid business profile found." };

    // Customer Management
    let customerId = null;
    const cleanPhone = phone.replace(/\D/g, ''); // Digits only normalization
    const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('business_id', resolvedBizId)
        .eq('phone', cleanPhone)
        .maybeSingle();

    if (existingCustomer) {
        customerId = existingCustomer.id;
    } else {
        const { data: newCustomer, error: createError } = await supabase
            .from('customers')
            .insert([{
                business_id: resolvedBizId, name: name, phone: cleanPhone,
                notes: 'Created via WhatsApp Booking'
            }])
            .select('id').maybeSingle();
        if (newCustomer) customerId = newCustomer.id;
    }

    // Insert Booking
    const { data, error } = await supabase
        .from('bookings')
        .insert([{
            business_id: resolvedBizId,
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

    // Notify Owner
    const { data: profile } = await supabase.from('profiles').select('phone_number').eq('id', resolvedBizId).single();
    if (profile && profile.phone_number) {
        const wa = require('./whatsapp');
        const alertMsg = `Aweh Boss! New Booking Request from ${name} for ${new Date(datetime).toLocaleString()}.\n\nReply "#${data.id} ok" to confirm or "#${data.id} no" to reject.`;
        await wa.sendMessage(profile.phone_number, alertMsg).catch(e => console.error("Failed to alert owner:", e));
    }

    return {
        id: data.id,
        name: data.customer_name,
        datetime: new Date(data.start_time).toLocaleString(),
        phone: data.customer_phone,
        status: data.status
    };
}

async function getDailyBookings(businessId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('business_id', businessId)
        .eq('status', 'approved')
        .gte('start_time', today.toISOString())
        .lt('start_time', tomorrow.toISOString())
        .order('start_time', { ascending: true });

    if (error) {
        console.error("Error fetching daily bookings:", error);
        return [];
    }
    return data;
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

module.exports = { addRequest, getBookingById, scheduleReminders, getDailyBookings };
