// server/calendar.js

const { google } = require('googleapis');
const path = require('path');

// Service Account Auth
const KEY_FILE = path.join(__dirname, 'service-account.json');
const SCOPES = ['https://www.googleapis.com/auth/calendar'];

const auth = new google.auth.GoogleAuth({
    keyFile: KEY_FILE,
    scopes: SCOPES,
});

const calendar = google.calendar({ version: 'v3', auth });

// Use 'primary' to mean the calendar of the person who shared it with the Service Account
// Ideally, this ID should come from the business profile database.
const CALENDAR_ID = 'primary';

async function getValues(date) {
    try {
        console.log(`📅 Checking Calendar for ${date}...`);

        // 1. Calculate Start/End of Day
        // Parse the input string or assume it's "today"
        let start = new Date();
        if (date && date.toLowerCase() !== 'today' && date.toLowerCase() !== 'tomorrow') {
            // Basic parsing
            start = new Date(date);
        } else if (date.toLowerCase() === 'tomorrow') {
            start.setDate(start.getDate() + 1);
        }

        start.setHours(9, 0, 0, 0); // 9 AM
        const end = new Date(start);
        end.setHours(17, 0, 0, 0); // 5 PM

        // 2. Fetch Events from Google
        const res = await calendar.events.list({
            calendarId: CALENDAR_ID,
            timeMin: start.toISOString(),
            timeMax: end.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
        });

        const events = res.data.items;

        // 3. Simple Availability Logic
        // Just return the busy times and let AI figure it out, 
        // OR return basic "Free Slots" logic.
        // Let's return a summary string for the AI.

        if (!events || events.length === 0) {
            return `No events found. The whole day (${start.toDateString()}) is free between 9am and 5pm.`;
        }

        const busyTimes = events.map(event => {
            const start = event.start.dateTime || event.start.date;
            const end = event.end.dateTime || event.end.date;
            return `${new Date(start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }).join(', ');

        return `Busy times on ${start.toDateString()}: ${busyTimes}. Other times between 9am-5pm are open.`;

    } catch (error) {
        console.error('Error fetching calendar:', error);
        return "Error checking calendar availability.";
    }
}

// Ensure the AI tool definition matches this signature if changing
async function createEvent(name, datetime, phone) {
    try {
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

module.exports = { getValues, createEvent };
