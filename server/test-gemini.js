require('dotenv').config({ path: './.env' }); // Load from local .env first
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function listModels() {
    try {
        if (!process.env.GEMINI_API_KEY) {
            console.error("❌ No GEMINI_API_KEY found in environment!");
            return;
        }
        console.log("🔑 Using API Key:", process.env.GEMINI_API_KEY.substring(0, 10) + "...");

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Note: listModels is on the genAI instance or model? 
        // Actually usually strictly via API, but SDK has help?
        // Let's try to just Instantiate a model and see errors, OR use the API key to fetch list via fetch if SDK doesn't expose it easily in this version.
        // Wait, SDK usually doesn't expose listModels directly on the main class in older versions?
        // Let's try a simple fetch to the API endpoint to be sure what the KEY sees.

        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            console.log("✅ All Available Models:");
            data.models.forEach(m => {
                console.log(` - ${m.name} | Methods: ${m.supportedGenerationMethods.join(', ')}`);
            });
        }
        else {
            console.error("❌ Error listing models:", data);
        }

    } catch (error) {
        console.error("❌ Fatal Error:", error);
    }
}

listModels();
