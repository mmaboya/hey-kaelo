// server/calendar.js

const { google } = require('googleapis');
const path = require('path');

// Service Account Auth
// Support both File (local) and Env Var (cloud/production)
const GOOGLE_SERVICE_ACCOUNT = process.env.GOOGLE_SERVICE_ACCOUNT;
let auth;
let calendar = null; // Default to null if auth fails

try {
    if (GOOGLE_SERVICE_ACCOUNT) {
        // Cloud Mode: Parse JSON from Env
        const credentials = JSON.parse(GOOGLE_SERVICE_ACCOUNT);
        auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/calendar'],
        });
        console.log("☁️  Using Google Credentials from Environment");
        calendar = google.calendar({ version: 'v3', auth });
    } else {
        // Local Mode: Use File
        // Only try this if we are NOT in production, or if we are sure the file exists
        if (process.env.NODE_ENV !== 'production') {
            const KEY_FILE = path.join(__dirname, 'service-account.json');
            auth = new google.auth.GoogleAuth({
                keyFile: KEY_FILE,
                scopes: ['https://www.googleapis.com/auth/calendar'],
            });
            console.log("💻 Using Google Credentials from Local File");
            calendar = google.calendar({ version: 'v3', auth });
        } else {
            console.warn("⚠️ Production Mode: No GOOGLE_SERVICE_ACCOUNT env var found, and skipping local file.");
        }
    }
} catch (e) {
    console.error("❌ Google Calendar Auth Init Failed:", e.message);
    // Do NOT throw, allowing server to start.
}

// const calendar = ... (Removed, declared above)

// Use 'primary' to mean the calendar of the person who shared it with the Service Account
const CALENDAR_ID = 'primary';

// CONFIGURATION
const BUSINESS_START_HOUR = 9;
const BUSINESS_END_HOUR = 17;
const SLOT_DURATION_MINUTES = 60;

// Helper: Check if a slot overlaps with busy events
function isBusy(slotStart, slotEnd, busyEvents) {
    return busyEvents.some(event => {
        const eventStart = new Date(event.start.dateTime || event.start.date);
        const eventEnd = new Date(event.end.dateTime || event.end.date);
        // Overlap: (StartA < EndB) and (EndA > StartB)
        return (slotStart < eventEnd) && (slotEnd > eventStart);
    });
}

// 1. Generate Available Slots (JSON)
async function generateSlots(dateInput) {
    try {
        if (!calendar) {
            console.warn("⚠️ Calendar not initialized.");
            return { error: "Calendar system offline." };
        }

        console.log(`📅 Generating Slots for ${dateInput}...`);

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

        startOfDay.setHours(BUSINESS_START_HOUR, 0, 0, 0);
        const endOfDay = new Date(startOfDay);
        endOfDay.setHours(BUSINESS_END_HOUR, 0, 0, 0);

        // Fetch Events
        const res = await calendar.events.list({
            calendarId: CALENDAR_ID,
            timeMin: startOfDay.toISOString(),
            timeMax: endOfDay.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
        });
        const busyEvents = res.data.items || [];

        // Generate Slots
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
                    label: slotStart.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                });
            }

            // Increment by Granularity (same as duration for now)
            cursor.setMinutes(cursor.getMinutes() + SLOT_DURATION_MINUTES);
        }

        return {
            date: startOfDay.toISOString().split('T')[0],
            slots: availableSlots
        };

    } catch (error) {
        console.error('Error generating slots:', error);
        return { error: "Failed to generate availability." };
    }
}

// 2. Strict Availability Check (For Booking Validation)
async function isSlotAvailable(isoDatetime) {
    try {
        if (!calendar) return true; // Fail open (or safe default) if offline? Safer to fail closed in PROD.
        // STRICT MODE: If calendar is offline, we cannot book.
        if (!calendar) throw new Error("Calendar System Offline");

        const slotStart = new Date(isoDatetime);
        if (isNaN(slotStart.getTime())) throw new Error("Invalid Date");

        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + SLOT_DURATION_MINUTES);

        // Fetch just the window around this slot
        // Add a tiny buffer to catch adjacent events? No, simple overlap is fine.
        const res = await calendar.events.list({
            calendarId: CALENDAR_ID,
            timeMin: slotStart.toISOString(),
            timeMax: slotEnd.toISOString(),
            singleEvents: true,
        });

        const busyEvents = res.data.items || [];
        const busy = isBusy(slotStart, slotEnd, busyEvents);

        return !busy; // Returns TRUE if Available

    } catch (error) {
        console.error("Availability Check Failed:", error);
        return false; // Fail Safe: Assume not available if error
    }
}

// Ensure the AI tool definition matches this signature if changing
async function createEvent(name, datetime, phone) {
    try {
        if (!calendar) return { error: "Calendar system offline." };
        console.log(`Creating GCal Event: ${name} at ${datetime}`);

        const start = new Date(datetime);
        const end = new Date(start);
        end.setHours(end.getHours() + 1); // Default 1 hour duration

        const event = {
            summary: `Booking: ${name}`,
            description: `Phone: ${phone}\nBooked via HeyKaelo`,
            start: {
                dateTime: start.toISOString(),
                timeZone: 'Africa/Johannesburg', // Set appropriate timezone
            },
            end: {
                dateTime: end.toISOString(),
                timeZone: 'Africa/Johannesburg',
            },
        };

        const res = await calendar.events.insert({
            calendarId: CALENDAR_ID,
            resource: event,
        });

        return { success: true, link: res.data.htmlLink };

    } catch (error) {
        console.error('Error creating event:', error);
        return { error: 'Failed to create calendar event.' };
    }
}

module.exports = { generateSlots, isSlotAvailable, createEvent };
