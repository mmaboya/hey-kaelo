-- check latest webhook events (raw messages)
SELECT * FROM webhook_events ORDER BY created_at DESC LIMIT 10;

-- check conversation states (who is bound to which business)
SELECT * FROM conversation_states ORDER BY updated_at DESC LIMIT 10;

-- check profiles (businesses)
SELECT * FROM profiles LIMIT 10;
