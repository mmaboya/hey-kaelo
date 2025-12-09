const supabase = require('./supabase');

// 1. Add a new booking request to Supabase
// 1. Add a new booking request to Supabase
async function addRequest(name, datetime, phone) {
    // ADMIN: Use Service Role to find a business to attach this to.
    // Improved Logic: Find a profile that actually has set up their Knowledge Base (business_context)
    // or fallback to the most recent profile.
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, business_name')
        .neq('business_context', '') // Prioritize configured profiles
        .order('created_at', { ascending: false })
        .limit(1);

    // Fallback if no context set yet: match any profile
    let businessId;
    if (!profiles || profiles.length === 0) {
        console.log("⚠️ No configured profile found, falling back to newest user.");
        const { data: fallback } = await supabase.from('profiles').select('id').order('created_at', { ascending: false }).limit(1);
        if (fallback && fallback.length > 0) businessId = fallback[0].id;
    } else {
        businessId = profiles[0].id;
        console.log(`✅ Attaching booking to business: ${profiles[0].business_name} (ID: ${businessId})`);
    }

    if (!businessId) {
        console.error("❌ No business profile found!", profileError);
        return { error: "No business profile found" };
    }

    // --- PHASE 4: Customer Management ---
    // 1. Check if customer exists for this business
    let customerId = null;
    const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('business_id', businessId)
        .eq('phone', phone)
        .single();

    if (existingCustomer) {
        customerId = existingCustomer.id;
        console.log(`👤 Found existing customer: ${customerId}`);
    } else {
        // 2. Create new customer
        console.log(`👤 Creating new customer for ${name} (${phone})`);
        const { data: newCustomer, error: createError } = await supabase
            .from('customers')
            .insert([{
                business_id: businessId,
                name: name,
                phone: phone,
                notes: 'Created via WhatsApp Booking'
            }])
            .select('id')
            .single();

        if (createError) {
            console.error("⚠️ Failed to create customer record:", createError);
            // Proceed without customer_id if this fails (graceful degradation)
        } else {
            customerId = newCustomer.id;
        }
    }

    // Attempt to parse date
    let timestamp = new Date().toISOString();
    try {
        const parsed = new Date(datetime);
        if (!isNaN(parsed.getTime())) {
            timestamp = parsed.toISOString();
        }
    } catch (e) {
        console.warn("Date parse fail, using Now");
    }

    // Insert with Service Role (bypasses RLS)
    const { data, error } = await supabase
        .from('bookings')
        .insert([{
            business_id: businessId,
            customer_id: customerId, // NEW: Link to customer
            customer_name: name,
            customer_phone: phone,
            start_time: timestamp,
            status: 'pending'
        }])
        .select()
        .single();

    if (error) {
        console.error("Supabase Insert Error:", error);
        return { error: error.message };
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

module.exports = { addRequest, getBookingById };
