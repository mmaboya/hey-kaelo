const supabase = require('../server/supabase');
require('dotenv').config();

async function listStates() {
    console.log("--- CONVERSATION STATES ---");
    const { data, error } = await supabase
        .from('conversation_states')
        .select('*');

    if (error) {
        console.error("Error:", error);
        return;
    }

    data.forEach(s => {
        console.log(`Phone: ${s.phone_number}`);
        console.log(`   Business: ${s.business_id}`);
        console.log(`   Metadata: ${JSON.stringify(s.metadata)}`);
        console.log(`   Updated:  ${s.updated_at}`);
        console.log("-------------------");
    });
}

listStates();
