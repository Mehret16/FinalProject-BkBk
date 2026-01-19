# Gemini AI Integration Guide

## Overview

Your Mental Health Chatbot backend is now fully integrated with **Google Gemini AI** to provide intelligent, empathetic mental health support with automatic language detection and crisis risk assessment.

---

## What's Been Added

### 1. **Gemini AI Configuration** (`config/gemini.js`)
- Bilingual system prompts (English & Amharic)
- Language detection from user messages
- Risk level classification (LOW, MEDIUM, HIGH)
- Intent classification (mental_support, crisis, unrelated)
- Conversation context management

### 2. **Gemini Service** (`services/geminiService.js`)
- Process messages through Gemini AI
- Automatic crisis detection and escalation
- Session analytics and risk analysis
- Conversation history tracking

### 3. **Updated Chat Routes** (`routes/chat.js`)
- `POST /api/chat/message` - Now uses Gemini AI
- `GET /api/chat/crisis-analysis/:sessionId` - Crisis risk analysis
- `GET /api/chat/analytics/:sessionId` - Session analytics

### 4. **Dependencies Added**
- `@google/generative-ai` - Google's official Gemini SDK

---

## Setup Instructions

### Step 1: Get Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikeys)
2. Click **"Get API Key"**
3. Create a new API key in your Google Cloud project
4. Copy the API key

### Step 2: Configure Environment Variables

1. Open `/backend/.env`
2. Add these variables:

```env
# GEMINI AI CONFIGURATION
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-pro
GEMINI_TEMPERATURE=0.7
GEMINI_MAX_TOKENS=1024
```

**Where to get these:**
- `GEMINI_API_KEY`: From Google AI Studio (above)
- `GEMINI_MODEL`: Default is `gemini-pro` (or use `gemini-pro-vision` for images)
- `GEMINI_TEMPERATURE`: 0.7 (balanced between creative and deterministic)
- `GEMINI_MAX_TOKENS`: 1024 (max response length)

### Step 3: Install Dependencies

```bash
cd /backend
npm install
```

### Step 4: Start the Backend

```bash
npm run dev
```

---

## How It Works

### Message Flow

```
Patient sends message
    ↓
Backend saves patient message to DB
    ↓
Language auto-detection (EN or AM)
    ↓
Risk classification (LOW/MEDIUM/HIGH)
    ↓
Gemini AI generates empathetic response
    ↓
Response saved to DB with classification
    ↓
If HIGH risk → Auto-escalate to therapist
    ↓
Response sent to patient
```

### Example API Request

```bash
curl -X POST http://localhost:5000/api/chat/message \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": 1,
    "messageText": "I feel really anxious and overwhelmed",
    "language": "en"
  }'
```

### Example Response

```json
{
  "message": "Message processed successfully",
  "patientMessage": {
    "messageId": 5,
    "sessionId": 1,
    "senderType": "patient",
    "sentimentScore": -0.3,
    "distressKeywords": ["anxious", "overwhelmed"]
  },
  "botResponse": {
    "messageId": 6,
    "response": "It sounds like you're carrying a lot right now. Anxiety and feeling overwhelmed are real experiences, and it's important that you recognize what you're going through. You don't have to handle this alone...",
    "classification": {
      "language": "en",
      "risk_level": "MEDIUM",
      "intent": "mental_support",
      "timestamp": "2024-01-19T10:30:00Z"
    }
  },
  "alert": null
}
```

---

## Crisis Detection & Escalation

### Risk Levels

| Level | Examples | Action |
|-------|----------|--------|
| **HIGH** | "I want to kill myself", "I'm going to hurt myself" | Auto-escalate, therapist alert |
| **MEDIUM** | "I feel hopeless", "Nothing matters" | Flag for review, suggest therapist |
| **LOW** | "I'm stressed", "I feel anxious" | Standard support response |

### Crisis Response Example

When a HIGH risk message is detected:

```json
{
  "alert": {
    "type": "CRISIS_ALERT",
    "riskLevel": "HIGH",
    "indicators": ["High-risk keywords detected"],
    "botResponse": "I'm really sorry you're feeling this much pain. I can't help with harming yourself, but you deserve support. Please reach out to someone you trust or local emergency services right now."
  }
}
```

---

## Bilingual Support

### Automatic Language Detection

The system automatically detects:
- **English** (EN) - Responds in English
- **Amharic** (AM) - Responds in Amharic (አማርኛ)

No manual language selection needed!

### Example - Amharic Support

```json
{
  "sessionId": 1,
  "messageText": "ጭንቀት ሌላ ነገር ጨርሱ አለብኝ",
  "language": "am"
}
```

Response will automatically be in Amharic.

---

## API Endpoints

### 1. Send Message (with Gemini AI)
```
POST /api/chat/message
Authorization: Bearer TOKEN
Body: {
  sessionId: number,
  messageText: string,
  language: "en" | "am" (optional)
}
```

**Returns:** Patient message + Gemini response + classification

### 2. Get Crisis Analysis
```
GET /api/chat/crisis-analysis/:sessionId
Authorization: Bearer TOKEN
```

**Returns:**
```json
{
  "sessionId": 1,
  "riskPercentage": 75,
  "riskLevel": "HIGH",
  "crisisIndicators": ["High-risk keywords detected"],
  "requiresTherapistAlert": true,
  "analyzedMessages": 5
}
```

