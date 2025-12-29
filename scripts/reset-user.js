const supabase = require('../server/supabase');
require('dotenv').config();

async function resetUser(phone) {
    console.log(`🧹 Resetting state for ${phone}...`);
    const { error } = await supabase
        .from('conversation_states')
        .delete()
        .eq('phone_number', phone);

    if (error) {
        console.error("Error:", error);
    } else {
        console.log("✅ State cleared.");
    }
}

const target = process.argv[2];
if (target) {
    resetUser(target);
} else {
    console.log("Please provide a phone number (e.g. whatsapp:+27...)");
}
