// server/calendar.js

const { google } = require('googleapis');
const path = require('path');
const supabase = require('./supabase');

// Service Account Auth
const GOOGLE_SERVICE_ACCOUNT = process.env.GOOGLE_SERVICE_ACCOUNT;
let auth;
let calendar = null;

try {
    if (GOOGLE_SERVICE_ACCOUNT) {
        const credentials = JSON.parse(GOOGLE_SERVICE_ACCOUNT);
        auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/calendar'],
        });
        console.log("☁️  Using Google Credentials from Environment");
        calendar = google.calendar({ version: 'v3', auth });
    } else {
        if (process.env.NODE_ENV !== 'production') {
            const KEY_FILE = path.join(__dirname, 'service-account.json');
            auth = new google.auth.GoogleAuth({
                keyFile: KEY_FILE,
                scopes: ['https://www.googleapis.com/auth/calendar'],
            });
            console.log("💻 Using Google Credentials from Local File");
            calendar = google.calendar({ version: 'v3', auth });
        } else {
            console.warn("⚠️ Production Mode: No GOOGLE_SERVICE_ACCOUNT env var found.");
        }
    }
} catch (e) {
    console.error("❌ Google Calendar Auth Init Failed:", e.message);
}

const CALENDAR_ID = 'primary';
const DEFAULT_START_HOUR = 9;
const DEFAULT_END_HOUR = 17;
const SLOT_DURATION_MINUTES = 60;

function isBusy(slotStart, slotEnd, busyEvents) {
    return busyEvents.some(event => {
        const eventStart = new Date(event.start.dateTime || event.start.date);
        const eventEnd = new Date(event.end.dateTime || event.end.date);
        return (slotStart < eventEnd) && (slotEnd > eventStart);
    });
}

// Fetch business operating hours for a given day of week (0=Sun, 6=Sat)
async function getBusinessHours(businessId, dayOfWeek) {
    if (!businessId) return { startHour: DEFAULT_START_HOUR, endHour: DEFAULT_END_HOUR, closed: false };

    try {
        const { data } = await supabase
            .from('operating_hours')
            .select('open_time, close_time, is_closed')
            .eq('business_id', businessId)
            .eq('day_of_week', dayOfWeek)
            .maybeSingle();

        if (!data || data.is_closed) return { closed: true };

        const [openH, openM] = data.open_time.split(':').map(Number);
        const [closeH, closeM] = data.close_time.split(':').map(Number);

        return {
            startHour: openH + openM / 60,
            endHour: closeH + closeM / 60,
            startMinute: openM,
            closeMinute: closeM,
            closed: false
        };
    } catch (e) {
        console.error("Failed to fetch operating hours:", e);
        return { startHour: DEFAULT_START_HOUR, endHour: DEFAULT_END_HOUR, closed: false };
    }
}

// 1. Generate Available Slots
async function generateSlots(dateInput, businessId) {
    try {
        if (!calendar) {
            console.warn("⚠️ Calendar not initialized.");
            return { error: "Calendar system offline." };
        }

        let startOfDay = new Date();
        if (dateInput) {
            const lower = dateInput.toLowerCase();
            if (lower === 'tomorrow') {
                startOfDay.setDate(startOfDay.getDate() + 1);
            } else if (lower !== 'today') {
                const parsed = new Date(dateInput);
                if (!isNaN(parsed)) startOfDay = parsed;
            }
        }

        // Fetch business hours for this day
        const bizHours = await getBusinessHours(businessId, startOfDay.getDay());
        if (bizHours.closed) {
            return { date: startOfDay.toISOString().split('T')[0], slots: [], message: "Closed on this day." };
        }

        const startHour = Math.floor(bizHours.startHour ?? DEFAULT_START_HOUR);
        const startMin = bizHours.startMinute ?? 0;
        const endHour = Math.floor(bizHours.endHour ?? DEFAULT_END_HOUR);
        const endMin = bizHours.closeMinute ?? 0;

        startOfDay.setHours(startHour, startMin, 0, 0);
        const endOfDay = new Date(startOfDay);
        endOfDay.setHours(endHour, endMin, 0, 0);

        const res = await calendar.events.list({
            calendarId: CALENDAR_ID,
            timeMin: startOfDay.toISOString(),
            timeMax: endOfDay.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
        });
        const busyEvents = res.data.items || [];

        const availableSlots = [];
        let cursor = new Date(startOfDay);

        while (cursor.getTime() + (SLOT_DURATION_MINUTES * 60000) <= endOfDay.getTime()) {
            const slotStart = new Date(cursor);
            const slotEnd = new Date(cursor);
            slotEnd.setMinutes(slotEnd.getMinutes() + SLOT_DURATION_MINUTES);

            if (!isBusy(slotStart, slotEnd, busyEvents)) {
                availableSlots.push({
                    start: slotStart.toISOString(),
                    end: slotEnd.toISOString(),
                    label: slotStart.toLocaleTimeString('en-ZA', { hour: 'numeric', minute: '2-digit', timeZone: 'Africa/Johannesburg' })
                });
            }

            cursor.setMinutes(cursor.getMinutes() + SLOT_DURATION_MINUTES);
        }

        return { date: startOfDay.toISOString().split('T')[0], slots: availableSlots };

    } catch (error) {
        console.error('Error generating slots:', error);
        return { error: "Failed to generate availability." };
    }
}

// 2. Strict Availability Check
async function isSlotAvailable(isoDatetime) {
    try {
        if (!calendar) return true; // Fail open if calendar offline (no Google Calendar configured)

        const slotStart = new Date(isoDatetime);
        if (isNaN(slotStart.getTime())) throw new Error("Invalid Date");

        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + SLOT_DURATION_MINUTES);

        const res = await calendar.events.list({
            calendarId: CALENDAR_ID,
            timeMin: slotStart.toISOString(),
            timeMax: slotEnd.toISOString(),
            singleEvents: true,
        });

        const busyEvents = res.data.items || [];
        return !isBusy(slotStart, slotEnd, busyEvents);

    } catch (error) {
        console.error("Availability Check Failed:", error);
        return false;
    }
}

async function createEvent(name, datetime, phone) {
    try {
        if (!calendar) return { error: "Calendar system offline." };

        const start = new Date(datetime);
        const end = new Date(start);
        end.setHours(end.getHours() + 1);

        const event = {
            summary: `Booking: ${name}`,
            description: `Phone: ${phone}\nBooked via HeyKaelo`,
            start: { dateTime: start.toISOString(), timeZone: 'Africa/Johannesburg' },
            end: { dateTime: end.toISOString(), timeZone: 'Africa/Johannesburg' },
        };

        const res = await calendar.events.insert({ calendarId: CALENDAR_ID, resource: event });
        return { success: true, link: res.data.htmlLink };

    } catch (error) {
        console.error('Error creating event:', error);
        return { error: 'Failed to create calendar event.' };
    }
}

module.exports = { generateSlots, isSlotAvailable, createEvent };
