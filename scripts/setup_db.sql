-- 1. IDEMPOTENCY (Phase 6)
-- Tracks processed messages to prevent duplicate handling
CREATE TABLE IF NOT EXISTS webhook_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    message_sid text NOT NULL,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT webhook_events_message_sid_key UNIQUE (message_sid)
);
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;


-- 2. PERSISTENT CONVERSATION STATE (Phase 7)
-- Stores the context of the user's chat session
CREATE TABLE IF NOT EXISTS conversation_states (
    phone_number text PRIMARY KEY,
    business_id uuid,
    intent text DEFAULT 'general',
    last_action text,
    metadata jsonb DEFAULT '{}'::jsonb,
    updated_at timestamptz DEFAULT now()
);
ALTER TABLE conversation_states ENABLE ROW LEVEL SECURITY;


-- 3. BUSINESS RESOLUTION (Phase 8)
-- Maps specific inbound phone numbers to Business Profiles
CREATE TABLE IF NOT EXISTS business_channels (
    phone_number text PRIMARY KEY,
    business_id uuid NOT NULL,
    channel_type text DEFAULT 'whatsapp_twilio'
);
ALTER TABLE business_channels ENABLE ROW LEVEL SECURITY;


-- 4. EVENT LOGGING (Phase 9)
-- Append-only audit log for all critical system actions
CREATE TABLE IF NOT EXISTS event_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type text NOT NULL,
    business_id uuid,
    customer_id uuid,
    booking_id uuid,
    payload jsonb DEFAULT '{}'::jsonb,
    severity text DEFAULT 'info',
    created_at timestamptz DEFAULT now()
);
-- Create Indices for fast lookup
CREATE INDEX IF NOT EXISTS idx_logs_business ON event_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_logs_booking ON event_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_logs_type ON event_logs(event_type);
ALTER TABLE event_logs ENABLE ROW LEVEL SECURITY;


-- 5. REMINDER SCHEDULER (Phase 10)
-- Tracks scheduled reminders to prevent double-sends
CREATE TABLE IF NOT EXISTS reminders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id uuid NOT NULL, -- Ensure this matches your 'bookings.id' type
    scheduled_time timestamptz NOT NULL,
    type text DEFAULT '24h_before',
    status text DEFAULT 'pending',
    attempt_count int DEFAULT 0,
    last_error text,
    created_at timestamptz DEFAULT now(),
    -- Constraint: Only one reminder of a specific type per booking
    CONSTRAINT uniq_booking_reminder UNIQUE (booking_id, type)
);
CREATE INDEX IF NOT EXISTS idx_reminders_status_time ON reminders(status, scheduled_time);

-- 1. IDEMPOTENCY (Phase 6)
-- Tracks processed messages to prevent duplicate handling
CREATE TABLE IF NOT EXISTS webhook_events (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    message_sid text NOT NULL,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT webhook_events_message_sid_key UNIQUE (message_sid)
);
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;


-- 2. PERSISTENT CONVERSATION STATE (Phase 7)
-- Stores the context of the user's chat session
CREATE TABLE IF NOT EXISTS conversation_states (
    phone_number text PRIMARY KEY,
    business_id uuid,
    intent text DEFAULT 'general',
    last_action text,
    metadata jsonb DEFAULT '{}'::jsonb,
    updated_at timestamptz DEFAULT now()
);
ALTER TABLE conversation_states ENABLE ROW LEVEL SECURITY;


-- 3. BUSINESS RESOLUTION (Phase 8)
-- Maps specific inbound phone numbers to Business Profiles
CREATE TABLE IF NOT EXISTS business_channels (
    phone_number text PRIMARY KEY,
    business_id uuid NOT NULL,
    channel_type text DEFAULT 'whatsapp_twilio'
);
ALTER TABLE business_channels ENABLE ROW LEVEL SECURITY;


-- 4. EVENT LOGGING (Phase 9)
-- Append-only audit log for all critical system actions
CREATE TABLE IF NOT EXISTS event_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type text NOT NULL,
    business_id uuid,
    customer_id uuid,
    booking_id uuid,
    payload jsonb DEFAULT '{}'::jsonb,
    severity text DEFAULT 'info',
    created_at timestamptz DEFAULT now()
);
-- Create Indices for fast lookup
CREATE INDEX IF NOT EXISTS idx_logs_business ON event_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_logs_booking ON event_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_logs_type ON event_logs(event_type);
ALTER TABLE event_logs ENABLE ROW LEVEL SECURITY;


-- 5. REMINDER SCHEDULER (Phase 10)
-- Tracks scheduled reminders to prevent double-sends
CREATE TABLE IF NOT EXISTS reminders (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id uuid NOT NULL, -- Ensure this matches your 'bookings.id' type
    scheduled_time timestamptz NOT NULL,
    type text DEFAULT '24h_before',
    status text DEFAULT 'pending',
    attempt_count int DEFAULT 0,
    last_error text,
    created_at timestamptz DEFAULT now(),
    -- Constraint: Only one reminder of a specific type per booking
    CONSTRAINT uniq_booking_reminder UNIQUE (booking_id, type)
);
CREATE INDEX IF NOT EXISTS idx_reminders_status_time ON reminders(status, scheduled_time);


-- 6. AI SAFETY (Phase 12)
-- Kill switch for AI per business
-- We use 'ADD COLUMN IF NOT EXISTS' syntax (requires Postgres 9.6+)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_enabled boolean DEFAULT true;

-- Add Onboarding Columns (Phase 13)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role_category TEXT; -- 'professional' vs 'on-the-go'
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role_type TEXT;     -- 'barber', 'mechanic', etc.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS slot_granularity INTEGER DEFAULT 60;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS approval_required BOOLEAN DEFAULT TRUE;

-- Add Profile & Slug Columns (Phase 17)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_context TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS business_name TEXT;
