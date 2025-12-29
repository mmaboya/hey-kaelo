# Support Layer Database Schema

To enable the Support Layer features, please run the following SQL code in your Supabase SQL Editor:

```sql
-- 1. Support Tickets Table
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    channel TEXT NOT NULL CHECK (channel IN ('web', 'whatsapp')),
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'ai_in_progress', 'waiting_customer', 'resolved', 'escalated')),
    priority TEXT NOT NULL DEFAULT 'med' CHECK (priority IN ('low', 'med', 'high')),
    error_code TEXT,
    request_id TEXT,
    route TEXT,
    summary_ai TEXT,
    resolution_ai TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Support Events (Timeline)
CREATE TABLE IF NOT EXISTS support_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('user_message', 'system_error', 'agent_action', 'agent_reply', 'escalation', 'resolution')),
    payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Support Assets
CREATE TABLE IF NOT EXISTS support_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('screenshot', 'log_bundle', 'whatsapp_media')),
    storage_path TEXT NOT NULL,
    meta JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Support Knowledge Base
CREATE TABLE IF NOT EXISTS support_kb_articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    tags TEXT[],
    symptoms TEXT,
    causes TEXT,
    steps TEXT,
    related_error_codes TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_kb_articles ENABLE ROW LEVEL SECURITY;

-- 6. Policies
CREATE POLICY "Users can manage their own tickets" ON support_tickets
    FOR ALL USING (auth.uid() = tenant_profile_id);

CREATE POLICY "Users can view events for their tickets" ON support_events
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM support_tickets t
            WHERE t.id = support_events.ticket_id
            AND t.tenant_profile_id = auth.uid()
        )
    );

CREATE POLICY "Users can view assets for their tickets" ON support_assets
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM support_tickets t
            WHERE t.id = support_assets.ticket_id
            AND t.tenant_profile_id = auth.uid()
        )
    );

CREATE POLICY "Anyone can read KB articles" ON support_kb_articles
    FOR SELECT TO authenticated, anon USING (true);
```

Sharp! 🤙
