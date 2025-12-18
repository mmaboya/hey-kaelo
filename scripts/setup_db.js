const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../deploy.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const DDL_STATEMENTS = [
    // 1. Idempotency (Phase 6)
    `CREATE TABLE IF NOT EXISTS webhook_events (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        message_sid text NOT NULL,
        created_at timestamptz DEFAULT now(),
        CONSTRAINT webhook_events_message_sid_key UNIQUE (message_sid)
    );`,
    `ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;`,

    // 2. Persistent Conversation State (Phase 7)
    `CREATE TABLE IF NOT EXISTS conversation_states (
        phone_number text PRIMARY KEY,
        business_id uuid,
        intent text DEFAULT 'general',
        last_action text,
        metadata jsonb DEFAULT '{}'::jsonb,
        updated_at timestamptz DEFAULT now()
    );`,
    `ALTER TABLE conversation_states ENABLE ROW LEVEL SECURITY;`,

    // 3. Business Resolution (Phase 8)
    `CREATE TABLE IF NOT EXISTS business_channels (
        phone_number text PRIMARY KEY,
        business_id uuid NOT NULL, -- REFERENCES profiles(id) usually, but kept loose to avoid foreign key hell during setup
        channel_type text DEFAULT 'whatsapp_twilio'
    );`,
    `ALTER TABLE business_channels ENABLE ROW LEVEL SECURITY;`,

    // 4. Event Logging (Phase 9)
    `CREATE TABLE IF NOT EXISTS event_logs (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        event_type text NOT NULL,
        business_id uuid,
        customer_id uuid,
        booking_id uuid,
        payload jsonb DEFAULT '{}'::jsonb,
        severity text DEFAULT 'info',
        created_at timestamptz DEFAULT now()
    );`,
    `CREATE INDEX IF NOT EXISTS idx_logs_business ON event_logs(business_id);`,
    `CREATE INDEX IF NOT EXISTS idx_logs_booking ON event_logs(booking_id);`,
    `ALTER TABLE event_logs ENABLE ROW LEVEL SECURITY;`,

    // 5. Reminders (Phase 10)
    `CREATE TABLE IF NOT EXISTS reminders (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        booking_id uuid NOT NULL, -- REFERENCES bookings(id)
        scheduled_time timestamptz NOT NULL,
        type text DEFAULT '24h_before',
        status text DEFAULT 'pending',
        attempt_count int DEFAULT 0,
        last_error text,
        created_at timestamptz DEFAULT now(),
        CONSTRAINT uniq_booking_reminder UNIQUE (booking_id, type)
    );`,
    `CREATE INDEX IF NOT EXISTS idx_reminders_status_time ON reminders(status, scheduled_time);`,

    // 6. AI Safety (Phase 12) - Add Column if not exists
    // Note: 'IF NOT EXISTS' for columns is tricky in raw SQL without PL/pgSQL.
    // We will attempt it, but if it fails (column exists), we catch it properly.
    `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_enabled boolean DEFAULT true;`
];

async function runMigrations() {
    console.log("🚀 Starting Database Migration...");

    for (const sql of DDL_STATEMENTS) {
        try {
            // Using rpc() would be ideal if we had a stored proc for exec sql.
            // But we don't. Supabase JS Client does not support raw SQL execution directly on the public interface
            // unless we use the Postgres Connection String (pg library) OR we have a dedicated RPC function.

            // CRITICAL CHECK: Does the user have an 'exec_sql' RPC function? If not, we cannot run DDL from client.
            // FAKE IT FOR NOW: We will assume we CAN'T run DDL from the client easily without 'postgres' driver.
            // Wait, standard Supabase pattern for migrations is using the CLI.

            // FALLBACK STRATEGY: 
            // Since we can't run RAW SQL via supabase-js without a custom RPC, 
            // We'll log the SQL and ask the user to run it in the SQL Editor.
            // OR use 'postgres' npm package if we have the connection string.

            // Let's check environment for Valid connection string.
            console.log(`\nPREPARING TO RUN:\n${sql}`);

        } catch (e) {
            console.error(`❌ Statement Failed: ${sql.substring(0, 50)}...`, e.message);
        }
    }

    console.warn("\n⚠️ NOTICE: supabase-js cannot execute CREATE TABLE statements directly.");
    console.warn("⚠️ Please copy the SQL statements above and run them in your Supabase SQL Editor.");
}

runMigrations();


// Actual Plan for the User Interaction:
// Since I cannot execute DDL via the JS client (without a specific RPC setup),
// keeping this script as a "generator" is good, but I should probably just provide the SQL file
// and instruct the user.
