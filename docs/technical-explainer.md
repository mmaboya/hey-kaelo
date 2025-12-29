# Technical Explainer: Hybrid Onboarding & AI Logic

This document explains the technical implementation of the Hybrid (Fixed + Mobile) workflow in HeyKaelo.

## 🏗️ Architecture Overview

The system uses a **Functional Branching** strategy instead of a static role-based one.

### 1. Data Model Updates
In the `profiles` table, we use:
- `role_category`: ENUM ('professional', 'tradesperson', 'hybrid')
- `role_type`: Custom string (e.g., "Solar Installer")
- `approval_required`: Boolean.
  - Defaults to `false` for `professional`.
  - Defaults to `true` for `tradesperson` and `hybrid`.

### 2. The Hybrid AI Prompt (`server/ai.js`)
The `getSystemInstruction` function now includes a specific branch for the `hybrid` category.

**Logic Highlights:**
- **Context Awareness**: The AI is instructed to "listen" for intent.
- **Receptionist Flow**: Triggered by keywords like "appointment", "slot", "book", "time". Uses `checkAvailability`.
- **Assistant Flow**: Triggered by keywords like "repair", "install", "come out", "quote". Uses Photo/Location request.
- **Fallback**: If the intent is ambiguous, the AI defaults to the Receptionist flow but adds a polite query about location.

### 3. Onboarding Flow (`server/onboarding.js`)
We refactored the `FLOWS` object to remove class names. The root message now uses:
1. `Fixed Appointments` (Maps to `pro_intro`)
2. `On-the-Go / Call-outs` (Maps to `trade_intro`)
3. `Both / Mixed` (Maps to `hybrid_intro`)

### 4. Dynamic Finalization
The `handleOnboarding` function determines the final response message based on the `nextStepId`:
- `finalize_pro` -> Professional framing.
- `finalize_trade` -> Mobile/Qualification framing.
- `finalize_hybrid` -> "Best of both worlds" framing.

## 🛠️ Testing Strategy
Use `server/verify_hybrid.js` (or similar node scripts) to simulate multi-persona requests:
```javascript
// Example Test Cases
const messageA = "Book 10am tomorrow"; // Should trigger slot check
const messageB = "I need a call-out"; // Should trigger photo/location request
```

## 🔐 Security & Permissions
- Users can only edit their own `role_category` via the `Setup.jsx` page or the authenticated `/api/profiles` endpoint.
- WhatsApp commands like `#setup` reset the state but do not delete the profile, allowing for re-onboarding.

---
*Dev Note: The Hybrid persona is optimized for GPT-4o / Gemini 1.5 Pro to ensure natural language context switching.*
