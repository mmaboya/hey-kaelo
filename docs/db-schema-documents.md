# Document Repository SQL Migration

To enable the Document Repository features, please run the following SQL code in your Supabase SQL Editor:

```sql
-- 1. Create Document Templates Table
CREATE TABLE IF NOT EXISTS document_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Document Requests Table
CREATE TABLE IF NOT EXISTS document_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    template_id UUID REFERENCES document_templates(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'signed', 'void'
    signature_url TEXT,
    signed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_requests ENABLE ROW LEVEL SECURITY;

-- 4. Policies
CREATE POLICY "Users can manage their own templates" ON document_templates
    FOR ALL USING (auth.uid() = business_id);

CREATE POLICY "Users can manage their own requests" ON document_requests
    FOR ALL USING (auth.uid() = business_id);

CREATE POLICY "Public can view and sign requests by ID" ON document_requests
    FOR SELECT TO public USING (true);

CREATE POLICY "Public can update requests to signed" ON document_requests
    FOR UPDATE TO public USING (status = 'pending') WITH CHECK (status = 'signed');
```

Sharp! 🤙
