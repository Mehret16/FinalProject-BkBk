# Gemini AI - Quick Start (5 Minutes)

## ⚡ Ultra-Fast Setup

### Step 1: Get API Key (2 minutes)

```
1. Go to: https://aistudio.google.com/app/apikeys
2. Sign in with Google account
3. Click "Get API Key" → "Create API Key"
4. Copy the key
```

### Step 2: Add to .env (1 minute)

**Open `/backend/.env` and add:**

```env
GEMINI_API_KEY=paste_your_key_here
GEMINI_MODEL=gemini-pro
GEMINI_TEMPERATURE=0.7
GEMINI_MAX_TOKENS=1024
```

### Step 3: Install & Run (2 minutes)

```bash
cd /backend
npm install
npm run dev
```

✅ **Done!** Your backend is now AI-powered!

---

## 🧪 Test It

### Create Session

```bash
curl -X POST http://localhost:5000/api/chat/session/create \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"language": "en"}'
```

### Send Message to Gemini

```bash
curl -X POST http://localhost:5000/api/chat/message \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": 1,
    "messageText": "I am feeling anxious",
    "language": "en"
  }'
```

**Response:**
```json
{
  "message": "Message processed successfully",
  "patientMessage": { ... },
  "botResponse": {
    "response": "That sounds really challenging...",
    "classification": {
      "language": "en",
      "risk_level": "LOW",
      "intent": "mental_support"
    }
  }
}
```

---

## 🌍 Bilingual Support (Automatic!)

Send Amharic message:

```bash
curl -X POST http://localhost:5000/api/chat/message \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": 1,
    "messageText": "ተጨነቅሁ"
  }'
```

**Gemini automatically responds in Amharic!**

---

## 🚨 Crisis Detection

Send high-risk message:

```bash
curl -X POST http://localhost:5000/api/chat/message \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": 1,
    "messageText": "I want to hurt myself"
  }'
```

**Response includes:**
```json
{
  "alert": {
    "type": "CRISIS_ALERT",
    "riskLevel": "HIGH",
    "indicators": ["High-risk keywords detected"]
  }
}
```

---

## 📊 Check Session Analytics

```bash
curl -X GET http://localhost:5000/api/chat/analytics/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🎯 Features Now Available

✅ Bilingual (EN/AM) - Auto-detects
✅ Empathetic responses
✅ Crisis detection (HIGH/MEDIUM/LOW)
✅ Session analytics
✅ Automatic escalation
✅ Message history

---

## 📚 Full Documentation

Read `GEMINI_AI_SETUP.md` for complete details.

---

**You're all set! 🚀**