### 3. Get Session Analytics
```
GET /api/chat/analytics/:sessionId
Authorization: Bearer TOKEN
```

**Returns:**
```json
{
  "session": { ... },
  "messageStats": {
    "total": 10,
    "patient_messages": 5,
    "bot_messages": 5
  },
  "classifications": [
    {
      "risk_level": "LOW",
      "intent": "mental_support",
      "count": 3
    }
  ],
  "sessionDuration": "15 minutes",
  "requiresTherapistIntervention": false
}
```

---

## Features

### ✅ Automatic Language Detection
- Detects English & Amharic automatically
- No manual language selection needed
- Responds in the same language as input

### ✅ Risk Classification
- HIGH: Suicidal/self-harm indicators
- MEDIUM: Hopelessness, despair, severe distress
- LOW: General stress, anxiety

### ✅ Intent Classification
- `mental_support` - Mental health related
- `crisis` - Crisis/self-harm statements
- `unrelated` - Off-topic questions (auto-refused)

### ✅ Empathetic Responses
- Validates user feelings
- Never judges or shames
- Encourages professional help when needed
- Follows mental health best practices

### ✅ Crisis Escalation
- Auto-detects high-risk statements
- Marks sessions for therapist review
- Provides crisis response templates
- Tracks risk indicators

### ✅ Session Analytics
- Message count and statistics
- Risk level tracking
- Duration calculations
- Classification metrics

---

## Database Schema Updates

The following tables track Gemini AI responses:

### `message_classifications` Table
```sql
CREATE TABLE message_classifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  message_id INT,
  risk_level VARCHAR(20),
  intent VARCHAR(50),
  language VARCHAR(5),
  detected_keywords JSON,
  confidence_score DECIMAL(3,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES chat_messages(id)
);
```

---

## Troubleshooting

### Issue: "GEMINI_API_KEY is not set"

**Solution:**
1. Check `/backend/.env` exists
2. Verify `GEMINI_API_KEY=your_key` is there
3. Restart backend: `npm run dev`

### Issue: "Failed to generate response"

**Possible causes:**
- Invalid API key
- Rate limit exceeded
- API service down
- Network connectivity issue

**Solution:**
- Check logs: `tail -f logs/app.log`
- Verify API key in Google AI Studio
- Wait a minute and retry

### Issue: Language not detecting correctly

**Solution:**
- The system detects based on character ratio
- If message is mostly Amharic characters (አማርኛ), it's classified as Amharic
- If mixed, English is default
- You can force language in request: `"language": "am"`

---

## Example: Complete Chat Flow

### 1. Create Session
```bash
POST /api/chat/session/create
Authorization: Bearer TOKEN
Body: { "language": "en" }
```

### 2. Send First Message
```bash
POST /api/chat/message
Authorization: Bearer TOKEN
Body: {
  "sessionId": 1,
  "messageText": "I've been feeling really anxious lately",
  "language": "en"
}
```

**Gemini Response:**
```
"That sounds really challenging. Anxiety can feel overwhelming when it builds up. 
I'm glad you're talking about it. Would you like to share more about what's been 
triggering these feelings?"
```

### 3. Continue Conversation
```bash
POST /api/chat/message
Authorization: Bearer TOKEN
Body: {
  "sessionId": 1,
  "messageText": "Work stress has been getting worse"
}
```

**Gemini Response:**
```
"Work stress is something many people struggle with. The fact that you're 
noticing it and naming it is actually a really good first step. Sometimes 
when we talk through what's happening, it helps us find ways to manage it..."
```

### 4. Get Session Analytics
```bash
GET /api/chat/analytics/1
Authorization: Bearer TOKEN
```

---

## Configuration Options

### Adjust Response Style

Edit `/backend/config/gemini.js` to customize:

```javascript
// Temperature (0 = deterministic, 1 = creative)
GEMINI_TEMPERATURE=0.7

// Max response length (100-4000)
GEMINI_MAX_TOKENS=1024

// Model choice
GEMINI_MODEL=gemini-pro  // or gemini-pro-vision
```

### Add Custom Keywords

In `classifyRiskLevel()`:
```javascript
const highRiskKeywords = [
  'existing keywords...',
  'your custom keyword'
];
```

---

## Security Notes

⚠️ **IMPORTANT:**

1. **Keep API key secret**
   - Never commit `.env` to git
   - Use environment variables in production
   - Rotate keys if compromised

2. **User Privacy**
   - All messages stored in database
   - Therapist can access with referral token
   - GDPR compliant (add deletion policies as needed)

3. **Rate Limiting**
   - Backend includes rate limiting
   - Adjust in `/backend/routes/chat.js`
   - Monitor API usage in Google AI Studio

---

## Next Steps

1. ✅ Added Gemini AI configuration
2. ✅ Created Gemini service layer
3. ✅ Updated chat routes with AI
4. ✅ Added crisis detection
5. 📋 **TODO:** Connect frontend to `/api/chat/message`
6. 📋 **TODO:** Add crisis alert notifications
7. 📋 **TODO:** Add therapist dashboard widget

---

## Support

For issues:
1. Check `/backend/logs/app.log`
2. Verify `.env` configuration
3. Test API with curl (examples above)
4. Check Gemini console for rate limits

---

**Your backend is now powered by Google Gemini AI! 🚀**
