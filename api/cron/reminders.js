require('dotenv').config();
const supabase = require('../../server/supabase');
const wa = require('../../server/whatsapp');

async function processReminders() {
    const now = new Date().toISOString();

    const { data: dueReminders } = await supabase
        .from('reminders')
        .select('*, bookings(*)')
        .eq('status', 'pending')
        .lte('scheduled_time', now);

    if (!dueReminders || dueReminders.length === 0) return;

    for (const reminder of dueReminders) {
        const booking = reminder.bookings;
        if (!booking || booking.status !== 'approved') {
            await supabase.from('reminders').update({ status: 'cancelled' }).eq('id', reminder.id);
            continue;
        }

        const { data: business } = await supabase
            .from('profiles')
            .select('business_name')
            .eq('id', booking.business_id)
            .single();

        const bizName = business?.business_name || "the shop";
        const timeStr = new Date(booking.start_time).toLocaleTimeString('en-ZA', {
            hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Johannesburg'
        });

        const message = reminder.type === '24h_before'
            ? `Hi ${booking.customer_name}! ✨ Just a friendly reminder from ${bizName} that you're booked in for tomorrow at ${timeStr}. We're looking forward to seeing you. Toodles! 🎈`
            : `Okie-dokie ${booking.customer_name}! Just a quick heads-up that your appointment with ${bizName} is coming up today at ${timeStr}. See you soon! Super-duper.`;

        try {
            await wa.sendMessage(booking.customer_phone, message);
            await supabase.from('reminders').update({ status: 'sent' }).eq('id', reminder.id);
            console.log(`✅ Sent reminder (${reminder.type}) to ${booking.customer_phone}`);
        } catch (e) {
            console.error("Failed to send reminder:", e);
            await supabase.from('reminders').update({
                attempt_count: reminder.attempt_count + 1,
                last_error: e.message
            }).eq('id', reminder.id);
        }
    }
}

module.exports = async (req, res) => {
    // Vercel cron jobs call this as a GET request
    // Protect against unauthorized calls
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.CRON_SECRET) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    try {
        await processReminders();
        res.json({ ok: true });
    } catch (err) {
        console.error('Cron reminders error:', err);
        res.status(500).json({ error: err.message });
    }
};
