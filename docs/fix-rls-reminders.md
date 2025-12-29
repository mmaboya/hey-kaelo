# Fix: Enable RLS on public.reminders

This migration enables Row-Level Security (RLS) on the `reminders` table and ensures that only the business owner who owns the associated booking can view or manage the reminders.

### SQL Migration

```sql
-- 1. Enable Row Level Security
ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

-- 2. Create Policy: Owners can manage reminders for their own bookings
-- This policy uses a subquery to check if the associated booking's business_id 
-- matches the currently authenticated user's ID (auth.uid()).
CREATE POLICY "Owners can manage reminders for their bookings" ON public.reminders
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.bookings b
            WHERE b.id = reminders.booking_id
            AND b.business_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.bookings b
            WHERE b.id = reminders.booking_id
            AND b.business_id = auth.uid()
        )
    );

-- 3. Optimization: Add an index on booking_id if it doesn't exist
-- This speeds up the RLS policy check.
CREATE INDEX IF NOT EXISTS idx_reminders_booking_id ON public.reminders(booking_id);
```

### Why this is needed:
*   **Security**: Prevents unauthorized users from reading or spoofing reminder schedules.
*   **Compliance**: Ensures that sensitive booking-related data is only accessible to the correct business owner.
*   **Best Practice**: Silences the Supabase security lint warning for public tables without RLS.

Sharp! 🤙
